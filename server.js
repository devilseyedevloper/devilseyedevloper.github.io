const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const CONTACTS_FILE = path.join(__dirname, 'contacts.txt');
const CONTACTS_DB = path.join(__dirname, 'contacts.json');
const RATINGS_FILE = path.join(__dirname, 'ratings.txt');
const RATINGS_DB = path.join(__dirname, 'ratings.json');

function ensureFile(filePath, defaultValue) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, typeof defaultValue === 'string' ? defaultValue : JSON.stringify(defaultValue, null, 2));
  }
}

ensureFile(CONTACTS_FILE, '');
ensureFile(RATINGS_FILE, '');
ensureFile(CONTACTS_DB, []);
ensureFile(RATINGS_DB, []);

function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]'); }
  catch (err) { return []; }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

app.post('/contact', (req, res) => {
  const { name, phone, email, message } = req.body;
  if (!name || !phone || !message) {
    return res.status(400).json({ ok: false, error: 'Missing fields' });
  }

  const ts = new Date().toISOString();
  const entry = `---\nTime: ${ts}\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nMessage: ${message}\n`;
  fs.appendFile(CONTACTS_FILE, entry, (err) => {
    if (err) return res.status(500).json({ ok: false, error: 'Write failed' });

    const contacts = readJson(CONTACTS_DB);
    const contact = { id: Date.now(), name, phone, email, message, time: ts };
    contacts.unshift(contact);
    writeJson(CONTACTS_DB, contacts);
    res.json({ ok: true });
  });
});

app.post('/rating', (req, res) => {
  const { rating } = req.body;
  const n = Number(rating);
  if (!n || n < 1 || n > 5) {
    return res.status(400).json({ ok: false, error: 'Invalid rating' });
  }

  const ts = new Date().toISOString();
  const logEntry = `User has given me ${n} star rating at ${ts}\n`;
  fs.appendFile(RATINGS_FILE, logEntry, (err) => {
    if (err) return res.status(500).json({ ok: false, error: 'Write failed' });

    const ratings = readJson(RATINGS_DB);
    ratings.push({ id: Date.now(), rating: n, time: ts });
    writeJson(RATINGS_DB, ratings);
    res.json({ ok: true });
  });
});

app.get('/ratings', (req, res) => {
  const ratings = readJson(RATINGS_DB);
  if (!ratings.length) return res.json({ avg: 0, count: 0 });
  const sum = ratings.reduce((total, item) => total + item.rating, 0);
  res.json({ avg: +(sum / ratings.length).toFixed(2), count: ratings.length });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'devilseye' && password === 'guri5779') {
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false, error: 'Invalid credentials' });
});

app.get('/admin/contacts', (req, res) => {
  const contacts = readJson(CONTACTS_DB);
  res.json(contacts);
});

app.delete('/admin/contact/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: 'Missing id' });
  const contacts = readJson(CONTACTS_DB);
  const filtered = contacts.filter(item => item.id !== id);
  writeJson(CONTACTS_DB, filtered);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
