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
  ERROR_EVENTS,
} from '../api/_lib/filmator-event-codes.js';

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
    'library.corrupt',
    'library.migration_failed',
    'export.render_failed',
    'export.write_failed',
    'export.encode_failed',
    'bookmark.resolve_failed',
    'photos.read_failed',
    'storekit.product_not_found',
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

// ---- summary ----

console.log('');
console.log(`Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
