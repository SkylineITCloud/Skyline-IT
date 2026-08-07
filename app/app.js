// Mzansi Connect App - Companion Dashboard
// SPDX-License-Identifier: Apache-2.0
//
// POPIA: Client-side only; no PII stored in browser.
// ECTA:  Transactions facilitated via server API.
//
// Runs standalone in DEMO mode with sample data when the API
// server is not reachable. Serves a mobile-style companion UI.

const API = "/api/mzansi/app";
let DEMO = false;

// ─── Demo data ──────────────────────────────────────────────
const demoData = {
  devices: [
    { id: "dev-1", serial: "MZ-LS-0001", name: "Nguni Herd Collar A", device_type: "livestock_tracker", firmware_ver: "1.2.0", battery_pct: 87, status: "online" },
    { id: "dev-2", serial: "MZ-SS-0001", name: "Spaza Shop Guard", device_type: "spaza_security", firmware_ver: "1.0.4", battery_pct: 64, status: "online" },
    { id: "dev-3", serial: "MZ-WT-0001", name: "JoJo Tank Monitor", device_type: "water_tank", firmware_ver: "1.1.0", battery_pct: 91, status: "online" },
    { id: "dev-4", serial: "MZ-EM-0001", name: "Prepaid Meter Watch", device_type: "electricity_monitor", firmware_ver: "1.0.2", battery_pct: 22, status: "low_battery" },
    { id: "dev-5", serial: "MZ-FT-0001", name: "Taxi 07 (DBN Route)", device_type: "fleet_tracker", firmware_ver: "1.2.1", battery_pct: 55, status: "online" },
    { id: "dev-6", serial: "MZ-SB-0001", name: "Classroom Smart Bell", device_type: "smart_bell", firmware_ver: "1.0.0", battery_pct: 73, status: "offline" }
  ],
  alerts: [
    { id: 1, device_id: "dev-4", device_name: "Prepaid Meter Watch", alert_type: "low_battery", severity: "warning", title: "Low battery", message: "Battery at 22%. Solar panel not charging.", acknowledged: false, created_at: "2026-07-30T09:12:00Z" },
    { id: 2, device_id: "dev-2", device_name: "Spaza Shop Guard", alert_type: "motion", severity: "critical", title: "Motion after hours", message: "Motion detected at 23:41. Door was closed.", acknowledged: false, created_at: "2026-07-30T23:41:00Z" },
    { id: 3, device_id: "dev-6", device_name: "Classroom Smart Bell", alert_type: "no_signal", severity: "warning", title: "Device offline", message: "No signal for 6 hours. Check SIM or power.", acknowledged: false, created_at: "2026-07-30T07:00:00Z" },
    { id: 4, device_id: "dev-1", device_name: "Nguni Herd Collar A", alert_type: "geofence_breach", severity: "info", title: "Collar 0427 left paddock", message: "Geofence breach recorded. Location pinned.", acknowledged: true, created_at: "2026-07-29T16:20:00Z" }
  ],
  energy: [
    { kwh: 3.2, cost_zar: 10.56, interval_start: "2026-07-24T00:00:00Z" },
    { kwh: 2.8, cost_zar: 9.24, interval_start: "2026-07-25T00:00:00Z" },
    { kwh: 4.1, cost_zar: 13.53, interval_start: "2026-07-26T00:00:00Z" },
    { kwh: 3.6, cost_zar: 11.88, interval_start: "2026-07-27T00:00:00Z" },
    { kwh: 5.0, cost_zar: 16.50, interval_start: "2026-07-28T00:00:00Z" },
    { kwh: 2.2, cost_zar: 7.26, interval_start: "2026-07-29T00:00:00Z" },
    { kwh: 3.8, cost_zar: 12.54, interval_start: "2026-07-30T00:00:00Z" }
  ],
  security: [
    { id: 1, device_id: "dev-2", device_name: "Spaza Shop Guard", event_type: "motion_detected", created_at: "2026-07-30T23:41:00Z" },
    { id: 2, device_id: "dev-2", device_name: "Spaza Shop Guard", event_type: "door_opened", created_at: "2026-07-30T08:05:00Z" },
    { id: 3, device_id: "dev-2", device_name: "Spaza Shop Guard", event_type: "power_lost", created_at: "2026-07-29T21:00:00Z" },
    { id: 4, device_id: "dev-2", device_name: "Spaza Shop Guard", event_type: "power_restored", created_at: "2026-07-29T22:15:00Z" },
    { id: 5, device_id: "dev-2", device_name: "Spaza Shop Guard", event_type: "panic_button", created_at: "2026-07-28T19:02:00Z" }
  ],
  plans: [
    { id: "p1", name: "Starter", price_zar: 49, interval: "monthly", features: ["1 device", "Standard alerts", "7-day history"] },
    { id: "p2", name: "Family", price_zar: 99, interval: "monthly", features: ["5 devices", "Priority alerts", "30-day history", "Energy insights"] },
    { id: "p3", name: "Business", price_zar: 249, interval: "monthly", features: ["20 devices", "Security + camera events", "90-day history", "API access"] }
  ],
  subscriptions: [
    { id: "sub-1", plan_name: "Family", status: "active", current_period_end: "2026-08-12T00:00:00Z", cancel_at_period_end: false },
    { id: "sub-2", plan_name: "Business", status: "active", current_period_end: "2026-08-20T00:00:00Z", cancel_at_period_end: false }
  ]
};

const deviceTypeMeta = {
  livestock_tracker: { icon: "🐄", label: "Livestock Tracker" },
  spaza_security: { icon: "🔒", label: "Spaza Security" },
  water_tank: { icon: "💧", label: "Water Tank" },
  electricity_monitor: { icon: "⚡", label: "Electricity Monitor" },
  fleet_tracker: { icon: "🚕", label: "Fleet Tracker" },
  smart_bell: { icon: "🔔", label: "Smart Bell" }
};

const secTypeMeta = {
  motion_detected: { icon: "👁️", label: "Motion detected" },
  door_opened: { icon: "🚪", label: "Door opened" },
  panic_button: { icon: "🚨", label: "Panic button pressed" },
  power_lost: { icon: "🔌", label: "Power lost" },
  power_restored: { icon: "✅", label: "Power restored" }
};

// ─── Tabs ───────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
  });
});

// ─── Renderers ──────────────────────────────────────────────
function renderDevices(devices) {
  const grid = document.getElementById("deviceGrid");
  grid.innerHTML = "";
  devices.forEach((d) => {
    const meta = deviceTypeMeta[d.device_type] || { icon: "📡", label: d.device_type };
    const card = document.createElement("div");
    card.className = "device-card " + d.status;
    card.innerHTML = `
      <div class="d-icon">${meta.icon}</div>
      <h3>${d.name || d.serial}</h3>
      <div class="d-type">${meta.label} - ${d.serial}</div>
      <div class="d-meta">
        <span class="d-status ${d.status}">${d.status.replace("_", " ")}</span>
        <span>🔋 ${d.battery_pct != null ? d.battery_pct + "%" : "—"}</span>
      </div>`;
    grid.appendChild(card);
  });
  if (!devices.length) grid.innerHTML = '<div class="empty">No devices yet. Pair your first device from the app.</div>';
}

function renderAlerts(alerts) {
  const list = document.getElementById("alertList");
  list.innerHTML = "";
  alerts.forEach((a) => {
    const item = document.createElement("div");
    item.className = "alert-item " + a.severity;
    item.innerHTML = `
      <div class="a-head">
        <h3>${a.title}</h3>
        <span class="a-time">${new Date(a.created_at).toLocaleString()}</span>
      </div>
      <p>${a.device_name || "Device"} - ${a.message || ""}</p>
      ${a.acknowledged ? "" : '<button class="ack-btn" data-id="' + a.id + '">Acknowledge</button>'}`;
    list.appendChild(item);
  });
  if (!alerts.length) list.innerHTML = '<div class="empty">No alerts. You are all clear.</div>';
  const unack = alerts.filter((a) => !a.acknowledged).length;
  document.getElementById("alertCount").textContent = unack;
  if (!unack) document.getElementById("alertCount").style.display = "none";

  list.querySelectorAll(".ack-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (DEMO) {
        const alert = demoData.alerts.find((a) => a.id === Number(id));
        if (alert) alert.acknowledged = true;
        renderAlerts(demoData.alerts);
        return;
      }
      try {
        await fetch(`${API}/alerts/${id}/ack`, { method: "PUT" });
        loadAll();
      } catch { loadDemo(); }
    });
  });
}

function renderEnergy(energy) {
  const total = energy.reduce((s, e) => s + e.kwh, 0);
  const cost = energy.reduce((s, e) => s + (e.cost_zar || 0), 0);
  document.getElementById("energySummary").innerHTML = `
    <div class="energy-stat"><strong>${total.toFixed(1)}</strong><span>kWh (7 days)</span></div>
    <div class="energy-stat"><strong>R${cost.toFixed(2)}</strong><span>Estimated cost</span></div>`;
  drawChart(energy);
}

function drawChart(energy) {
  const canvas = document.getElementById("energyChart");
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const pad = 26;
  const max = Math.max(...energy.map((e) => e.kwh), 1);
  const barW = (w - pad * 2) / energy.length;
  const gold = "#FFB612", line = "#2E2E2E";

  ctx.strokeStyle = line;
  ctx.beginPath();
  ctx.moveTo(pad, h - pad);
  ctx.lineTo(w - 4, h - pad);
  ctx.stroke();

  energy.forEach((e, i) => {
    const bh = (e.kwh / max) * (h - pad * 2);
    const x = pad + i * barW + barW * 0.15;
    ctx.fillStyle = gold;
    ctx.fillRect(x, h - pad - bh, barW * 0.7, bh);
    ctx.fillStyle = "#9A9A9A";
    ctx.font = "10px Space Grotesk";
    ctx.textAlign = "center";
    ctx.fillText(e.kwh.toFixed(1), x + barW * 0.35, h - pad - bh - 6);
    ctx.fillText(new Date(e.interval_start).toLocaleDateString(undefined, { weekday: "short" }), x + barW * 0.35, h - 8);
  });
}

function renderSecurity(events) {
  const motion = events.filter((e) => e.event_type === "motion_detected").length;
  const doors = events.filter((e) => e.event_type === "door_opened").length;
  const panics = events.filter((e) => e.event_type === "panic_button").length;
  document.getElementById("securityStats").innerHTML = `
    <div><strong>${motion}</strong><span>Motion</span></div>
    <div><strong>${doors}</strong><span>Door opens</span></div>
    <div><strong>${panics}</strong><span>Panics</span></div>`;

  const feed = document.getElementById("securityFeed");
  feed.innerHTML = "";
  events.forEach((e) => {
    const meta = secTypeMeta[e.event_type] || { icon: "📡", label: e.event_type };
    const item = document.createElement("div");
    item.className = "sec-item";
    item.innerHTML = `
      <span class="s-icon">${meta.icon}</span>
      <div>
        <h3>${meta.label}</h3>
        <p>${e.device_name || "Device"}</p>
        <time>${new Date(e.created_at).toLocaleString()}</time>
      </div>`;
    feed.appendChild(item);
  });
  if (!events.length) feed.innerHTML = '<div class="empty">No security events recorded.</div>';
}

function renderPlans(plans, subs) {
  const grid = document.getElementById("planGrid");
  grid.innerHTML = "";
  plans.forEach((p, i) => {
    const card = document.createElement("div");
    card.className = "plan-card" + (i === 1 ? " featured" : "");
    card.innerHTML = `
      <h3>${p.name}</h3>
      <div class="price">R${p.price_zar}<small>/month</small></div>
      <ul>${p.features.map((f) => `<li>${f}</li>`).join("")}</ul>`;
    grid.appendChild(card);
  });

  const list = document.getElementById("subList");
  list.innerHTML = "";
  subs.forEach((s) => {
    const item = document.createElement("div");
    item.className = "sub-item";
    item.innerHTML = `
      <div>
        <h3>${s.plan_name || "Plan"}</h3>
        <p>Renews ${new Date(s.current_period_end).toLocaleDateString()}${s.cancel_at_period_end ? " - cancels after this period" : ""}</p>
      </div>
      <span class="sub-status ${s.status}">${s.status.replace("_", " ")}</span>
      ${s.cancel_at_period_end ? "" : `<button class="cancel-btn" data-id="${s.id}">Cancel</button>`}`;
    list.appendChild(item);
  });
  if (!subs.length) list.innerHTML = '<div class="empty">No active subscriptions.</div>';

  list.querySelectorAll(".cancel-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (DEMO) {
        const sub = demoData.subscriptions.find((s) => s.id === btn.dataset.id);
        if (sub) sub.cancel_at_period_end = true;
        renderPlans(demoData.plans, demoData.subscriptions);
        return;
      }
      try {
        await fetch(`${API}/subscriptions/${btn.dataset.id}/cancel`, { method: "PUT" });
        loadAll();
      } catch { loadDemo(); }
    });
  });
}

// ─── Connection status ──────────────────────────────────────
function setConn(ok, text) {
  document.getElementById("connDot").className = "conn-dot " + (ok ? "connected" : "");
  document.getElementById("connText").textContent = text;
}

// ─── Loaders ────────────────────────────────────────────────
async function loadAll() {
  try {
    const endpoints = {
      devices: "/devices",
      alerts: "/alerts",
      energy: "/energy/dev-4",
      security: "/security/dev-2",
      plans: "/plans",
      subs: "/subscriptions"
    };
    const keys = Object.keys(endpoints);
    const results = await Promise.all(
      keys.map((k) => fetch(API + endpoints[k]).then((r) => (r.ok ? r.json() : Promise.reject())))
    );
    const [devices, alerts, energy, security, plans, subs] = results;
    renderDevices(devices);
    renderAlerts(alerts);
    renderEnergy(energy);
    renderSecurity(security);
    renderPlans(plans, subs);
    setConn(true, "Connected");
  } catch {
    loadDemo();
  }
}

function loadDemo() {
  DEMO = true;
  document.getElementById("demoBanner").hidden = false;
  renderDevices(demoData.devices);
  renderAlerts(demoData.alerts);
  renderEnergy(demoData.energy);
  renderSecurity(demoData.security);
  renderPlans(demoData.plans, demoData.subscriptions);
  setConn(false, "Demo data");
}

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
    const sizeEl = document.getElementById("apkSize");
    if (sizeEl && info.sizeBytes) {
      sizeEl.textContent = `Android APK · v${info.version} · ${(info.sizeBytes / 1048576).toFixed(1)} MB`;
    }
  } catch { /* keep static href */ }
}

// ─── Init ───────────────────────────────────────────────────
loadAppInfo();
loadAll();
