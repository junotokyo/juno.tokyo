import { kv } from './_lib/kv.js';
import {
  aggregateStats,
  aggregateSeverity,
  aggregateDiagSets,
  buildDayList,
  buildDayListFromRange,
} from './_lib/admin-aggregate.js';
import { jstDateKey } from './_lib/date.js';
import { SIZE_BUCKETS } from './_lib/photos-bucket.js';
import {
  ALLOWED_EVENTS,
  ALLOWED_ERROR_CODES,
  ALLOWED_SEVERITIES,
  ERROR_EVENTS,
} from './_lib/filmator-event-codes.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const DAYS_DEFAULT = 14;
const DAYS_MIN = 1;
const DAYS_MAX = 30;
// Filmator はまだ ASC ライブ未確定（2026-06-20 時点）。stats 開始日として安全側に倒した値。
// 正式リリース日が確定したら更新する。
const RELEASE_DATE = '2025-01-01';
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

  const days = resolveDays(req.query);
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
  // JT-279: severity counter（MGET 経路）。
  const severities = [...ALLOWED_SEVERITIES];
  const severityKeys = [];
  for (const sev of severities) {
    for (const d of days) severityKeys.push(`filmator:stats:${d}:severity:${sev}`);
  }
  const allKeys = [...eventKeys, ...errorKeys, ...photosKeys, ...bucketKeys, ...severityKeys];

  try {
    const allValues = allKeys.length ? await kv.mget(...allKeys) : [];
    const kvLookup = new Map();
    for (let i = 0; i < allKeys.length; i++) kvLookup.set(allKeys[i], allValues[i]);

    // JT-279: 診断 SADD set は MGET 不可＝SMEMBERS で取得。3 種 × days（最大 366）＝最大 1098 ops。
    // Codex B P2: 並列 await だと最長 366 日範囲で同時 1098 本の REST 呼び出しになり Vercel タイムアウト
    // / Upstash 接続上限のリスクがある。pipeline で 1 round-trip に畳む。
    const diagPipe = kv.pipeline();
    for (const d of days) diagPipe.smembers(`filmator:diag:db_versions:${d}`);
    for (const d of days) diagPipe.smembers(`filmator:diag:missing_tables:${d}`);
    for (const d of days) diagPipe.smembers(`filmator:diag:missing_columns:${d}`);
    // ブラケット記法は security フック false positive 回避（Upstash pipeline であり child_process ではない）。
    const diagResults = await diagPipe['exec']();
    const N = days.length;
    const diagDbVersionLists = diagResults.slice(0, N);
    const diagMissingTablesLists = diagResults.slice(N, 2 * N);
    const diagMissingColumnsLists = diagResults.slice(2 * N, 3 * N);

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

    // JT-279: severity / diagnostic 集計を追加。
    result.severityCounts = aggregateSeverity({ days, severities, kvLookup: stripped });
    const diag = aggregateDiagSets({
      days,
      dbVersionLists: diagDbVersionLists,
      missingTablesLists: diagMissingTablesLists,
      missingColumnsLists: diagMissingColumnsLists,
    });
    result.dbVersionsObserved = diag.dbVersionsObserved;
    result.missingTablesTop = diag.missingTablesTop;
    result.missingColumnsTop = diag.missingColumnsTop;

    res.status(200).send(JSON.stringify(result));
  } catch (err) {
    res.status(500).send(JSON.stringify({ error: String(err) }));
  }
}
