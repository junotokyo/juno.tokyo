// 認証は middleware.js の Basic 認証のみ。ブラウザが Authorization を自動 replay する。

const $ = (id) => document.getElementById(id);

const EVENT_COLORS = {
  launch: '#3b82f6',
  catalog_opened: '#0d9488',
  edit_committed: '#06b6d4',
  export_succeeded: '#10b981',
  paywall_shown: '#f59e0b',
  purchase_succeeded: '#8b5cf6',
  promo_redeemed: '#ec4899',
  error_occurred: '#dc2626',
};

const EVENT_LABELS_JA = {
  launch: 'アプリ起動',
  catalog_opened: 'カタログ open',
  edit_committed: '編集枚数',
  export_succeeded: '書き出し成功',
  paywall_shown: '課金画面表示',
  purchase_succeeded: '購入成功',
  promo_redeemed: 'プロモ適用',
  error_occurred: 'エラー発生',
};

// 各 KPI のホバーツールチップ説明文（簡潔・現実的な粒度）。
const EVENT_TOOLTIPS = {
  launch: 'アプリを起動した回数。',
  catalog_opened: 'カタログを開いた回数（別カタログへの切替も含む）。',
  edit_committed: 'エディット画面で補正が確定した「カタログ×写真」の延べ件数。アプリ起動中、同じ写真の 2 回目以降はカウントしない。neutral 戻し（編集取消）もカウントしない。',
  export_succeeded: '書き出しバッチが 1 枚以上成功して完了した回数。バッチ内の枚数に関わらず 1 バッチ＝1 回として計上。',
  paywall_shown: '無料上限到達で Pro 案内シートが表示された回数。',
  purchase_succeeded: 'StoreKit で買い切り購入が成功した回数。',
  promo_redeemed: 'プロモコードが正常に適用された回数。',
  error_occurred: 'エラーが発生した回数（種別ごとの内訳は下の「エラー種別ごとの日次推移」グラフ）。',
};

const PHOTOS_KPI_TOOLTIP = '各書き出しバッチで実際に書き出されたファイルの総枚数（バッチごとの photos 合計）。「書き出し成功」が回数、こちらは枚数。';

const KPI_ORDER = [
  'launch',
  'catalog_opened',
  'edit_committed',
  'export_succeeded',
  'paywall_shown',
  'purchase_succeeded',
  'promo_redeemed',
  'error_occurred',
];

const ERROR_KPI_KEYS = new Set(['error_occurred']);
const ACCENT_KPI_KEYS = new Set(['export_succeeded', 'edit_committed']);

const SIZE_BUCKETS = ['1', '2-10', '11-50', '51-200', '201+'];
const BUCKET_COLORS = {
  '1': '#a7f3d0',
  '2-10': '#5eead4',
  '11-50': '#0d9488',
  '51-200': '#0e7490',
  '201+': '#1e3a8a',
};

function eventLabel(evt) {
  return EVENT_LABELS_JA[evt] || evt;
}

const CODE_COLOR_POOL = [
  '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d',
  '#16a34a', '#059669', '#0891b2', '#0284c7', '#2563eb',
  '#4f46e5', '#7c3aed', '#9333ea', '#c026d3', '#db2777',
  '#e11d48', '#78716c', '#525252', '#3f3f46', '#3b82f6',
  '#0d9488', '#f97316',
];

let chartEvents = null;
let chartPhotos = null;
let chartExportSize = null;
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

// Filmator はリリース日未確定（2026-06-20 時点）。stats 開始日として安全側の値。
const RELEASE_DATE = '2025-01-01';

function todayJstDate() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

function selectedRange() {
  const from = $('rangeFrom')?.value || '';
  const to = $('rangeTo')?.value || '';
  if (from && to && from <= to) return { from, to };
  return null;
}

function updateDaysControls() {
  const hasRange = !!selectedRange();
  document.querySelectorAll('input[name="days"]').forEach((el) => {
    el.disabled = hasRange;
    el.parentElement?.classList.toggle('disabled', hasRange);
  });
}

function buildStatsUrl() {
  const range = selectedRange();
  if (range) return `/filmator/admin-stats?from=${range.from}&to=${range.to}`;
  return `/filmator/admin-stats?days=${selectedDays()}`;
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
  for (const [k, v] of Object.entries(data.errorsByCode || {})) {
    errorsByCode[k] = { total: v.total, daily: [...v.daily].reverse() };
  }
  const exportPhotos = data.exportPhotos
    ? { total: data.exportPhotos.total, daily: [...data.exportPhotos.daily].reverse() }
    : { total: 0, daily: days.map(() => 0) };
  const exportSizeBuckets = {};
  for (const [k, v] of Object.entries(data.exportSizeBuckets || {})) {
    exportSizeBuckets[k] = { total: v.total, daily: [...v.daily].reverse() };
  }
  return { days, events, errorsByCode, exportPhotos, exportSizeBuckets };
}

function renderKpis(events, exportPhotos) {
  const grid = $('kpiGrid');
  grid.textContent = '';

  for (const evt of KPI_ORDER) {
    const total = events[evt]?.total ?? 0;
    const card = document.createElement('div');
    let cls = 'kpi';
    if (ERROR_KPI_KEYS.has(evt)) cls += ' err';
    else if (ACCENT_KPI_KEYS.has(evt)) cls += ' accent';
    card.className = cls;
    // ホバーで説明をブラウザのデフォルト tooltip 表示（簡潔な粒度の解説）。
    card.title = EVENT_TOOLTIPS[evt] || evt;
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = eventLabel(evt);
    const value = document.createElement('div');
    value.className = 'value';
    value.textContent = total.toLocaleString();
    card.append(label, value);
    grid.append(card);
  }

  // 書き出し枚数合計を独立 KPI として追加（export_succeeded は回数、こちらは枚数）
  const photosCard = document.createElement('div');
  photosCard.className = 'kpi accent';
  photosCard.title = PHOTOS_KPI_TOOLTIP;
  const photosLabel = document.createElement('div');
  photosLabel.className = 'label';
  photosLabel.textContent = '書き出し枚数 合計';
  const photosValue = document.createElement('div');
  photosValue.className = 'value';
  photosValue.textContent = (exportPhotos?.total ?? 0).toLocaleString();
  photosCard.append(photosLabel, photosValue);
  grid.append(photosCard);
}

function renderEventsChart(days, events) {
  const datasets = KPI_ORDER.map((evt) => ({
    label: eventLabel(evt),
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

function renderPhotosChart(days, exportPhotos) {
  if (chartPhotos) chartPhotos.destroy();
  chartPhotos = new Chart($('chartPhotos').getContext('2d'), {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{
        label: '書き出し枚数',
        data: exportPhotos.daily,
        backgroundColor: 'rgba(13, 148, 136, 0.6)',
        borderColor: '#0d9488',
        borderWidth: 1,
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

function renderExportSizeChart(days, exportSizeBuckets) {
  const datasets = SIZE_BUCKETS.map((bucket) => ({
    label: `${bucket} 枚`,
    data: exportSizeBuckets[bucket]?.daily ?? days.map(() => 0),
    backgroundColor: BUCKET_COLORS[bucket] || '#888',
  }));
  if (chartExportSize) chartExportSize.destroy();
  chartExportSize = new Chart($('chartExportSize').getContext('2d'), {
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

function renderErrorTotalChart(days, events) {
  const totals = events.error_occurred?.daily ?? days.map(() => 0);
  if (chartErrorTotal) chartErrorTotal.destroy();
  chartErrorTotal = new Chart($('chartErrorTotal').getContext('2d'), {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: 'エラー発生',
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
    const data = await fetchJson(buildStatsUrl());
    const view = reversedForChart(data);
    renderKpis(data.events, data.exportPhotos);
    renderEventsChart(view.days, view.events);
    renderPhotosChart(view.days, view.exportPhotos);
    renderExportSizeChart(view.days, view.exportSizeBuckets);
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
      e.event ? eventLabel(e.event) : '',
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
    const data = await fetchJson(`/filmator/admin-error-log?days=${selectedLogDays()}`);
    cachedLogEntries = Array.isArray(data.entries) ? data.entries : [];
    renderLogTable();
  } catch (e) {
    showStatus($('logStatus'), `取得失敗: ${e.message}`, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function refreshAll() {
  await Promise.all([refreshStats(), refreshLog()]);
}

function init() {
  $('refreshBtn').addEventListener('click', refreshAll);
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

  const today = todayJstDate();
  for (const id of ['rangeFrom', 'rangeTo']) {
    const el = $(id);
    if (!el) continue;
    el.min = RELEASE_DATE;
    el.max = today;
    el.addEventListener('change', () => {
      updateDaysControls();
      if (selectedRange()) refreshStats();
    });
  }
  $('clearRangeBtn')?.addEventListener('click', () => {
    $('rangeFrom').value = '';
    $('rangeTo').value = '';
    updateDaysControls();
    refreshStats();
  });
  updateDaysControls();

  refreshStats();
  refreshLog();
}

init();
