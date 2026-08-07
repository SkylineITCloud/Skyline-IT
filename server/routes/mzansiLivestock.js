// LiveStock GPS Tracker API (unified, JSON-backed)
// Ported from Subsidies/Mzansi Connect/Product/Livestock tracker/server
const express = require('express');
const path = require('path');
const { createStore } = require('../services/jsonStore');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'mzansi', 'livestock');

const animals = createStore(DATA_DIR, 'animals.json');
const locations = createStore(DATA_DIR, 'locations.json');
const panicEvents = createStore(DATA_DIR, 'panic_events.json');
const alerts = createStore(DATA_DIR, 'alerts.json');

const { requireApiKey } = require('../middleware/auth');
const router = express.Router();

const esc = (s) => (typeof s === 'string' ? s.replace(/[<>"'&]/g, '') : s);

const nextId = (prefix, store) => {
  const max = store.all().reduce((m, i) => Math.max(m, Number(String(i.id).replace(/\D/g, '')) || 0), 0);
  return prefix + (max + 1);
};

const animalByTag = (tag) => animals.find((a) => a.tag === tag);
const animalById = (id) => animals.find((a) => String(a.id) === String(id));

function animalMeta(animal) {
  const last = locations
    .where((l) => l.animal_id === animal.id)
    .sort((a, b) => (a.recorded_at < b.recorded_at ? 1 : -1))[0];
  if (!last) return { animal_id: animal.id, tag: animal.tag, name: animal.name, species: animal.species };
  return {
    animal_id: animal.id,
    tag: animal.tag,
    name: animal.name,
    species: animal.species,
    latitude: last.latitude,
    longitude: last.longitude,
    speed_kmh: last.speed_kmh,
    battery_v: last.battery_v,
    created_at: last.recorded_at,
  };
}

function recordPanic(entry) {
  const panic = panicEvents.insert({
    id: nextId('panic', panicEvents),
    animal_id: entry.animal_id,
    sub_collar_id: entry.sub_collar_id || null,
    trigger: entry.trigger,
    severity: entry.severity,
    latitude: entry.latitude,
    longitude: entry.longitude,
    speed_kmh: entry.speed_kmh,
    battery_v: entry.battery_v || null,
    message: entry.message || null,
    resolved: false,
    created_at: new Date().toISOString(),
  });
  alerts.insert({
    id: nextId('al', alerts),
    animal_id: entry.animal_id,
    panic_event_id: panic.id,
    alert_type: 'panic',
    message: `${entry.trigger}: ${entry.message || 'Panic detected'}`,
    latitude: entry.latitude,
    longitude: entry.longitude,
    created_at: new Date().toISOString(),
  });
  console.log(`PANIC [${panic.severity}] ${entry.animal_id}: ${entry.trigger} @ ${entry.latitude},${entry.longitude}`);
  return panic;
}

// ─── Ingest GPS ping from collar (requires API key) ────────
router.post('/locations', requireApiKey, (req, res) => {
  const { animal_id, latitude, longitude, speed_kmh, battery_v, strap_ok, sub_collars } = req.body;

  if (!animal_id || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'Missing required fields: animal_id, latitude, longitude' });
  }
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ error: 'latitude and longitude must be numbers' });
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: 'coordinates out of range' });
  }

  if (strap_ok === false) {
    recordPanic({
      animal_id: esc(animal_id),
      trigger: 'strap_breach',
      severity: 'critical',
      latitude,
      longitude,
      speed_kmh: Math.max(0, speed_kmh || 0),
      message: 'Main collar strap breached — possible theft',
    });
  }

  const row = locations.insert({
    id: nextId('loc', locations),
    animal_id: esc(animal_id),
    latitude,
    longitude,
    point: `POINT(${longitude} ${latitude})`,
    speed_kmh: Math.max(0, speed_kmh || 0),
    battery_v: battery_v || null,
    recorded_at: new Date().toISOString(),
  });

  if (Array.isArray(sub_collars) && sub_collars.length > 0) {
    for (const sub of sub_collars) {
      if (sub.strap_ok === false) {
        recordPanic({
          animal_id: esc(animal_id),
          sub_collar_id: esc(sub.id || 'unknown'),
          trigger: 'sub_strap_breach',
          severity: 'critical',
          latitude,
          longitude,
          message: `Sub-collar ${sub.id || 'unknown'} strap breached`,
        });
      }
      if (sub.strayed === true) {
        recordPanic({
          animal_id: esc(animal_id),
          sub_collar_id: esc(sub.id || 'unknown'),
          trigger: 'sub_strayed',
          severity: 'warning',
          latitude,
          longitude,
          message: `Sub-collar ${sub.id || 'unknown'} strayed > 3km from main`,
        });
      }
    }
  }

  res.status(201).json({ id: row.id });
});

// ─── Ingest panic event from collar (requires API key) ──────
router.post('/panic', requireApiKey, (req, res) => {
  const { animal_id, sub_collar_id, trigger, latitude, longitude, speed_kmh, battery_v, message } = req.body;

  if (!animal_id || !trigger || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'Missing required fields: animal_id, trigger, latitude, longitude' });
  }

  const validTriggers = [
    'strap_breach', 'high_speed', 'rapid_accel', 'off_hours_movement',
    'geofence_breach_high_speed', 'prolonged_struggle', 'manual_panic', 'no_heartbeat',
    'sub_strap_breach', 'sub_strayed', 'sub_low_battery', 'sub_no_main_contact', 'sub_forcible_removal',
  ];
  if (!validTriggers.includes(trigger)) {
    return res.status(400).json({ error: `Invalid trigger. Must be one of: ${validTriggers.join(', ')}` });
  }

  const isCritical = ['strap_breach', 'manual_panic', 'no_heartbeat', 'sub_strap_breach', 'sub_forcible_removal'].includes(trigger);
  const severity = isCritical ? 'critical' : (speed_kmh || 0) > 30 ? 'critical' : 'warning';

  const panic = recordPanic({
    animal_id: esc(animal_id),
    sub_collar_id: sub_collar_id ? esc(sub_collar_id) : null,
    trigger,
    severity,
    latitude,
    longitude,
    speed_kmh: Math.max(0, speed_kmh || 0),
    battery_v: battery_v || null,
    message: message ? esc(message) : null,
  });

  res.status(201).json({ id: panic.id, severity });
});

// ─── Active panics (joined with animal tag) ─────────────────
router.get('/panic/active', (_req, res) => {
  const list = panicEvents
    .all()
    .filter((p) => !p.resolved)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((p) => {
      const animal = animalById(p.animal_id);
      return {
        id: p.id,
        animal_id: p.animal_id,
        tag: animal ? animal.tag : null,
        sub_collar_id: p.sub_collar_id,
        trigger: p.trigger,
        severity: p.severity,
        message: p.message,
        created_at: p.created_at,
      };
    });
  res.json(list);
});

// ─── Resolve a panic event (requires API key) ───────────────
router.put('/panic/:id/resolve', requireApiKey, (req, res) => {
  const list = panicEvents.all();
  const panic = list.find((p) => String(p.id) === String(req.params.id));
  if (!panic) return res.status(404).json({ error: 'Panic event not found' });
  panic.resolved = true;
  panic.resolved_at = new Date().toISOString();
  panicEvents.save(list);
  res.json(panic);
});

// ─── Latest locations for an animal ─────────────────────────
router.get('/locations/:animalId', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const list = locations
    .where((l) => l.animal_id === esc(req.params.animalId))
    .sort((a, b) => (a.recorded_at < b.recorded_at ? 1 : -1))
    .slice(0, limit);
  res.json(list);
});

// ─── Animals ────────────────────────────────────────────────
router.get('/animals', (_req, res) => {
  res.json(animals.where((a) => a.active !== false));
});

router.post('/animals', requireApiKey, (req, res) => {
  const { tag, name, species, breed, color } = req.body;
  if (!tag) return res.status(400).json({ error: 'tag is required' });
  if (animalByTag(String(tag))) return res.status(409).json({ error: 'Tag already exists' });
  const animal = animals.insert({
    id: nextId('animal', animals),
    tag: esc(tag),
    name: name ? esc(name) : null,
    species: species ? esc(species) : null,
    breed: breed ? esc(breed) : null,
    color: color ? esc(color) : null,
    active: true,
    created_at: new Date().toISOString(),
  });
  res.status(201).json(animal);
});

router.put('/animals/:id', requireApiKey, (req, res) => {
  const list = animals.all();
  const animal = list.find((a) => String(a.id) === String(req.params.id));
  if (!animal) return res.status(404).json({ error: 'Animal not found' });
  const { name, species, breed, color, active } = req.body;
  if (name !== undefined) animal.name = esc(name);
  if (species !== undefined) animal.species = esc(species);
  if (breed !== undefined) animal.breed = esc(breed);
  if (color !== undefined) animal.color = esc(color);
  if (active !== undefined) animal.active = !!active;
  animals.save(list);
  res.json(animal);
});

// ─── Latest location of every animal (for map) ──────────────
router.get('/latest', (_req, res) => {
  const list = animals.all().filter((a) => a.active !== false).map(animalMeta);
  res.json(list);
});

// ─── Health ─────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

module.exports = router;
