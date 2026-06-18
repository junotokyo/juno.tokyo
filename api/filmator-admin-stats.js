import { kv } from './_lib/kv.js';
import { aggregateStats, buildDayList } from './_lib/admin-aggregate.js';
import { SIZE_BUCKETS } from './_lib/photos-bucket.js';
import {
  ALLOWED_EVENTS,
  ALLOWED_ERROR_CODES,
  ERROR_EVENTS,
} from './_lib/filmator-event-codes.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const DAYS_DEFAULT = 14;
const DAYS_MIN = 1;
const DAYS_MAX = 30;

function setHeaders(res, headers) {
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
}

function clampDays(raw) {
  const n = parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n)) return DAYS_DEFAULT;
  return Math.min(DAYS_MAX, Math.max(DAYS_MIN, n));
}

function toInt(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : 0;
}

export default async function handler(req, res) {
  setHeaders(res, JSON_HEADERS);

  if (req.method !== 'GET') {
    res.status(405).send(JSON.stringify({ error: 'method_not_allowed' }));
    return;
  }

  const daysCount = clampDays(req.query?.days);
  const days = buildDayList(daysCount);
  const events = [...ALLOWED_EVENTS];
  const codes = [...ALLOWED_ERROR_CODES];
  const errorEvents = [...ERROR_EVENTS];

  // Filmator は popscan-config DB 共用＝`filmator:` プレフィックス。
  const eventKeys = [];
  for (const evt of events) {
    for (const d of days) eventKeys.push(`filmator:stats:${d}:${evt}`);
  }
  const errorKeys = [];
  for (const code of codes) {
    for (const evt of errorEvents) {
      for (const d of days) errorKeys.push(`filmator:stats:${d}:${evt}:${code}`);
    }
  }
  const photosKeys = days.map((d) => `filmator:stats:${d}:export_succeeded:photos`);
  const bucketKeys = [];
  for (const bucket of SIZE_BUCKETS) {
    for (const d of days) bucketKeys.push(`filmator:stats:${d}:export_size:${bucket}`);
  }
  const allKeys = [...eventKeys, ...errorKeys, ...photosKeys, ...bucketKeys];

  try {
    const allValues = allKeys.length ? await kv.mget(...allKeys) : [];
    const kvLookup = new Map();
    for (let i = 0; i < allKeys.length; i++) kvLookup.set(allKeys[i], allValues[i]);

    // aggregateStats は kvLookup のキーをそのまま (`filmator:stats:...`) 渡すので
    // 内側で参照する `stats:${d}:${evt}` をキーマッパ経由で解決させる。
    // → 既存 _lib/admin-aggregate.js は `stats:` プレフィックスを暗黙に組み立てるため、
    //   ここでは kvLookup を `stats:...` キー基準で再構築してから渡す。
    const stripped = new Map();
    for (const [k, v] of kvLookup) stripped.set(k.replace(/^filmator:/, ''), v);
    const result = aggregateStats({ days, events, codes, errorEvents, kvLookup: stripped });

    // export_succeeded の枚数合計と size bucket 分布を追加
    const photosDaily = days.map((d) => toInt(kvLookup.get(`filmator:stats:${d}:export_succeeded:photos`)));
    const photosTotal = photosDaily.reduce((a, b) => a + b, 0);
    result.exportPhotos = { total: photosTotal, daily: photosDaily };

    const exportSizeBuckets = {};
    for (const bucket of SIZE_BUCKETS) {
      const daily = days.map((d) => toInt(kvLookup.get(`filmator:stats:${d}:export_size:${bucket}`)));
      const total = daily.reduce((a, b) => a + b, 0);
      exportSizeBuckets[bucket] = { total, daily };
    }
    result.exportSizeBuckets = exportSizeBuckets;

    res.status(200).send(JSON.stringify(result));
  } catch (err) {
    res.status(500).send(JSON.stringify({ error: String(err) }));
  }
}
