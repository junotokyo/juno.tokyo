// JT-279: Filmator サーバ側の高 severity エラー通知（Resend メール）。
// 1 日 1 通保証は Upstash Redis SET NX EX 86400 で原子的に取る。
// 送信本体は注入可能 mailer＝テストでは spy 関数を渡し、外部 API ノータッチ。
//
// 設計判断（Codex Q1）: env 未設定 (no_mailer) のとき dedupe slot を claim しない。
//   理由：コードが先に本番反映され env が後で設定された場合に、初回 high event が起きると
//   slot だけ取って通知できず、env 設定後の同日も deduped で送信されない事故を防ぐ。
//   slot 未 claim ＝ env 設定後の次 event で claim → 送信が走る。
//
// 設計判断（Codex Q2）: mailer throw 時は KV slot は既に claim 済（fail-closed）。
//   理由：at-least-once retry queue は複雑化のため避け、運用復旧は手動 DEL で対応する。
//   失敗時に console.error で **復旧するべき KV キー名を必ず print** することで運用が見える。

import { jstDateKey } from './date.js';

const DEDUPE_TTL_SECONDS = 86400;

// 環境変数から Resend mailer を構築。未設定なら null を返す。
function resolveMailer() {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.FILMATOR_NOTIFY_TO;
  const from = process.env.FILMATOR_NOTIFY_FROM;
  if (!key || !to || !from) return null;
  return async ({ subject, body }) => {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, text: body }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      throw new Error(`resend ${r.status}: ${detail}`);
    }
  };
}

function formatSubject({ date, errorCode }) {
  return `[Filmator] high severity: ${errorCode} (${date})`;
}

// メール本文。**allow-list 化したキーのみ参照**＝将来 entry に余計なキーが混入しても出力されない（Codex Q11）。
function formatBody({ entry, date }) {
  const lines = [
    `date (JST):     ${date}`,
    `hour (JST):     ${entry.ts_hour ?? '(none)'}`,
    `error_code:     ${entry.code ?? '(none)'}`,
    `severity:       ${entry.severity ?? '(none)'}`,
    `app_version:    ${entry.app_version ?? '(none)'}`,
    `build:          ${entry.build ?? '(none)'}`,
    `os_version:     ${entry.os_version ?? '(none)'}`,
    `db_version:     ${entry.db_version ?? '(none)'}`,
    `missing_tables: ${entry.missing_tables || '(none)'}`,
    `missing_columns:${entry.missing_columns || '(none)'}`,
    '',
    'Dashboard: https://juno.tokyo/filmator/admin/stats/',
    '',
    'これは「その日に最初に観測された high-severity エラー」の通知。',
    '同日の追加分はメール送信されない（KV dedupe）。',
  ];
  return lines.join('\n');
}

export async function notifyHighSeverity({
  now,
  kv,
  date,
  errorCode,
  entry,
  mailer,
}) {
  const resolvedMailer = mailer === undefined ? resolveMailer() : mailer;
  const resolvedDate = date || jstDateKey(now);

  // Codex Q1: mailer 未設定なら slot 取らず即 return（env 設定後の同日に送信開始できる）。
  if (!resolvedMailer) {
    return { sent: false, reason: 'no_mailer' };
  }

  const slotKey = `filmator:notify:high:${resolvedDate}`;
  // SET NX EX → 1日1通の原子的予約。先に予約できた呼び出しだけが送信する。
  // Upstash @upstash/redis@1.34 は { nx: true, ex: seconds } を { set: 'OK' or null } で返す。
  const reserved = await kv.set(slotKey, '1', { nx: true, ex: DEDUPE_TTL_SECONDS });
  if (reserved !== 'OK' && reserved !== true && reserved !== 1) {
    return { sent: false, reason: 'deduped' };
  }

  try {
    await resolvedMailer({
      subject: formatSubject({ date: resolvedDate, errorCode }),
      body: formatBody({ entry, date: resolvedDate }),
    });
    return { sent: true };
  } catch (err) {
    // Codex Q2: 復旧するべき KV キー名を必ず print。
    console.error(
      `[filmator-notify] FAILED — recovery: redis DEL ${slotKey}`,
      String(err)
    );
    return { sent: false, reason: 'mailer_threw', error: String(err) };
  }
}

// テスト用に format 関数を export（PII 退行防止 assertion 用・Codex Q11）。
export const _testing = { formatSubject, formatBody };
