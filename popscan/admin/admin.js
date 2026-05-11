const TOKEN_KEY = 'popscan_admin_token';

const $ = (id) => document.getElementById(id);

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || '';
}
function setToken(t) {
  sessionStorage.setItem(TOKEN_KEY, t);
}
function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

function showStatus(el, message, kind) {
  el.textContent = message;
  el.className = 'status ' + (kind || '');
  el.hidden = false;
}
function clearStatus(el) {
  el.hidden = true;
  el.textContent = '';
}

async function api(path, { method = 'GET', body, contentType } = {}) {
  const headers = { 'x-admin-token': getToken() };
  const opts = { method, headers };
  if (body !== undefined) {
    if (typeof body === 'string') {
      headers['content-type'] = contentType || 'text/plain';
      opts.body = body;
    } else {
      headers['content-type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(path, opts);
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}

async function fetchPromoFlag() {
  const res = await fetch('/popscan/time', { headers: { 'x-popscan-purpose': 'quota_check' } });
  const data = await res.json();
  return Boolean(data.p);
}

async function login() {
  const token = $('token').value.trim();
  if (!token) {
    showStatus($('loginStatus'), 'token を入力してください', 'error');
    return;
  }
  setToken(token);
  const res = await api('/popscan/manage-promos');
  if (res.status === 401) {
    clearToken();
    showStatus($('loginStatus'), '認証失敗', 'error');
    return;
  }
  if (!res.ok) {
    showStatus($('loginStatus'), `エラー (${res.status})`, 'error');
    return;
  }
  $('login').hidden = true;
  $('app').hidden = false;
  await refreshAll();
}

function logout() {
  clearToken();
  $('login').hidden = false;
  $('app').hidden = true;
  $('token').value = '';
  clearStatus($('loginStatus'));
}

async function refreshPromoState() {
  try {
    const flag = await fetchPromoFlag();
    $('promoState').textContent = flag ? 'ON' : 'OFF';
    $('promoState').dataset.value = String(flag);
    $('promoDesc').textContent = flag
      ? '無料プランユーザーがアプリを起動すると、自動で無制限プランに昇格します'
      : '通常モード（無料プランユーザーは無料プランのままです）';
  } catch (e) {
    showStatus($('promoStatus'), 'Promo flag 取得失敗: ' + e.message, 'error');
  }
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

async function togglePromo() {
  const current = $('promoState').dataset.value === 'true';
  const next = !current;
  const value = next ? 'true' : 'false';
  $('promoToggle').disabled = true;
  clearStatus($('promoStatus'));
  const res = await api('/popscan/set-promo', { method: 'POST', body: value, contentType: 'text/plain' });
  $('promoToggle').disabled = false;
  if (!res.ok) {
    showStatus($('promoStatus'), `切替失敗 (${res.status})`, 'error');
    return;
  }
  await refreshPromoState();
  showStatus($('promoStatus'), `Promo flag を ${value.toUpperCase()} に変更`, 'ok');
}

async function refreshCodes() {
  const res = await api('/popscan/manage-promos');
  if (!res.ok) {
    showStatus($('codeStatus'), `一覧取得失敗 (${res.status})`, 'error');
    return;
  }
  const tbody = $('codeTable').querySelector('tbody');
  tbody.textContent = '';
  const codes = Array.isArray(res.data) ? res.data : [];
  codes.sort((a, b) => String(a.code).localeCompare(String(b.code)));
  const today = todayUTC();
  for (const c of codes) {
    const isExpired = typeof c.expires === 'string' && c.expires < today;
    const tr = document.createElement('tr');
    tr.className = 'code-row' + (isExpired ? ' expired' : '');
    tr.title = 'クリックで下のフォームへ読み込み';
    tr.addEventListener('click', () => loadIntoForm(c));
    const tdCode = document.createElement('td');
    tdCode.textContent = c.code;
    const tdExpires = document.createElement('td');
    tdExpires.textContent = c.expires || '';
    if (isExpired) {
      const badge = document.createElement('span');
      badge.className = 'badge-expired';
      badge.textContent = '期限切れ';
      tdExpires.append(badge);
    }
    const tdCount = document.createElement('td');
    tdCount.textContent = String(c.count ?? '');
    const tdActions = document.createElement('td');
    tdActions.className = 'row-actions';
    const del = document.createElement('button');
    del.textContent = '削除';
    del.addEventListener('click', (e) => { e.stopPropagation(); deleteCode(c.code); });
    tdActions.append(del);
    tr.append(tdCode, tdExpires, tdCount, tdActions);
    tbody.append(tr);
  }
  $('codeEmpty').hidden = codes.length > 0;
  $('codeTable').hidden = codes.length === 0;
}

function loadIntoForm(c) {
  $('newCode').value = c.code || '';
  $('newExpires').value = c.expires || '';
  $('newCount').value = String(c.count ?? '');
  clearStatus($('codeStatus'));
  $('formMode').textContent = `編集中: ${c.code}（同じコードで「登録」を押すと上書きされます）`;
  $('formMode').hidden = false;
  $('newExpires').focus();
}

function clearForm() {
  $('newCode').value = '';
  $('newExpires').value = '';
  $('newCount').value = '1';
  $('formMode').hidden = true;
  clearStatus($('codeStatus'));
}

async function addCode() {
  const code = $('newCode').value.trim().toUpperCase();
  const expires = $('newExpires').value.trim();
  const count = parseInt($('newCount').value, 10);
  clearStatus($('codeStatus'));
  if (!/^[A-Z0-9]{1,8}$/.test(code)) {
    showStatus($('codeStatus'), 'Code は 1-8 文字の英数字', 'error');
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expires)) {
    showStatus($('codeStatus'), 'Expires は yyyy-mm-dd 形式で入力', 'error');
    return;
  }
  if (isNaN(count) || count < 0) {
    showStatus($('codeStatus'), 'Count は 0 以上の整数', 'error');
    return;
  }
  $('addBtn').disabled = true;
  const res = await api('/popscan/manage-promos', { method: 'POST', body: { code, expires, count } });
  $('addBtn').disabled = false;
  if (!res.ok) {
    showStatus($('codeStatus'), `登録失敗 (${res.status}) ${res.data?.error || ''}`, 'error');
    return;
  }
  clearForm();
  showStatus($('codeStatus'), `${code} を登録`, 'ok');
  await refreshCodes();
}

async function deleteCode(code) {
  if (!confirm(`${code} を削除しますか？`)) return;
  const res = await api('/popscan/manage-promos', { method: 'DELETE', body: { code } });
  if (!res.ok) {
    showStatus($('codeStatus'), `削除失敗 (${res.status})`, 'error');
    return;
  }
  showStatus($('codeStatus'), `${code} を削除`, 'ok');
  await refreshCodes();
}

async function refreshAll() {
  await Promise.all([refreshPromoState(), refreshCodes()]);
}

function init() {
  $('loginBtn').addEventListener('click', login);
  $('logoutBtn').addEventListener('click', logout);
  $('promoToggle').addEventListener('click', togglePromo);
  $('addBtn').addEventListener('click', addCode);
  $('clearBtn').addEventListener('click', clearForm);
  $('token').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });

  if (getToken()) {
    api('/popscan/manage-promos').then((res) => {
      if (res.ok) {
        $('login').hidden = true;
        $('app').hidden = false;
        refreshAll();
      } else {
        clearToken();
      }
    });
  }
}

init();
