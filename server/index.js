require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname, '..');
const isProd = process.env.NODE_ENV === 'production';

/* ─── LICENSED USE NOTICE ─── */
const LICENSE_HOLDER = process.env.LICENSE_HOLDER || 'Skyline IT (S\'nqobile Langa Hlatshwayo)';
const LICENSE_TYPE = process.env.LICENSE_TYPE || 'MIT';

/* ─── SECURITY: HELMET ─── */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
}));

/* ─── CORS ─── */
const allowedOrigins = [
  'https://www.skylineit.site',
  'https://skylineit.site',
  process.env.CORS_ORIGIN,
].filter(Boolean);

if (!isProd) allowedOrigins.push('http://localhost:' + PORT, 'http://localhost:3000', 'http://127.0.0.1:3000');

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    cb(null, false);
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-Api-Key'],
  maxAge: 86400,
}));

/* ─── COMPRESSION ─── */
app.use(compression());

/* ─── BODY PARSERS ─── */
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

/* ─── REQUEST LOGGER (hidden, no detailed output in prod) ─── */
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (!isProd) {
      console.log(`[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
    }
  });
  next();
});

/* ─── RATE LIMITERS ─── */
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'API rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Admin rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ─── HIDDEN API KEY AUTH ─── */
const API_KEY = process.env.API_KEY || null;

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!API_KEY) return res.status(503).json({ error: 'API not configured' });
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

/* ─── CONTACT LOG STORE ─── */
const CONTACT_LOG = path.join(ROOT, 'data', 'contacts.jsonl');
if (!fs.existsSync(path.dirname(CONTACT_LOG))) {
  fs.mkdirSync(path.dirname(CONTACT_LOG), { recursive: true });
}

/* ─── PUBLIC API ─── */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), licensee: LICENSE_HOLDER });
});

app.post('/api/contact', contactLimiter, (req, res) => {
  const { name, email, message, company } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }
  if (typeof name !== 'string' || name.length > 100) return res.status(400).json({ error: 'Invalid name.' });
  if (typeof email !== 'string' || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email.' });
  }
  if (typeof message !== 'string' || message.length > 2000) return res.status(400).json({ error: 'Message too long.' });

  const entry = {
    id: uuidv4(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    company: (company || '').trim(),
    message: message.trim(),
    ip: req.ip,
    timestamp: new Date().toISOString(),
  };

  fs.appendFileSync(CONTACT_LOG, JSON.stringify(entry) + '\n');

  res.json({ success: true, message: 'Thank you! We will get back to you soon.' });
});

/* ─── HIDDEN ADMIN API ─── */
app.get('/api/admin/stats', apiLimiter, requireApiKey, (req, res) => {
  let contactCount = 0;
  try {
    if (fs.existsSync(CONTACT_LOG)) {
      const data = fs.readFileSync(CONTACT_LOG, 'utf-8').trim();
      if (data) contactCount = data.split('\n').length;
    }
  } catch {}

  res.json({
    licensee: LICENSE_HOLDER,
    license: LICENSE_TYPE,
    contacts: contactCount,
    uptime: process.uptime(),
    memory: process.memoryUsage().rss,
    node: process.version,
    env: isProd ? 'production' : 'development',
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/admin/restart', adminLimiter, requireApiKey, (req, res) => {
  res.json({ success: true, message: 'Server restarting...' });
  setTimeout(() => { process.exit(0); }, 500);
});

app.get('/api/admin/contacts', adminLimiter, requireApiKey, (req, res) => {
  try {
    if (!fs.existsSync(CONTACT_LOG)) return res.json([]);
    const lines = fs.readFileSync(CONTACT_LOG, 'utf-8').trim().split('\n').filter(Boolean);
    const entries = lines.map(l => JSON.parse(l));
    res.json(entries.slice(-50).reverse());
  } catch {
    res.status(500).json({ error: 'Failed to read contact log.' });
  }
});

/* ─── STATIC FILES ─── */
app.use(express.static(ROOT, {
  maxAge: isProd ? '7d' : 0,
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
    if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.webp')) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  },
}));

/* ─── SPA FALLBACK ─── */
app.get('*', (req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

/* ─── GLOBAL ERROR HANDLER ─── */
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

/* ─── START ─── */
app.listen(PORT, () => {
  const mode = isProd ? 'PRODUCTION' : 'DEVELOPMENT';
  console.log('');
  console.log('  ╔═══════════════════════════════════════╗');
  console.log('  ║       SKYLINE IT — BACKEND            ║');
  console.log('  ║───────────────────────────────────────║');
  console.log(`  ║  Mode:      ${mode.padEnd(28)}║`);
  console.log(`  ║  Port:      ${String(PORT).padEnd(28)}║`);
  console.log(`  ║  Licensee:  ${LICENSE_HOLDER.padEnd(28)}║`);
  console.log(`  ║  License:   ${LICENSE_TYPE.padEnd(28)}║`);
  console.log('  ╚═══════════════════════════════════════╝');
  console.log('');
});
