// 管理 UI 統計の集計ロジック（純関数）。
// KV / Redis 依存を持たないため、Node の単体テストから直接 import できる。

import { jstDateKey } from './date.js';

export function buildDayList(n, now = new Date()) {
  const days = [];
  for (let i = 0; i < n; i++) {
    days.push(jstDateKey(new Date(now.getTime() - i * 86400000)));
  }
  return days;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// YYYY-MM-DD 形式の from / to を受け取り JST 日付配列を返す（両端 inclusive、新しい日付が先頭）。
// 妥当性検査に失敗 / from > to / 期間 > maxDays のときは null を返す。
export function buildDayListFromRange(from, to, { maxDays = 365 } = {}) {
  if (typeof from !== 'string' || typeof to !== 'string') return null;
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) return null;
  if (from > to) return null;

  // JST 正午で固定（DST 影響なし・jstDateKey でその日付に確定する）。
  const fromTs = Date.parse(`${from}T12:00:00+09:00`);
  const toTs = Date.parse(`${to}T12:00:00+09:00`);
  if (!Number.isFinite(fromTs) || !Number.isFinite(toTs)) return null;

  const days = [];
  for (let ts = toTs; ts >= fromTs; ts -= 86400000) {
    days.push(jstDateKey(new Date(ts)));
    if (days.length > maxDays) return null;
  }
  return days;
}

function toInt(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : 0;
}

export function aggregateStats({ days, events, codes, errorEvents, kvLookup }) {
  const eventsOut = {};
  for (const evt of events) {
    const daily = days.map((d) => toInt(kvLookup.get(`stats:${d}:${evt}`)));
    const total = daily.reduce((a, b) => a + b, 0);
    eventsOut[evt] = { total, daily };
  }

  const errorsByCode = {};
  for (const code of codes) {
    const daily = days.map((d) => {
      let sum = 0;
      for (const evt of errorEvents) {
        sum += toInt(kvLookup.get(`stats:${d}:${evt}:${code}`));
      }
      return sum;
    });
    const total = daily.reduce((a, b) => a + b, 0);
    if (total > 0) {
      errorsByCode[code] = { total, daily };
    }
  }

  return { days, events: eventsOut, errorsByCode };
}

export function mergeErrorLogs({ days, perDayLists }) {
  const out = [];
  for (let i = 0; i < days.length; i++) {
    const list = perDayLists[i] || [];
    for (const e of list) {
      if (e && typeof e === 'object') {
        out.push({ date: days[i], ...e });
      }
    }
  }
  return out;
}

// JT-279: severity 別の日次・合計集計。kvLookup は `stats:` プレフィックス基準
// （filmator-admin-stats.js が `filmator:` を strip して渡す）。
export function aggregateSeverity({ days, severities, kvLookup }) {
  const out = {};
  for (const sev of severities) {
    const daily = days.map((d) => toInt(kvLookup.get(`stats:${d}:severity:${sev}`)));
    const total = daily.reduce((a, b) => a + b, 0);
    out[sev] = { total, daily };
  }
  return out;
}

// JT-279: 診断 SADD set の集計。
// dbVersionLists / missingTablesLists / missingColumnsLists は per-day SMEMBERS の生 array。
// Set 形式＝per-day は「観測日数」になる（Codex Q5・UI 側で「観測日数」と明示）。
export function aggregateDiagSets({ days, dbVersionLists, missingTablesLists, missingColumnsLists }) {
  // db_versions: per-day unique int 集合 → flatten + min/max + unique 件数。
  const allVersions = new Set();
  const dailyVersions = (dbVersionLists || []).map((list) => {
    const arr = (list || []).map((s) => parseInt(String(s), 10)).filter(Number.isFinite);
    for (const n of arr) allVersions.add(n);
    return arr.sort((a, b) => a - b);
  });
  const sortedVersions = [...allVersions].sort((a, b) => a - b);

  // tables/columns: 全期間で「観測日数」カウント → top 20。
  const countTop = (perDayLists, limit = 20) => {
    const counts = new Map();
    for (const list of (perDayLists || [])) {
      for (const name of (list || [])) {
        counts.set(name, (counts.get(name) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1))
      .slice(0, limit);
  };

  return {
    dbVersionsObserved: {
      daily: dailyVersions,
      allMin: sortedVersions[0] ?? null,
      allMax: sortedVersions[sortedVersions.length - 1] ?? null,
      uniqueCount: sortedVersions.length,
    },
    missingTablesTop: countTop(missingTablesLists),
    missingColumnsTop: countTop(missingColumnsLists),
  };
}
