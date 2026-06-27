// Filmator analytics 純関数の単体テスト。
// 実行: node scripts/test-filmator-analytics.mjs
// 失敗時は exit code 1。
//
// このテストが証明すること:
//   - clampPhotos() が 1..100000 範囲外を境界へクランプし、非数値/NaN は null を返す
//   - bucketForPhotos() が docs/08 §3.6 の bucket 境界（1 / 2-10 / 11-50 / 51-200 / 201+）を正しく分類する
//   - ALLOWED_EVENTS / ALLOWED_ERROR_CODES の集合契約（docs/08 §3.2/§3.3 と一致）
//   - SIZE_BUCKETS の順序と内容
//
// このテストが証明しないこと（手動確認が必要）:
//   - Vercel handler が body parse / 400 reject / KV 書き込みを実際に行うか
//   - filmatorKv が FILMATOR_KV_REST_API_URL の DB に正しく接続するか
//   - Upstash Redis の INCR/INCRBY/LPUSH/EXPIRE の実挙動
//   - Basic 認証 middleware が新 /filmator/admin* matcher を実際に保護するか

import assert from 'node:assert/strict';
import {
  clampPhotos,
  bucketForPhotos,
  SIZE_BUCKETS,
  PHOTOS_MIN,
  PHOTOS_MAX,
} from '../api/_lib/photos-bucket.js';
import {
  ALLOWED_EVENTS,
  ALLOWED_ERROR_CODES,
  ALLOWED_SEVERITIES,
  ERROR_EVENTS,
  ERROR_CODE_SEVERITY,
  EXTENSION_FIELD_RULES,
  SEVERITY_HIGH,
} from '../api/_lib/filmator-event-codes.js';
import {
  isCsvField,
  isIntInRange,
  CONTENT_BLACKLIST,
} from '../api/_lib/filmator-validators.js';

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

// ---- clampPhotos ----

test('clampPhotos_valid — in-range integers pass through', () => {
  assert.equal(clampPhotos(1), 1);
  assert.equal(clampPhotos(2), 2);
  assert.equal(clampPhotos(50), 50);
  assert.equal(clampPhotos(100000), 100000);
});

test('clampPhotos_truncatesFloat — fractional integer is floored', () => {
  assert.equal(clampPhotos(3.7), 3);
  assert.equal(clampPhotos(1.1), 1);
});

test('clampPhotos_belowMin — clamps to PHOTOS_MIN', () => {
  assert.equal(clampPhotos(0), PHOTOS_MIN);
  assert.equal(clampPhotos(-5), PHOTOS_MIN);
});

test('clampPhotos_aboveMax — clamps to PHOTOS_MAX', () => {
  assert.equal(clampPhotos(100001), PHOTOS_MAX);
  assert.equal(clampPhotos(999999), PHOTOS_MAX);
});

test('clampPhotos_nonNumber — null for string/null/undefined/NaN/Infinity', () => {
  assert.equal(clampPhotos('42'), null);
  assert.equal(clampPhotos(null), null);
  assert.equal(clampPhotos(undefined), null);
  assert.equal(clampPhotos(NaN), null);
  assert.equal(clampPhotos(Infinity), null);
  assert.equal(clampPhotos(-Infinity), null);
  assert.equal(clampPhotos({}), null);
  assert.equal(clampPhotos([]), null);
});

// ---- bucketForPhotos ----

test('bucketForPhotos_boundaries — exact bucket edges (docs/08 §3.6)', () => {
  assert.equal(bucketForPhotos(1), '1');
  assert.equal(bucketForPhotos(2), '2-10');
  assert.equal(bucketForPhotos(10), '2-10');
  assert.equal(bucketForPhotos(11), '11-50');
  assert.equal(bucketForPhotos(50), '11-50');
  assert.equal(bucketForPhotos(51), '51-200');
  assert.equal(bucketForPhotos(200), '51-200');
  assert.equal(bucketForPhotos(201), '201+');
  assert.equal(bucketForPhotos(100000), '201+');
});

test('SIZE_BUCKETS_orderAndContents — order matters for stacked chart', () => {
  assert.deepEqual(SIZE_BUCKETS, ['1', '2-10', '11-50', '51-200', '201+']);
});

// ---- event allow-list ----

test('ALLOWED_EVENTS — docs/08 §3.2 contract', () => {
  const expected = new Set([
    'launch',
    'catalog_opened',
    'edit_committed',
    'export_succeeded',
    'paywall_shown',
    'purchase_succeeded',
    'promo_redeemed',
    'error_occurred',
  ]);
  assert.equal(ALLOWED_EVENTS.size, expected.size, 'event count');
  for (const e of expected) assert.ok(ALLOWED_EVENTS.has(e), `missing event: ${e}`);
});

test('ALLOWED_EVENTS — PopScan-only events rejected', () => {
  // PopScan 固有（scan/save 系）は Filmator では含まない
  assert.equal(ALLOWED_EVENTS.has('save_succeeded'), false);
  assert.equal(ALLOWED_EVENTS.has('save_failed'), false);
});

test('ERROR_EVENTS — only error_occurred', () => {
  assert.equal(ERROR_EVENTS.size, 1);
  assert.ok(ERROR_EVENTS.has('error_occurred'));
});

// ---- error_code allow-list ----

test('ALLOWED_ERROR_CODES — docs/08 §3.3 fixed list', () => {
  const expected = [
    'catalog.open_failed',
    'catalog.corrupt',
    'catalog.locked',
    'catalog.schema_unsupported', // JT-278/279
    'library.corrupt',
    'library.migration_failed',
    'export.render_failed',
    'export.write_failed',
    'export.encode_failed',
    'bookmark.resolve_failed',
    'photos.read_failed',
    'storekit.product_not_found',
    'storekit.product_load_failed', // JT-249/JT-366
    'storekit.purchase_failed',
    'storekit.purchase_cancelled',
    'storekit.verification_failed',
    'storekit.restore_failed',
    'promo.invalid_code',
    'promo.network_error',
    'network.timeout',
    'network.offline',
    'network.server_error',
    'icloud.unavailable',
    'unknown',
  ];
  assert.equal(ALLOWED_ERROR_CODES.size, expected.length, 'error_code count');
  for (const c of expected) assert.ok(ALLOWED_ERROR_CODES.has(c), `missing code: ${c}`);
});

test('ALLOWED_ERROR_CODES — PopScan-only codes rejected', () => {
  // PopScan 固有（camera/vision/photos.* permission）は Filmator では含まない
  assert.equal(ALLOWED_ERROR_CODES.has('camera.permission_denied'), false);
  assert.equal(ALLOWED_ERROR_CODES.has('camera.session_failed'), false);
  assert.equal(ALLOWED_ERROR_CODES.has('camera.capture_failed'), false);
  assert.equal(ALLOWED_ERROR_CODES.has('vision.no_rectangle'), false);
  assert.equal(ALLOWED_ERROR_CODES.has('vision.detection_failed'), false);
  assert.equal(ALLOWED_ERROR_CODES.has('photos.permission_denied'), false);
  assert.equal(ALLOWED_ERROR_CODES.has('photos.write_failed'), false);
  assert.equal(ALLOWED_ERROR_CODES.has('photos.fetch_failed'), false);
  assert.equal(ALLOWED_ERROR_CODES.has('quota.time_endpoint_failed'), false);
});

// ---- JT-279: severity 汎用化 ----

test('SEVERITY_HIGH — constant value', () => {
  assert.equal(SEVERITY_HIGH, 'high');
});

test('ALLOWED_SEVERITIES — currently contains high only', () => {
  assert.equal(ALLOWED_SEVERITIES.size, 1);
  assert.ok(ALLOWED_SEVERITIES.has('high'));
});

test('ERROR_CODE_SEVERITY — catalog.schema_unsupported is high', () => {
  assert.equal(ERROR_CODE_SEVERITY.get('catalog.schema_unsupported'), 'high');
});

test('ERROR_CODE_SEVERITY — other codes return undefined', () => {
  assert.equal(ERROR_CODE_SEVERITY.get('catalog.open_failed'), undefined);
  assert.equal(ERROR_CODE_SEVERITY.get('export.write_failed'), undefined);
  assert.equal(ERROR_CODE_SEVERITY.get('unknown'), undefined);
});

// integrity test (Codex Q9): ERROR_CODE_SEVERITY の値が全て ALLOWED_SEVERITIES に含まれる。
// 将来 medium/low を ERROR_CODE_SEVERITY に追加したら ALLOWED_SEVERITIES も拡張する
// （拡張漏れはこのテストで検出）。
test('ERROR_CODE_SEVERITY values ⊆ ALLOWED_SEVERITIES — integrity', () => {
  for (const [code, sev] of ERROR_CODE_SEVERITY.entries()) {
    assert.ok(ALLOWED_SEVERITIES.has(sev), `code ${code} mapped to unknown severity ${sev}`);
  }
});

test('EXTENSION_FIELD_RULES — only catalog.schema_unsupported', () => {
  const keys = Object.keys(EXTENSION_FIELD_RULES);
  assert.deepEqual(keys, ['catalog.schema_unsupported']);
  const rule = EXTENSION_FIELD_RULES['catalog.schema_unsupported'];
  assert.equal(rule.severity.required, true);
  assert.equal(rule.db_version.required, true);
  assert.equal(rule.db_version.min, 1);
  assert.equal(rule.db_version.max, 99999);
  assert.equal(rule.missing_tables.required, false);
  assert.equal(rule.missing_tables.maxEntries, 12);
  assert.equal(rule.missing_columns.maxEntries, 12);
});

// ---- JT-279: validators ----

test('isCsvField_valid — basic CSV / single / empty', () => {
  assert.equal(isCsvField('a,b,c', { maxEntries: 12, maxEntryLen: 64 }), true);
  assert.equal(isCsvField('AgLibrary', { maxEntries: 12, maxEntryLen: 64 }), true);
  assert.equal(isCsvField('Adobe_images.fileFormat', { maxEntries: 12, maxEntryLen: 96 }), true);
  assert.equal(isCsvField('', { maxEntries: 12, maxEntryLen: 64 }), true);
});

test('isCsvField_rejectsPathChars — / \\ space ; \' "', () => {
  assert.equal(isCsvField('a/b', { maxEntries: 12, maxEntryLen: 64 }), false);
  assert.equal(isCsvField('../etc', { maxEntries: 12, maxEntryLen: 64 }), false);
  assert.equal(isCsvField('a b', { maxEntries: 12, maxEntryLen: 64 }), false);
  assert.equal(isCsvField('a;b', { maxEntries: 12, maxEntryLen: 64 }), false);
  assert.equal(isCsvField("a'b", { maxEntries: 12, maxEntryLen: 64 }), false);
});

test('isCsvField_rejectsOverEntries — 13 entries fails (cap 12)', () => {
  const csv = Array.from({ length: 13 }, (_, i) => `t${i}`).join(',');
  assert.equal(isCsvField(csv, { maxEntries: 12, maxEntryLen: 64 }), false);
});

test('isCsvField_rejectsLongEntry — entry over maxEntryLen', () => {
  const longEntry = 'a'.repeat(70);
  assert.equal(isCsvField(longEntry, { maxEntries: 12, maxEntryLen: 64 }), false);
});

test('isCsvField_rejectsBlacklistToken — file extension / path component', () => {
  // path/filename 由来トークンは reject（content-free 防御・Codex Q4）
  assert.equal(isCsvField('foo.lrcat', { maxEntries: 12, maxEntryLen: 96 }), false);
  assert.equal(isCsvField('Users.jun', { maxEntries: 12, maxEntryLen: 96 }), false);
  assert.equal(isCsvField('a.jpg', { maxEntries: 12, maxEntryLen: 96 }), false);
  assert.equal(isCsvField('Volumes.disk', { maxEntries: 12, maxEntryLen: 96 }), false);
  assert.equal(isCsvField('tmp.foo', { maxEntries: 12, maxEntryLen: 96 }), false);
});

test('isCsvField_acceptsAdobeIdentifiers — Adobe schema names pass', () => {
  // Adobe テーブル / 列名は通る（接頭辞が Adobe_ / Ag* で blacklist と衝突しない）
  assert.equal(isCsvField('Adobe_images', { maxEntries: 12, maxEntryLen: 96 }), true);
  assert.equal(isCsvField('AgLibraryFolder,AgLibraryRootFolder', { maxEntries: 12, maxEntryLen: 96 }), true);
  assert.equal(isCsvField('Adobe_images.fileFormat,Adobe_imageDevelopSettings.text', { maxEntries: 12, maxEntryLen: 96 }), true);
});

test('CONTENT_BLACKLIST_exported — contains expected tokens', () => {
  assert.ok(CONTENT_BLACKLIST.includes('lrcat'));
  assert.ok(CONTENT_BLACKLIST.includes('jpg'));
  assert.ok(CONTENT_BLACKLIST.includes('Users'));
  assert.ok(CONTENT_BLACKLIST.includes('Volumes'));
});

test('isIntInRange — basic ranges', () => {
  assert.equal(isIntInRange(50, 1, 100), true);
  assert.equal(isIntInRange(1, 1, 100), true);
  assert.equal(isIntInRange(100, 1, 100), true);
  assert.equal(isIntInRange(0, 1, 100), false);
  assert.equal(isIntInRange(101, 1, 100), false);
});

test('isIntInRange_rejectsNonInteger', () => {
  assert.equal(isIntInRange('50', 1, 100), false);
  assert.equal(isIntInRange(50.5, 1, 100), false);
  assert.equal(isIntInRange(null, 1, 100), false);
  assert.equal(isIntInRange(undefined, 1, 100), false);
  assert.equal(isIntInRange(NaN, 1, 100), false);
  assert.equal(isIntInRange(Infinity, 1, 100), false);
});

// ---- summary ----

console.log('');
console.log(`Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
