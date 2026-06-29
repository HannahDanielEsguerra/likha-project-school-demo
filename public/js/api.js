// Shared frontend helpers for Project LIKHA (auth state, API calls, formatting).

async function api(path, { method = 'GET', body } = {}) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`/api/${path}`, opts);
  let data = {};
  try { data = await res.json(); } catch (_) { /* no body */ }
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

const apiGet = (p) => api(p);
const apiPost = (p, body) => api(p, { method: 'POST', body });
const apiPut = (p, body) => api(p, { method: 'PUT', body });
const apiDel = (p) => api(p, { method: 'DELETE' });

let currentUserCache;
async function getMe(force = false) {
  if (currentUserCache !== undefined && !force) return currentUserCache;
  try {
    const { user } = await apiGet('me');
    currentUserCache = user;
  } catch (_) {
    currentUserCache = null;
  }
  return currentUserCache;
}

function isStaff(user) {
  return !!user && (user.role === 'admin' || user.role === 'editor');
}

async function logout() {
  try { await apiPost('logout'); } catch (_) {}
  window.location.href = '/';
}

// Fills any element with id="authNav" based on login state.
async function renderAuthNav() {
  const slot = document.getElementById('authNav');
  if (!slot) return;
  const user = await getMe();
  if (!user) {
    slot.innerHTML = '<a href="/login.html" class="nav-cta">Sign in</a>';
    return;
  }
  const adminLink = isStaff(user)
    ? '<a href="/admin.html">Admin</a>'
    : '';
  slot.innerHTML = `
    <span class="nav-user">Hi, ${escapeHtml(user.fullname.split(' ')[0])}</span>
    ${adminLink}
    <a href="#" class="nav-cta" id="logoutLink">Sign out</a>`;
  const link = document.getElementById('logoutLink');
  if (link) link.addEventListener('click', (e) => { e.preventDefault(); logout(); });
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// Auto-render the nav slot on every page that includes it.
document.addEventListener('DOMContentLoaded', renderAuthNav);
