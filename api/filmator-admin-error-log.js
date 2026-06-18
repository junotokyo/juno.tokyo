import { kv } from './_lib/kv.js';
import { buildDayList, mergeErrorLogs } from './_lib/admin-aggregate.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const DAYS_DEFAULT = 3;
const DAYS_MIN = 1;
const DAYS_MAX = 7;

function setHeaders(res, headers) {
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
}

function clampDays(raw) {
  const n = parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n)) return DAYS_DEFAULT;
  return Math.min(DAYS_MAX, Math.max(DAYS_MIN, n));
}

function parseEntry(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  setHeaders(res, JSON_HEADERS);

  if (req.method !== 'GET') {
    res.status(405).send(JSON.stringify({ error: 'method_not_allowed' }));
    return;
  }

  const daysCount = clampDays(req.query?.days);
  const days = buildDayList(daysCount);

  try {
    const rawLists = await Promise.all(days.map((d) => kv.lrange(`filmator:error_log:${d}`, 0, -1)));
    const perDayLists = rawLists.map((list) => (list || []).map(parseEntry).filter(Boolean));
    const entries = mergeErrorLogs({ days, perDayLists });
    res.status(200).send(JSON.stringify({ entries }));
  } catch (err) {
    res.status(500).send(JSON.stringify({ error: String(err) }));
  }
}
