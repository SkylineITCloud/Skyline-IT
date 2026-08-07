// Mzansi Cloud — Analytics API (unified, JSON-backed)
// Ported from Subsidies/Mzansi Connect/Product/Mzansi Cloud/server
const express = require('express');
const fs = require('fs');
const path = require('path');
const { createStore } = require('../services/jsonStore');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'mzansi', 'cloud');
const WEB_DIR = path.join(__dirname, '..', '..', 'Subsidies', 'Mzansi Connect', 'Product', 'Mzansi Cloud', 'web');

const customers = createStore(DATA_DIR, 'customers.json');
const staff = createStore(DATA_DIR, 'staff.json');
const devices = createStore(DATA_DIR, 'devices.json');
const summaries = createStore(DATA_DIR, 'summaries.json');
const alerts = createStore(DATA_DIR, 'alerts.json');
const auditLog = createStore(DATA_DIR, 'audit.json');

const { requireApiKey } = require('../middleware/auth');
const router = express.Router();

function customerById(id) {
  return customers.find((c) => c.id === id);
}

function enrichDevice(d) {
  const customer = customerById(d.customer_id);
  return {
    id: d.id,
    name: d.name,
    serial: d.serial,
    device_type: d.device_type,
    status: d.status,
    battery_pct: d.battery_pct,
    customer: customer ? { full_name: customer.full_name } : null,
  };
}

// ─── Analytics overview ─────────────────────────────────────
router.get('/analytics/overview', (_req, res) => {
  const list = devices.all();
  res.json({
    total_customers: customers.all().length,
    total_devices: list.length,
    online_devices: list.filter((d) => d.status === 'online').length,
    open_alerts: alerts.all().length,
  });
});

router.get('/analytics/devices-by-status', (_req, res) => {
  const counts = { online: 0, offline: 0, low_battery: 0, error: 0, provisioning: 0 };
  for (const d of devices.all()) {
    counts[d.status] = (counts[d.status] || 0) + 1;
  }
  res.json(counts);
});

router.get('/analytics/devices-by-type', (_req, res) => {
  const counts = {};
  for (const d of devices.all()) {
    counts[d.device_type] = (counts[d.device_type] || 0) + 1;
  }
  res.json(counts);
});

router.get('/analytics/summaries', (req, res) => {
  const metric = req.query.metric || 'power_w';
  const days = Math.min(parseInt(req.query.days) || 14, 90);
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days);
  const rows = summaries
    .where((s) => s.metric === metric && new Date(s.day) >= cutoff)
    .sort((a, b) => (a.day < b.day ? -1 : 1))
    .map((s) => ({ day: s.day, avg_value: s.avg_value, total_value: s.total_value, samples: s.samples }));
  res.json(rows);
});

router.get('/analytics/aggregate', (req, res) => {
  const metric = req.query.metric || 'power_w';
  const rows = summaries.where((s) => s.metric === metric);
  if (!rows.length) return res.json({ metric, total: 0, avg: 0, samples: 0 });
  const total = rows.reduce((s, r) => s + (r.total_value || 0), 0);
  const samples = rows.reduce((s, r) => s + (r.samples || 0), 0);
  res.json({ metric, total, avg: rows.length ? total / rows.length : 0, samples });
});

// ─── Devices (with customer join) ───────────────────────────
router.get('/devices', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  res.json(devices.all().slice(0, limit).map(enrichDevice));
});

// ─── Alerts (with device join) ──────────────────────────────
router.get('/alerts', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const list = alerts.all().slice(0, limit).map((a) => {
    const device = devices.find((d) => d.id === a.device_id);
    return {
      id: a.id,
      severity: a.severity,
      title: a.title,
      device: device ? { name: device.name, serial: device.serial } : a.device || null,
      created_at: a.created_at,
    };
  });
  res.json(list);
});

// ─── Customers (admin, requires API key) ────────────────────
router.get('/customers', requireApiKey, (_req, res) => {
  const list = customers.all().map((c) => ({
    id: c.id,
    full_name: c.full_name,
    email: c.email,
    phone: c.phone,
    created_at: c.created_at,
    devices: devices.where((d) => d.customer_id === c.id).length,
  }));
  res.json(list);
});

// ─── Audit log (admin, requires API key) ────────────────────
router.get('/audit', requireApiKey, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const list = auditLog.all().slice(0, limit).map((a) => {
    const person = staff.find((s) => s.id === a.staff_id);
    return { id: a.id, action: a.action, staff: person ? { full_name: person.full_name } : null, created_at: a.created_at };
  });
  res.json(list);
});

// ─── Health + app download ──────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

router.get('/app', (_req, res) => {
  const apk = '/downloads/mzansi-cloud.apk';
  const apkPath = path.join(WEB_DIR, 'downloads', 'mzansi-cloud.apk');
  const sizeBytes = fs.existsSync(apkPath) ? fs.statSync(apkPath).size : 0;
  res.json({ version: '1.0.3', apk, sizeBytes });
});

module.exports = router;
