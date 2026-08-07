require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const { createDb } = require('./services/db');
const { standard: globalLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname, '..');
const isProd = process.env.NODE_ENV === 'production';

const LICENSE_HOLDER = process.env.LICENSE_HOLDER || "Skyline IT (S'nqobile Langa Hlatshwayo)";

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://skylineit.site", "https://www.skylineit.site"],
      frameSrc: ["'none'"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
}));

const allowedOrigins = [
  'https://www.skylineit.site', 'https://skylineit.site',
  'https://www.mzansiconnect.store',
  process.env.CORS_ORIGIN,
].filter(Boolean);
if (!isProd) allowedOrigins.push('http://localhost:' + PORT, 'http://localhost:3000', 'http://127.0.0.1:3000');

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    cb(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-Api-Key', 'Authorization'],
  maxAge: 86400,
}));

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (!isProd) {
      console.log(`[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
    }
  });
  next();
});

app.use('/api/', globalLimiter);

app.use('/api/holding', require('./routes/holding'));
app.use('/api/mzansi', require('./routes/mzansiConnect'));
app.use('/api/circuit-forge', require('./routes/circuitForge'));
app.use('/api/studysync', require('./routes/studySync'));
app.use('/api/store', require('./routes/store'));
app.use('/api/valow', require('./routes/valow'));
app.use('/api/mzansi/compare/auth', require('./routes/mzansiCompareAuth'));
app.use('/api/mzansi/compare/products', require('./routes/mzansiCompareProducts'));
app.use('/api/mzansi/compare/search', require('./routes/mzansiCompareSearch'));
app.use('/api/mzansi/app', require('./routes/mzansiApp'));
app.use('/api/mzansi/cloud', require('./routes/mzansiCloud'));
app.use('/api/mzansi/marketplace', require('./routes/mzansiMarketplace'));
app.use('/api/mzansi/livestock', require('./routes/mzansiLivestock'));

// ─── SUBSIDIARY SITES (served by the unified server) ───
app.use('/store', express.static(path.join(ROOT, 'store'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  },
}));
app.use('/valow', express.static(path.join(ROOT, 'Subsidies', 'Valow', 'server', 'public')));
app.use('/site', express.static(path.join(ROOT, 'site')));

const noCache = (res, filePath) => {
  if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
};

app.use('/app', express.static(path.join(ROOT, 'app'), { setHeaders: noCache }));
app.use('/cloud', express.static(path.join(ROOT, 'cloud'), { setHeaders: noCache }));
app.use('/marketplace', express.static(path.join(ROOT, 'marketplace'), { setHeaders: noCache }));
app.use('/livestock', express.static(path.join(ROOT, 'livestock'), { setHeaders: noCache }));

app.use(express.static(ROOT, {
  maxAge: isProd ? '7d' : 0,
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.webp')) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  },
}));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Route not found' });
  }
  res.sendFile(path.join(ROOT, 'index.html'));
});

app.use(errorHandler);

async function main() {
  try {
    await createDb();
    console.log('StudySync database initialized');
  } catch (err) {
    console.error('StudySync DB init warning (non-fatal):', err.message);
  }

  app.listen(PORT, '0.0.0.0', () => {
    const mode = isProd ? 'PRODUCTION' : 'DEVELOPMENT';
    console.log('');
    console.log('  --- SKYLINE IT - Unified Backend ---');
    console.log('  Mode:      ' + mode);
    console.log('  Port:      ' + PORT);
    console.log('  Licensee:  ' + LICENSE_HOLDER);
    console.log('');
    console.log('  Routes:');
    console.log('    /api/holding/*       Holding Company');
    console.log('    /api/mzansi/*        Mzansi Connect');
    console.log('    /api/circuit-forge/* Circuit Forge Technologies');
    console.log('    /api/studysync/*     StudySync');
    console.log('    /api/store/*         Circuit Forge Store (products + orders)');
    console.log('    /api/valow/*         Valow votes');
    console.log('    /api/mzansi/compare/* Mzansi Price Compare (auth/products/search)');
    console.log('    /api/mzansi/app/*     Mzansi Connect App (devices/alerts/energy/plans)');
    console.log('    /api/mzansi/cloud/*   Mzansi Cloud (analytics/devices/customers)');
    console.log('    /api/mzansi/marketplace/* Mzansi Marketplace (jobs/technicians/earnings)');
    console.log('    /api/mzansi/livestock/* LiveStock GPS Tracker (locations/panic/animals)');
    console.log('  Sites:');
    console.log('    /                    Skyline IT');
    console.log('    /store/              Circuit Forge Storefront (/store/admin.html)');
    console.log('    /valow/              Valow vote dashboard');
    console.log('    /site/               Circuit Forge Technologies');
    console.log('    /app/                Mzansi Connect App companion dashboard');
    console.log('    /cloud/              Mzansi Cloud analytics dashboard');
    console.log('    /marketplace/        Mzansi Marketplace jobs & technicians');
    console.log('    /livestock/          LiveStock GPS Tracker map dashboard');
    console.log('');
  });
}

main();
