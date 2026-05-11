// 集計ロジックの単体テスト。
// 実行: node scripts/test-admin-stats-aggregate.mjs
// 失敗時は exit code 1。
//
// このテストが証明すること:
//   - aggregateStats() が KV 値マップから event 合計・日次配列を正しく構築する
//   - null / 文字列数値混在でも数値合計が正しい
//   - errorsByCode は total > 0 のものだけを返す
//   - mergeErrorLogs() が日付の新しい順 → 各日リスト順を保つ
//
// このテストが証明しないこと（手動確認が必要）:
//   - Upstash Redis が MGET / LRANGE で期待する key/value 型で返すか
//   - Vercel handler の query parse / clamp / レスポンス整形
//   - Basic 認証 middleware が新 path を実際に保護するか
//   - ブラウザ Chart.js 描画

import assert from 'node:assert/strict';
import {
  aggregateStats,
  buildDayList,
  mergeErrorLogs,
} from '../api/_lib/admin-aggregate.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err.message);
    failed++;
  }
}

// ---- aggregateStats ----

test('aggregateStats_basic — launch counts daily and total', () => {
  const days = ['2026-05-12', '2026-05-11', '2026-05-10'];
  const kvLookup = new Map([
    ['stats:2026-05-12:launch', 30],
    ['stats:2026-05-11:launch', 20],
    ['stats:2026-05-10:launch', 10],
  ]);
  const result = aggregateStats({
    days,
    events: ['launch'],
    codes: [],
    errorEvents: ['save_failed', 'error_occurred'],
    kvLookup,
  });
  assert.deepEqual(result.events.launch.daily, [30, 20, 10]);
  assert.equal(result.events.launch.total, 60);
  assert.deepEqual(result.errorsByCode, {});
});

test('aggregateStats_nullValues — missing days treated as 0', () => {
  const days = ['2026-05-12', '2026-05-11', '2026-05-10'];
  const kvLookup = new Map([
    ['stats:2026-05-12:launch', 5],
    // 2026-05-11 missing
    ['stats:2026-05-10:launch', null],
  ]);
  const result = aggregateStats({
    days,
    events: ['launch'],
    codes: [],
    errorEvents: [],
    kvLookup,
  });
  assert.deepEqual(result.events.launch.daily, [5, 0, 0]);
  assert.equal(result.events.launch.total, 5);
});

test('aggregateStats_stringNumbers — Upstash returns "42" string', () => {
  const days = ['2026-05-12'];
  const kvLookup = new Map([['stats:2026-05-12:launch', '42']]);
  const result = aggregateStats({
    days,
    events: ['launch'],
    codes: [],
    errorEvents: [],
    kvLookup,
  });
  assert.equal(result.events.launch.total, 42);
  assert.deepEqual(result.events.launch.daily, [42]);
});

test('aggregateStats_errorByCode — sums across error events and days', () => {
  const days = ['2026-05-12', '2026-05-11', '2026-05-10'];
  const kvLookup = new Map([
    ['stats:2026-05-12:save_failed:photos.write_failed', 1],
    ['stats:2026-05-11:save_failed:photos.write_failed', 2],
    ['stats:2026-05-10:save_failed:photos.write_failed', 3],
    ['stats:2026-05-12:error_occurred:photos.write_failed', 10],
  ]);
  const result = aggregateStats({
    days,
    events: [],
    codes: ['photos.write_failed', 'network.timeout'],
    errorEvents: ['save_failed', 'error_occurred'],
    kvLookup,
  });
  assert.equal(result.errorsByCode['photos.write_failed'].total, 16);
  assert.deepEqual(result.errorsByCode['photos.write_failed'].daily, [11, 2, 3]);
  // network.timeout has no data → omitted
  assert.equal(result.errorsByCode['network.timeout'], undefined);
});

test('aggregateStats_zeroCodes_excluded — codes with total=0 omitted', () => {
  const days = ['2026-05-12'];
  const result = aggregateStats({
    days,
    events: [],
    codes: ['unknown', 'network.timeout'],
    errorEvents: ['save_failed', 'error_occurred'],
    kvLookup: new Map(),
  });
  assert.deepEqual(result.errorsByCode, {});
});

test('aggregateStats_unknownCodeInKv_ignored — kv keys not in code list are ignored', () => {
  const days = ['2026-05-12'];
  const kvLookup = new Map([
    ['stats:2026-05-12:save_failed:rogue.code', 99],
  ]);
  const result = aggregateStats({
    days,
    events: [],
    codes: ['photos.write_failed'],
    errorEvents: ['save_failed', 'error_occurred'],
    kvLookup,
  });
  // rogue.code is not iterated; lookup query never asks for it
  assert.deepEqual(result.errorsByCode, {});
});

// ---- buildDayList ----

test('buildDayList_newestFirst — 3 days, newest first, JST date keys', () => {
  // Fix "now" to 2026-05-12 06:00 UTC (= JST 15:00)
  const now = new Date(Date.UTC(2026, 4, 12, 6, 0, 0));
  const days = buildDayList(3, now);
  assert.deepEqual(days, ['2026-05-12', '2026-05-11', '2026-05-10']);
});

test('buildDayList_jstBoundary — UTC 14:00 of May 11 is JST May 11 23:00, prev = May 10', () => {
  const now = new Date(Date.UTC(2026, 4, 11, 14, 0, 0));
  const days = buildDayList(2, now);
  assert.deepEqual(days, ['2026-05-11', '2026-05-10']);
});

test('buildDayList_jstBoundary_lateUTC — UTC 16:00 of May 11 = JST May 12 01:00', () => {
  const now = new Date(Date.UTC(2026, 4, 11, 16, 0, 0));
  const days = buildDayList(2, now);
  assert.deepEqual(days, ['2026-05-12', '2026-05-11']);
});

// ---- mergeErrorLogs ----

test('mergeErrorLogs_order — newest day first, within-day LPUSH order preserved', () => {
  const days = ['2026-05-12', '2026-05-11'];
  const perDayLists = [
    [
      { ts_hour: '2026-05-12T15', event: 'error_occurred', code: 'a' },
      { ts_hour: '2026-05-12T10', event: 'error_occurred', code: 'b' },
    ],
    [
      { ts_hour: '2026-05-11T20', event: 'save_failed', code: 'photos.write_failed' },
    ],
  ];
  const merged = mergeErrorLogs({ days, perDayLists });
  assert.equal(merged.length, 3);
  assert.equal(merged[0].code, 'a');
  assert.equal(merged[0].date, '2026-05-12');
  assert.equal(merged[1].code, 'b');
  assert.equal(merged[2].code, 'photos.write_failed');
  assert.equal(merged[2].date, '2026-05-11');
});

test('mergeErrorLogs_handlesNullEntries — skips null/non-object entries', () => {
  const days = ['2026-05-12'];
  const perDayLists = [[null, { event: 'error_occurred', code: 'x' }, 'invalid']];
  const merged = mergeErrorLogs({ days, perDayLists });
  assert.equal(merged.length, 1);
  assert.equal(merged[0].code, 'x');
});

test('mergeErrorLogs_emptyLists — returns empty array', () => {
  const merged = mergeErrorLogs({ days: ['2026-05-12'], perDayLists: [[]] });
  assert.deepEqual(merged, []);
});

// ---- summary ----

console.log('');
console.log(`Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
