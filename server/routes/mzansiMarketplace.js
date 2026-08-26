// Mzansi Marketplace — Jobs & Technicians API (unified, JSON-backed)
// Ported from Subsidies/Mzansi Connect/Product/Mzansi Marketplace/server
const express = require('express');
const fs = require('fs');
const path = require('path');
const { createStore } = require('../services/jsonStore');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'mzansi', 'marketplace');
const WEB_DIR = path.join(__dirname, '..', '..', 'Subsidies', 'Mzansi Connect', 'Product', 'Mzansi Marketplace', 'web');

const customers = createStore(DATA_DIR, 'customers.json');
const technicians = createStore(DATA_DIR, 'technicians.json');
const jobs = createStore(DATA_DIR, 'jobs.json');
const applications = createStore(DATA_DIR, 'applications.json');
const installs = createStore(DATA_DIR, 'installs.json');
const payouts = createStore(DATA_DIR, 'payouts.json');

const { requireApiKey } = require('../middleware/auth');
const { strict } = require('../middleware/rateLimiter');
const router = express.Router();

const nextId = (prefix, store) => {
  const max = store.all().reduce((m, i) => Math.max(m, Number(String(i.id).replace(/\D/g, '')) || 0), 0);
  return prefix + (max + 1);
};

function enrichJob(j) {
  const customer = customers.find((c) => c.id === j.customer_id);
  return {
    id: j.id,
    title: j.title,
    description: j.description,
    device_type: j.device_type,
    town: j.town,
    province: j.province,
    pay_rand: j.pay_rand,
    status: j.status,
    technician_id: j.technician_id || null,
    created_at: j.created_at,
    customer: customer ? { full_name: customer.full_name } : j.customer || null,
  };
}

// ─── Jobs ───────────────────────────────────────────────────
router.get('/jobs', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const status = req.query.status;
  let list = jobs.all();
  if (status) list = list.filter((j) => j.status === status);
  res.json(list.slice(0, limit).map(enrichJob));
});

router.get('/jobs/:id', (req, res) => {
  if (!/^j\d+$/.test(String(req.params.id))) return res.status(404).json({ error: 'Job not found' });
  const job = jobs.find((j) => String(j.id) === String(req.params.id));
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(enrichJob(job));
});

router.post('/jobs', requireApiKey, (req, res) => {
  const { title, description, device_type, town, province, pay_rand, customer_id } = req.body;
  if (!title || pay_rand == null) {
    return res.status(400).json({ error: 'title and pay_rand are required' });
  }
  const t = String(title).trim();
  const pay = Number(pay_rand);
  if (t.length > 120) return res.status(400).json({ error: 'title too long' });
  if (!Number.isFinite(pay) || pay < 0 || pay > 1000000) {
    return res.status(400).json({ error: 'pay_rand out of range' });
  }
  if (customer_id && !/^c\d+$/.test(String(customer_id))) {
    return res.status(400).json({ error: 'Invalid customer id' });
  }
  const job = jobs.insert({
    id: nextId('j', jobs),
    title: t,
    description: description ? String(description).slice(0, 2000) : null,
    device_type: device_type ? String(device_type).slice(0, 40) : 'general',
    town: town ? String(town).slice(0, 80) : null,
    province: province ? String(province).slice(0, 80) : null,
    pay_rand: pay,
    status: 'open',
    created_at: new Date().toISOString(),
    customer_id: customer_id || null,
  });
  res.status(201).json(enrichJob(job));
});

router.post('/jobs/:id/apply', strict, (req, res) => {
  if (!/^j\d+$/.test(String(req.params.id))) return res.status(404).json({ error: 'Job not found' });
  const job = jobs.find((j) => String(j.id) === String(req.params.id));
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'open') return res.status(409).json({ error: 'Job is no longer open' });

  let techId = req.body.technician_id || null;
  // Public applicant flow — create an unverified technician profile on first apply
  if (!techId && req.body.name && req.body.phone) {
    const name = String(req.body.name).trim();
    const phone = String(req.body.phone).trim();
    if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'name must be 2-80 characters' });
    if (!/^[+0-9()\s-]{7,20}$/.test(phone)) return res.status(400).json({ error: 'phone looks invalid' });
    const existing = technicians.find((t) => t.phone === phone);
    if (existing) {
      techId = existing.id;
    } else {
      techId = technicians.insert({
        id: nextId('t', technicians),
        full_name: name,
        phone,
        town: String(req.body.town || '').trim() || job.town,
        province: req.body.province || job.province || null,
        rating_avg: 0,
        jobs_done: 0,
        skills: [],
        verified: false,
        created_at: new Date().toISOString(),
      }).id;
    }
  }
  if (!techId) return res.status(400).json({ error: 'technician_id or name + phone are required' });
  const tech = technicians.find((t) => t.id === techId);
  if (!tech) return res.status(400).json({ error: 'Unknown technician' });
  if (applications.find((a) => a.job_id === job.id && a.technician_id === techId)) {
    return res.status(409).json({ error: 'Already applied' });
  }
  const app = applications.insert({
    id: nextId('app', applications),
    job_id: job.id,
    technician_id: String(techId),
    created_at: new Date().toISOString(),
  });
  res.status(201).json({ success: true, application: app, technician: { id: tech.id, full_name: tech.full_name } });
});

router.put('/jobs/:id/assign', requireApiKey, (req, res) => {
  if (!/^j\d+$/.test(String(req.params.id))) return res.status(404).json({ error: 'Job not found' });
  const list = jobs.all();
  const job = list.find((j) => String(j.id) === String(req.params.id));
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const techId = req.body.technician_id;
  if (!techId) return res.status(400).json({ error: 'technician_id is required' });
  if (!/^t\d+$/.test(String(techId))) return res.status(400).json({ error: 'Invalid technician id' });
  job.status = 'assigned';
  job.technician_id = String(techId);
  jobs.save(list);
  res.json(enrichJob(job));
});

router.put('/jobs/:id/status', requireApiKey, (req, res) => {
  if (!/^j\d+$/.test(String(req.params.id))) return res.status(404).json({ error: 'Job not found' });
  const list = jobs.all();
  const job = list.find((j) => String(j.id) === String(req.params.id));
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const status = req.body.status;
  if (!['open', 'assigned', 'in_progress', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  job.status = status;
  jobs.save(list);

  if (status === 'completed' && job.technician_id) {
    const techList = technicians.all();
    const tech = techList.find((t) => t.id === job.technician_id);
    if (tech) {
      tech.jobs_done = (tech.jobs_done || 0) + 1;
      technicians.save(techList);
    }
    installs.insert({
      id: nextId('inst', installs),
      job_id: job.id,
      technician_id: job.technician_id,
      installed_at: new Date().toISOString(),
    });
    payouts.insert({
      id: nextId('pay', payouts),
      technician_id: job.technician_id,
      amount_rand: job.pay_rand,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
  }
  res.json(enrichJob(job));
});

// ─── Technicians ────────────────────────────────────────────
router.get('/technicians', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const list = technicians
    .all()
    .filter((t) => t.verified !== false)
    .sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0))
    .slice(0, limit);
  res.json(list);
});

router.get('/technicians/:id', (req, res) => {
  if (!/^t\d+$/.test(String(req.params.id))) return res.status(404).json({ error: 'Technician not found' });
  const tech = technicians.find((t) => String(t.id) === String(req.params.id));
  if (!tech) return res.status(404).json({ error: 'Technician not found' });
  res.json(tech);
});

router.post('/technicians', requireApiKey, (req, res) => {
  const { full_name, email, town, province, skills } = req.body;
  if (!full_name) return res.status(400).json({ error: 'full_name is required' });
  const name = String(full_name).trim();
  if (name.length > 120) return res.status(400).json({ error: 'full_name too long' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  if (email && technicians.find((t) => t.email === email)) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  const tech = technicians.insert({
    id: nextId('t', technicians),
    full_name: name,
    email: email ? String(email).toLowerCase() : null,
    town: town ? String(town).slice(0, 80) : null,
    province: province ? String(province).slice(0, 80) : null,
    skills: Array.isArray(skills) ? skills.map(s => String(s).slice(0, 40)).slice(0, 20) : [],
    rating_avg: 0,
    jobs_done: 0,
    verified: false,
    created_at: new Date().toISOString(),
  });
  res.status(201).json(tech);
});

// ─── Earnings ───────────────────────────────────────────────
router.get('/earnings/:technicianId', (req, res) => {
  const tech = technicians.find((t) => t.id === req.params.technicianId);
  if (!tech) return res.status(404).json({ error: 'Technician not found' });
  const pay = payouts.where((p) => p.technician_id === req.params.technicianId);
  const total = pay.reduce((s, p) => s + Number(p.amount_rand || 0), 0);
  const paid = pay.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount_rand || 0), 0);
  res.json({ payouts: pay, total, paid });
});

// ─── Health + app download ──────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

router.get('/app', (_req, res) => {
  const apk = '/downloads/mzansi-marketplace.apk';
  const apkPath = path.join(WEB_DIR, 'downloads', 'mzansi-marketplace.apk');
  const sizeBytes = fs.existsSync(apkPath) ? fs.statSync(apkPath).size : 0;
  res.json({ version: '1.0.1', apk, sizeBytes });
});

module.exports = router;
