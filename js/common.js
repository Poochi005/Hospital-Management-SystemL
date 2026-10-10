// Shared helper functions used by all pages
// api() is defined in js/local-api.js (data is stored in the browser's localStorage)

function getUser() {
  try { return JSON.parse(sessionStorage.getItem('hmsUser')); } catch (e) { return null; }
}

function requireRole(role) {
  const u = getUser();
  if (!u || u.role !== role) { location.href = 'index.html'; return null; }
  const who = document.getElementById('who');
  if (who) who.textContent = u.fullName + ' (' + u.role + ')';
  return u;
}

function logout() {
  sessionStorage.removeItem('hmsUser');
  location.href = 'index.html';
}

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function money(n) { return '₹' + Number(n || 0).toFixed(2); }

function badge(s) { return '<span class="badge ' + esc(s) + '">' + esc(s) + '</span>'; }

let toastTimer;
function toast(msg, isErr) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show' + (isErr ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = ''; }, 3200);
}

// Runs an async action and shows an error toast if it fails
async function run(fn) {
  try { await fn(); } catch (e) { toast(e.message, true); }
}

function table(headers, rows) {
  if (!rows.length) return '<p class="empty">No records found.</p>';
  return '<div class="table-wrap"><table><thead><tr>' +
    headers.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' +
    rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') +
    '</tbody></table></div>';
}

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}
