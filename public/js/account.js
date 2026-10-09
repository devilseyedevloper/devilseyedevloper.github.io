const AUTH_META_KEY = 'swc_auth_meta';
const AUTH_SESSION_KEY = 'swc_auth_session';

function accountClient() {
  if (typeof window.supabase === 'undefined' || !window.SUPABASE_CONFIG) return null;
  const { url, anonKey } = window.SUPABASE_CONFIG;
  if (!url || !anonKey || url.includes('YOUR_') || anonKey.includes('YOUR_')) return null;
  window._authClient ||= window.supabase.createClient(url, anonKey);
  return window._authClient;
}

function validPassword(password) {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]{8,}$/.test(password);
}

function setStatus(message, type = 'error') {
  const statusEl = document.querySelector('#accountStatus');
  if (!statusEl) return;
  if (!message) {
    statusEl.textContent = '';
    statusEl.className = 'auth-status';
    return;
  }
  statusEl.className = `auth-status show ${type}`;
  statusEl.textContent = message;
}

async function initAccount() {
  if (window.SUPABASE_CONFIG_READY) await window.SUPABASE_CONFIG_READY;
  const client = accountClient();
  if (!client) {
    setStatus('Account access is not configured yet.');
    return;
  }
  const { data: { session } } = await client.auth.getSession();
  if (!session) {
    window.location.href = 'auth.html';
    return;
  }

  // Set user info
  let profile = await client.from('profiles').select('username,email').eq('id', session.user.id).maybeSingle();
  const email = session.user.email;
  // Auto-create profile if missing
  if (!profile.data) {
    const defaultUsername = email.split('@')[0];
    const { error: profileError } = await client.from('profiles').upsert({ id: session.user.id, username: defaultUsername, email }, { onConflict: 'id' });
    if (!profileError) {
      profile = { data: { username: defaultUsername, email } };
    }
  }
  const username = profile.data?.username || email.split('@')[0];

  const emailEl = document.querySelector('#accountEmail');
  if (emailEl) emailEl.textContent = email;

  const welcomeEl = document.querySelector('#accountWelcomeHeading');
  if (welcomeEl) welcomeEl.textContent = `Welcome back, ${username}`;

  const usernameInput = document.querySelector('#accountUsername');
  if (usernameInput) usernameInput.value = profile.data?.username || '';

  const avatarEl = document.querySelector('#userAvatar');
  if (avatarEl) avatarEl.textContent = (username[0] || 'C').toUpperCase();

  // Tab Switching Logic
  const tabs = document.querySelectorAll('.account-tab-btn');
  const panels = {
    'orders': document.querySelector('#tabOrders'),
    'new-order': document.querySelector('#tabNewOrder'),
    'settings': document.querySelector('#tabSettings')
  };

  const switchTab = tabId => {
    tabs.forEach(btn => {
      const active = btn.dataset.tab === tabId;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    Object.entries(panels).forEach(([id, panel]) => {
      if (panel) {
        panel.style.display = id === tabId ? 'block' : 'none';
        panel.classList.toggle('active', id === tabId);
      }
    });
    setStatus('');
  };

  tabs.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  document.querySelector('#openNewOrderTabBtn')?.addEventListener('click', () => switchTab('new-order'));
  document.querySelector('#emptyStateOrderBtn')?.addEventListener('click', () => switchTab('new-order'));

  // Load and render orders
  async function loadOrders() {
    const ordersList = document.querySelector('#ordersList');
    if (!ordersList) return;

    const ordersResult = await client.from('orders')
      .select('id,title,status,total,description,created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (ordersResult.error) {
      if (ordersResult.error.code === 'PGRST205') {
        ordersList.innerHTML = '<div class="empty-orders-state"><p>Orders database is not configured yet. Run supabase-schema.sql to enable.</p></div>';
      } else {
        ordersList.innerHTML = `<div class="empty-orders-state"><p>${ordersResult.error.message}</p></div>`;
      }
      return;
    }

    if (!ordersResult.data?.length) {
      ordersList.innerHTML = `
        <div class="empty-orders-state">
          <span class="empty-icon">📂</span>
          <h3>No active projects yet</h3>
          <p>Ready to start a new web application or website? Submit your project details below to begin.</p>
          <button type="button" class="btn btn-secondary small" id="emptyStateOrderBtnInner">Create First Project Request</button>
        </div>
      `;
      document.querySelector('#emptyStateOrderBtnInner')?.addEventListener('click', () => switchTab('new-order'));
      return;
    }

    ordersList.replaceChildren(...ordersResult.data.map(order => {
      const card = document.createElement('article');
      card.className = 'order-card';

      const statusMap = {
        'pending': { label: 'Pending Review', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
        'cleared': { label: 'Scope Approved', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' },
        'in_progress': { label: 'In Development', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
        'completed': { label: 'Delivered & Handed Over', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' }
      };
      const st = statusMap[order.status] || { label: order.status, color: '#94a3b8', bg: 'rgba(255, 255, 255, 0.05)' };
      const dateStr = order.created_at ? new Date(order.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';

      card.innerHTML = `
        <div class="order-card-header">
          <div>
            <span class="order-status-badge" style="color: ${st.color}; background: ${st.bg}; border: 1px solid ${st.color}40;">● ${st.label}</span>
            <h3 class="order-title">${order.title || 'Untitled Project'}</h3>
            <span class="order-date">Initiated on ${dateStr}</span>
          </div>
          <div class="order-quote">
            <span class="order-quote-label">Estimated Budget</span>
            <span class="order-quote-val">${order.total > 0 ? `₹${Number(order.total).toLocaleString('en-IN')}` : 'Quote Pending'}</span>
          </div>
        </div>
        ${order.description ? `<p class="order-description">${order.description.replace(/\n/g, '<br>')}</p>` : ''}
      `;
      return card;
    }));
  }

  await loadOrders();

  // Handle New Project Brief Submission
  const newOrderForm = document.querySelector('#clientNewOrderForm');
  if (newOrderForm) {
    newOrderForm.addEventListener('submit', async event => {
      event.preventDefault();
      setStatus('');
      const submitBtn = document.querySelector('#submitOrderBtn');
      const title = document.querySelector('#orderTitle')?.value.trim();
      const type = document.querySelector('#orderType')?.value;
      const budget = document.querySelector('#orderBudget')?.value.trim();
      const timeline = document.querySelector('#orderTimeline')?.value.trim();
      const brief = document.querySelector('#orderBrief')?.value.trim();

      if (!title || !brief) {
        setStatus('Please enter both a project title and brief requirements.', 'error');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting Project Brief...';
      }

      try {
        const totalVal = parseFloat((budget || '').replace(/[^0-9.]/g, '')) || 0;
        const { error } = await client.from('orders').insert({
          user_id: session.user.id,
          title: title,
          customer_name: username,
          mobile: timeline || 'Standard',
          description: `Deliverable Type: ${type}\nTarget Timeline: ${timeline || 'Flexible'}\nBudget Indication: ${budget || 'Not specified'}\n\nScope & Deliverables:\n${brief}`,
          status: 'pending',
          total: totalVal
        });

        if (error) throw error;

        newOrderForm.reset();
        setStatus('Project brief submitted successfully! I will review your requirements and begin planning.', 'success');
        await loadOrders();
        setTimeout(() => switchTab('orders'), 1200);
      } catch (err) {
        setStatus(err.message || 'Unable to submit project brief.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Project Brief →';
        }
      }
    });
  }

  // Profile Form (Username)
  document.querySelector('#profileForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const updatedUsername = document.querySelector('#accountUsername').value.trim();
    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(updatedUsername)) {
      setStatus('Username must be 3-30 characters using letters, numbers, dots, underscores, or hyphens.', 'error');
      return;
    }
    const { error } = await client.from('profiles').update({ username: updatedUsername }).eq('id', session.user.id);
    if (error) {
      setStatus(error.message, 'error');
    } else {
      setStatus('Username updated successfully.', 'success');
      if (welcomeEl) welcomeEl.textContent = `Welcome back, ${updatedUsername}`;
      if (avatarEl) avatarEl.textContent = updatedUsername[0].toUpperCase();
    }
  });

  // Email Form
  document.querySelector('#emailForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const newEmail = document.querySelector('#accountNewEmail').value.trim();
    const { error } = await client.auth.updateUser({ email: newEmail });
    setStatus(error ? error.message : 'Check your new email address to confirm the change.', error ? 'error' : 'success');
  });

  // Password Form
  document.querySelector('#passwordForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const oldPassword = document.querySelector('#accountOldPassword').value;
    const newPassword = document.querySelector('#accountNewPassword').value;
    if (!oldPassword) {
      setStatus('Enter your current password first.', 'error');
      return;
    }
    if (!validPassword(newPassword)) {
      setStatus('Password must be 8+ characters and contain only letters and numbers.', 'error');
      return;
    }
    if (oldPassword === newPassword) {
      setStatus('Your new password must be different from your current password.', 'error');
      return;
    }
    const verification = await client.auth.signInWithPassword({ email: session.user.email, password: oldPassword });
    if (verification.error) {
      setStatus('Current password is incorrect. Password was not changed.', 'error');
      return;
    }
    const { error } = await client.auth.updateUser({ password: newPassword });
    setStatus(error ? error.message : 'Password updated successfully.', error ? 'error' : 'success');
    if (!error) event.target.reset();
  });

  // Logout
  document.querySelector('#logoutButton')?.addEventListener('click', async () => {
    await client.auth.signOut();
    localStorage.removeItem(AUTH_META_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    window.location.href = 'auth.html';
  });
}

document.addEventListener('DOMContentLoaded', initAccount);
