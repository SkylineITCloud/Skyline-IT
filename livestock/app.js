// LiveStock GPS Tracker — Web Dashboard
// SPDX-License-Identifier: Apache-2.0
//
// POPIA: Client-side only; no PII stored in browser.
// ECTA:  Electronic transactions facilitated via server API.

const API = "/api/mzansi/livestock";

const map = L.map("map").setView([-25.0, 134.0], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 18,
}).addTo(map);

const markers = {};
const panicMarkers = {};

const selectedIcon = L.divIcon({
  className: "", html: `<div style="width:18px;height:18px;border-radius:50%;background:#e94560;border:3px solid white;box-shadow:0 0 8px rgba(233,69,96,0.6);"></div>`, iconSize: [18,18], iconAnchor: [9,9]
});

const defaultIcon = L.divIcon({
  className: "", html: `<div style="width:14px;height:14px;border-radius:50%;background:#3498db;border:2px solid white;box-shadow:0 0 4px rgba(52,152,219,0.5);"></div>`, iconSize: [14,14], iconAnchor: [7,7]
});

const panicIcon = L.divIcon({
  className: "", html: `<div style="width:22px;height:22px;border-radius:50%;background:#e74c3c;border:3px solid #ff0;box-shadow:0 0 16px rgba(231,76,60,0.9);animation:pulse 1s infinite;"></div>`, iconSize: [22,22], iconAnchor: [11,11]
});

let selectedAnimalId = null;
let animalsData = [];
let activePanics = [];

// ─── Inject pulse animation ─────────────────────────────────
(function() {
  const style = document.createElement("style");
  style.textContent = `@keyframes pulse { 0%{transform:scale(1);opacity:1} 50%{transform:scale(1.3);opacity:0.7} 100%{transform:scale(1);opacity:1} }`;
  document.head.appendChild(style);
})();

// ─── Render sidebar ────────────────────────────────────────
function renderAnimalList(animals) {
  const container = document.getElementById("animalList");
  container.innerHTML = "";
  animalsData = animals;
  const panickedIds = new Set(activePanics.map(p => p.animal_id));

  animals.forEach((a) => {
    const isPanicking = panickedIds.has(a.animal_id);
    const card = document.createElement("div");
    card.className = "animal-card" + (a.animal_id === selectedAnimalId ? " selected" : "") + (isPanicking ? " panicking" : "");
    card.innerHTML = `
      <div class="tag">${a.tag || "—"} ${isPanicking ? "🚨" : ""}</div>
      <div class="species">${a.species || "—"} ${a.name ? "· " + a.name : ""}</div>
      <div class="meta">
        <span>${a.speed_kmh ? a.speed_kmh.toFixed(1) + " km/h" : "—"}</span>
        <span class="battery">${a.battery_v ? a.battery_v.toFixed(2) + "V" : "—"}</span>
      </div>
      ${isPanicking ? `<div class="panic-badge">PANIC — ${activePanics.find(p => p.animal_id === a.animal_id)?.trigger || ""}</div>` : ""}
    `;
    card.addEventListener("click", () => focusAnimal(a.animal_id));
    container.appendChild(card);
  });

  document.getElementById("animalCount").textContent = animals.length + " animals";
}

// ─── Panic alert bar ────────────────────────────────────────
function renderPanicBar(panics) {
  const bar = document.getElementById("panicBar");
  if (!panics.length) { bar.style.display = "none"; return; }
  bar.style.display = "flex";
  bar.innerHTML = panics.map(p => `
    <div class="panic-item severity-${p.severity}" onclick="focusAnimal('${p.animal_id}')">
      <strong>${p.tag || "Unknown"}</strong>
      <span>${p.trigger}</span>
      <small>${new Date(p.created_at).toLocaleTimeString()}</small>
    </div>
  `).join("");
}

// ─── Update markers on map ─────────────────────────────────
function updateMarkers(animals) {
  const panickedIds = new Set(activePanics.map(p => p.animal_id));

  animals.forEach((a) => {
    if (!a.latitude || !a.longitude) return;
    const latlng = [a.latitude, a.longitude];
    const isPanicking = panickedIds.has(a.animal_id);
    const isSelected = a.animal_id === selectedAnimalId;

    if (isPanicking) {
      if (markers[a.animal_id]) map.removeLayer(markers[a.animal_id]);
      if (!panicMarkers[a.animal_id]) {
        const m = L.marker(latlng, { icon: panicIcon }).addTo(map);
        const panic = activePanics.find(p => p.animal_id === a.animal_id);
        const subInfo = panic?.sub_collar_id ? `<br>Sub-collar: ${panic.sub_collar_id}` : "";
        m.bindPopup(`
          <strong>🚨 ${a.tag || "Unknown"}</strong><br>
          <span style="color:#e74c3c">PANIC: ${panic?.trigger || "Unknown"}</span>${subInfo}<br>
          ${a.latitude.toFixed(5)}, ${a.longitude.toFixed(5)}<br>
          Speed: ${a.speed_kmh ? a.speed_kmh.toFixed(1) + " km/h" : "—"}<br>
          ${panic?.message || ""}
        `);
        panicMarkers[a.animal_id] = m;
      }
      return;
    }

    if (panicMarkers[a.animal_id]) {
      map.removeLayer(panicMarkers[a.animal_id]);
      delete panicMarkers[a.animal_id];
    }

    const icon = isSelected ? selectedIcon : defaultIcon;
    if (markers[a.animal_id]) {
      markers[a.animal_id].setLatLng(latlng).setIcon(icon);
    } else {
      const m = L.marker(latlng, { icon }).addTo(map);
      m.bindPopup(`<strong>${a.tag || "Unknown"}</strong><br>${a.species || ""}<br>${a.latitude.toFixed(5)}, ${a.longitude.toFixed(5)}<br>Speed: ${a.speed_kmh ? a.speed_kmh.toFixed(1)+" km/h" : "—"}<br>Battery: ${a.battery_v ? a.battery_v.toFixed(2)+"V" : "—"}`);
      markers[a.animal_id] = m;
    }
  });

  const activeIds = new Set(animals.map(a => a.animal_id));
  Object.keys(markers).forEach(id => { if (!activeIds.has(id)) { map.removeLayer(markers[id]); delete markers[id]; } });
  Object.keys(panicMarkers).forEach(id => { if (!activePanics.some(p => p.animal_id === id)) { map.removeLayer(panicMarkers[id]); delete panicMarkers[id]; } });
}

// ─── Focus map on animal ───────────────────────────────────
function focusAnimal(animalId) {
  selectedAnimalId = animalId;
  const animal = animalsData.find(a => a.animal_id === animalId);
  if (animal && animal.latitude && animal.longitude) map.setView([animal.latitude, animal.longitude], 14);
  fetchLatest();
}

// ─── Fetch latest locations ────────────────────────────────
async function fetchLatest() {
  try {
    const r = await fetch(API + "/latest");
    if (!r.ok) throw new Error("fetch failed");
    const data = await r.json();
    document.getElementById("connectionStatus").textContent = "Connected (poll)";
    document.getElementById("connectionStatus").className = "connected";
    document.getElementById("lastUpdate").textContent = "Updated " + new Date().toLocaleTimeString();
    const activeData = data.filter(d => d.latitude && d.longitude);
    renderAnimalList(activeData);
    updateMarkers(activeData);
    const bats = activeData.filter(d => d.battery_v != null).map(d => d.battery_v);
    if (bats.length) document.getElementById("avgBattery").textContent = (bats.reduce((a,b)=>a+b,0)/bats.length).toFixed(2)+"V";
    document.getElementById("activeToday").textContent = activeData.length;
  } catch {
    document.getElementById("connectionStatus").textContent = "Error fetching data";
    document.getElementById("connectionStatus").className = "disconnected";
  }
}

// ─── Fetch active panics ───────────────────────────────────
async function fetchPanics() {
  try {
    const r = await fetch(API + "/panic/active");
    if (!r.ok) throw new Error("fetch failed");
    activePanics = await r.json();
  } catch {
    activePanics = [];
  }
  renderPanicBar(activePanics);
  fetchLatest();
}

// ─── Init ──────────────────────────────────────────────────
fetchPanics();
fetchLatest();
setInterval(fetchLatest, 15000);
setInterval(fetchPanics, 10000);
