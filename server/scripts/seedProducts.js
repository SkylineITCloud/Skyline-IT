// Seed script for the 4 Mzansi Connect product stores (app / cloud / marketplace / livestock).
// Idempotent: only seeds a store when its JSON file is missing or empty.
// Run: node server/scripts/seedProducts.js
const path = require('path');
const { createStore } = require('../services/jsonStore');

const ROOT = path.join(__dirname, '..', '..');

const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();
const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();
const dayStamp = (d) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);

const seeded = [];

function seed(dir, file, rows) {
  const store = createStore(path.join(ROOT, 'data', 'mzansi', dir), file);
  if (store.all().length === 0) {
    store.save(rows);
    seeded.push(`${dir}/${file} (${rows.length} rows)`);
  }
  return store;
}

// ─── Mzansi Connect App ─────────────────────────────────────
seed('app', 'devices.json', [
  { id: 'dev-1', serial: 'MZ-LS-0001', name: 'Nguni Herd Collar A', device_type: 'livestock_tracker', firmware_ver: '1.2.0', battery_pct: 87, status: 'online' },
  { id: 'dev-2', serial: 'MZ-SS-0001', name: 'Spaza Shop Guard', device_type: 'spaza_security', firmware_ver: '1.0.4', battery_pct: 64, status: 'online' },
  { id: 'dev-3', serial: 'MZ-WT-0001', name: 'JoJo Tank Monitor', device_type: 'water_tank', firmware_ver: '1.1.0', battery_pct: 91, status: 'online' },
  { id: 'dev-4', serial: 'MZ-EM-0001', name: 'Prepaid Meter Watch', device_type: 'electricity_monitor', firmware_ver: '1.0.2', battery_pct: 22, status: 'low_battery' },
  { id: 'dev-5', serial: 'MZ-FT-0001', name: 'Taxi 07 (DBN Route)', device_type: 'fleet_tracker', firmware_ver: '1.2.1', battery_pct: 55, status: 'online' },
  { id: 'dev-6', serial: 'MZ-SB-0001', name: 'Classroom Smart Bell', device_type: 'smart_bell', firmware_ver: '1.0.0', battery_pct: 73, status: 'offline' },
]);

seed('app', 'readings.json', [
  { id: 'rd-1', device_id: 'dev-1', metric: 'battery_pct', value: 87, unit: '%', recorded_at: hoursAgo(0.5) },
  { id: 'rd-2', device_id: 'dev-1', metric: 'status', value: 'online', unit: null, recorded_at: hoursAgo(0.5) },
  { id: 'rd-3', device_id: 'dev-2', metric: 'battery_pct', value: 64, unit: '%', recorded_at: hoursAgo(1) },
  { id: 'rd-4', device_id: 'dev-2', metric: 'status', value: 'online', unit: null, recorded_at: hoursAgo(1) },
  { id: 'rd-5', device_id: 'dev-3', metric: 'battery_pct', value: 91, unit: '%', recorded_at: hoursAgo(2) },
  { id: 'rd-6', device_id: 'dev-3', metric: 'status', value: 'online', unit: null, recorded_at: hoursAgo(2) },
  { id: 'rd-7', device_id: 'dev-4', metric: 'battery_pct', value: 22, unit: '%', recorded_at: hoursAgo(3) },
  { id: 'rd-8', device_id: 'dev-4', metric: 'status', value: 'low_battery', unit: null, recorded_at: hoursAgo(3) },
  { id: 'rd-9', device_id: 'dev-5', metric: 'battery_pct', value: 55, unit: '%', recorded_at: hoursAgo(1) },
  { id: 'rd-10', device_id: 'dev-5', metric: 'status', value: 'online', unit: null, recorded_at: hoursAgo(1) },
  { id: 'rd-11', device_id: 'dev-6', metric: 'battery_pct', value: 73, unit: '%', recorded_at: hoursAgo(6) },
  { id: 'rd-12', device_id: 'dev-6', metric: 'status', value: 'offline', unit: null, recorded_at: hoursAgo(6) },
]);

seed('app', 'alerts.json', [
  { id: 1, device_id: 'dev-4', alert_type: 'low_battery', severity: 'warning', title: 'Low battery', message: 'Battery at 22%. Solar panel not charging.', acknowledged: false, created_at: hoursAgo(6) },
  { id: 2, device_id: 'dev-2', alert_type: 'motion', severity: 'critical', title: 'Motion after hours', message: 'Motion detected at 23:41. Door was closed.', acknowledged: false, created_at: hoursAgo(9) },
  { id: 3, device_id: 'dev-6', alert_type: 'no_signal', severity: 'warning', title: 'Device offline', message: 'No signal for 6 hours. Check SIM or power.', acknowledged: false, created_at: hoursAgo(26) },
  { id: 4, device_id: 'dev-1', alert_type: 'geofence_breach', severity: 'info', title: 'Collar 0427 left paddock', message: 'Geofence breach recorded. Location pinned.', acknowledged: true, created_at: daysAgo(2) },
]);

seed('app', 'energy.json', [3.2, 2.8, 4.1, 3.6, 5.0, 2.2, 3.8].map((kwh, i) => ({
  id: `en-${i + 1}`,
  device_id: 'dev-4',
  kwh,
  cost_zar: +(kwh * 3.3).toFixed(2),
  interval_start: daysAgo(6 - i),
})));

seed('app', 'security.json', [
  { id: 1, device_id: 'dev-2', event_type: 'motion_detected', created_at: hoursAgo(9) },
  { id: 2, device_id: 'dev-2', event_type: 'door_opened', created_at: hoursAgo(30) },
  { id: 3, device_id: 'dev-2', event_type: 'power_lost', created_at: daysAgo(2) },
  { id: 4, device_id: 'dev-2', event_type: 'power_restored', created_at: daysAgo(2) },
  { id: 5, device_id: 'dev-2', event_type: 'panic_button', created_at: daysAgo(3) },
]);

seed('app', 'plans.json', [
  { id: 'p1', name: 'Starter', price_zar: 49, interval: 'monthly', features: ['1 device', 'Standard alerts', '7-day history'] },
  { id: 'p2', name: 'Family', price_zar: 99, interval: 'monthly', features: ['5 devices', 'Priority alerts', '30-day history', 'Energy insights'] },
  { id: 'p3', name: 'Business', price_zar: 249, interval: 'monthly', features: ['20 devices', 'Security + camera events', '90-day history', 'API access'] },
]);

seed('app', 'subscriptions.json', [
  { id: 'sub-1', plan_id: 'p2', status: 'active', current_period_end: daysAgo(-12), cancel_at_period_end: false },
  { id: 'sub-2', plan_id: 'p3', status: 'active', current_period_end: daysAgo(-20), cancel_at_period_end: false },
]);

// ─── Mzansi Cloud ───────────────────────────────────────────
seed('cloud', 'customers.json', [
  { id: 'c1', full_name: 'Thabo Mokoena', email: 'thabo.m@example.co.za', phone: '082 555 0111', created_at: '2025-11-02T00:00:00Z' },
  { id: 'c2', full_name: 'Lindiwe Khumalo', email: 'lindiwe.k@example.co.za', phone: '083 555 0112', created_at: '2025-11-14T00:00:00Z' },
  { id: 'c3', full_name: 'Sipho Dlamini', email: 'sipho.d@example.co.za', phone: '084 555 0113', created_at: '2025-12-01T00:00:00Z' },
  { id: 'c4', full_name: 'Nomsa Thabethe', email: 'nomsa.t@example.co.za', phone: '072 555 0114', created_at: '2026-01-08T00:00:00Z' },
  { id: 'c5', full_name: 'Sifiso Nkosi', email: 'sifiso.n@example.co.za', phone: '073 555 0115', created_at: '2026-02-19T00:00:00Z' },
]);

seed('cloud', 'staff.json', [
  { id: 's1', full_name: 'Nandi Mthethwa', role: 'admin' },
  { id: 's2', full_name: 'Kagiso Molefe', role: 'support' },
  { id: 's3', full_name: 'Zinhle Nxumalo', role: 'admin' },
]);

seed('cloud', 'devices.json', [
  { id: 'dev-1', serial: 'MZ-LS-0001', name: 'Nguni Herd Collar A', device_type: 'livestock_tracker', status: 'online', battery_pct: 87, customer_id: 'c1' },
  { id: 'dev-2', serial: 'MZ-SS-0001', name: 'Spaza Shop Guard', device_type: 'spaza_security', status: 'online', battery_pct: 64, customer_id: 'c2' },
  { id: 'dev-3', serial: 'MZ-WT-0001', name: 'JoJo Tank Monitor', device_type: 'water_tank', status: 'online', battery_pct: 91, customer_id: 'c3' },
  { id: 'dev-4', serial: 'MZ-EM-0001', name: 'Prepaid Meter Watch', device_type: 'electricity_monitor', status: 'low_battery', battery_pct: 22, customer_id: 'c4' },
  { id: 'dev-5', serial: 'MZ-FT-0001', name: 'Taxi 07 (DBN Route)', device_type: 'fleet_tracker', status: 'online', battery_pct: 55, customer_id: 'c5' },
  { id: 'dev-6', serial: 'MZ-SB-0001', name: 'Classroom Smart Bell', device_type: 'smart_bell', status: 'offline', battery_pct: 73, customer_id: 'c1' },
  { id: 'dev-7', serial: 'MZ-SS-0002', name: 'Shop Guard Umlazi', device_type: 'spaza_security', status: 'error', battery_pct: 12, customer_id: 'c3' },
]);

const metricBase = { power_w: 1100, voltage_v: 230, battery_pct: 80, water_level_pct: 60 };
const cloudSummaries = [];
for (const [metric, base] of Object.entries(metricBase)) {
  for (let i = 30; i >= 1; i--) {
    const wave = Math.sin((30 - i) / 4) * (base * 0.18);
    const avg = Math.max(1, Math.round(base + wave + ((30 - i) % 5) * 30));
    cloudSummaries.push({
      id: `sum-${metric}-${i}`,
      metric,
      day: dayStamp(i),
      avg_value: avg,
      total_value: avg * 96,
      samples: 96,
    });
  }
}
seed('cloud', 'summaries.json', cloudSummaries);

seed('cloud', 'alerts.json', [
  { id: 1, device_id: 'dev-2', severity: 'critical', title: 'Motion after hours', created_at: hoursAgo(9) },
  { id: 2, device_id: 'dev-4', severity: 'warning', title: 'Low battery', created_at: hoursAgo(6) },
  { id: 3, device_id: 'dev-6', severity: 'warning', title: 'Device offline', created_at: hoursAgo(26) },
  { id: 4, device_id: 'dev-1', severity: 'info', title: 'Geofence breach', created_at: daysAgo(2) },
  { id: 5, device_id: 'dev-3', severity: 'warning', title: 'Overflow detected', created_at: daysAgo(2) },
  { id: 6, device_id: 'dev-5', severity: 'info', title: 'Firmware updated', created_at: daysAgo(3) },
]);

seed('cloud', 'audit.json', [
  { id: 1, staff_id: 's1', action: 'Viewed customer list', created_at: hoursAgo(2) },
  { id: 2, staff_id: 's3', action: 'Updated device status (dev-4)', created_at: hoursAgo(5) },
  { id: 3, staff_id: 's2', action: 'Escalated alert #2', created_at: hoursAgo(8) },
]);

// ─── Mzansi Marketplace ─────────────────────────────────────
seed('marketplace', 'customers.json', [
  { id: 'c1', full_name: 'Umlazi Spaza Co-op', email: 'coop@example.co.za', phone: '082 555 0101' },
  { id: 'c2', full_name: 'Makhanya Family Farm', email: 'makhanya@example.co.za', phone: '083 555 0102' },
  { id: 'c3', full_name: 'KwaMashu Taxi Assoc', email: 'taxi@example.co.za', phone: '084 555 0103' },
  { id: 'c4', full_name: 'Inanda Primary School', email: 'school@example.co.za', phone: '072 555 0104' },
]);

seed('marketplace', 'technicians.json', [
  { id: 'demo-technician', full_name: 'Zanele Dube', email: 'zanele@example.co.za', town: 'Mooi River', province: 'KwaZulu-Natal', rating_avg: 5.0, jobs_done: 12, skills: ['livestock', 'solar', 'esp32'], verified: true, created_at: '2026-01-10T00:00:00Z' },
  { id: 't1', full_name: 'Sanele Mkhize', email: 'sanele@example.co.za', town: 'Umlazi', province: 'KwaZulu-Natal', rating_avg: 4.9, jobs_done: 47, skills: ['esp32', 'solar', 'wiring'], verified: true, created_at: '2025-11-02T00:00:00Z' },
  { id: 't2', full_name: 'Bongani Zulu', email: 'bongani@example.co.za', town: 'KwaMashu', province: 'KwaZulu-Natal', rating_avg: 4.7, jobs_done: 32, skills: ['gsm', 'gps', 'wiring'], verified: true, created_at: '2025-12-14T00:00:00Z' },
  { id: 't3', full_name: 'Ayanda Ndlovu', email: 'ayanda@example.co.za', town: 'Cato Manor', province: 'KwaZulu-Natal', rating_avg: 4.8, jobs_done: 28, skills: ['esp32', 'water', 'solar'], verified: true, created_at: '2026-01-20T00:00:00Z' },
  { id: 't4', full_name: 'Thulani Khumalo', email: 'thulani@example.co.za', town: 'Durban', province: 'KwaZulu-Natal', rating_avg: 4.6, jobs_done: 19, skills: ['fleet', 'gsm', 'gps'], verified: true, created_at: '2026-02-05T00:00:00Z' },
]);

seed('marketplace', 'jobs.json', [
  { id: 'j1', title: 'Install Spaza Shop Security', description: 'Mount motion sensor, door sensor, and panic button. Customer in Umlazi.', device_type: 'spaza_security', town: 'Umlazi', province: 'KwaZulu-Natal', pay_rand: 850, status: 'open', created_at: hoursAgo(20), customer_id: 'c1' },
  { id: 'j2', title: 'Solar-powered tank monitor', description: 'Fit water level sensor to 5000L JoJo tank and pair with app.', device_type: 'water_tank', town: 'Cato Manor', province: 'KwaZulu-Natal', pay_rand: 620, status: 'open', created_at: hoursAgo(26), customer_id: 'c2' },
  { id: 'j3', title: 'Livestock collar pairing', description: 'Configure 8 GPS collars for a smallholder herd and demo the dashboard.', device_type: 'livestock_tracker', town: 'Mooi River', province: 'KwaZulu-Natal', pay_rand: 1400, status: 'open', created_at: daysAgo(2), customer_id: 'c2' },
  { id: 'j4', title: 'Prepaid meter monitor install', description: 'Install electricity monitor on prepaid meter, verify readings.', device_type: 'electricity_monitor', town: 'KwaMashu', province: 'KwaZulu-Natal', pay_rand: 480, status: 'open', created_at: daysAgo(2), customer_id: 'c4' },
  { id: 'j5', title: 'Taxi fleet tracker batch', description: 'Fit 5 fleet trackers to minibus taxis. Must have GSM wiring experience.', device_type: 'fleet_tracker', town: 'Durban', province: 'KwaZulu-Natal', pay_rand: 2200, status: 'open', created_at: daysAgo(3), customer_id: 'c3' },
  { id: 'j6', title: 'Smart bell wiring', description: 'Wire smart bell system across 8 classrooms.', device_type: 'smart_bell', town: 'Inanda', province: 'KwaZulu-Natal', pay_rand: 1800, status: 'assigned', created_at: daysAgo(3), customer_id: 'c4', technician_id: 't1' },
]);

seed('marketplace', 'payouts.json', [
  { id: 'e1', technician_id: 'demo-technician', amount_rand: 1400, status: 'paid', created_at: daysAgo(6) },
  { id: 'e2', technician_id: 'demo-technician', amount_rand: 850, status: 'paid', created_at: daysAgo(10) },
  { id: 'e3', technician_id: 'demo-technician', amount_rand: 620, status: 'pending', created_at: daysAgo(1) },
  { id: 'e4', technician_id: 'demo-technician', amount_rand: 480, status: 'pending', created_at: daysAgo(1) },
]);

// ─── Livestock tracker ──────────────────────────────────────
seed('livestock', 'animals.json', [
  { id: 'animal-1', tag: '0427', name: 'Bessie', species: 'Cattle', breed: 'Nguni', color: 'brown', active: true, created_at: '2026-01-15T00:00:00Z' },
  { id: 'animal-2', tag: '0431', name: 'Tandi', species: 'Cattle', breed: 'Nguni', color: 'black', active: true, created_at: '2026-01-15T00:00:00Z' },
  { id: 'animal-3', tag: '0442', name: 'Mpumi', species: 'Cattle', breed: 'Bonsmara', color: 'red', active: true, created_at: '2026-02-01T00:00:00Z' },
  { id: 'animal-4', tag: '0455', name: null, species: 'Goat', breed: 'Boer', color: 'white', active: true, created_at: '2026-02-10T00:00:00Z' },
  { id: 'animal-5', tag: '0460', name: 'Sipho', species: 'Cattle', breed: 'Nguni', color: 'spotted', active: true, created_at: '2026-03-05T00:00:00Z' },
  { id: 'animal-6', tag: '0473', name: null, species: 'Sheep', breed: 'Dorper', color: 'white', active: true, created_at: '2026-03-20T00:00:00Z' },
]);

const herdLocations = [];
const animalCoords = [
  { id: 'animal-1', lat: -29.8521, lon: 30.9812 },
  { id: 'animal-2', lat: -29.8558, lon: 30.9775 },
  { id: 'animal-3', lat: -29.8497, lon: 30.9859 },
  { id: 'animal-4', lat: -29.8582, lon: 30.9724 },
  { id: 'animal-5', lat: -29.8510, lon: 30.9881 },
  { id: 'animal-6', lat: -29.8541, lon: 30.9708 },
];
for (const a of animalCoords) {
  for (let i = 0; i < 5; i++) {
    herdLocations.push({
      id: `loc-${a.id}-${i}`,
      animal_id: a.id,
      latitude: +(a.lat + (Math.random() - 0.5) * 0.004).toFixed(6),
      longitude: +(a.lon + (Math.random() - 0.5) * 0.004).toFixed(6),
      point: `POINT(${a.lon} ${a.lat})`,
      speed_kmh: +(Math.random() * 3.5).toFixed(1),
      battery_v: +(4.05 + Math.random() * 0.25).toFixed(2),
      recorded_at: hoursAgo(i * 2),
    });
  }
}
seed('livestock', 'locations.json', herdLocations);

seed('livestock', 'panic_events.json', [
  { id: 'panic-1', animal_id: 'animal-5', sub_collar_id: null, trigger: 'manual_panic', severity: 'critical', latitude: -29.8510, longitude: 30.9881, speed_kmh: 0, battery_v: 4.11, message: 'Manual panic button pressed by herder', resolved: false, created_at: hoursAgo(3) },
  { id: 'panic-2', animal_id: 'animal-2', sub_collar_id: 'sub-03', trigger: 'sub_strayed', severity: 'warning', latitude: -29.8558, longitude: 30.9775, speed_kmh: 1.2, battery_v: 4.2, message: 'Sub-collar sub-03 strayed > 3km from main', resolved: true, resolved_at: hoursAgo(26), created_at: hoursAgo(30) },
]);

seed('livestock', 'alerts.json', [
  { id: 'al-1', animal_id: 'animal-5', panic_event_id: 'panic-1', alert_type: 'panic', message: 'manual_panic: Manual panic button pressed by herder', latitude: -29.8510, longitude: 30.9881, created_at: hoursAgo(3) },
  { id: 'al-2', animal_id: 'animal-2', panic_event_id: 'panic-2', alert_type: 'panic', message: 'sub_strayed: Sub-collar sub-03 strayed > 3km from main', latitude: -29.8558, longitude: 30.9775, created_at: hoursAgo(30) },
]);

console.log('Seed complete. Seeded:');
for (const s of seeded) console.log('  - ' + s);
if (!seeded.length) console.log('  (nothing — all stores already populated)');
