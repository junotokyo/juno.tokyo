// Filmator analytics の event / error_code allow-list（docs/08 §3.2/§3.3）。
// クライアント `enum AnalyticsEvent` / `enum AnalyticsErrorCode` と常に一致させる。
// kv に触らない純データなので、admin-stats や単体テストから安全に import 可能。
// validator 実装は責務分離のため _lib/filmator-validators.js に置く（JT-279 Codex Q10）。

export const ALLOWED_EVENTS = new Set([
  'launch',
  'catalog_opened',
  'edit_committed',
  'export_succeeded',
  'paywall_shown',
  'purchase_succeeded',
  'promo_redeemed',
  'error_occurred',
]);

export const ERROR_EVENTS = new Set(['error_occurred']);

export const ALLOWED_ERROR_CODES = new Set([
  'catalog.open_failed',
  'catalog.corrupt',
  'catalog.locked',
  'catalog.schema_unsupported',
  'library.corrupt',
  'library.migration_failed',
  'library.read_failed',
  'export.render_failed',
  'export.write_failed',
  'export.encode_failed',
  'bookmark.resolve_failed',
  'bookmark.create_failed',
  'bookmark.persist_failed',
  'photos.read_failed',
  'storekit.product_not_found',
  'storekit.product_load_failed',
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
]);

// JT-279: severity 汎用化。サーバ map (ERROR_CODE_SEVERITY) を集計・通知判定の真実とする。
// 受信 payload の severity フィールドは validation のみで使う（不一致は invalid_severity で reject）。
// 将来 medium/low を足すときは ALLOWED_SEVERITIES と ERROR_CODE_SEVERITY を一緒に拡張する
// （test-filmator-analytics.mjs の integrity test が乖離を検出する）。
export const SEVERITY_HIGH = 'high';
export const ALLOWED_SEVERITIES = new Set([SEVERITY_HIGH]);

export const ERROR_CODE_SEVERITY = new Map([
  ['catalog.schema_unsupported', SEVERITY_HIGH],
]);

// catalog.schema_unsupported のみが受け付ける拡張フィールドの仕様。
// 他の error_code でこれらが送られてきたら 400 (unexpected_extension)。
// 実 validation は filmator-analytics.js handler で実行（このオブジェクトは declarative 仕様のみ）。
export const EXTENSION_FIELD_RULES = {
  'catalog.schema_unsupported': {
    severity: { required: true, allow: ALLOWED_SEVERITIES },
    db_version: { required: true, type: 'int', min: 1, max: 99999 },
    missing_tables: { required: false, type: 'csv', maxEntries: 12, maxEntryLen: 64 },
    missing_columns: { required: false, type: 'csv', maxEntries: 12, maxEntryLen: 96 },
  },
};
