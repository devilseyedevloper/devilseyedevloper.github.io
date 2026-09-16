const tokenKey = 'swc_admin_token';
const token = () => localStorage.getItem(tokenKey);
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });
const $ = selector => document.querySelector(selector);

function setStatus(message, target = '#dashboardStatus') {
  $(target).textContent = message || '';
}

function row(text, detail, actionText, action) {
  const item = document.createElement('div');
  item.className = 'admin-row';
  const copy = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = text;
  const description = document.createElement('p');
  description.textContent = detail || '';
  copy.append(title, description);
  item.appendChild(copy);
  if (actionText) {
    const button = document.createElement('button');
    button.className = 'btn btn-secondary small';
    button.textContent = actionText;
    button.addEventListener('click', action);
    item.appendChild(button);
  }
  return item;
}

function renderList(selector, items, emptyText, getText, getDetail, remove) {
  const list = $(selector);
  list.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'admin-muted';
    empty.textContent = emptyText;
    list.appendChild(empty);
    return;
  }
  items.forEach(item => list.appendChild(row(getText(item), getDetail(item), 'Remove', () => remove(item))));
}

function renderUsers(users) {
  const list = $('#usersList');
  list.replaceChildren();
  if (!users.length) {
    const empty = document.createElement('p');
    empty.className = 'admin-muted';
    empty.textContent = 'No registered users or Supabase is not configured.';
    list.appendChild(empty);
    return;
  }
  users.forEach(user => {
    const item = document.createElement('div');
    item.className = 'admin-row';
    const copy = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = user.username || user.email || user.id;
    const detail = document.createElement('p');
    detail.textContent = `${user.email || 'No email'}${user.blocked ? ' — blocked' : ''}`;
    copy.append(title, detail);
    const actions = document.createElement('div');
    actions.className = 'admin-actions';
    const block = document.createElement('button');
    block.className = 'btn btn-secondary small';
    block.textContent = user.blocked ? 'Unblock' : 'Block';
    block.addEventListener('click', async () => {
      const endpoint = `/api/admin/blocked-users/${encodeURIComponent(user.id)}`;
      await request(user.blocked ? endpoint : '/api/admin/blocked-users', {
        method: user.blocked ? 'DELETE' : 'POST',
        body: user.blocked ? undefined : JSON.stringify({ id: user.id, reason: 'Blocked by administrator' })
      });
      loadDashboard();
    });
    const remove = document.createElement('button');
    remove.className = 'btn btn-secondary small';
    remove.textContent = 'Delete';
    remove.addEventListener('click', async () => {
      if (!window.confirm(`Permanently delete ${user.email || 'this user'}?`)) return;
      await request(`/api/admin/users/${encodeURIComponent(user.id)}`, { method: 'DELETE' });
      loadDashboard();
    });
    actions.append(block, remove);
    item.append(copy, actions);
    list.appendChild(item);
  });
}

function renderOrders(orders) {
  const list = $('#ordersList');
  const filter = $('#orderStatusFilter').value;
  const visible = filter === 'all' ? orders : orders.filter(order => order.status === filter);
  list.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'admin-muted';
    empty.textContent = 'No orders in this category.';
    list.appendChild(empty);
    return;
  }
  visible.forEach(order => {
    const item = document.createElement('div');
    item.className = 'admin-row';
    const copy = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = order.title;
    const detail = document.createElement('p');
    detail.textContent = `${order.customer_name} — ${order.mobile} — ${order.description}`;
    copy.append(title, detail);
    const controls = document.createElement('select');
    ['pending', 'cleared', 'completed'].forEach(status => {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = status[0].toUpperCase() + status.slice(1);
      option.selected = order.status === status;
      controls.appendChild(option);
    });
    controls.addEventListener('change', async () => {
      await request(`/api/admin/orders/${encodeURIComponent(order.id)}`, { method: 'PATCH', body: JSON.stringify({ status: controls.value }) });
      loadDashboard();
    });
    item.append(copy, controls);
    list.appendChild(item);
  });
}

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.error || 'Request failed.');
  return data;
}

async function loadDashboard() {
  try {
    const data = await request('/api/admin/overview');
    renderUsers(data.users || []);
    renderOrders(data.orders || []);
    renderList('#reviewsList', data.reviews, 'No stored reviews.', item => item.name, item => `${item.rating}/5 — ${item.review}`, item => request(`/api/admin/reviews/${encodeURIComponent(item.id)}`, { method: 'DELETE' }).then(loadDashboard));
    renderList('#messagesList', data.messages, 'No stored messages.', item => item.subject || item.name, item => `${item.email} — ${item.message}`, item => request(`/api/admin/messages/${encodeURIComponent(item.id)}`, { method: 'DELETE' }).then(loadDashboard));
    renderList('#blockedList', data.state.blockedVisitors || [], 'No blocked visitors.', item => item.identifier, item => item.reason || 'No reason provided', item => request(`/api/admin/blocked-visitors/${encodeURIComponent(item.identifier)}`, { method: 'DELETE' }).then(loadDashboard));
    renderList('#screenshotsList', (data.state.hiddenScreenshots || []).map(src => ({ src })), 'No hidden screenshots.', item => item.src, () => 'Hidden from the public site', item => request('/api/admin/hidden-screenshots', { method: 'DELETE', body: JSON.stringify({ src: item.src }) }).then(loadDashboard));
    setStatus(data.supabaseConfigured ? '' : 'Supabase is not configured: reviews and messages are unavailable to the admin until server credentials are added.');
  } catch (error) {
    if (error.message.includes('authentication')) logout();
    else setStatus(error.message);
  }
}

function showDashboard() {
  $('#loginPanel').hidden = true;
  $('#dashboard').hidden = false;
  loadDashboard();
}

function logout() {
  localStorage.removeItem(tokenKey);
  $('#dashboard').hidden = true;
  $('#loginPanel').hidden = false;
}

$('#loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  $('#loginStatus').textContent = '';
  try {
    const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: $('#username').value, password: $('#password').value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed.');
    localStorage.setItem(tokenKey, data.token);
    showDashboard();
  } catch (error) {
    $('#loginStatus').textContent = error.message;
  }
});

$('#logoutButton').addEventListener('click', async () => {
  try { await request('/api/admin/logout', { method: 'POST' }); } catch (_) {}
  logout();
});

$('#blockForm').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    await request('/api/admin/blocked-visitors', { method: 'POST', body: JSON.stringify({ identifier: $('#blockIdentifier').value.trim(), reason: $('#blockReason').value.trim() }) });
    event.target.reset();
    loadDashboard();
  } catch (error) { setStatus(error.message); }
});

$('#screenshotForm').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    await request('/api/admin/hidden-screenshots', { method: 'POST', body: JSON.stringify({ src: $('#screenshotPath').value.trim() }) });
    event.target.reset();
    loadDashboard();
  } catch (error) { setStatus(error.message); }
});

$('#orderStatusFilter').addEventListener('change', () => loadDashboard());

if (token()) showDashboard();
