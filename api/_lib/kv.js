import { Redis } from '@upstash/redis';

// Vercel Marketplace の Upstash for Redis 統合が注入する環境変数を使う
// (KV_REST_API_URL / KV_REST_API_TOKEN — 旧 @vercel/kv と同じ命名)。
//
// PopScan と Filmator は同一 DB を共用する（Vercel Marketplace Free 枠が 1 DB 制約のため）。
// 論理分離はキー命名で実現する：
//   PopScan キー：`stats:{date}:*` / `promo-code:*` / `error_log:*` / `promo-redeem-rate:*` 等（接頭語なし）
//   Filmator キー：上記すべての先頭に `filmator:` プレフィックス
// 衝突しない＝PopScan サーバ側コードは無変更で済む。
export const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});
