// Malaysia Haze Dashboard
// Configure API_BASE_URL below after deploying the Cloudflare Worker.
// The Worker keeps the DOE APIMS request server-side and can cache it.

const CONFIG = {
  API_BASE_URL: "https://malaysiahazeindex.rogerktj.workers.dev/api/apims",
  REFRESH_MS: 5 * 60 * 1000,
  STORAGE_KEY: "malaysia-haze-dashboard.locations",

  // Empty initially on purpose: choose the stations/locations you want
  // from the search box, then they are remembered in this browser.
  DEFAULT_LOCATION_IDS: []
};

const state = {
  stations: [],
  selectedIds: loadSelectedIds(),
  refreshTimer: null
};

const els = {
  cards: document.getElementById("cards"),
  searchInput: document.getElementById("searchInput"),
  searchResults: document.getElementById("searchResults"),
  locationCount: document.getElementById("locationCount"),
  lastUpdated: document.getElementById("lastUpdated"),
  message: document.getElementById("message"),
  refreshBtn: document.getElementById("refreshBtn")
};

function loadSelectedIds() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY));
    return Array.isArray(saved) ? saved : [...CONFIG.DEFAULT_LOCATION_IDS];
  } catch {
    return [...CONFIG.DEFAULT_LOCATION_IDS];
  }
}

function saveSelectedIds() {
  localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.selectedIds));
}

function showMessage(text) {
  els.message.textContent = text;
  els.message.classList.remove("hidden");
}

function hideMessage() {
  els.message.classList.add("hidden");
}

function apiClass(value) {
  const n = Number(value);
  const cls = String(value || "").trim();

  if (cls) return cls;
  if (!Number.isFinite(n)) return "Unknown";
  if (n <= 50) return "Good";
  if (n <= 100) return "Moderate";
  if (n <= 200) return "Unhealthy";
  if (n <= 300) return "Very Unhealthy";
  return "Hazardous";
}

function guidance(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) return "No activity guidance is available for this reading.";
  if (n <= 50) return "Normal outdoor activities are generally suitable.";
  if (n <= 100) return "Outdoor activities can continue. People who are unusually sensitive may prefer shorter or lighter activity.";
  if (n <= 200) return "Reduce prolonged or strenuous outdoor activity. Sensitive people should consider limiting outdoor time.";
  if (n <= 300) return "Avoid prolonged outdoor activity and reduce strenuous exercise. Consider staying indoors when possible.";
  if (n <= 500) return "Minimise outdoor activity. Avoid strenuous exercise and follow current health advice.";
  return "Emergency-level reading. Avoid outdoor activity and follow official health and emergency guidance.";
}

function classTone(value) {
  const n = Number(value);
  const cls = String(value || "").toLowerCase();

  if (cls.includes("good") || (!cls && n <= 50)) return "good";
  if (cls.includes("moderate") || (!cls && n <= 100)) return "moderate";
  if (cls.includes("very") || (!cls && n <= 300)) return "very-unhealthy";
  if (cls.includes("hazard") || (!cls && n > 300)) return "hazardous";
  return "unhealthy";
}

function normalizeStation(item) {
  const a = item?.attributes || item || {};
  return {
    id: String(a.STATION_ID ?? ""),
    location: String(a.STATION_LOCATION ?? a.PLACE ?? "Unknown location"),
    state: String(a.STATE_NAME ?? ""),
    place: String(a.PLACE ?? ""),
    api: a.API == null ? null : Number(a.API),
    pm10Api: a.API_PM10 == null ? null : Number(a.API_PM10),
    pollutant: String(a.PARAM_SELECTED ?? a.PARAM_SYMBOL ?? ""),
    className: apiClass(a.CLASS ?? ""),
    category: String(a.STATION_CATEGORY ?? ""),
    timestamp: a.DATETIME == null ? null : Number(a.DATETIME),
    latitude: a.LATITUDE == null ? null : Number(a.LATITUDE),
    longitude: a.LONGITUDE == null ? null : Number(a.LONGITUDE)
  };
}

async function fetchStations() {
  if (CONFIG.API_BASE_URL.includes("YOUR-WORKER")) {
    throw new Error("Set CONFIG.API_BASE_URL in app.js to your Cloudflare Worker URL.");
  }

  const response = await fetch(CONFIG.API_BASE_URL, {
    headers: { "Accept": "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Data service returned HTTP ${response.status}.`);
  }

  const data = await response.json();
  const raw = Array.isArray(data) ? data : Array.isArray(data.features) ? data.features : [];
  return raw.map(normalizeStation).filter(x => x.id);
}

function formatReadingTime(timestamp) {
  if (!timestamp) return "Reading time unavailable";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Reading time unavailable";
  return date.toLocaleString("en-MY", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function render() {
  const selected = state.selectedIds
    .map(id => state.stations.find(s => s.id === id))
    .filter(Boolean);

  els.locationCount.textContent = String(selected.length);

  if (!selected.length) {
    els.cards.innerHTML = `
      <div class="empty">
        <strong>No locations selected yet.</strong><br>
        Search for a location above and add the ones you want on the dashboard.
      </div>
    `;
    return;
  }

  els.cards.innerHTML = "";

  for (const station of selected) {
    const card = document.getElementById("cardTemplate").content.cloneNode(true);
    const root = card.querySelector(".card");
    const tone = classTone(station.api ?? station.className);

    root.querySelector(".location").textContent = station.location;
    root.querySelector(".state").textContent = station.state || station.category || "Malaysia";
    root.querySelector(".api-number").textContent =
      Number.isFinite(station.api) ? Math.round(station.api) : "—";

    const badge = root.querySelector(".class-badge");
    badge.textContent = station.className;
    badge.classList.add(tone);

    root.querySelector(".pollutant").textContent =
      station.pollutant ? `Main pollutant: ${station.pollutant}` : "Main pollutant: —";

    root.querySelector(".activity-text").textContent = guidance(station.api);

    root.querySelector(".station").textContent =
      station.place ? `Station: ${station.place}` : `Station ID: ${station.id}`;

    root.querySelector(".reading-time").textContent =
      `Reading: ${formatReadingTime(station.timestamp)}`;

    root.querySelector(".remove").addEventListener("click", () => removeLocation(station.id));

    els.cards.appendChild(card);
  }
}

function removeLocation(id) {
  state.selectedIds = state.selectedIds.filter(x => x !== id);
  saveSelectedIds();
  render();
}

function addLocation(id) {
  if (!state.selectedIds.includes(id)) {
    state.selectedIds.push(id);
    saveSelectedIds();
  }
  els.searchInput.value = "";
  els.searchResults.classList.add("hidden");
  render();
}

function searchStations(query) {
  const q = query.trim().toLowerCase();

  if (!q) {
    els.searchResults.classList.add("hidden");
    els.searchResults.innerHTML = "";
    return;
  }

  const results = state.stations
    .filter(s =>
      s.location.toLowerCase().includes(q) ||
      s.state.toLowerCase().includes(q) ||
      s.place.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
    )
    .slice(0, 15);

  if (!results.length) {
    els.searchResults.innerHTML = `<div class="result">No matching APIMS locations found.</div>`;
    els.searchResults.classList.remove("hidden");
    return;
  }

  els.searchResults.innerHTML = "";

  for (const station of results) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "result";
    button.innerHTML = `
      <strong>${escapeHtml(station.location)}</strong>
      <span>${escapeHtml([station.state, station.place || station.id].filter(Boolean).join(" · "))}</span>
    `;
    button.addEventListener("click", () => addLocation(station.id));
    els.searchResults.appendChild(button);
  }

  els.searchResults.classList.remove("hidden");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function refresh() {
  els.refreshBtn.disabled = true;
  els.refreshBtn.textContent = "…";

  try {
    const stations = await fetchStations();
    state.stations = stations;
    hideMessage();
    els.lastUpdated.textContent = new Date().toLocaleTimeString("en-MY", {
      hour: "2-digit",
      minute: "2-digit"
    });

    // Remove saved IDs that no longer exist in the upstream data.
    const known = new Set(stations.map(s => s.id));
    state.selectedIds = state.selectedIds.filter(id => known.has(id));
    saveSelectedIds();

    render();
  } catch (error) {
    showMessage(error.message || "Unable to load APIMS data.");
    if (!state.stations.length) render();
  } finally {
    els.refreshBtn.disabled = false;
    els.refreshBtn.textContent = "↻";
  }
}

els.searchInput.addEventListener("input", e => searchStations(e.target.value));
els.refreshBtn.addEventListener("click", refresh);

document.addEventListener("click", e => {
  if (!e.target.closest(".toolbar")) {
    els.searchResults.classList.add("hidden");
  }
});

refresh();
state.refreshTimer = setInterval(refresh, CONFIG.REFRESH_MS);
