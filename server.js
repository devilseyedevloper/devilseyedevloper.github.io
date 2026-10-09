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
const projectsFile = path.join(dataDir, 'projects.json');
const uploadsDir = path.join(__dirname, 'public', 'images', 'uploads');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

function readProjects() {
  try {
    return JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
  } catch (_) {
    return [];
  }
}

function writeProjects(projects) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 2));
}

function ensureUploadsDir() {
  fs.mkdirSync(uploadsDir, { recursive: true });
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
  const rawUser = String(req.body?.username || '').trim();
  const rawPass = String(req.body?.password || '');

  const envUser = (process.env.ADMIN_USERNAME || '').trim();
  const envEmail = (process.env.ADMIN_EMAIL || '').trim();
  const envPass = process.env.ADMIN_PASSWORD || '';

  if (!envUser || !envPass) {
    return res.status(503).json({ error: 'Admin credentials are not configured on the server.' });
  }

  const isUserMatch = rawUser.toLowerCase() === envUser.toLowerCase();
  const isEmailMatch = Boolean(envEmail && rawUser.toLowerCase() === envEmail.toLowerCase());
  const isUsernameMatch = isUserMatch || isEmailMatch;

  if (!isUsernameMatch) {
    return res.status(404).json({ error: 'Admin username not recognized.', isAdminMatch: false });
  }

  if (!safeEqual(rawPass, envPass)) {
    return res.status(401).json({ error: 'Incorrect admin password.', isAdminMatch: true });
  }

  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { username: envUser, createdAt: Date.now() });
  res.json({ token });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (token) sessions.delete(token);
  res.status(204).end();
});

app.get('/api/admin/overview', requireAdmin, async (req, res) => {
  try {
    const [reviews, messages, users, profiles, orders, dbProjects] = await Promise.all([
      supabaseRequest('reviews'),
      supabaseRequest('messages'),
      supabaseAuthRequest('/admin/users?per_page=1000'),
      supabaseRequest('profiles').catch(() => []),
      supabaseRequest('orders').catch(() => []),
      supabaseRequest('projects', 'GET', undefined, '&order=created_at.desc').catch(() => null)
    ]);
    const profileMap = new Map((profiles || []).map(profile => [profile.id, profile]));
    const blockedUsers = readAdminState().blockedUsers || [];
    const localProjects = readProjects();
    const projects = (dbProjects && Array.isArray(dbProjects) && dbProjects.length > 0) ? dbProjects : localProjects;
    res.json({
      reviews: reviews || [],
      messages: messages || [],
      orders: orders || [],
      projects: projects || [],
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

// Public endpoint to retrieve all projects for projects.html
app.get('/api/projects', async (req, res) => {
  try {
    let projects = null;
    try {
      projects = await supabaseRequest('projects', 'GET', undefined, '&order=created_at.desc');
    } catch (_) {}
    if (!projects || !Array.isArray(projects) || projects.length === 0) {
      projects = readProjects();
    }
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin endpoint to post a new project with image uploads and write-up
app.post('/api/admin/projects', requireAdmin, async (req, res) => {
  try {
    const {
      title,
      categoryLabel,
      filterCategory,
      status,
      description,
      features,
      tech,
      link,
      images
    } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Project title is required.' });
    }
    if (!description || !String(description).trim()) {
      return res.status(400).json({ error: 'Project description is required.' });
    }

    ensureUploadsDir();

    const projectId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const processedImages = [];

    if (Array.isArray(images)) {
      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        if (typeof item === 'string') {
          if (item.startsWith('data:image/')) {
            const matches = item.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
            if (matches) {
              const rawExt = matches[1].toLowerCase().replace('svg+xml', 'svg').replace('jpeg', 'jpg');
              const ext = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(rawExt) ? rawExt : 'png';
              const filename = `proj-${projectId}-${i + 1}-${Date.now()}.${ext}`;
              const filePath = path.join(uploadsDir, filename);
              fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
              processedImages.push(`images/uploads/${filename}`);
              continue;
            }
          }
          processedImages.push(item);
        } else if (item && typeof item === 'object' && item.data) {
          const matches = String(item.data).match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
          if (matches) {
            const rawExt = matches[1].toLowerCase().replace('svg+xml', 'svg').replace('jpeg', 'jpg');
            const ext = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(rawExt) ? rawExt : 'png';
            const filename = `proj-${projectId}-${i + 1}-${Date.now()}.${ext}`;
            const filePath = path.join(uploadsDir, filename);
            fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
            processedImages.push(`images/uploads/${filename}`);
            continue;
          }
          if (item.url) processedImages.push(item.url);
        }
      }
    }

    const featureList = Array.isArray(features)
      ? features.map(f => String(f).trim()).filter(Boolean)
      : String(features || '')
          .split(/[\r\n]+/)
          .map(f => f.replace(/^[-•*✓]\s*/, '').trim())
          .filter(Boolean);

    const techList = Array.isArray(tech)
      ? tech.map(t => String(t).trim()).filter(Boolean)
      : String(tech || '')
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);

    const newProject = {
      id: projectId,
      title: String(title).trim(),
      categoryLabel: String(categoryLabel || 'Featured Project').trim(),
      filterCategory: String(filterCategory || 'webapp fullstack').trim(),
      status: String(status || '● Live Project').trim(),
      description: String(description).trim(),
      features: featureList,
      tech: techList,
      link: String(link || '').trim(),
      images: processedImages,
      created_at: new Date().toISOString()
    };

    const projects = readProjects();
    projects.unshift(newProject);
    writeProjects(projects);

    try {
      await supabaseRequest('projects', 'POST', {
        id: newProject.id,
        title: newProject.title,
        category_label: newProject.categoryLabel,
        filter_category: newProject.filterCategory,
        status: newProject.status,
        description: newProject.description,
        features: newProject.features,
        tech: newProject.tech,
        link: newProject.link,
        images: newProject.images,
        created_at: newProject.created_at
      });
    } catch (_) {}

    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin endpoint to delete a project
app.delete('/api/admin/projects/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const projects = readProjects();
    const target = projects.find(p => p.id === id);
    const updated = projects.filter(p => p.id !== id);
    writeProjects(updated);

    if (target && Array.isArray(target.images)) {
      target.images.forEach(img => {
        if (typeof img === 'string' && img.startsWith('images/uploads/')) {
          const filePath = path.join(__dirname, 'public', img);
          try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          } catch (_) {}
        }
      });
    }

    try {
      await supabaseRequest('projects', 'DELETE', undefined, `&id=eq.${encodeURIComponent(id)}`);
    } catch (_) {}

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/site-state', (req, res) => {
  res.json(readAdminState());
});

app.get('/api/account-status/:id', (req, res) => {
  const blocked = (readAdminState().blockedUsers || []).some(item => item.id === req.params.id);
  res.json({ blocked });
});

app.post('/api/auth/profile', async (req, res) => {
  try {
    const { userId, username, email } = req.body || {};
    if (!userId || !username || !email) {
      return res.status(400).json({ error: 'userId, username and email are required.' });
    }
    // Create/update profile using service role to bypass RLS
    const baseUrl = supabaseBaseUrl();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!baseUrl || !serviceKey) {
      return res.status(503).json({ error: 'Supabase service credentials not configured.' });
    }
    const response = await fetch(`${baseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ id: userId, username, email })
    });
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: 'Failed to create profile', details: text });
    }
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
