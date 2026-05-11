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
