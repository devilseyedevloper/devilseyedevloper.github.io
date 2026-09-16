require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;
const sessions = new Map();
const dataDir = path.join(__dirname, 'data');
const stateFile = path.join(dataDir, 'admin-state.json');

app.use(express.json({ limit: '100kb' }));

app.use((req, res, next) => {
  if (req.path.startsWith('/admin') || req.path.startsWith('/api/admin')) return next();
  if (isBlockedVisitor(req)) return res.status(403).send('Access denied.');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

function readAdminState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch (_) {
    return { blockedVisitors: [], blockedUsers: [], hiddenScreenshots: [] };
  }
}

function writeAdminState(state) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

function isBlockedVisitor(req) {
  const state = readAdminState();
  const forwardedIp = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return state.blockedVisitors.some(item => item.identifier === req.ip || item.identifier === forwardedIp);
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.cookies?.admin_session;
  if (!token || !sessions.has(token)) return res.status(401).json({ error: 'Admin authentication required.' });
  req.admin = sessions.get(token);
  next();
}

function supabaseBaseUrl() {
  return String(process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
}

function supabaseRequest(table, method = 'GET', body, query = '') {
  const baseUrl = supabaseBaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) return Promise.resolve(null);
  return fetch(`${baseUrl}/rest/v1/${table}?select=*${query}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: method === 'DELETE' ? 'return=minimal' : 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  }).then(async response => {
    if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`);
    return method === 'DELETE' ? true : response.json();
  });
}

function supabaseAuthRequest(pathname, method = 'GET') {
  const baseUrl = supabaseBaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) return Promise.resolve(null);
  return fetch(`${baseUrl}/auth/v1${pathname}`, {
    method,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  }).then(async response => {
    if (!response.ok) throw new Error(`Supabase auth request failed: ${response.status}`);
    return response.status === 204 ? true : response.json();
  });
}

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'Admin credentials are not configured on the server.' });
  }
  if (!safeEqual(username, process.env.ADMIN_USERNAME) || !safeEqual(password, process.env.ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'Invalid admin username or password.' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { username, createdAt: Date.now() });
  res.json({ token });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (token) sessions.delete(token);
  res.status(204).end();
});

app.get('/api/admin/overview', requireAdmin, async (req, res) => {
  try {
    const [reviews, messages, users, profiles, orders] = await Promise.all([
      supabaseRequest('reviews'),
      supabaseRequest('messages'),
      supabaseAuthRequest('/admin/users?per_page=1000'),
      supabaseRequest('profiles').catch(() => []),
      supabaseRequest('orders').catch(() => [])
    ]);
    const profileMap = new Map((profiles || []).map(profile => [profile.id, profile]));
    const blockedUsers = readAdminState().blockedUsers || [];
    res.json({
      reviews: reviews || [],
      messages: messages || [],
      orders: orders || [],
      users: (users?.users || []).map(user => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        username: profileMap.get(user.id)?.username || '',
        blocked: blockedUsers.some(item => item.id === user.id)
      })),
      state: readAdminState(),
      supabaseConfigured: Boolean(reviews || messages || users)
    });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.patch('/api/admin/orders/:id', requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  if (!['pending', 'cleared', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Order status must be pending, cleared, or completed.' });
  }
  try {
    if (!await supabaseRequest('orders', 'PATCH', { status }, `&id=eq.${encodeURIComponent(req.params.id)}`)) {
      return res.status(503).json({ error: 'Supabase is not configured.' });
    }
    res.status(204).end();
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    if (!await supabaseAuthRequest(`/admin/users/${encodeURIComponent(req.params.id)}`, 'DELETE')) {
      return res.status(503).json({ error: 'Supabase service credentials are not configured.' });
    }
    res.status(204).end();
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.post('/api/admin/blocked-users', requireAdmin, (req, res) => {
  const { id, reason = '' } = req.body || {};
  if (!id || String(id).length > 100) return res.status(400).json({ error: 'A valid user id is required.' });
  const state = readAdminState();
  state.blockedUsers = [...new Map([
    ...(state.blockedUsers || []).map(item => [item.id, item]),
    [id, { id, reason: String(reason).slice(0, 500), createdAt: new Date().toISOString() }]
  ]).values()];
  writeAdminState(state);
  res.status(201).json(state.blockedUsers.at(-1));
});

app.delete('/api/admin/blocked-users/:id', requireAdmin, (req, res) => {
  const state = readAdminState();
  state.blockedUsers = (state.blockedUsers || []).filter(item => item.id !== req.params.id);
  writeAdminState(state);
  res.status(204).end();
});

app.delete('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
  try {
    if (!await supabaseRequest('reviews', 'DELETE', undefined, `&id=eq.${encodeURIComponent(req.params.id)}`)) {
      return res.status(503).json({ error: 'Supabase is not configured.' });
    }
    res.status(204).end();
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.delete('/api/admin/messages/:id', requireAdmin, async (req, res) => {
  try {
    if (!await supabaseRequest('messages', 'DELETE', undefined, `&id=eq.${encodeURIComponent(req.params.id)}`)) {
      return res.status(503).json({ error: 'Supabase is not configured.' });
    }
    res.status(204).end();
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.post('/api/admin/blocked-visitors', requireAdmin, (req, res) => {
  const { identifier, reason = '' } = req.body || {};
  if (!identifier || String(identifier).length > 200) return res.status(400).json({ error: 'A valid visitor identifier is required.' });
  const state = readAdminState();
  state.blockedVisitors = [...new Map([
    ...state.blockedVisitors.map(item => [item.identifier, item]),
    [identifier, { identifier, reason: String(reason).slice(0, 500), createdAt: new Date().toISOString() }]
  ]).values()];
  writeAdminState(state);
  res.status(201).json(state.blockedVisitors.at(-1));
});

app.delete('/api/admin/blocked-visitors/:identifier', requireAdmin, (req, res) => {
  const state = readAdminState();
  state.blockedVisitors = state.blockedVisitors.filter(item => item.identifier !== req.params.identifier);
  writeAdminState(state);
  res.status(204).end();
});

app.post('/api/admin/hidden-screenshots', requireAdmin, (req, res) => {
  const { src } = req.body || {};
  if (!src || !String(src).startsWith('images/')) return res.status(400).json({ error: 'Only public image paths can be hidden.' });
  const state = readAdminState();
  state.hiddenScreenshots = [...new Set([...state.hiddenScreenshots, src])];
  writeAdminState(state);
  res.status(201).json(state);
});

app.delete('/api/admin/hidden-screenshots', requireAdmin, (req, res) => {
  const state = readAdminState();
  state.hiddenScreenshots = state.hiddenScreenshots.filter(src => src !== req.body?.src);
  writeAdminState(state);
  res.status(204).end();
});

app.get('/api/site-state', (req, res) => {
  res.json(readAdminState());
});

app.get('/api/account-status/:id', (req, res) => {
  const blocked = (readAdminState().blockedUsers || []).some(item => item.id === req.params.id);
  res.json({ blocked });
});

// Optional endpoint to securely provide public config from environment variables
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: supabaseBaseUrl(),
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
  });
});

// Multi-Page Clean URL Routes
const cleanPages = {
  about: 'about.html',
  skills: 'skills.html',
  projects: 'projects.html',
  features: 'features.html',
  services: 'features.html',
  pricing: 'pricing.html',
  reviews: 'reviews.html',
  feedback: 'reviews.html',
  contact: 'contact.html',
  auth: 'auth.html',
  account: 'account.html',
  admin: 'admin.html'
};

Object.entries(cleanPages).forEach(([route, file]) => {
  app.get(`/${route}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', file));
  });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
