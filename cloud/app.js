// Mzansi Cloud - Analytics Dashboard
// SPDX-License-Identifier: Apache-2.0
//
// POPIA: Client-side only; no PII stored in browser.
// ECTA:  Transactions facilitated via server API.
//
// Runs standalone in DEMO mode with sample data when the API
// server is not reachable.

const API = "/api/mzansi/cloud";
let DEMO = false;

// ─── Demo data ──────────────────────────────────────────────
const demoData = {
  overview: { total_customers: 148, total_devices: 326, online_devices: 291, open_alerts: 12 },
  devicesByStatus: { online: 291, offline: 18, low_battery: 14, error: 3 },
  devicesByType: {
    livestock_tracker: 104,
    spaza_security: 78,
    water_tank: 45,
    electricity_monitor: 52,
    fleet_tracker: 38,
    smart_bell: 9
  },
  summaries: [
    { day: "2026-07-17", avg_value: 1120 }, { day: "2026-07-18", avg_value: 980 },
    { day: "2026-07-19", avg_value: 1240 }, { day: "2026-07-20", avg_value: 890 },
    { day: "2026-07-21", avg_value: 1360 }, { day: "2026-07-22", avg_value: 1050 },
    { day: "2026-07-23", avg_value: 990 }, { day: "2026-07-24", avg_value: 1180 },
    { day: "2026-07-25", avg_value: 1240 }, { day: "2026-07-26", avg_value: 1420 },
    { day: "2026-07-27", avg_value: 1010 }, { day: "2026-07-28", avg_value: 880 },
    { day: "2026-07-29", avg_value: 1130 }, { day: "2026-07-30", avg_value: 1210 }
  ],
  alerts: [
    { id: 1, severity: "critical", title: "Motion after hours", device: { name: "Spaza Shop Guard", serial: "MZ-SS-0001" }, created_at: "2026-07-30T23:41:00Z" },
    { id: 2, severity: "warning", title: "Low battery", device: { name: "Prepaid Meter Watch", serial: "MZ-EM-0001" }, created_at: "2026-07-30T09:12:00Z" },
    { id: 3, severity: "warning", title: "Device offline", device: { name: "Classroom Smart Bell", serial: "MZ-SB-0001" }, created_at: "2026-07-30T07:00:00Z" },
    { id: 4, severity: "info", title: "Geofence breach", device: { name: "Nguni Herd Collar A", serial: "MZ-LS-0001" }, created_at: "2026-07-29T16:20:00Z" },
    { id: 5, severity: "warning", title: "Overflow detected", device: { name: "JoJo Tank Monitor", serial: "MZ-WT-0001" }, created_at: "2026-07-29T11:02:00Z" },
    { id: 6, severity: "info", title: "Firmware updated", device: { name: "Taxi 07 (DBN Route)", serial: "MZ-FT-0001" }, created_at: "2026-07-28T22:00:00Z" }
  ],
  devices: [
    { name: "Nguni Herd Collar A", device_type: "livestock_tracker", status: "online", battery_pct: 87, customer: { full_name: "Thabo M." } },
    { name: "Spaza Shop Guard", device_type: "spaza_security", status: "online", battery_pct: 64, customer: { full_name: "Lindiwe K." } },
    { name: "JoJo Tank Monitor", device_type: "water_tank", status: "online", battery_pct: 91, customer: { full_name: "Sipho D." } },
    { name: "Prepaid Meter Watch", device_type: "electricity_monitor", status: "low_battery", battery_pct: 22, customer: { full_name: "Nomsa T." } },
    { name: "Taxi 07 (DBN Route)", device_type: "fleet_tracker", status: "online", battery_pct: 55, customer: { full_name: "Sifiso N." } },
    { name: "Classroom Smart Bell", device_type: "smart_bell", status: "offline", battery_pct: 73, customer: { full_name: "Mzamomuhle Primary" } }
  ],
  customers: [
    { full_name: "Thabo Mokoena", email: "thabo.m@example.co.za", phone: "082 555 0111", created_at: "2025-11-02T00:00:00Z" },
    { full_name: "Lindiwe Khumalo", email: "lindiwe.k@example.co.za", phone: "083 555 0112", created_at: "2025-11-14T00:00:00Z" },
    { full_name: "Sipho Dlamini", email: "sipho.d@example.co.za", phone: "084 555 0113", created_at: "2025-12-01T00:00:00Z" },
    { full_name: "Nomsa Thabethe", email: "nomsa.t@example.co.za", phone: "072 555 0114", created_at: "2026-01-08T00:00:00Z" },
    { full_name: "Sifiso Nkosi", email: "sifiso.n@example.co.za", phone: "073 555 0115", created_at: "2026-02-19T00:00:00Z" }
  ]
};

const typeLabels = {
  livestock_tracker: "Livestock",
  spaza_security: "Security",
  water_tank: "Water",
  electricity_monitor: "Energy",
  fleet_tracker: "Fleet",
  smart_bell: "Smart Bell"
};

// ─── Renderers ──────────────────────────────────────────────
function renderStats(overview) {
  const items = [
    { label: "Customers", value: overview.total_customers },
    { label: "Devices", value: overview.total_devices },
    { label: "Online now", value: overview.online_devices },
    { label: "Open alerts", value: overview.open_alerts }
  ];
  document.getElementById("statGrid").innerHTML = items.map((i) => `
    <div class="stat-card">
      <div class="s-num">${i.value}</div>
      <div class="s-label">${i.label}</div>
    </div>`).join("");
}

function drawLine(summaries) {
  const canvas = document.getElementById("lineChart");
  const ctx = canvas.getContext("2d");
  const w = canvas.clientWidth || 600, h = 220;
  canvas.width = w * 2; canvas.height = h * 2;
  ctx.scale(2, 2);
  ctx.clearRect(0, 0, w, h);

  const pad = 36;
  const values = summaries.map((s) => s.avg_value);
  const max = Math.max(...values, 1) * 1.1;
  const min = 0;
  const step = (w - pad * 2) / Math.max(values.length - 1, 1);

  ctx.strokeStyle = "#2E2E2E";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad + ((h - pad * 2) / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
  }

  ctx.strokeStyle = "#FFB612";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - min) / (max - min)) * (h - pad * 2);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = "#FFB612";
  values.forEach((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - min) / (max - min)) * (h - pad * 2);
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  });

  ctx.fillStyle = "#9A9A9A";
  ctx.font = "10px Space Grotesk";
  ctx.textAlign = "center";
  summaries.forEach((s, i) => {
    if (i % 2 === 0 || i === summaries.length - 1) {
      ctx.fillText(s.day.slice(5), pad + i * step, h - 12);
    }
  });
}

function drawPie(byStatus) {
  const canvas = document.getElementById("pieChart");
  const ctx = canvas.getContext("2d");
  const w = canvas.clientWidth || 300, h = 220;
  canvas.width = w * 2; canvas.height = h * 2;
  ctx.scale(2, 2);
  ctx.clearRect(0, 0, w, h);

  const colors = {
    online: "#007A4B",
    offline: "#9A9A9A",
    low_battery: "#FFB612",
    error: "#DE3831",
    provisioning: "#002395"
  };
  const entries = Object.entries(byStatus).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 12;
  let angle = -Math.PI / 2;

  entries.forEach(([status, value]) => {
    const sweep = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = colors[status] || "#555";
    ctx.fill();
    angle += sweep;
  });

  ctx.fillStyle = "#ECECEC";
  ctx.font = "11px Space Grotesk";
  ctx.textAlign = "left";
  let ly = h - 16;
  [...entries].reverse().forEach(([status, value]) => {
    ctx.fillStyle = colors[status] || "#555";
    ctx.fillRect(8, ly - 8, 10, 10);
    ctx.fillStyle = "#ECECEC";
    ctx.fillText(`${status.replace("_", " ")}: ${value} (${Math.round((value / total) * 100)}%)`, 22, ly);
    ly -= 16;
  });
}

function renderAlerts(alerts) {
  const tbody = document.querySelector("#alertTable tbody");
  tbody.innerHTML = alerts.map((a) => `
    <tr>
      <td><span class="sev ${a.severity}">${a.severity.toUpperCase()}</span></td>
      <td>${a.title}</td>
      <td>${a.device ? a.device.name : "—"}</td>
      <td>${new Date(a.created_at).toLocaleString()}</td>
    </tr>`).join("");
  if (!alerts.length) tbody.innerHTML = '<tr><td colspan="4">No alerts.</td></tr>';
}

function renderDevices(devices) {
  const tbody = document.querySelector("#deviceTable tbody");
  tbody.innerHTML = devices.map((d) => `
    <tr>
      <td>${d.name || d.serial || "—"}</td>
      <td>${typeLabels[d.device_type] || d.device_type}</td>
      <td><span class="status ${d.status}">${d.status.replace("_", " ")}</span></td>
      <td>${d.battery_pct != null ? d.battery_pct + "%" : "—"}</td>
      <td>${d.customer ? d.customer.full_name : "—"}</td>
    </tr>`).join("");
  if (!devices.length) tbody.innerHTML = '<tr><td colspan="5">No devices.</td></tr>';
}

function renderCustomers(customers) {
  const tbody = document.querySelector("#customerTable tbody");
  tbody.innerHTML = customers.map((c) => `
    <tr>
      <td>${c.full_name}</td>
      <td>${c.email}</td>
      <td>${c.phone || "—"}</td>
      <td>${c.devices || "—"}</td>
      <td>${new Date(c.created_at).toLocaleDateString()}</td>
    </tr>`).join("");
  if (!customers.length) tbody.innerHTML = '<tr><td colspan="5">No customers.</td></tr>';
}

// ─── Connection status ──────────────────────────────────────
function setConn(ok, text) {
  const el = document.getElementById("connStatus");
  el.className = "conn-badge" + (ok ? " connected" : "");
  el.textContent = text;
  document.getElementById("footerStatus").textContent = ok ? "Connected to API" : "Demo mode";
}

// ─── Loaders ────────────────────────────────────────────────
async function loadAll() {
  try {
    const metric = document.getElementById("metricSelect").value;
    const days = document.getElementById("rangeSelect").value;
    const [overview, byStatus, summaries, alerts, devices] = await Promise.all([
      fetch(`${API}/analytics/overview`).then((r) => r.json()),
      fetch(`${API}/analytics/devices-by-status`).then((r) => r.json()),
      fetch(`${API}/analytics/summaries?metric=${metric}&days=${days}`).then((r) => r.json()),
      fetch(`${API}/alerts?limit=12`).then((r) => r.json()),
      fetch(`${API}/devices?limit=100`).then((r) => r.json())
    ]);
    renderStats(overview);
    drawPie(byStatus);
    drawLine(summaries.map((s) => ({ day: s.day, avg_value: s.avg_value || 0 })));
    renderAlerts(alerts);
    renderDevices(devices);
    try {
      const customers = await fetch(`${API}/customers`).then((r) => r.json());
      renderCustomers(customers);
    } catch {
      document.getElementById("customerCard").querySelector("tbody").innerHTML =
        '<tr><td colspan="5">Requires X-API-Key header (admin).</td></tr>';
    }
    setConn(true, "Connected");
  } catch {
    loadDemo();
  }
}

function loadDemo() {
  DEMO = true;
  document.getElementById("demoBanner").hidden = false;
  renderStats(demoData.overview);
  drawPie(demoData.devicesByStatus);
  drawLine(demoData.summaries);
  renderAlerts(demoData.alerts);
  renderDevices(demoData.devices);
  renderCustomers(demoData.customers);
  setConn(false, "Demo mode");
}

// ─── Events ─────────────────────────────────────────────────
document.getElementById("refreshBtn").addEventListener("click", loadAll);
document.getElementById("metricSelect").addEventListener("change", loadAll);
document.getElementById("rangeSelect").addEventListener("change", loadAll);

// ─── App download info ──────────────────────────────────────
async function loadAppInfo() {
  try {
    const r = await fetch(API + "/app");
    if (!r.ok) return;
    const info = await r.json();
    const btn = document.getElementById("downloadBtn");
    if (btn) {
      btn.setAttribute("href", info.apk);
      btn.textContent = `⬇ Download App v${info.version}`;
    }
  } catch { /* keep static href */ }
}

// ─── Init ───────────────────────────────────────────────────
loadAppInfo();
loadAll();
