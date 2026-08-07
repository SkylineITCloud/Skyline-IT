// Mzansi Marketplace - Jobs & Technicians
// SPDX-License-Identifier: Apache-2.0
//
// POPIA: Client-side only; no PII stored in browser.
// ECTA:  Transactions facilitated via server API.
//
// Runs standalone in DEMO mode with sample data when the API
// server is not reachable.

const API = "/api/mzansi/marketplace";
let DEMO = false;
let jobsCache = [];

// ─── Demo data ──────────────────────────────────────────────
const demoData = {
  jobs: [
    { id: "j1", title: "Install Spaza Shop Security", description: "Mount motion sensor, door sensor, and panic button. Customer in Umlazi.", device_type: "spaza_security", town: "Umlazi", province: "KwaZulu-Natal", pay_rand: 850, status: "open", created_at: "2026-07-30T10:00:00Z" },
    { id: "j2", title: "Solar-powered tank monitor", description: "Fit water level sensor to 5000L JoJo tank and pair with app.", device_type: "water_tank", town: "Cato Manor", province: "KwaZulu-Natal", pay_rand: 620, status: "open", created_at: "2026-07-30T09:15:00Z" },
    { id: "j3", title: "Livestock collar pairing", description: "Configure 8 GPS collars for a smallholder herd and demo the dashboard.", device_type: "livestock_tracker", town: "Mooi River", province: "KwaZulu-Natal", pay_rand: 1400, status: "open", created_at: "2026-07-29T14:30:00Z" },
    { id: "j4", title: "Prepaid meter monitor install", description: "Install electricity monitor on prepaid meter, verify readings.", device_type: "electricity_monitor", town: "KwaMashu", province: "KwaZulu-Natal", pay_rand: 480, status: "open", created_at: "2026-07-29T08:00:00Z" },
    { id: "j5", title: "Taxi fleet tracker batch", description: "Fit 5 fleet trackers to minibus taxis. Must have GSM wiring experience.", device_type: "fleet_tracker", town: "Durban", province: "KwaZulu-Natal", pay_rand: 2200, status: "open", created_at: "2026-07-28T16:45:00Z" },
    { id: "j6", title: "Smart bell wiring", description: "Wire smart bell system across 8 classrooms.", device_type: "smart_bell", town: "Inanda", province: "KwaZulu-Natal", pay_rand: 1800, status: "assigned", created_at: "2026-07-28T11:20:00Z" }
  ],
  technicians: [
    { id: "t1", full_name: "Sanele Mkhize", town: "Umlazi", rating_avg: 4.9, jobs_done: 47, skills: ["esp32", "solar", "wiring"], verified: true },
    { id: "t2", full_name: "Bongani Zulu", town: "KwaMashu", rating_avg: 4.7, jobs_done: 32, skills: ["gsm", "gps", "wiring"], verified: true },
    { id: "t3", full_name: "Ayanda Ndlovu", town: "Cato Manor", rating_avg: 4.8, jobs_done: 28, skills: ["esp32", "water", "solar"], verified: true },
    { id: "t4", full_name: "Thulani Khumalo", town: "Durban", rating_avg: 4.6, jobs_done: 19, skills: ["fleet", "gsm", "gps"], verified: true },
    { id: "t5", full_name: "Zanele Dube", town: "Mooi River", rating_avg: 5.0, jobs_done: 12, skills: ["livestock", "solar", "esp32"], verified: true }
  ],
  earnings: [
    { id: "e1", amount_rand: 1400, status: "paid", created_at: "2026-07-25T00:00:00Z" },
    { id: "e2", amount_rand: 850, status: "paid", created_at: "2026-07-21T00:00:00Z" },
    { id: "e3", amount_rand: 620, status: "pending", created_at: "2026-07-30T00:00:00Z" },
    { id: "e4", amount_rand: 480, status: "pending", created_at: "2026-07-30T00:00:00Z" }
  ]
};

const deviceLabels = {
  livestock_tracker: "🐄 Livestock",
  spaza_security: "🔒 Security",
  water_tank: "💧 Water",
  electricity_monitor: "⚡ Energy",
  fleet_tracker: "🚕 Fleet",
  smart_bell: "🔔 Smart Bell"
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
function renderJobs(jobs) {
  jobsCache = jobs;
  const grid = document.getElementById("jobGrid");
  const q = (document.getElementById("jobSearch").value || "").toLowerCase();
  const filtered = jobs.filter((j) =>
    !q || j.town.toLowerCase().includes(q) || (j.device_type || "").includes(q) || (j.title || "").toLowerCase().includes(q)
  );
  grid.innerHTML = filtered.map((j) => `
    <div class="job-card">
      <div class="j-meta">
        <span>${deviceLabels[j.device_type] || "📡 " + (j.device_type || "Device")}</span>
        <span>📍 ${j.town}, ${j.province}</span>
      </div>
      <h3>${j.title}</h3>
      <p class="j-desc">${j.description || ""}</p>
      <div class="j-pay">R${Number(j.pay_rand).toLocaleString()}</div>
      <div class="j-foot">
        <span class="job-status ${j.status}">${j.status.replace("_", " ")}</span>
        ${j.status === "open" ? `<button class="apply-btn" data-id="${j.id}">Apply</button>` : ""}
      </div>
    </div>`).join("");
  if (!filtered.length) grid.innerHTML = '<div class="empty">No jobs match your search.</div>';

  grid.querySelectorAll(".apply-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const job = jobsCache.find((j) => j.id === btn.dataset.id);
      if (!job) return;
      btn.textContent = "Applied ✓";
      btn.disabled = true;
      btn.style.background = "var(--sa-green)";
      btn.style.color = "#fff";
    });
  });
}

function renderTechnicians(techs) {
  const grid = document.getElementById("techGrid");
  grid.innerHTML = techs.map((t) => `
    <div class="tech-card">
      <div class="t-head">
        <h3>${t.full_name}</h3>
        <span class="t-rating">★ ${Number(t.rating_avg).toFixed(1)}</span>
      </div>
      <div class="t-town">📍 ${t.town}, ${t.province || "KwaZulu-Natal"}</div>
      <div class="t-skills">
        ${(t.skills || []).map((s) => `<span class="skill-tag">${s}</span>`).join("")}
      </div>
      <div class="t-stats">
        <span><strong>${t.jobs_done}</strong> jobs done</span>
        <span>${t.verified ? "✅ Verified" : "Pending verification"}</span>
      </div>
    </div>`).join("");
  if (!techs.length) grid.innerHTML = '<div class="empty">No technicians registered yet.</div>';
}

function renderEarnings(earnings) {
  const total = (earnings.payouts || earnings).reduce((s, p) => s + Number(p.amount_rand), 0);
  const paid = (earnings.payouts || earnings).filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount_rand), 0);
  const pending = total - paid;
  document.getElementById("earningsSummary").innerHTML = `
    <div class="e-stat"><strong>R${total.toLocaleString()}</strong><span>Total earnings</span></div>
    <div class="e-stat"><strong>R${paid.toLocaleString()}</strong><span>Paid out</span></div>
    <div class="e-stat"><strong>R${pending.toLocaleString()}</strong><span>Pending</span></div>`;

  const list = document.getElementById("payoutList");
  list.innerHTML = (earnings.payouts || earnings).map((p) => `
    <div class="payout-item">
      <div>
        <strong>R${Number(p.amount_rand).toLocaleString()}</strong>
        <small> - ${new Date(p.created_at).toLocaleDateString()}</small>
      </div>
      <span class="p-status ${p.status}">${p.status}</span>
    </div>`).join("");
  if (!(earnings.payouts || earnings).length) list.innerHTML = '<div class="empty">No payouts yet.</div>';
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
    const [jobs, techs, earnings] = await Promise.all([
      fetch(`${API}/jobs?limit=50`).then((r) => r.json()),
      fetch(`${API}/technicians?limit=50`).then((r) => r.json()),
      fetch(`${API}/earnings/demo-technician`).then((r) => r.json())
    ]);
    renderJobs(jobs);
    renderTechnicians(techs);
    renderEarnings(earnings);
    setConn(true, "Connected");
  } catch {
    loadDemo();
  }
}

function loadDemo() {
  DEMO = true;
  document.getElementById("demoBanner").hidden = false;
  renderJobs(demoData.jobs);
  renderTechnicians(demoData.technicians);
  renderEarnings({ payouts: demoData.earnings });
  setConn(false, "Demo mode");
}

// ─── Events ─────────────────────────────────────────────────
document.getElementById("refreshBtn").addEventListener("click", loadAll);
document.getElementById("jobSearch").addEventListener("input", () => renderJobs(jobsCache));

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
