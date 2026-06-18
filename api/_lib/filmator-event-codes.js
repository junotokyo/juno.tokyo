// Filmator analytics の event / error_code allow-list（docs/08 §3.2/§3.3）。
// クライアント `enum AnalyticsEvent` / `enum AnalyticsErrorCode` と常に一致させる。
// kv に触らない純データなので、admin-stats や単体テストから安全に import 可能。

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
]);
