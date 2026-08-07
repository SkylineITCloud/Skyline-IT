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
  const job = jobs.find((j) => String(j.id) === String(req.params.id));
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(enrichJob(job));
});

router.post('/jobs', requireApiKey, (req, res) => {
  const { title, description, device_type, town, province, pay_rand, customer_id } = req.body;
  if (!title || pay_rand == null) {
    return res.status(400).json({ error: 'title and pay_rand are required' });
  }
  const job = jobs.insert({
    id: nextId('j', jobs),
    title: String(title),
    description: description || null,
    device_type: device_type || 'general',
    town: town || null,
    province: province || null,
    pay_rand: Number(pay_rand),
    status: 'open',
    created_at: new Date().toISOString(),
    customer_id: customer_id || null,
  });
  res.status(201).json(enrichJob(job));
});

router.post('/jobs/:id/apply', requireApiKey, (req, res) => {
  const job = jobs.find((j) => String(j.id) === String(req.params.id));
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const techId = req.body.technician_id;
  if (!techId) return res.status(400).json({ error: 'technician_id is required' });
  if (applications.find((a) => a.job_id === job.id && a.technician_id === techId)) {
    return res.status(409).json({ error: 'Already applied' });
  }
  const app = applications.insert({
    id: nextId('app', applications),
    job_id: job.id,
    technician_id: String(techId),
    created_at: new Date().toISOString(),
  });
  res.status(201).json(app);
});

router.put('/jobs/:id/assign', requireApiKey, (req, res) => {
  const list = jobs.all();
  const job = list.find((j) => String(j.id) === String(req.params.id));
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const techId = req.body.technician_id;
  if (!techId) return res.status(400).json({ error: 'technician_id is required' });
  job.status = 'assigned';
  job.technician_id = String(techId);
  jobs.save(list);
  res.json(enrichJob(job));
});

router.put('/jobs/:id/status', requireApiKey, (req, res) => {
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
  const tech = technicians.find((t) => String(t.id) === String(req.params.id));
  if (!tech) return res.status(404).json({ error: 'Technician not found' });
  res.json(tech);
});

router.post('/technicians', requireApiKey, (req, res) => {
  const { full_name, email, town, province, skills } = req.body;
  if (!full_name) return res.status(400).json({ error: 'full_name is required' });
  if (email && technicians.find((t) => t.email === email)) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  const tech = technicians.insert({
    id: nextId('t', technicians),
    full_name: String(full_name),
    email: email || null,
    town: town || null,
    province: province || null,
    skills: Array.isArray(skills) ? skills : [],
    rating_avg: 0,
    jobs_done: 0,
    verified: false,
    created_at: new Date().toISOString(),
  });
  res.status(201).json(tech);
});

// ─── Earnings ───────────────────────────────────────────────
router.get('/earnings/:technicianId', (req, res) => {
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
