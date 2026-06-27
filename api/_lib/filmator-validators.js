// JT-279: Filmator analytics 受信 payload の純関数 validator。
// 責務分離（Codex Q10）— filmator-event-codes.js は定義のみ、本ファイルは validation 関数のみ。
// kv 依存なし＝単体テストから安全に import 可能。

// content-free 規約のための blacklist（Codex Q4）。
// catalog.schema_unsupported の missing_tables / missing_columns に Adobe schema 名以外の
// path / filename 由来語が紛れ込むのを構造的に塞ぐ。Adobe テーブル/列は Adobe_* / Ag* 接頭で
// blacklist と衝突しない。case-insensitive で照合。
const CONTENT_BLACKLIST_TOKENS = [
  'lrcat', 'jpg', 'jpeg', 'heic', 'heif', 'dng', 'raw', 'tif', 'tiff', 'png',
  'Users', 'Volumes', 'home', 'tmp', 'private',
];

function containsBlacklistedToken(value) {
  const lower = value.toLowerCase();
  for (const token of CONTENT_BLACKLIST_TOKENS) {
    const t = token.toLowerCase();
    // ドット区切り or 先頭一致での token 出現を捕まえる（`Users.foo` / `foo.lrcat` 両対応）。
    // 完全一致 or 前後がドット/区切り文字＝Adobe schema 名（`Adobe_images.fileFormat` 等）は通る。
    if (lower === t) return true;
    if (lower.startsWith(t + '.')) return true;
    if (lower.endsWith('.' + t)) return true;
    if (lower.includes('.' + t + '.')) return true;
  }
  return false;
}

// CSV 形式の content-free フィールド validator。
// 各 entry は `[A-Za-z0-9_.]` のみ、blacklist トークンを含まない、件数・長さ上限以内。
// 空文字列は valid（クライアントが「該当 0 件」を空文字で送れる）。
export function isCsvField(value, { maxEntries, maxEntryLen }) {
  if (typeof value !== 'string') return false;
  if (value.length === 0) return true;
  const parts = value.split(',');
  if (parts.length > maxEntries) return false;
  for (const p of parts) {
    if (p.length === 0 || p.length > maxEntryLen) return false;
    if (!/^[A-Za-z0-9_.]+$/.test(p)) return false;
    if (containsBlacklistedToken(p)) return false;
  }
  return true;
}

// 整数範囲 validator。number 型限定＝文字列 "99" は reject。NaN・Infinity も reject。
export function isIntInRange(value, min, max) {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= min
    && value <= max;
}

// 短文字列 validator（既存 filmator-analytics.js の isShortString と同じ意図・将来統合用）。
export function isShortString(value, maxLen = 32) {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLen;
}

// テスト・運用用の export。
export const CONTENT_BLACKLIST = Object.freeze([...CONTENT_BLACKLIST_TOKENS]);
