const THEME_KEY = "topuni-theme";

const REGION_COLORS = {
  "North America": "#2f6bff",
  Europe: "#874dff",
  Asia: "#22b8bf",
  Oceania: "#ff9c3d",
  "South America": "#62d49f",
  Africa: "#f25f7a",
};

const SCORE_BREAKDOWN_CONFIG = [
  { key: "research", label: "Research Output", color: "#2f6bff" },
  { key: "industry", label: "Industry Impact", color: "#874dff" },
  { key: "citations", label: "Citations", color: "#22b8bf" },
  { key: "international", label: "International Outlook", color: "#ff9c3d" },
  { key: "teaching", label: "Teaching", color: "#62d49f" },
];

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

function numericScore(value) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const matches = String(value).match(/\d+(?:\.\d+)?/g);
  if (!matches?.length) return 0;
  const nums = matches.map(Number);
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function externalLink(label, url, className = "") {
  return url ? `<a class="${className}" href="${url}" target="_blank" rel="noreferrer">${label}</a>` : "—";
}

function internalProfileLink(slug, label = "Profile") {
  return slug ? `<a href="./universities/${slug}.html">${label}</a>` : "";
}

function tagList(items = []) {
  return items.map((item) => `<span class="tag">${item}</span>`).join("");
}

function scoreValue(university, key) {
  return numericScore(university?.scorecard?.[key]);
}

function compareUniversities(a, b, mode) {
  switch (mode) {
    case "name-asc":
      return a.name.localeCompare(b.name);
    case "country-asc":
      return a.country.localeCompare(b.country) || a.rank - b.rank;
    case "score-desc":
      return scoreValue(b, "overall") - scoreValue(a, "overall") || a.rank - b.rank;
    case "research-desc":
      return scoreValue(b, "research") - scoreValue(a, "research") || a.rank - b.rank;
    case "industry-desc":
      return scoreValue(b, "industry") - scoreValue(a, "industry") || a.rank - b.rank;
    case "citations-desc":
      return scoreValue(b, "citations") - scoreValue(a, "citations") || a.rank - b.rank;
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
    button.setAttribute("aria-pressed", button.dataset.themeOption === theme ? "true" : "false");
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

function formatDate(isoDate) {
  if (!isoDate) return "—";
  const value = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(value.getTime())) return isoDate;
  return value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function regionSlug(region) {
  return String(region || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function average(items) {
  return items.length ? items.reduce((sum, item) => sum + item, 0) / items.length : 0;
}

function sparkline(values) {
  const nums = values.map((value) => Math.max(0, Math.min(100, numericScore(value))));
  const points = nums.map((value, index) => {
    const x = (index / Math.max(1, nums.length - 1)) * 96 + 2;
    const y = 26 - (value / 100) * 22;
    return `${x},${y}`;
  }).join(" ");
  const area = `M 2 26 L ${points.split(" ").join(" L ")} L 98 26 Z`;
  return `<svg class="trend-sparkline" viewBox="0 0 100 28" aria-hidden="true"><path d="${area}"></path><polyline points="${points}"></polyline></svg>`;
}

function renderMeta(meta, universities) {
  const el = document.getElementById("meta-summary");
  if (!el) return;
  const countries = new Set(universities.map((u) => u.country).filter(Boolean));
  const metrics = new Set(["overall", "research", "teaching", "citations", "industry", "international"]);
  el.innerHTML = `
    <article class="stat-card">
      <div class="stat-icon">TOP</div>
      <div>
        <div class="stat-value">${universities.length}</div>
        <div class="stat-label">Top Universities</div>
      </div>
    </article>
    <article class="stat-card">
      <div class="stat-icon">GLB</div>
      <div>
        <div class="stat-value">${countries.size}</div>
        <div class="stat-label">Countries</div>
      </div>
    </article>
    <article class="stat-card">
      <div class="stat-icon">MET</div>
      <div>
        <div class="stat-value">${metrics.size}</div>
        <div class="stat-label">Ranking Metrics</div>
      </div>
    </article>
    <article class="stat-card">
      <div class="stat-icon">NEW</div>
      <div>
        <div class="stat-value">Updated</div>
        <div class="stat-label">${formatDate(meta.updated_at)}</div>
      </div>
    </article>`;
}

function renderHeroScatter(universities) {
  const scatter = document.getElementById("hero-scatter");
  const legend = document.getElementById("hero-scatter-legend");
  const caption = document.getElementById("hero-chart-caption");
  const highlights = document.getElementById("hero-scatter-highlights");
  if (!scatter || !legend) return;

  const featured = universities
    .filter((u) => scoreValue(u, "research") && scoreValue(u, "industry"))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 90);

  const highlighted = featured.slice(0, 4);
  const highlightedSlugs = new Set(highlighted.map((u) => u.slug));

  scatter.innerHTML = featured.map((u) => {
    const x = Math.max(4, Math.min(96, scoreValue(u, "industry")));
    const y = Math.max(4, Math.min(96, scoreValue(u, "research")));
    const color = REGION_COLORS[u.region] || "#2f6bff";
    const classes = `hero-dot${highlightedSlugs.has(u.slug) ? " is-featured" : ""}`;
    return `<span class="${classes}" title="#${u.rank} ${u.name}" style="left:${x}%; bottom:${y}%; background:${color}"></span>`;
  }).join("");

  const usedRegions = [...new Set(featured.map((u) => u.region))];
  legend.innerHTML = usedRegions.map((region) => `
    <span class="legend-item">
      <span class="legend-swatch" style="background:${REGION_COLORS[region] || "#2f6bff"}"></span>
      ${region}
    </span>`).join("");

  if (caption) {
    caption.textContent = `Showing ${featured.length} top universities with complete research and industry scores.`;
  }

  if (highlights) {
    highlights.innerHTML = highlighted.map((u) => `
      <article class="hero-highlight">
        <strong>#${u.rank} ${u.name}</strong>
        <span class="muted">${u.region} · Research ${scoreValue(u, "research").toFixed(1)} · Industry ${scoreValue(u, "industry").toFixed(1)}</span>
      </article>`).join("");
  }
}

function renderOverview(universities) {
  const body = document.getElementById("overview-body");
  const search = document.getElementById("search");
  const countryFilter = document.getElementById("country-filter");
  const regionFilter = document.getElementById("region-filter");
  const sortBy = document.getElementById("sort-by");
  const pageSize = document.getElementById("page-size");
  const prev = document.getElementById("page-prev");
  const next = document.getElementById("page-next");
  const pageStatus = document.getElementById("page-status");
  const countEl = document.getElementById("overview-count");
  const clearFilters = document.getElementById("clear-filters");
  const emptyState = document.getElementById("empty-state");

  if (!body || !search || !countryFilter || !regionFilter || !sortBy || !pageSize || !prev || !next || !pageStatus || !countEl || !clearFilters || !emptyState) return;

  let currentPage = 1;
  const params = new URLSearchParams(window.location.search);
  const countries = [...new Set(universities.map((u) => u.country).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const regions = [...new Set(universities.map((u) => u.region).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  countryFilter.innerHTML = '<option value="">All countries</option>' + countries.map((country) => `<option value="${country}">${countryFlag(country)} ${country}</option>`).join("");
  regionFilter.innerHTML = '<option value="">All regions</option>' + regions.map((region) => `<option value="${region}">${region}</option>`).join("");

  if (params.get("search")) search.value = params.get("search");
  if (params.get("country")) countryFilter.value = params.get("country");
  if (params.get("region")) regionFilter.value = params.get("region");
  if (params.get("sort")) sortBy.value = params.get("sort");
  if (params.get("pageSize")) pageSize.value = params.get("pageSize");
  currentPage = positiveInt(params.get("page"), 1);

  function filteredData() {
    const q = search.value.toLowerCase().trim();
    const country = countryFilter.value;
    const region = regionFilter.value;
    const sort = sortBy.value;

    return universities
      .filter((u) => !country || u.country === country)
      .filter((u) => !region || u.region === region)
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

    countEl.textContent = filtered.length
      ? `Showing ${start + 1}-${Math.min(start + size, filtered.length)} of ${filtered.length} universities`
      : "Showing 0 of 0 universities";
    pageStatus.textContent = `Page ${currentPage} of ${totalPages}`;
    prev.disabled = currentPage === 1;
    next.disabled = currentPage === totalPages;
    emptyState.hidden = filtered.length > 0;

    const nextParams = new URLSearchParams(window.location.search);
    search.value ? nextParams.set("search", search.value) : nextParams.delete("search");
    countryFilter.value ? nextParams.set("country", countryFilter.value) : nextParams.delete("country");
    regionFilter.value ? nextParams.set("region", regionFilter.value) : nextParams.delete("region");
    sortBy.value ? nextParams.set("sort", sortBy.value) : nextParams.delete("sort");
    pageSize.value ? nextParams.set("pageSize", pageSize.value) : nextParams.delete("pageSize");
    currentPage > 1 ? nextParams.set("page", String(currentPage)) : nextParams.delete("page");
    const url = `${window.location.pathname}${nextParams.toString() ? `?${nextParams.toString()}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", url);

    body.innerHTML = pageRows.map((u) => {
      const score = scoreValue(u, "overall").toFixed(1);
      const research = scoreValue(u, "research").toFixed(1);
      const industry = scoreValue(u, "industry").toFixed(1);
      const citations = scoreValue(u, "citations").toFixed(1);
      const profile = internalProfileLink(u.slug);
      const spotlight = u.spotlight ? `<a href="./spotlight.html#${u.slug}">Spotlight</a>` : "";
      const rankingLink = externalLink("THE", u.ranking_links?.the);
      const title = u.official_url
        ? `<a class="university-link" href="${u.official_url}" target="_blank" rel="noreferrer"><strong>${u.name}</strong></a>`
        : `<strong>${u.name}</strong>`;
      const trend = sparkline([
        u.scorecard?.teaching,
        u.scorecard?.research,
        u.scorecard?.citations,
        u.scorecard?.industry,
        u.scorecard?.international,
      ]);

      return `
        <tr>
          <td data-label="Rank"><span class="table-rank">${u.rank}</span></td>
          <td data-label="University">
            ${title}
            <div class="table-subtext">${u.city ? `${u.city}, ` : ""}${u.region}</div>
            <div class="table-subtext">${[rankingLink, profile, spotlight].filter(Boolean).join(" · ")}</div>
          </td>
          <td data-label="Country">${countryFlag(u.country)} ${u.country}</td>
          <td data-label="Score"><span class="table-metric">${score}</span></td>
          <td data-label="Research">${research}</td>
          <td data-label="Industry">${industry}</td>
          <td data-label="Citations">${citations}</td>
          <td data-label="Trend" class="trend-cell">${trend}</td>
        </tr>`;
    }).join("");
  }

  function resetAndDraw() {
    currentPage = 1;
    draw();
  }

  [search, countryFilter, regionFilter, sortBy, pageSize].forEach((el) => el.addEventListener("input", resetAndDraw));
  countryFilter.addEventListener("change", resetAndDraw);
  regionFilter.addEventListener("change", resetAndDraw);
  sortBy.addEventListener("change", resetAndDraw);
  pageSize.addEventListener("change", resetAndDraw);
  clearFilters.addEventListener("click", () => {
    search.value = "";
    countryFilter.value = "";
    regionFilter.value = "";
    sortBy.value = "rank-asc";
    pageSize.value = "20";
    resetAndDraw();
  });
  prev.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage -= 1;
      draw();
    }
  });
  next.addEventListener("click", () => {
    currentPage += 1;
    draw();
  });
  draw();
}

function renderScoreBreakdown(universities) {
  const el = document.getElementById("score-breakdown");
  if (!el) return;

  const raw = SCORE_BREAKDOWN_CONFIG.map((metric) => ({
    ...metric,
    value: average(universities.map((u) => scoreValue(u, metric.key))),
  }));

  const metrics = raw.map((metric) => ({
    ...metric,
    display: metric.value.toFixed(1),
    width: Math.max(6, Math.min(100, metric.value)),
  }));

  let stop = 0;
  const gradient = metrics.map((metric) => {
    const start = stop;
    stop += 100 / metrics.length;
    return `${metric.color} ${start}% ${stop}%`;
  }).join(", ");

  el.innerHTML = `
    <div class="score-donut" style="--donut-gradient: conic-gradient(${gradient})">
      <div class="score-donut-center">
        <div>
          <strong>${average(universities.map((u) => scoreValue(u, "overall"))).toFixed(1)}</strong>
          <span class="muted">avg overall</span>
        </div>
      </div>
    </div>
    <div class="metric-list">
      ${metrics.map((metric) => `
        <div class="metric-item">
          <span class="metric-label"><span class="metric-swatch" style="background:${metric.color}"></span> ${metric.label}</span>
          <strong class="metric-value">${metric.display}</strong>
          <span class="metric-bar"><span style="width:${metric.width}%; background:${metric.color}"></span></span>
        </div>`).join("")}
    </div>`;
}

function renderInsights(universities, spotlights) {
  const el = document.getElementById("ranking-insights");
  if (!el) return;

  const groupedCountries = universities.reduce((acc, university) => {
    acc[university.country] = (acc[university.country] || 0) + 1;
    return acc;
  }, {});
  const [topCountry, topCountryCount] = Object.entries(groupedCountries).sort((a, b) => b[1] - a[1])[0] || ["—", 0];

  const groupedRegions = universities.reduce((acc, university) => {
    (acc[university.region] ||= []).push(university);
    return acc;
  }, {});
  const regionLeader = Object.entries(groupedRegions)
    .map(([region, items]) => ({
      region,
      average: average(items.slice(0, 15).map((item) => scoreValue(item, "overall"))),
    }))
    .sort((a, b) => b.average - a.average)[0];

  const topTenCountries = new Set(universities.filter((u) => u.rank <= 10).map((u) => u.country));
  const mappedCount = universities.filter((u) => Number.isFinite(u.latitude) && Number.isFinite(u.longitude)).length;
  const spotlightCount = spotlights?.spotlights?.length || universities.filter((u) => u.spotlight).length;

  const cards = [
    {
      icon: "US",
      title: `${topCountry} leads by volume`,
      text: `${topCountryCount} universities appear in the top 200, giving it the deepest ranked bench.`
    },
    {
      icon: "R",
      title: `${regionLeader?.region || "—"} sets the pace`,
      text: `Its top 15 institutions average ${regionLeader ? regionLeader.average.toFixed(1) : "—"} overall on the THE scorecard.`
    },
    {
      icon: "10",
      title: `${topTenCountries.size} countries reach the top 10`,
      text: `The highest tier remains globally distributed across a small set of countries with elite clusters.`
    },
    {
      icon: "AI",
      title: `${spotlightCount} spotlight universities`,
      text: `${mappedCount} universities include map coordinates and ${spotlightCount} include deeper research detail pages.`
    },
  ];

  el.innerHTML = cards.map((card) => `
    <article class="insight-item">
      <span class="insight-icon">${card.icon}</span>
      <h3>${card.title}</h3>
      <p class="muted">${card.text}</p>
    </article>`).join("");
}

function renderRegions(universities) {
  const el = document.getElementById("regions-grid");
  if (!el) return;

  const grouped = universities.reduce((acc, university) => {
    (acc[university.region] ||= []).push(university);
    return acc;
  }, {});

  el.innerHTML = Object.entries(grouped)
    .map(([region, schools]) => [region, [...schools].sort((a, b) => a.rank - b.rank)])
    .sort(([, a], [, b]) => a[0].rank - b[0].rank)
    .map(([region, schools]) => `
      <article class="region-card">
        <div class="meta-link-row">
          <div>
            <h3>${region}</h3>
            <p class="muted">${schools.length} universities</p>
          </div>
          <a class="country-badge" href="./regions/${regionSlug(region)}.html">Top ${Math.min(10, schools.length)}</a>
        </div>
        <ol>
          ${schools.slice(0, 3).map((u) => `<li><strong>#${u.rank}</strong> ${u.official_url ? `<a class="region-list-link" href="${u.official_url}" target="_blank" rel="noreferrer">${u.name}</a>` : u.name}</li>`).join("")}
        </ol>
      </article>`).join("");
}

function renderCountries(universities) {
  const el = document.getElementById("countries-grid");
  if (!el) return;

  const grouped = universities.reduce((acc, university) => {
    (acc[university.country] ||= []).push(university);
    return acc;
  }, {});

  el.innerHTML = Object.entries(grouped)
    .map(([country, schools]) => [country, [...schools].sort((a, b) => a.rank - b.rank)])
    .sort(([, a], [, b]) => b.length - a.length || a[0].rank - b[0].rank)
    .slice(0, 8)
    .map(([country, schools]) => `
      <article class="country-card">
        <div class="country-topline">
          <h3>${countryFlag(country)} ${country}</h3>
          <a class="country-badge" href="./countries/${regionSlug(country)}.html">View country</a>
        </div>
        <div class="country-meta">
          <span>${schools.length} universities</span>
          <span>Top score: ${scoreValue(schools[0], "overall").toFixed(1)}</span>
        </div>
        <ol>
          ${schools.slice(0, 3).map((u) => `<li><strong>#${u.rank}</strong> <a class="region-list-link" href="./universities/${u.slug}.html">${u.name}</a></li>`).join("")}
        </ol>
      </article>`).join("");
}

function renderMapSummary(universities) {
  const el = document.getElementById("map-summary");
  if (!el) return;
  const countries = new Set(universities.map((u) => u.country).filter(Boolean));
  el.innerHTML = `
    <span class="map-pill">🌍 ${countries.size} countries</span>
    <span class="map-pill">🏛 ${universities.length} universities</span>
    <span class="map-pill">📍 ${universities.filter((u) => Number.isFinite(u.latitude) && Number.isFinite(u.longitude)).length} mapped</span>`;
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

  function overlapKey(university) {
    return `${Number(university.latitude).toFixed(4)},${Number(university.longitude).toFixed(4)}`;
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

    rows.forEach((university) => {
      const key = overlapKey(university);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(university);
    });

    [...grouped.values()].forEach((group) => {
      group.sort((a, b) => a.rank - b.rank);
      group.forEach((university, index) => {
        const [lat, lng] = offsetLatLng(Number(university.latitude), Number(university.longitude), index, group.length);
        const marker = window.L.circleMarker([lat, lng], {
          radius: university.rank <= 25 ? 6 : 5,
          weight: 1,
          color: "#ffffff",
          fillColor: REGION_COLORS[university.region] || "#2f6bff",
          fillOpacity: 0.92,
        });
        marker.bindTooltip(`#${university.rank} ${university.name}<br>${university.city ? `${university.city}, ` : ""}${university.country}`);
        marker.bindPopup(`<strong>#${university.rank} ${university.name}</strong><br>${university.city ? `${university.city}, ` : ""}${university.country}<br>${university.official_url ? `<a href="${university.official_url}" target="_blank" rel="noreferrer">Official website</a>` : "No official link"}`);
        markersLayer.addLayer(marker);
        if (university.rank <= 25) marker.bringToFront();
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
  const grid = document.getElementById("spotlight-grid");
  const list = document.getElementById("spotlight-list");

  if (grid) {
    grid.innerHTML = spotlights.spotlights
      .slice(0, 5)
      .map((spotlight) => {
        const university = universities.find((u) => u.slug === spotlight.slug);
        return `
          <article class="spotlight-item" id="${spotlight.slug}">
            <div class="spotlight-topline">
              <div>
                <h3><a class="spotlight-title" href="./universities/${spotlight.slug}.html">${spotlight.name}</a></h3>
                <p class="muted">${countryFlag(university?.country)} ${university?.country || "—"}</p>
              </div>
              <span class="country-badge">#${university?.rank || "—"}</span>
            </div>
            <p class="muted">${(spotlight.advances || []).slice(0, 1).join(" ")}</p>
            <div class="spotlight-tags">${tagList((spotlight.strengths || []).slice(0, 4))}</div>
          </article>`;
      }).join("");
  }

  if (list) {
    list.innerHTML = spotlights.spotlights.map((spotlight) => {
      const university = universities.find((u) => u.slug === spotlight.slug);
      return `
        <article class="panel" id="${spotlight.slug}">
          <p class="section-kicker">Rank #${university?.rank || "—"}</p>
          <h3>${university?.official_url ? `<a class="university-link" href="${university.official_url}" target="_blank" rel="noreferrer">${spotlight.name}</a>` : spotlight.name}</h3>
          <p class="muted">${(spotlight.advances || []).join(" ")}</p>
          <div class="tag-row">${tagList(spotlight.strengths)}</div>
          <p><strong>Department:</strong> ${externalLink(spotlight.department.label, spotlight.department.url)}</p>
          <p><strong>Labs:</strong> ${(spotlight.labs || []).map((lab) => externalLink(lab.label, lab.url)).join(" · ")}</p>
          <p><strong>Research:</strong> ${(spotlight.research_links || []).map((research) => externalLink(research.label, research.url)).join(" · ")}</p>
          <p><strong>Papers / breakthroughs:</strong> ${(spotlight.papers || []).map((paper) => externalLink(paper.title, paper.url)).join(" · ")}</p>
        </article>`;
    }).join("");
  }
}

window.addEventListener("resize", syncTopbarOffset);
window.addEventListener("load", syncTopbarOffset);

initTheme();
syncTopbarOffset();

const needsDataBootstrap = [
  "meta-summary",
  "hero-scatter",
  "overview-body",
  "regions-grid",
  "countries-grid",
  "world-map",
  "spotlight-grid",
  "spotlight-list",
].some((id) => document.getElementById(id));

if (needsDataBootstrap) {
  Promise.all([loadJson(dataPath("universities.json")), loadJson(dataPath("spotlights.json"))])
    .then(([data, spotlights]) => {
      renderMeta(data.meta, data.universities);
      renderHeroScatter(data.universities);
      renderOverview(data.universities);
      renderScoreBreakdown(data.universities);
      renderInsights(data.universities, spotlights);
      renderRegions(data.universities);
      renderCountries(data.universities);
      renderMapSummary(data.universities);
      renderMap(data.universities);
      renderSpotlights(spotlights, data.universities);
    })
    .catch((error) => {
      const target = document.getElementById("meta-summary")
        || document.getElementById("spotlight-grid")
        || document.getElementById("spotlight-list");
      if (target) {
        target.innerHTML = `<p><strong>Could not load site data.</strong><br>${error.message}</p>`;
      }
    });
}
