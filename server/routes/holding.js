const { Router } = require('express');
const { requireApiKey } = require('../middleware/auth');
const { strict, api, admin } = require('../middleware/rateLimiter');
const { contactRules, handleValidationErrors } = require('../middleware/validate');
const db = require('../services/holdingDb');

const router = Router();

const LICENSE_HOLDER = process.env.LICENSE_HOLDER || "Skyline IT (S'nqobile Langa Hlatshwayo)";
const LICENSE_TYPE = process.env.LICENSE_TYPE || 'MIT';

router.get('/health', (req, res) => {
  res.json({
    status: 'ok', timestamp: new Date().toISOString(),
    licensee: LICENSE_HOLDER, uptime: process.uptime(),
    memory: process.memoryUsage().rss, node: process.version,
  });
});

router.post('/contact', strict, contactRules, handleValidationErrors, (req, res) => {
  const { name, email, message, company } = req.body;
  const entry = db.insertContact({ name, email, message, company, ip: req.ip });
  res.json({ success: true, id: entry.id, message: 'Thank you! We will get back to you soon.' });
});

router.get('/admin/stats', api, requireApiKey, (req, res) => {
  res.json({
    licensee: LICENSE_HOLDER, license: LICENSE_TYPE,
    contacts: db.contactCount(), uptime: process.uptime(),
    memory: process.memoryUsage().rss, node: process.version,
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

router.get('/admin/contacts', admin, requireApiKey, (req, res) => {
  try {
    res.json(db.getContacts(50));
  } catch {
    res.status(500).json({ error: 'Failed to read contact log.' });
  }
});

router.post('/admin/restart', admin, requireApiKey, (req, res) => {
  res.json({ success: true, message: 'Server restarting...' });
  setTimeout(() => { process.exit(0); }, 500);
});

module.exports = router;
