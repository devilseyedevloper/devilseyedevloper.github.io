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

function renderProjects(projects) {
  const list = $('#projectsList');
  if (!list) return;
  list.replaceChildren();
  if (!projects.length) {
    const empty = document.createElement('p');
    empty.className = 'admin-muted';
    empty.textContent = 'No custom projects published yet. Use the form above to add your first project!';
    list.appendChild(empty);
    return;
  }

  projects.forEach(project => {
    const card = document.createElement('div');
    card.className = 'project-card-admin';

    const top = document.createElement('div');
    top.className = 'project-card-admin-top';

    const info = document.createElement('div');
    const title = document.createElement('strong');
    title.style.fontSize = '1.05rem';
    title.textContent = project.title;

    const badges = document.createElement('div');
    badges.style.marginTop = '4px';

    const catBadge = document.createElement('span');
    catBadge.className = 'project-meta-pill';
    catBadge.textContent = project.categoryLabel || 'Project';

    const statusBadge = document.createElement('span');
    statusBadge.className = 'project-meta-pill';
    statusBadge.style.background = 'rgba(6, 182, 212, 0.18)';
    statusBadge.style.color = 'var(--accent-cyan)';
    statusBadge.textContent = project.status || 'Active';

    const dateSpan = document.createElement('span');
    dateSpan.className = 'admin-muted';
    dateSpan.style.fontSize = '0.8rem';
    if (project.created_at) {
      dateSpan.textContent = `Posted ${new Date(project.created_at).toLocaleDateString()}`;
    }

    badges.append(catBadge, statusBadge, dateSpan);
    info.append(title, badges);

    const actions = document.createElement('div');
    actions.className = 'admin-actions';

    const viewBtn = document.createElement('a');
    viewBtn.className = 'btn btn-secondary small';
    viewBtn.href = `projects.html#project-${project.id}`;
    viewBtn.target = '_blank';
    viewBtn.textContent = 'View on Site ↗';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-secondary small';
    deleteBtn.style.borderColor = 'rgba(236, 72, 153, 0.4)';
    deleteBtn.style.color = 'var(--accent-pink)';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', async () => {
      if (!window.confirm(`Are you sure you want to permanently delete "${project.title}" from your portfolio?`)) return;
      try {
        await request(`/api/admin/projects/${encodeURIComponent(project.id)}`, { method: 'DELETE' });
        loadDashboard();
      } catch (err) {
        alert(err.message);
      }
    });

    actions.append(viewBtn, deleteBtn);
    top.append(info, actions);

    const desc = document.createElement('p');
    desc.className = 'admin-muted';
    desc.style.fontSize = '0.9rem';
    desc.style.margin = '0';
    desc.textContent = (project.description || '').slice(0, 180) + ((project.description || '').length > 180 ? '...' : '');

    card.append(top, desc);

    if (Array.isArray(project.images) && project.images.length > 0) {
      const thumbs = document.createElement('div');
      thumbs.className = 'project-card-admin-thumbs';
      project.images.forEach(img => {
        const thumb = document.createElement('img');
        thumb.src = img;
        thumb.alt = project.title;
        thumb.title = 'Click to open in new tab';
        thumb.addEventListener('click', () => window.open(img, '_blank'));
        thumbs.appendChild(thumb);
      });
      card.appendChild(thumbs);
    }

    list.appendChild(card);
  });
}

let attachedImages = [];
let projectFormInitialized = false;

function initProjectForm() {
  if (projectFormInitialized) return;
  projectFormInitialized = true;

  const form = $('#projectPostForm');
  const dropzone = $('#dropzone');
  const fileInput = $('#projImages');
  const urlInput = $('#projImageUrlInput');
  const addUrlBtn = $('#addImageUrlBtn');
  const previewGrid = $('#imagePreviewGrid');
  const formStatus = $('#projectFormStatus');
  const submitBtn = $('#submitProjectBtn');

  if (!form) return;

  function renderPreviews() {
    previewGrid.replaceChildren();
    attachedImages.forEach((img, idx) => {
      const card = document.createElement('div');
      card.className = 'preview-card';

      const imageElem = document.createElement('img');
      imageElem.src = img.data || img.url;
      imageElem.alt = img.name || `Image ${idx + 1}`;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'preview-remove';
      removeBtn.innerHTML = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
      removeBtn.title = 'Remove image';
      removeBtn.addEventListener('click', () => {
        attachedImages.splice(idx, 1);
        renderPreviews();
      });

      card.append(imageElem, removeBtn);
      previewGrid.appendChild(card);
    });
  }

  function handleFiles(files) {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = e => {
        attachedImages.push({
          type: 'file',
          name: file.name,
          data: e.target.result
        });
        renderPreviews();
      };
      reader.readAsDataURL(file);
    });
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => {
      if (e.target.files) handleFiles(e.target.files);
      fileInput.value = '';
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, e => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, e => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', e => {
      if (e.dataTransfer && e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    });
  }

  if (addUrlBtn && urlInput) {
    addUrlBtn.addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (!url) return;
      attachedImages.push({
        type: 'url',
        name: url.split('/').pop() || 'Remote Image',
        data: url,
        url: url
      });
      urlInput.value = '';
      renderPreviews();
    });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    formStatus.textContent = '';
    formStatus.style.color = 'var(--accent-light)';

    const title = $('#projTitle').value.trim();
    const categoryLabel = $('#projCategoryLabel').value.trim();
    const filterCategory = $('#projFilterCategory').value;
    const status = $('#projStatus').value.trim();
    const description = $('#projDescription').value.trim();
    const features = $('#projFeatures').value.trim();
    const tech = $('#projTech').value.trim();
    const link = $('#projLink').value.trim();

    if (!title) {
      formStatus.style.color = 'var(--accent-pink)';
      formStatus.textContent = 'Please enter a project title.';
      return;
    }
    if (!description) {
      formStatus.style.color = 'var(--accent-pink)';
      formStatus.textContent = 'Please write a description for the project.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Publishing Project...';

    try {
      const payload = {
        title,
        categoryLabel,
        filterCategory,
        status,
        description,
        features,
        tech,
        link,
        images: attachedImages.map(img => img.data || img.url)
      };

      await request('/api/admin/projects', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      formStatus.style.color = 'var(--accent-emerald)';
      formStatus.textContent = '✓ Project published successfully!';
      form.reset();
      $('#projCategoryLabel').value = 'Full-Stack Web Application';
      $('#projStatus').value = '● Live Client System';
      attachedImages = [];
      renderPreviews();
      loadDashboard();

      setTimeout(() => {
        formStatus.textContent = '';
      }, 4000);
    } catch (err) {
      formStatus.style.color = 'var(--accent-pink)';
      formStatus.textContent = `Error: ${err.message}`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Publish Project to Showcase';
    }
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
    renderProjects(data.projects || []);
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
  initProjectForm();
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
    const username = $('#username').value.trim();
    const password = $('#password').value;
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || 'Login failed.');
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
