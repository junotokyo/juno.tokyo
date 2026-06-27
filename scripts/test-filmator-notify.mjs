// Filmator notify（高 severity メール通知）の単体テスト。
// 実行: node scripts/test-filmator-notify.mjs
// 失敗時は exit code 1。
//
// このテストが証明すること（JT-279）:
//   - mailer 未設定（null）時：dedupe slot を claim しない＝同日 env 設定後に送信開始できる（Codex Q1）
//   - mailer 注入時：期待 subject / body フォーマットで 1 回だけ呼ばれる
//   - 同日 2 回目の呼び出しは mailer を呼ばない（Upstash SET NX EX による dedupe）
//   - mailer throw 時：dedupe slot は claim 済（fail-closed）＋ {sent:false, reason:'mailer_threw'} を返す
//   - body は allow-list 化したキーのみ参照＝entry に余計なキー（_raw_body 等）を混ぜても出力されない（Codex Q11）
//   - body にファイルパス・カタログ拡張子は出ない（privacy assertion）
//
// このテストが証明しないこと（手動確認が必要）:
//   - Resend API が実際にメールを送れるか（Preview deploy で実送達確認）
//   - Vercel の複数 instance 同時実行時に Upstash SET NX が本当に atomic か（Upstash 側保証）
//   - 環境変数 misconfig 検知の運用復旧フロー

import assert from 'node:assert/strict';
import { notifyHighSeverity, _testing } from '../api/_lib/filmator-notify.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  return (async () => {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ ${name}`);
      console.error(err.stack || err.message);
      failed++;
    }
  })();
}

function makeKv() {
  const store = new Map();
  return {
    store,
    async set(key, value, opts) {
      if (opts?.nx && store.has(key)) return null;
      store.set(key, value);
      return 'OK';
    },
  };
}

const baseEntry = {
  ts_hour: '2026-06-27T03',
  event: 'error_occurred',
  code: 'catalog.schema_unsupported',
  severity: 'high',
  app_version: '1.0.0',
  build: '100',
  os_version: '15.0',
  db_version: 99,
  missing_tables: 'AgLibraryFolder,Adobe_images',
  missing_columns: 'Adobe_images.fileFormat',
};

await test('no_mailer — slot claim せず即 return（env 設定後の同日に送信できる）', async () => {
  const kv = makeKv();
  const r = await notifyHighSeverity({
    now: new Date('2026-06-27T03:00:00+09:00'),
    kv,
    date: '2026-06-27',
    errorCode: 'catalog.schema_unsupported',
    entry: baseEntry,
    mailer: null,
  });
  assert.equal(r.sent, false);
  assert.equal(r.reason, 'no_mailer');
  assert.equal(kv.store.has('filmator:notify:high:2026-06-27'), false,
    'no_mailer 時は slot claim しない（env 設定後の send を妨げない）');
});

await test('mailer 注入時 — 1 回呼ばれて slot に予約が入る', async () => {
  const kv = makeKv();
  let calls = 0;
  let captured = null;
  const mailer = async (msg) => { calls++; captured = msg; };
  const r = await notifyHighSeverity({
    now: new Date('2026-06-27T03:00:00+09:00'),
    kv,
    date: '2026-06-27',
    errorCode: 'catalog.schema_unsupported',
    entry: baseEntry,
    mailer,
  });
  assert.equal(r.sent, true);
  assert.equal(calls, 1);
  assert.ok(kv.store.has('filmator:notify:high:2026-06-27'));
  assert.ok(captured.subject.includes('catalog.schema_unsupported'));
  assert.ok(captured.subject.includes('2026-06-27'));
});

await test('同日 2 回目 — dedupe で mailer 呼ばれない', async () => {
  const kv = makeKv();
  let calls = 0;
  const mailer = async () => { calls++; };
  const r1 = await notifyHighSeverity({
    now: new Date('2026-06-27T03:00:00+09:00'),
    kv, date: '2026-06-27', errorCode: 'catalog.schema_unsupported',
    entry: baseEntry, mailer,
  });
  const r2 = await notifyHighSeverity({
    now: new Date('2026-06-27T05:00:00+09:00'),
    kv, date: '2026-06-27', errorCode: 'catalog.schema_unsupported',
    entry: baseEntry, mailer,
  });
  assert.equal(r1.sent, true);
  assert.equal(r2.sent, false);
  assert.equal(r2.reason, 'deduped');
  assert.equal(calls, 1);
});

await test('mailer throw — fail-closed（slot claim 済・reason mailer_threw）', async () => {
  const kv = makeKv();
  const mailer = async () => { throw new Error('resend 500: internal'); };
  // console.error は stderr に出るが test 失敗ではない（運用 print の動作確認）
  const r = await notifyHighSeverity({
    now: new Date('2026-06-27T03:00:00+09:00'),
    kv, date: '2026-06-27', errorCode: 'catalog.schema_unsupported',
    entry: baseEntry, mailer,
  });
  assert.equal(r.sent, false);
  assert.equal(r.reason, 'mailer_threw');
  assert.ok(r.error.includes('resend 500'));
  assert.ok(kv.store.has('filmator:notify:high:2026-06-27'),
    'mailer 失敗時も slot は claim 済（fail-closed 設計・手動 DEL で復旧）');
});

await test('format body — privacy: パスや拡張子は body に出ない', async () => {
  const body = _testing.formatBody({ entry: baseEntry, date: '2026-06-27' });
  // 期待値：Adobe schema 名・db_version は出る
  assert.ok(body.includes('AgLibraryFolder'));
  assert.ok(body.includes('Adobe_images.fileFormat'));
  assert.ok(body.includes('db_version:     99'));
  // 反例：path / 拡張子由来語は entry に元々無いので body にも出ない
  assert.equal(body.includes('/Users/'), false);
  assert.equal(body.includes('.lrcat'), false);
  assert.equal(body.includes('jpg'), false);
  assert.equal(body.includes('Volumes'), false);
});

await test('format body — entry の allow-list 外キーは出力されない（退行防止・Codex Q11）', async () => {
  // 将来 entry に raw body や追加キーが混入しても、format function は allow-list 化したキーしか参照しない＝出力されない
  const polluted = {
    ...baseEntry,
    _raw_body: '/Users/jun/Catalog.lrcat の中身',
    catalog_name: 'MyVacation',
    photo_path: '/Volumes/SSD/photos/DSC_001.jpg',
    arbitrary_key: 'PII content here',
  };
  const body = _testing.formatBody({ entry: polluted, date: '2026-06-27' });
  assert.equal(body.includes('_raw_body'), false);
  assert.equal(body.includes('MyVacation'), false);
  assert.equal(body.includes('/Volumes/SSD'), false);
  assert.equal(body.includes('PII content here'), false);
  assert.equal(body.includes('arbitrary_key'), false);
});

await test('format body — entry の欠損フィールドは "(none)" 表記', async () => {
  const sparse = {
    ts_hour: '2026-06-27T03',
    code: 'catalog.schema_unsupported',
    severity: 'high',
    // app_version / build / os_version / db_version / missing_* なし
  };
  const body = _testing.formatBody({ entry: sparse, date: '2026-06-27' });
  assert.ok(body.includes('app_version:    (none)'));
  assert.ok(body.includes('build:          (none)'));
  assert.ok(body.includes('db_version:     (none)'));
  assert.ok(body.includes('missing_tables: (none)'));
});

console.log('');
console.log(`Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
