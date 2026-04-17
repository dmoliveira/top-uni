const THEME_KEY = "topuni-theme";

function syncTopbarOffset() {
  const topbar = document.querySelector(".topbar-shell");
  const height = topbar ? Math.ceil(topbar.getBoundingClientRect().height) : 84;
  document.documentElement.style.setProperty("--topbar-offset", `${height}px`);
}

const COUNTRY_FLAGS = {
  Australia: "🇦🇺",
  Austria: "🇦🇹",
  Belgium: "🇧🇪",
  Canada: "🇨🇦",
  China: "🇨🇳",
  Denmark: "🇩🇰",
  Finland: "🇫🇮",
  France: "🇫🇷",
  Germany: "🇩🇪",
  "Hong Kong": "🇭🇰",
  India: "🇮🇳",
  Ireland: "🇮🇪",
  Israel: "🇮🇱",
  Italy: "🇮🇹",
  Japan: "🇯🇵",
  Lebanon: "🇱🇧",
  Luxembourg: "🇱🇺",
  Macao: "🇲🇴",
  Malaysia: "🇲🇾",
  Netherlands: "🇳🇱",
  "New Zealand": "🇳🇿",
  Norway: "🇳🇴",
  Qatar: "🇶🇦",
  "Russian Federation": "🇷🇺",
  "Saudi Arabia": "🇸🇦",
  Singapore: "🇸🇬",
  "South Korea": "🇰🇷",
  Sweden: "🇸🇪",
  Switzerland: "🇨🇭",
  Taiwan: "🇹🇼",
  "United Kingdom": "🇬🇧",
  "United States": "🇺🇸",
};

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

function dataPath(filename) {
  return /\/(regions|countries|universities)\//.test(window.location.pathname)
    ? `../data/${filename}`
    : `./data/${filename}`;
}

function countryFlag(country) {
  return COUNTRY_FLAGS[country] || "🌍";
}

function positiveInt(value, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : fallback;
}

function link(label, url, className = "") {
  return url ? `<a class="${className}" href="${url}" target="_blank" rel="noreferrer">${label}</a>` : "—";
}

function tagList(items = []) {
  return items.map((item) => `<span class="tag">${item}</span>`).join("");
}

function numericScore(value) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const matches = String(value).match(/\d+(?:\.\d+)?/g);
  if (!matches?.length) return 0;
  const nums = matches.map(Number);
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function compareUniversities(a, b, mode) {
  switch (mode) {
    case "name-asc":
      return a.name.localeCompare(b.name);
    case "country-asc":
      return a.country.localeCompare(b.country) || a.rank - b.rank;
    case "founded-asc":
      return (a.founded || 99999) - (b.founded || 99999) || a.rank - b.rank;
    case "founded-desc":
      return (b.founded || 0) - (a.founded || 0) || a.rank - b.rank;
    case "score-desc":
      return numericScore(b.scorecard.overall) - numericScore(a.scorecard.overall) || a.rank - b.rank;
    case "rank-asc":
    default:
      return a.rank - b.rank;
  }
}

function applyTheme(theme) {
  const root = document.documentElement;
  const resolved = theme === "auto"
    ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : theme;
  root.dataset.theme = resolved;
  document.querySelectorAll(".theme-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.themeOption === theme);
  });
}

function initTheme() {
  const params = new URLSearchParams(window.location.search);
  const saved = params.get("theme") || localStorage.getItem(THEME_KEY) || "auto";
  applyTheme(saved);
  document.querySelectorAll(".theme-button").forEach((button) => {
    button.addEventListener("click", () => {
      const theme = button.dataset.themeOption || "auto";
      localStorage.setItem(THEME_KEY, theme);
      applyTheme(theme);
      const next = new URLSearchParams(window.location.search);
      theme === "auto" ? next.delete("theme") : next.set("theme", theme);
      const url = `${window.location.pathname}${next.toString() ? `?${next.toString()}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", url);
    });
  });
}

window.addEventListener("resize", syncTopbarOffset);
window.addEventListener("load", syncTopbarOffset);

function renderOverview(universities) {
  const body = document.getElementById("overview-body");
  const search = document.getElementById("search");
  const countryFilter = document.getElementById("country-filter");
  const sortBy = document.getElementById("sort-by");
  const pageSize = document.getElementById("page-size");
  const prev = document.getElementById("page-prev");
  const next = document.getElementById("page-next");
  const pageStatus = document.getElementById("page-status");
  const countEl = document.getElementById("overview-count");
  const clearFilters = document.getElementById("clear-filters");
  const emptyState = document.getElementById("empty-state");
  if (!body || !search || !countryFilter || !sortBy || !pageSize || !prev || !next || !pageStatus || !countEl || !clearFilters || !emptyState) return;

  let currentPage = 1;
  const params = new URLSearchParams(window.location.search);
  const countries = [...new Set(universities.map((u) => u.country).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  countryFilter.innerHTML = '<option value="">🌍 All countries</option>' + countries.map((country) => `<option value="${country}">${countryFlag(country)} ${country}</option>`).join("");
  if (params.get("search")) search.value = params.get("search");
  if (params.get("country")) countryFilter.value = params.get("country");
  if (params.get("sort")) sortBy.value = params.get("sort");
  if (params.get("pageSize")) pageSize.value = params.get("pageSize");
  currentPage = positiveInt(params.get("page"), 1);

  function filteredData() {
    const q = search.value.toLowerCase().trim();
    const country = countryFilter.value;
    const sort = sortBy.value;
    return universities
      .filter((u) => !country || u.country === country)
      .filter((u) => !q || [u.name, u.country, u.region, u.city || "", ...(u.strengths || [])].join(" ").toLowerCase().includes(q))
      .sort((a, b) => compareUniversities(a, b, sort));
  }

  function draw() {
    const filtered = filteredData();
    const size = Number(pageSize.value || 20);
    const totalPages = Math.max(1, Math.ceil(filtered.length / size));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * size;
    const pageRows = filtered.slice(start, start + size);

    countEl.textContent = `Showing ${filtered.length ? start + 1 : 0}-${Math.min(start + size, filtered.length)} of ${filtered.length} universities`;
    pageStatus.textContent = `Page ${currentPage} of ${totalPages}`;
    prev.disabled = currentPage === 1;
    next.disabled = currentPage === totalPages;
    emptyState.hidden = filtered.length > 0;
    const nextParams = new URLSearchParams(window.location.search);
    search.value ? nextParams.set("search", search.value) : nextParams.delete("search");
    countryFilter.value ? nextParams.set("country", countryFilter.value) : nextParams.delete("country");
    sortBy.value ? nextParams.set("sort", sortBy.value) : nextParams.delete("sort");
    pageSize.value ? nextParams.set("pageSize", pageSize.value) : nextParams.delete("pageSize");
    currentPage > 1 ? nextParams.set("page", String(currentPage)) : nextParams.delete("page");
    const url = `${window.location.pathname}${nextParams.toString() ? `?${nextParams.toString()}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", url);

    body.innerHTML = pageRows.map((u) => {
      const dept = u.department ? link(u.department.label, u.department.url) : "—";
      const researchLinks = u.labs?.length ? u.labs.slice(0, 2).map((lab) => link(lab.label, lab.url)).join(" · ") : "—";
        const spotlight = u.spotlight ? `<a href="./spotlight.html#${u.slug}">Spotlight</a>` : "";
        const profile = `<a href="./universities/${u.slug}.html">Profile</a>`;
      const rankMeta = u.rank_display && String(u.rank_display) !== String(u.rank) ? `<div class="muted">THE band: ${u.rank_display}</div>` : "";
      const title = u.official_url
        ? `<a class="university-link" href="${u.official_url}" target="_blank" rel="noreferrer"><strong>${u.name}</strong></a>`
        : `<strong>${u.name}</strong>`;
      return `
        <tr>
          <td data-label="Rank"><strong>${u.rank}</strong>${rankMeta}</td>
          <td data-label="University">${title}<div class="muted">THE score: ${u.scorecard.overall || "—"}</div></td>
          <td data-label="Region">${u.region}</td>
          <td data-label="Founded">${u.founded || "—"}</td>
          <td data-label="Location"><span class="flag-label">${countryFlag(u.country)}</span>${[u.city, u.country].filter(Boolean).join(", ")}</td>
          <td data-label="Department / Research links"><div>${dept}</div><div class="muted">${researchLinks}</div></td>
          <td data-label="Strong at">${tagList(u.strengths)}</td>
            <td data-label="Links">${[link("THE", u.ranking_links.the), profile, spotlight].filter(Boolean).join(" · ")}</td>
        </tr>`;
    }).join("");
  }

  function resetAndDraw() {
    currentPage = 1;
    draw();
  }

  [search, countryFilter, sortBy, pageSize].forEach((el) => el.addEventListener("input", resetAndDraw));
  countryFilter.addEventListener("change", resetAndDraw);
  sortBy.addEventListener("change", resetAndDraw);
  pageSize.addEventListener("change", resetAndDraw);
  clearFilters.addEventListener("click", () => {
    search.value = "";
    countryFilter.value = "";
    sortBy.value = "rank-asc";
    pageSize.value = "20";
    resetAndDraw();
  });
  prev.addEventListener("click", () => { if (currentPage > 1) { currentPage -= 1; draw(); } });
  next.addEventListener("click", () => { currentPage += 1; draw(); });
  draw();
}

function renderMeta(meta, universities) {
  const el = document.getElementById("meta-summary");
  if (!el) return;
  const counts = universities.reduce((acc, u) => {
    acc[u.region] = (acc[u.region] || 0) + 1;
    return acc;
  }, {});
  el.innerHTML = `
    <h2>${meta.title}</h2>
    <p>${meta.source_note}</p>
    <p><strong>Updated:</strong> ${meta.updated_at}</p>
    <p class="muted"><strong>Source note:</strong> This is not an aggregated ranking. Ordered positions follow THE Computer Science World University Rankings 2026, enriched with ROR and official university pages.</p>
    <div class="badge-row">
      ${Object.entries(counts).map(([region, count]) => `<span class="badge">${region}: ${count}</span>`).join("")}
    </div>
    <p class="muted">Coverage: official links ${meta.coverage?.official_url || 0}/200 · founded year ${meta.coverage?.founded || 0}/200 · city ${meta.coverage?.city || 0}/200 · spotlight pages ${meta.coverage?.spotlight || 0}</p>`;
}

function renderRegions(universities) {
  const el = document.getElementById("regions-grid");
  if (!el) return;
  const grouped = universities.reduce((acc, u) => {
    (acc[u.region] ||= []).push(u);
    return acc;
  }, {});
  el.innerHTML = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([region, schools]) => `
      <article class="panel region-card">
        <h3>${region}</h3>
        <p>${schools.length} universities</p>
        <ol>
          ${schools.map((u) => `<li><strong>#${u.rank}</strong> ${countryFlag(u.country)} ${u.official_url ? `<a class="region-list-link" href="${u.official_url}" target="_blank" rel="noreferrer">${u.name}</a>` : u.name}</li>`).join("")}
        </ol>
      </article>`)
    .join("");
}

function renderMap(universities) {
  const mapEl = document.getElementById("world-map");
  const regionFilter = document.getElementById("map-region-filter");
  const zoomIn = document.getElementById("map-zoom-in");
  const zoomOut = document.getElementById("map-zoom-out");
  const reset = document.getElementById("map-reset");
  if (!mapEl || !regionFilter || !zoomIn || !zoomOut || !reset || !window.L) return;

  const mapped = universities.filter((u) => Number.isFinite(u.latitude) && Number.isFinite(u.longitude));
  const regions = [...new Set(mapped.map((u) => u.region))].sort((a, b) => a.localeCompare(b));
  regionFilter.innerHTML = '<option value="">All regions</option>' + regions.map((region) => `<option value="${region}">${region}</option>`).join("");

  const map = window.L.map(mapEl, {
    worldCopyJump: true,
    minZoom: 1,
    maxZoom: 6,
    zoomControl: false,
  }).setView([22, 10], 1.5);

  window.L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  }).addTo(map);

  const markersLayer = window.L.layerGroup().addTo(map);

  function overlapKey(u) {
    return `${Number(u.latitude).toFixed(4)},${Number(u.longitude).toFixed(4)}`;
  }

  function offsetLatLng(lat, lng, index, total) {
    if (total <= 1) return [lat, lng];
    const angle = (Math.PI * 2 * index) / total;
    const radiusMeters = 900 + Math.max(0, total - 2) * 180;
    const latOffset = (radiusMeters * Math.cos(angle)) / 111320;
    const lngOffset = (radiusMeters * Math.sin(angle)) / (111320 * Math.cos((lat * Math.PI) / 180));
    return [lat + latOffset, lng + lngOffset];
  }

  function drawPoints() {
    const region = regionFilter.value;
    const rows = mapped.filter((u) => !region || u.region === region);
    markersLayer.clearLayers();
    const bounds = [];
    const grouped = new Map();
    rows.forEach((u) => {
      const key = overlapKey(u);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(u);
    });

    [...grouped.values()].forEach((group) => {
      group.sort((a, b) => a.rank - b.rank);
      group.forEach((u, index) => {
        const [lat, lng] = offsetLatLng(Number(u.latitude), Number(u.longitude), index, group.length);
        const marker = window.L.circleMarker([lat, lng], {
        radius: u.rank <= 25 ? 6 : 5,
        weight: 1,
        color: "#ffffff",
        fillColor: "#2f80ed",
        fillOpacity: 0.9,
      });
        marker.bindTooltip(`#${u.rank} ${u.name}<br>${u.city ? `${u.city}, ` : ""}${u.country}${group.length > 1 ? `<br>${group.length} nearby universities shown separately` : ""}`);
        marker.bindPopup(`<strong>#${u.rank} ${u.name}</strong><br>${u.city ? `${u.city}, ` : ""}${u.country}<br>${u.official_url ? `<a href="${u.official_url}" target="_blank" rel="noreferrer">Official website</a>` : "No official link"}`);
        markersLayer.addLayer(marker);
        if (u.rank <= 25) marker.bringToFront();
        bounds.push([lat, lng]);
      });
    });
    if (bounds.length) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: region ? 4 : 2 });
    }
  }

  zoomIn.addEventListener("click", () => map.zoomIn());
  zoomOut.addEventListener("click", () => map.zoomOut());
  reset.addEventListener("click", () => {
    regionFilter.value = "";
    drawPoints();
    map.setView([22, 10], 1.5);
  });
  regionFilter.addEventListener("change", drawPoints);
  drawPoints();
}

function renderSpotlights(spotlights, universities) {
  const targets = [document.getElementById("spotlight-grid"), document.getElementById("spotlight-list")].filter(Boolean);
  if (!targets.length) return;
  const cards = spotlights.spotlights.map((s) => {
    const uni = universities.find((u) => u.slug === s.slug);
    return `
      <article class="panel card" id="${s.slug}">
        <p class="eyebrow">Rank #${uni?.rank || "—"}</p>
        <h3>${uni?.official_url ? `<a class="university-link" href="${uni.official_url}" target="_blank" rel="noreferrer">${s.name}</a>` : s.name}</h3>
        <p>${(s.advances || []).join(" ")}</p>
        <div>${tagList(s.strengths)}</div>
        <p><strong>Department:</strong> ${link(s.department.label, s.department.url)}</p>
        <p><strong>Labs:</strong> ${(s.labs || []).map((lab) => link(lab.label, lab.url)).join(" · ")}</p>
        <p><strong>Research:</strong> ${(s.research_links || []).map((r) => link(r.label, r.url)).join(" · ")}</p>
        <p><strong>Papers / breakthroughs:</strong> ${(s.papers || []).map((p) => link(p.title, p.url)).join(" · ")}</p>
      </article>`;
  }).join("");
  targets.forEach((el) => (el.innerHTML = cards));
}

initTheme();
syncTopbarOffset();

Promise.all([loadJson(dataPath("universities.json")), loadJson(dataPath("spotlights.json"))])
  .then(([data, spotlights]) => {
    renderMeta(data.meta, data.universities);
    renderOverview(data.universities);
    renderRegions(data.universities);
    renderMap(data.universities);
    renderSpotlights(spotlights, data.universities);
  })
  .catch((error) => {
    const target = document.getElementById("meta-summary") || document.body;
    target.innerHTML = `<p><strong>Could not load site data.</strong><br>${error.message}</p>`;
  });
