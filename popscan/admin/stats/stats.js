// 認証は middleware.js の Basic 認証のみ。ブラウザが Authorization を自動 replay する。

const $ = (id) => document.getElementById(id);

const EVENT_COLORS = {
  launch: '#3b82f6',
  save_succeeded: '#10b981',
  save_failed: '#ef4444',
  paywall_shown: '#f59e0b',
  purchase_succeeded: '#8b5cf6',
  promo_redeemed: '#06b6d4',
  error_occurred: '#dc2626',
};

const KPI_ORDER = [
  'launch',
  'save_succeeded',
  'save_failed',
  'paywall_shown',
  'purchase_succeeded',
  'promo_redeemed',
  'error_occurred',
];

const ERROR_KPI_KEYS = new Set(['save_failed', 'error_occurred']);

// 色プールは error_code 種別の数だけ動的に必要
const CODE_COLOR_POOL = [
  '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d',
  '#16a34a', '#059669', '#0891b2', '#0284c7', '#2563eb',
  '#4f46e5', '#7c3aed', '#9333ea', '#c026d3', '#db2777',
  '#e11d48', '#78716c', '#525252', '#3f3f46', '#3b82f6',
];

let chartEvents = null;
let chartErrorTotal = null;
let chartErrorByCode = null;
let cachedLogEntries = [];

function showStatus(el, msg, kind) {
  el.textContent = msg;
  el.className = 'status ' + (kind || '');
  el.hidden = false;
}
function clearStatus(el) { el.hidden = true; el.textContent = ''; }

function selectedDays() {
  return parseInt(document.querySelector('input[name="days"]:checked').value, 10);
}
function selectedLogDays() {
  return parseInt(document.querySelector('input[name="logDays"]:checked').value, 10);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return await res.json();
}

function reversedForChart(data) {
  // API は新しい順で返してくる。グラフは古い順に描く方が直感的。
  const days = [...data.days].reverse();
  const events = {};
  for (const [k, v] of Object.entries(data.events)) {
    events[k] = { total: v.total, daily: [...v.daily].reverse() };
  }
  const errorsByCode = {};
  for (const [k, v] of Object.entries(data.errorsByCode)) {
    errorsByCode[k] = { total: v.total, daily: [...v.daily].reverse() };
  }
  return { days, events, errorsByCode };
}

function renderKpis(events) {
  const grid = $('kpiGrid');
  grid.textContent = '';
  for (const evt of KPI_ORDER) {
    const total = events[evt]?.total ?? 0;
    const card = document.createElement('div');
    card.className = 'kpi' + (ERROR_KPI_KEYS.has(evt) ? ' err' : '');
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = evt;
    const value = document.createElement('div');
    value.className = 'value';
    value.textContent = total.toLocaleString();
    card.append(label, value);
    grid.append(card);
  }
}

function renderEventsChart(days, events) {
  const datasets = KPI_ORDER.map((evt) => ({
    label: evt,
    data: events[evt]?.daily ?? days.map(() => 0),
    borderColor: EVENT_COLORS[evt] || '#888',
    backgroundColor: EVENT_COLORS[evt] || '#888',
    tension: 0.2,
    fill: false,
    pointRadius: 2,
    borderWidth: 2,
  }));
  if (chartEvents) chartEvents.destroy();
  chartEvents = new Chart($('chartEvents').getContext('2d'), {
    type: 'line',
    data: { labels: days, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

function renderErrorTotalChart(days, events) {
  const savedFailed = events.save_failed?.daily ?? days.map(() => 0);
  const errOcc = events.error_occurred?.daily ?? days.map(() => 0);
  const totals = days.map((_, i) => savedFailed[i] + errOcc[i]);
  if (chartErrorTotal) chartErrorTotal.destroy();
  chartErrorTotal = new Chart($('chartErrorTotal').getContext('2d'), {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: 'エラー合計',
        data: totals,
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220, 38, 38, 0.15)',
        tension: 0.2,
        fill: true,
        pointRadius: 2,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

function renderErrorByCodeChart(days, errorsByCode) {
  const codes = Object.keys(errorsByCode).sort((a, b) => errorsByCode[b].total - errorsByCode[a].total);
  const datasets = codes.map((code, i) => ({
    label: code,
    data: errorsByCode[code].daily,
    backgroundColor: CODE_COLOR_POOL[i % CODE_COLOR_POOL.length],
  }));
  if (chartErrorByCode) chartErrorByCode.destroy();
  if (codes.length === 0) {
    chartErrorByCode = new Chart($('chartErrorByCode').getContext('2d'), {
      type: 'bar',
      data: { labels: days, datasets: [{ label: '(エラーなし)', data: days.map(() => 0), backgroundColor: '#ccc' }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } },
    });
    return;
  }
  chartErrorByCode = new Chart($('chartErrorByCode').getContext('2d'), {
    type: 'bar',
    data: { labels: days, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom' } },
      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

async function refreshStats() {
  const btn = $('refreshBtn');
  btn.disabled = true;
  clearStatus($('statsStatus'));
  try {
    const days = selectedDays();
    const data = await fetchJson(`/popscan/admin-stats?days=${days}`);
    const view = reversedForChart(data);
    renderKpis(data.events);
    renderEventsChart(view.days, view.events);
    renderErrorTotalChart(view.days, view.events);
    renderErrorByCodeChart(view.days, view.errorsByCode);
    $('lastUpdated').textContent = `更新: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`;
  } catch (e) {
    showStatus($('statsStatus'), `取得失敗: ${e.message}`, 'error');
  } finally {
    btn.disabled = false;
  }
}

function renderLogTable() {
  const fEvent = $('filterEvent').value.trim().toLowerCase();
  const fCode = $('filterCode').value.trim().toLowerCase();
  const fVer = $('filterVersion').value.trim().toLowerCase();
  const filtered = cachedLogEntries.filter((e) => {
    if (fEvent && !String(e.event ?? '').toLowerCase().includes(fEvent)) return false;
    if (fCode && !String(e.code ?? '').toLowerCase().includes(fCode)) return false;
    if (fVer) {
      const av = String(e.app_version ?? '').toLowerCase();
      const ov = String(e.os_version ?? '').toLowerCase();
      if (!av.includes(fVer) && !ov.includes(fVer)) return false;
    }
    return true;
  });
  const tbody = $('logTable').querySelector('tbody');
  tbody.textContent = '';
  for (const e of filtered) {
    const tr = document.createElement('tr');
    const cells = [
      e.date || '',
      e.ts_hour ? e.ts_hour.replace('T', ' ') + ':00' : '',
      e.event || '',
      e.code || '',
      e.app_version || '',
      e.build || '',
      e.os_version || '',
    ];
    for (const c of cells) {
      const td = document.createElement('td');
      td.textContent = c;
      tr.append(td);
    }
    tbody.append(tr);
  }
  $('logCount').textContent = `${filtered.length} / ${cachedLogEntries.length} 件`;
}

async function refreshLog() {
  const btn = $('refreshLogBtn');
  btn.disabled = true;
  clearStatus($('logStatus'));
  try {
    const data = await fetchJson(`/popscan/admin-error-log?days=${selectedLogDays()}`);
    cachedLogEntries = Array.isArray(data.entries) ? data.entries : [];
    renderLogTable();
  } catch (e) {
    showStatus($('logStatus'), `取得失敗: ${e.message}`, 'error');
  } finally {
    btn.disabled = false;
  }
}

function init() {
  $('refreshBtn').addEventListener('click', refreshStats);
  $('refreshLogBtn').addEventListener('click', refreshLog);
  document.querySelectorAll('input[name="days"]').forEach((el) =>
    el.addEventListener('change', refreshStats)
  );
  document.querySelectorAll('input[name="logDays"]').forEach((el) =>
    el.addEventListener('change', refreshLog)
  );
  for (const id of ['filterEvent', 'filterCode', 'filterVersion']) {
    $(id).addEventListener('input', renderLogTable);
  }
  refreshStats();
  refreshLog();
}

init();
