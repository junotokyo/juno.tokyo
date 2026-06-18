import { Redis } from '@upstash/redis';

function makeKv({ url, token }) {
  return new Redis({ url, token });
}

// PopScan 用：Vercel Marketplace の Upstash for Redis 統合が注入するデフォルト env
// (KV_REST_API_URL / KV_REST_API_TOKEN — 旧 @vercel/kv と同じ命名)
export const kv = makeKv({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Filmator 用：専用 Upstash DB（docs/08 §5）。Vercel 側で 2 つ目の Upstash 統合を
// `FILMATOR` prefix で接続し、`FILMATOR_KV_REST_API_URL` / `FILMATOR_KV_REST_API_TOKEN` を注入する。
// PopScan の `popscan-config` とは別 DB（接頭語なしのキー命名で衝突しない）。
export const filmatorKv = makeKv({
  url: process.env.FILMATOR_KV_REST_API_URL,
  token: process.env.FILMATOR_KV_REST_API_TOKEN,
});
