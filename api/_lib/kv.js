import { Redis } from '@upstash/redis';

// Vercel Marketplace の Upstash for Redis 統合が注入する環境変数を使う
// (KV_REST_API_URL / KV_REST_API_TOKEN — 旧 @vercel/kv と同じ命名)
export const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});
