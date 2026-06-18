// Filmator `export_succeeded` の `photos`（書き出し枚数）処理の純関数。
// docs/08 §3.6 のスキーマ：枚数 INCRBY + バッチサイズ分布 bucket INCR。

export const PHOTOS_MIN = 1;
export const PHOTOS_MAX = 100000;

export const SIZE_BUCKETS = ['1', '2-10', '11-50', '51-200', '201+'];

// 数値以外・NaN・非有限値は null（＝送信元の型エラー扱いで reject）。
// 1 未満は 1、100000 超は 100000 にクランプして集計を歪めない。
export function clampPhotos(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const n = Math.trunc(value);
  if (n < PHOTOS_MIN) return PHOTOS_MIN;
  if (n > PHOTOS_MAX) return PHOTOS_MAX;
  return n;
}

export function bucketForPhotos(n) {
  if (n <= 1) return '1';
  if (n <= 10) return '2-10';
  if (n <= 50) return '11-50';
  if (n <= 200) return '51-200';
  return '201+';
}
