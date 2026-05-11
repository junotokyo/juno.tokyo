#!/usr/bin/env node
// Netlify Blobs → Vercel KV ワンタイム移行スクリプト
//
// 必要 env:
//   NETLIFY_PAT          Netlify Personal Access Token
//   KV_REST_API_URL      Vercel KV (Upstash) REST URL
//   KV_REST_API_TOKEN    Vercel KV (Upstash) REST Token
//
// 使い方:
//   node scripts/migrate-blobs-to-kv.mjs --dry-run
//   node scripts/migrate-blobs-to-kv.mjs --apply
//
// 処理:
//   - Netlify Blobs ストア "popscan-config" の全キーを列挙
//   - "promo" は文字列として KV にコピー
//   - "promo-code:*" は JSON.parse してオブジェクトとして KV にコピー
//   - --dry-run 時は KV への書き込みを行わず内容を出力するだけ
//   - 再実行可能 (idempotent)

import { getStore } from '@netlify/blobs';
import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const STORE = {
  name: 'popscan-config',
  siteID: '45361e2a-4fc3-4f9a-a862-3c34f7d0c791',
  token: process.env.NETLIFY_PAT,
  consistency: 'strong',
};

function requireEnv(name) {
  if (!process.env[name]) {
    console.error(`✗ env ${name} が未設定`);
    process.exit(1);
  }
}

function parseFlags(argv) {
  const flags = { dryRun: false, apply: false };
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') flags.dryRun = true;
    else if (a === '--apply') flags.apply = true;
    else { console.error(`不明なフラグ: ${a}`); process.exit(1); }
  }
  if (flags.dryRun === flags.apply) {
    console.error('--dry-run か --apply のどちらか一方を指定してください');
    process.exit(1);
  }
  return flags;
}

async function main() {
  const { dryRun } = parseFlags(process.argv);
  requireEnv('NETLIFY_PAT');
  if (!dryRun) {
    requireEnv('KV_REST_API_URL');
    requireEnv('KV_REST_API_TOKEN');
  }

  console.log(`mode: ${dryRun ? 'DRY-RUN (KV write 抑止)' : 'APPLY'}`);

  const store = getStore(STORE);
  const { blobs } = await store.list();
  console.log(`Blobs: ${blobs.length} キー検出`);

  let promoCount = 0;
  let codeCount = 0;
  let skipped = 0;

  for (const { key } of blobs) {
    if (key === 'promo') {
      const value = await store.get(key);
      console.log(`  promo = "${value}"`);
      if (!dryRun) await kv.set('promo', value);
      promoCount++;
    } else if (key.startsWith('promo-code:')) {
      const raw = await store.get(key);
      let data;
      try { data = JSON.parse(raw); } catch {
        console.warn(`  ${key}: JSON.parse 失敗 (raw=${raw}) — スキップ`);
        skipped++;
        continue;
      }
      console.log(`  ${key} = ${JSON.stringify(data)}`);
      if (!dryRun) await kv.set(key, data);
      codeCount++;
    } else {
      console.warn(`  ${key}: 未知のキー形式 — スキップ`);
      skipped++;
    }
  }

  console.log('');
  console.log(`完了: promo=${promoCount}, promo-code=${codeCount}, skipped=${skipped}`);
  if (dryRun) console.log('（--dry-run のため KV への書き込みは行っていません）');
}

main().catch((err) => {
  console.error('エラー:', err);
  process.exit(1);
});
