// Mzansi Connect App — Companion Dashboard API (unified, JSON-backed)
// Ported from Subsidies/Mzansi Connect/Product/Mzansi Connect App/server
const express = require('express');
const fs = require('fs');
const path = require('path');
const { createStore } = require('../services/jsonStore');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'mzansi', 'app');
const WEB_DIR = path.join(__dirname, '..', '..', 'Subsidies', 'Mzansi Connect', 'Product', 'Mzansi Connect App', 'web');

const devices = createStore(DATA_DIR, 'devices.json');
const readings = createStore(DATA_DIR, 'readings.json');
const alerts = createStore(DATA_DIR, 'alerts.json');
const energy = createStore(DATA_DIR, 'energy.json');
const security = createStore(DATA_DIR, 'security.json');
const plans = createStore(DATA_DIR, 'plans.json');
const subscriptions = createStore(DATA_DIR, 'subscriptions.json');

const { requireApiKey } = require('../middleware/auth');
const router = express.Router();

function deviceById(id) {
  return devices.find((d) => d.id === id);
}

function latestReadingsFor(deviceId) {
  const rows = readings.where((r) => r.device_id === deviceId);
  const latest = {};
  for (const r of rows) {
    const cur = latest[r.metric];
    if (!cur || r.recorded_at > cur.recorded_at) latest[r.metric] = r;
  }
  return latest;
}

// ─── Device list ────────────────────────────────────────────
router.get('/devices', (_req, res) => {
  const list = devices.all().map((d) => {
    const lr = latestReadingsFor(d.id);
    return {
      ...d,
      battery_pct: lr.battery_pct != null ? Math.round(lr.battery_pct.value) : d.battery_pct,
      status: lr.status ? lr.status.value : d.status,
    };
  });
  res.json(list);
});

// ─── Alerts ─────────────────────────────────────────────────
router.get('/alerts', (_req, res) => {
  res.json(alerts.where((a) => !a.acknowledged).concat(alerts.where((a) => a.acknowledged)));
});

router.put('/alerts/:id/ack', (req, res) => {
  const list = alerts.all();
  const alert = list.find((a) => String(a.id) === String(req.params.id));
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  alert.acknowledged = true;
  alerts.save(list);
  res.json(alert);
});

// ─── Energy usage (dev-4) ───────────────────────────────────
router.get('/energy/:deviceId', (req, res) => {
  res.json(energy.where((e) => e.device_id === req.params.deviceId));
});

// ─── Security events (dev-2) ────────────────────────────────
router.get('/security/:deviceId', (req, res) => {
  const dev = deviceById(req.params.deviceId);
  const rows = security.where((e) => e.device_id === req.params.deviceId);
  res.json(rows.map((e) => ({ ...e, device_name: dev ? dev.name : e.device_name })));
});

// ─── Subscription plans ─────────────────────────────────────
router.get('/plans', (_req, res) => {
  res.json(plans.all());
});

// ─── Subscriptions ──────────────────────────────────────────
router.get('/subscriptions', (_req, res) => {
  const list = subscriptions.all().map((s) => {
    const plan = plans.find((p) => p.id === s.plan_id);
    return {
      id: s.id,
      plan_name: plan ? plan.name : s.plan_name,
      status: s.status,
      current_period_end: s.current_period_end,
      cancel_at_period_end: s.cancel_at_period_end,
    };
  });
  res.json(list);
});

router.put('/subscriptions/:id/cancel', (req, res) => {
  const list = subscriptions.all();
  const sub = list.find((s) => String(s.id) === String(req.params.id));
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  sub.cancel_at_period_end = true;
  subscriptions.save(list);
  const plan = plans.find((p) => p.id === sub.plan_id);
  res.json({
    id: sub.id,
    plan_name: plan ? plan.name : sub.plan_name,
    status: sub.status,
    current_period_end: sub.current_period_end,
    cancel_at_period_end: sub.cancel_at_period_end,
  });
});

// ─── Telemetry ingest (device firmware, requires API key) ───
router.post('/telemetry', requireApiKey, (req, res) => {
  const { device_id, metric, value, unit, recorded_at } = req.body;
  if (!device_id || !metric || value == null) {
    return res.status(400).json({ error: 'Missing required fields: device_id, metric, value' });
  }
  const entry = readings.insert({
    id: 'rd-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    device_id: String(device_id),
    metric: String(metric),
    value,
    unit: unit || null,
    recorded_at: recorded_at || new Date().toISOString(),
  });
  res.status(201).json({ id: entry.id });
});

// ─── App download info ──────────────────────────────────────
router.get('/app', (_req, res) => {
  const apk = '/downloads/mzansi-connect-app.apk';
  const apkPath = path.join(WEB_DIR, 'downloads', 'mzansi-connect-app.apk');
  const sizeBytes = fs.existsSync(apkPath) ? fs.statSync(apkPath).size : 0;
  res.json({ version: '1.0.2', apk, sizeBytes });
});

module.exports = router;
