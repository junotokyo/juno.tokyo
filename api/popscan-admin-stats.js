import { kv } from './_lib/kv.js';
import { aggregateStats, buildDayList, buildDayListFromRange } from './_lib/admin-aggregate.js';
import { jstDateKey } from './_lib/date.js';
import {
  ALLOWED_EVENTS,
  ALLOWED_ERROR_CODES,
  ERROR_EVENTS,
} from './popscan-analytics.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const DAYS_DEFAULT = 14;
const DAYS_MIN = 1;
const DAYS_MAX = 30;
const RELEASE_DATE = '2026-05-22';
const RANGE_MAX_DAYS = 366;

function setHeaders(res, headers) {
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
}

function clampDays(raw) {
  const n = parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n)) return DAYS_DEFAULT;
  return Math.min(DAYS_MAX, Math.max(DAYS_MIN, n));
}

function resolveDays(query) {
  const from = typeof query?.from === 'string' ? query.from : null;
  const to = typeof query?.to === 'string' ? query.to : null;
  if (from && to) {
    const today = jstDateKey(new Date());
    const clampedFrom = from < RELEASE_DATE ? RELEASE_DATE : from;
    const clampedTo = to > today ? today : to;
    const range = buildDayListFromRange(clampedFrom, clampedTo, { maxDays: RANGE_MAX_DAYS });
    if (range) return range;
  }
  return buildDayList(clampDays(query?.days));
}

export default async function handler(req, res) {
  setHeaders(res, JSON_HEADERS);

  if (req.method !== 'GET') {
    res.status(405).send(JSON.stringify({ error: 'method_not_allowed' }));
    return;
  }

  const days = resolveDays(req.query);
  const events = [...ALLOWED_EVENTS];
  const codes = [...ALLOWED_ERROR_CODES];
  const errorEvents = [...ERROR_EVENTS];

  // PopScan キーは `popscan:` 接頭語付き（Filmator は `filmator:`）。
  const eventKeys = [];
  for (const evt of events) {
    for (const d of days) eventKeys.push(`popscan:stats:${d}:${evt}`);
  }
  const errorKeys = [];
  for (const code of codes) {
    for (const evt of errorEvents) {
      for (const d of days) errorKeys.push(`popscan:stats:${d}:${evt}:${code}`);
    }
  }
  const allKeys = [...eventKeys, ...errorKeys];

  try {
    const allValues = allKeys.length ? await kv.mget(...allKeys) : [];
    const kvLookup = new Map();
    for (let i = 0; i < allKeys.length; i++) kvLookup.set(allKeys[i], allValues[i]);

    // aggregateStats は `stats:` キー前提（PopScan/Filmator 共用純関数）なので、
    // popscan: プレフィックスを strip してから渡す。
    const stripped = new Map();
    for (const [k, v] of kvLookup) stripped.set(k.replace(/^popscan:/, ''), v);
    const result = aggregateStats({ days, events, codes, errorEvents, kvLookup: stripped });
    res.status(200).send(JSON.stringify(result));
  } catch (err) {
    res.status(500).send(JSON.stringify({ error: String(err) }));
  }
}
