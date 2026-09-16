const AUTH_META_KEY = 'swc_auth_meta';
const AUTH_SESSION_KEY = 'swc_auth_session';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function authClient() {
  if (typeof window.supabase === 'undefined' || !window.SUPABASE_CONFIG) return null;
  const { url, anonKey } = window.SUPABASE_CONFIG;
  if (!url || !anonKey || url.includes('YOUR_') || anonKey.includes('YOUR_')) return null;
  window._authClient ||= window.supabase.createClient(url, anonKey);
  return window._authClient;
}

function readAuthMeta() {
  try { return JSON.parse(localStorage.getItem(AUTH_META_KEY) || 'null'); } catch (_) { return null; }
}

function saveAuthMeta(meta) {
  localStorage.setItem(AUTH_META_KEY, JSON.stringify(meta));
}

async function enforceSessionPolicy(client) {
  const { data: { session } } = await client.auth.getSession();
  if (!session) return null;
  const meta = readAuthMeta();
  const currentSession = sessionStorage.getItem(AUTH_SESSION_KEY) === 'active';
  if (!meta || (!meta.remember && !currentSession) || (meta.remember && Date.now() - meta.lastActive > THREE_DAYS_MS)) {
    await client.auth.signOut();
    localStorage.removeItem(AUTH_META_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
  meta.lastActive = Date.now();
  saveAuthMeta(meta);
  return session;
}

async function initAuthNavigation() {
  if (window.SUPABASE_CONFIG_READY) await window.SUPABASE_CONFIG_READY;
  const client = authClient();
  const links = document.querySelectorAll('.nav-auth-link');
  if (!client || !links.length) return;
  const session = await enforceSessionPolicy(client);
  links.forEach(link => {
    link.textContent = session ? 'Your account' : 'Log in / Sign up';
    link.href = session ? 'account.html' : 'auth.html';
    link.classList.toggle('nav-account-link', Boolean(session));
  });
}

function validatePassword(password) {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]{8,}$/.test(password);
}

async function findEmailByUsername(client, username) {
  const { data, error } = await client.from('profiles').select('email').eq('username', username).maybeSingle();
  if (error) throw new Error(error.code === 'PGRST205'
    ? 'The profiles table is missing. Run supabase-schema.sql in the Supabase SQL Editor.'
    : error.message);
  return data?.email || null;
}

async function saveProfile(client, userId, username, email) {
  const { error } = await client.from('profiles').upsert({ id: userId, username, email }, { onConflict: 'id' });
  if (error) throw new Error(error.code === 'PGRST205'
    ? 'Signup setup is incomplete. Run supabase-schema.sql in the Supabase SQL Editor, then try again.'
    : error.message);
}

async function handleAuthPage() {
  const form = document.querySelector('#authForm');
  if (!form) return;
  const status = document.querySelector('#authStatus');
  const submit = document.querySelector('#authSubmit');
  const btnText = submit?.querySelector('.btn-text');
  const modeButtons = document.querySelectorAll('[data-auth-mode]');
  const identifierInput = document.querySelector('#authIdentifier');
  const emailInput = document.querySelector('#authEmail');
  const usernameInput = document.querySelector('#authUsername');
  const signupFields = document.querySelector('#authSignupFields');
  const loginField = document.querySelector('#authLoginField');
  const passwordInput = document.querySelector('#authPassword');
  const togglePasswordBtn = document.querySelector('#togglePasswordBtn');
  const eyeIcon = document.querySelector('#eyeIcon');
  const eyeOffIcon = document.querySelector('#eyeOffIcon');
  const passwordRequirements = document.querySelector('#passwordRequirements');
  const reqLength = document.querySelector('#reqLength');
  const reqAlphanumeric = document.querySelector('#reqAlphanumeric');
  const authTitle = document.querySelector('#authTitle');
  const authSubtitle = document.querySelector('#authSubtitle');
  const authPasswordHint = document.querySelector('#authPasswordHint');
  const rememberMe = document.querySelector('#rememberMe');
  let mode = 'login';

  if (window.SUPABASE_CONFIG_READY) await window.SUPABASE_CONFIG_READY;
  const client = authClient();

  const setSubmitText = text => {
    if (btnText) {
      btnText.textContent = text;
    } else if (submit) {
      submit.textContent = text;
    }
  };

  const showStatus = (message, type = 'error') => {
    if (!status) return;
    if (!message) {
      status.textContent = '';
      status.className = 'auth-status';
      return;
    }
    status.className = `auth-status show ${type}`;
    status.textContent = message;
  };

  const updatePasswordRequirements = password => {
    if (!reqLength || !reqAlphanumeric) return;
    const isLengthOk = password.length >= 8;
    const isAlphaNumOk = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]+$/.test(password);

    reqLength.classList.toggle('valid', isLengthOk);
    const badgeLength = reqLength.querySelector('.req-badge');
    if (badgeLength) badgeLength.textContent = isLengthOk ? '✓' : '✕';

    reqAlphanumeric.classList.toggle('valid', isAlphaNumOk);
    const badgeAlphaNum = reqAlphanumeric.querySelector('.req-badge');
    if (badgeAlphaNum) badgeAlphaNum.textContent = isAlphaNumOk ? '✓' : '✕';
  };

  if (togglePasswordBtn && passwordInput && eyeIcon && eyeOffIcon) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      eyeIcon.style.display = isPassword ? 'none' : 'block';
      eyeOffIcon.style.display = isPassword ? 'block' : 'none';
      togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      togglePasswordBtn.setAttribute('title', isPassword ? 'Hide password' : 'Show password');
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      if (mode === 'signup') {
        updatePasswordRequirements(passwordInput.value);
      }
    });
  }

  const setMode = nextMode => {
    mode = nextMode;
    const isSignup = mode === 'signup';

    modeButtons.forEach(item => {
      const active = item.dataset.authMode === nextMode;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    if (authTitle) authTitle.textContent = isSignup ? 'Create your account' : 'Welcome back';
    if (authSubtitle) {
      authSubtitle.textContent = isSignup
        ? 'Sign up to manage your project milestones and communicate directly.'
        : 'Log in to keep your project conversations and account access together.';
    }

    setSubmitText(isSignup ? 'Sign up' : 'Log in');
    if (authPasswordHint) {
      authPasswordHint.textContent = isSignup
        ? 'Must be at least 8 characters with letters and numbers only.'
        : 'Use your username or email plus your password.';
    }

    if (passwordRequirements) {
      passwordRequirements.style.display = isSignup ? 'flex' : 'none';
    }

    if (passwordInput) {
      passwordInput.autocomplete = isSignup ? 'new-password' : 'current-password';
      if (isSignup) {
        updatePasswordRequirements(passwordInput.value);
      }
    }

    if (signupFields) signupFields.style.display = isSignup ? 'flex' : 'none';
    if (loginField) loginField.style.display = isSignup ? 'none' : 'flex';

    if (identifierInput) {
      identifierInput.required = !isSignup;
      identifierInput.disabled = isSignup;
      if (isSignup) identifierInput.value = '';
    }
    if (emailInput) emailInput.required = isSignup;
    if (usernameInput) usernameInput.required = isSignup;

    showStatus('');

    if (isSignup) {
      usernameInput?.focus();
    } else {
      identifierInput?.focus();
    }
  };

  modeButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.authMode)));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    showStatus('');
    submit.disabled = true;
    submit.classList.add('loading');
    setSubmitText(mode === 'signup' ? 'Creating account...' : 'Authenticating...');

    try {
      const password = passwordInput ? passwordInput.value : '';
      if (!validatePassword(password)) {
        throw new Error('Password must be 8+ characters long and contain only letters and numbers.');
      }

      if (mode === 'signup') {
        if (!client) throw new Error('Account access is not configured yet.');
        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        if (!username || username.length < 3) throw new Error('Username must be at least 3 characters long.');
        if (!/^[a-zA-Z0-9_.-]+$/.test(username)) throw new Error('Username can only contain letters, numbers, dots, underscores, and hyphens.');
        const result = await client.auth.signUp({ email, password });
        if (result.error) throw result.error;
        if (result.data?.user) {
          await saveProfile(client, result.data.user.id, username, email);
        }
        showStatus('Account created successfully! Check your email to confirm it, then log in.', 'success');
        setMode('login');
        form.reset();
        return;
      }

      const identifier = identifierInput.value.trim();
      if (!identifier) throw new Error('Enter your username or email.');

      const adminLoginResponse = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier, password })
      });
      if (adminLoginResponse.ok) {
        const adminData = await adminLoginResponse.json();
        localStorage.setItem('swc_admin_token', adminData.token);
        window.location.href = 'admin.html';
        return;
      }

      if (!client) throw new Error('Admin credentials were not accepted, and public account access is not configured.');

      let email = identifier;
      if (!identifier.includes('@')) {
        email = await findEmailByUsername(client, identifier);
        if (!email) throw new Error('No account found for that username.');
      }
      const result = await client.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      const accountStatus = await fetch(`/api/account-status/${encodeURIComponent(result.data.user.id)}`).then(response => response.json());
      if (accountStatus.blocked) {
        await client.auth.signOut();
        throw new Error('This account has been blocked by the administrator.');
      }
      saveAuthMeta({ remember: Boolean(rememberMe?.checked), lastActive: Date.now() });
      sessionStorage.setItem(AUTH_SESSION_KEY, 'active');
      window.location.href = 'index.html';
    } catch (error) {
      const message = error.message || 'Unable to complete account access.';
      const formatted = /signups? not allowed|disable signups/i.test(message)
        ? 'New account registration is currently disabled. Enable Allow new users to sign up in Supabase Authentication settings, then try again.'
        : message;
      showStatus(formatted, 'error');
    } finally {
      submit.disabled = false;
      submit.classList.remove('loading');
      setSubmitText(mode === 'signup' ? 'Sign up' : 'Log in');
    }
  });

  const urlParams = new URLSearchParams(window.location.search);
  const requestedMode = urlParams.get('mode');
  setMode(requestedMode === 'signup' ? 'signup' : 'login');
}

window.requireAuthenticatedUser = async function requireAuthenticatedUser() {
  if (window.SUPABASE_CONFIG_READY) await window.SUPABASE_CONFIG_READY;
  const client = authClient();
  if (!client) return null;
  return enforceSessionPolicy(client);
};

document.addEventListener('DOMContentLoaded', async () => {
  await initAuthNavigation();
  await handleAuthPage();
});
