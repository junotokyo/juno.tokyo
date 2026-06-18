#!/usr/bin/env node
// PopScan 既存 KV キーを popscan: 接頭語付きに移行するワンショットスクリプト。
//
// 背景：juno.tokyo の Vercel + Upstash KV を PopScan/Filmator 両アプリで共用するため、
// キー命名を <app>: 接頭語付きに統一する（filmator: は既に対応済、本スクリプトで popscan: を遡及付与）。
//
// 使い方:
//   KV_REST_API_URL=... KV_REST_API_TOKEN=... node scripts/migrate-junotokyo-prefix.mjs           # ドライラン（既定）
//   KV_REST_API_URL=... KV_REST_API_TOKEN=... node scripts/migrate-junotokyo-prefix.mjs --apply   # 実行
//
// env は Vercel Dashboard → juno-tokyo project → Storage → KV → .env.local Snippet からコピー可。
//
// 対象キー:
//   - promo                  → popscan:promo            （単一キー・set-promo の現在値）
//   - promo-code:{CODE}      → popscan:promo-code:{CODE}（promo コード Hash）
//   - stats:{date}:*         → popscan:stats:{date}:*   （日次集計カウンタ）
//   - error_log:{date}       → popscan:error_log:{date} （エラーログ List）
//
// 対象外:
//   - promo-redeem-rate:*    TTL 60s で自動消滅するため移行不要。コード切替直後は計測が一時的にリセットされるが許容。
//   - filmator:*             既に接頭語付き＝触らない。
//   - popscan:*              既に移行済みのキー＝触らない（リトライ安全）。
//
// 実行順（本番手順）:
//   1. このスクリプトを含むコードを main に push → Vercel 自動デプロイ完了を待つ（即時 Production 反映）
//   2. デプロイ完了直後にこのスクリプトを --apply で実行（PopScan サーバが popscan: キーを読み書きする状態で、
//      既存 接頭語なしキーを popscan: 付きにリネーム＝サーバの読み書き先に追従させる）
//   3. PopScan admin / stats が以前同様に表示されることを確認
//
// 注意:
//   - 既に dest キー（popscan:...）が存在する場合は警告＋上書き（RENAME の標準挙動）。
//     通常はリトライでない限り発生しないが、リトライ時は最後に書かれた方が残る＝想定通り。
//   - Filmator キー（filmator:*）には触らない（SCAN match で除外）。
//   - 1 つのキー毎に exists → rename の 2 コマンド＝ N キーで 2N コマンド。今日時点のキー数は十分小さい。

import { Redis } from '@upstash/redis';

const APPLY = process.argv.includes('--apply');

const PATTERNS = [
  { match: 'promo-code:*', label: 'promo-code' },
  { match: 'stats:*', label: 'stats' },
  { match: 'error_log:*', label: 'error_log' },
];

const SINGLE_KEYS = ['promo'];

function makeRedis() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    console.error('error: KV_REST_API_URL / KV_REST_API_TOKEN must be set in env');
    process.exit(1);
  }
  return new Redis({ url, token });
}

async function scanKeys(kv, pattern) {
  const keys = [];
  let cursor = '0';
  do {
    const result = await kv.scan(cursor, { match: pattern, count: 1000 });
    cursor = String(result[0]);
    for (const k of result[1]) keys.push(k);
  } while (cursor !== '0');
  return keys;
}

function newName(oldKey) {
  return `popscan:${oldKey}`;
}

function isAlreadyPrefixed(key) {
  return key.startsWith('popscan:') || key.startsWith('filmator:');
}

async function migrateOne(kv, key, log) {
  if (isAlreadyPrefixed(key)) {
    log(`  - ${key}: already prefixed (skip)`);
    return { skipped: 1 };
  }
  const dest = newName(key);
  const destExists = await kv.exists(dest);
  if (destExists) {
    log(`  ⚠ ${key} → ${dest}: dest exists, will overwrite`);
  } else {
    log(`  ✓ ${key} → ${dest}`);
  }
  if (APPLY) {
    await kv.rename(key, dest);
    return { renamed: 1, conflict: destExists ? 1 : 0 };
  }
  return { wouldRename: 1, conflict: destExists ? 1 : 0 };
}

async function main() {
  const kv = makeRedis();

  console.log(APPLY ? '🔥 APPLY mode (will rename keys in-place)' : '🧪 DRY-RUN mode (no writes; pass --apply to execute)');
  console.log('');

  let totalRenamed = 0;
  let totalWouldRename = 0;
  let totalSkipped = 0;
  let totalConflict = 0;

  // Single keys
  console.log('[single keys]');
  for (const key of SINGLE_KEYS) {
    const exists = await kv.exists(key);
    if (!exists) {
      console.log(`  - ${key}: not present (skip)`);
      totalSkipped++;
      continue;
    }
    const r = await migrateOne(kv, key, (msg) => console.log(msg));
    totalRenamed += r.renamed ?? 0;
    totalWouldRename += r.wouldRename ?? 0;
    totalSkipped += r.skipped ?? 0;
    totalConflict += r.conflict ?? 0;
  }

  // Pattern keys
  for (const { match, label } of PATTERNS) {
    const keys = await scanKeys(kv, match);
    // SCAN match は glob で前方一致なので、popscan:promo-code:* / filmator:promo-code:* は match しない（OK）。
    // 念のため isAlreadyPrefixed で防御。
    const candidates = keys.filter((k) => !isAlreadyPrefixed(k));
    console.log(`\n[${label}] matched ${keys.length} keys, ${candidates.length} need migration`);
    for (const key of candidates) {
      const r = await migrateOne(kv, key, (msg) => console.log(msg));
      totalRenamed += r.renamed ?? 0;
      totalWouldRename += r.wouldRename ?? 0;
      totalSkipped += r.skipped ?? 0;
      totalConflict += r.conflict ?? 0;
    }
  }

  console.log('');
  console.log('─────────────────────────────────────');
  if (APPLY) {
    console.log(`Summary: ${totalRenamed} renamed, ${totalSkipped} skipped, ${totalConflict} overwrites`);
  } else {
    console.log(`Summary (dry-run): would rename ${totalWouldRename}, skip ${totalSkipped}, overwrites ${totalConflict}`);
    console.log('Run with --apply to execute.');
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
