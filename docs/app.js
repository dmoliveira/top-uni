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

const REGION_COLORS = {
  "North America": "#2f6bff",
  Europe: "#874dff",
  Asia: "#22b8bf",
  Oceania: "#ff9c3d",
  "South America": "#62d49f",
  Africa: "#f25f7a",
};

const OVERVIEW_MAP_WIDTH = 900;
const OVERVIEW_MAP_HEIGHT = 340;

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

function compareUniversities(a, b) {
  return a.rank - b.rank;
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
  let storedTheme = null;
  try {
    storedTheme = localStorage.getItem(THEME_KEY);
  } catch {
    storedTheme = null;
  }
  const saved = params.get("theme") || storedTheme || "auto";
  applyTheme(saved);
  document.querySelectorAll(".theme-button").forEach((button) => {
    button.addEventListener("click", () => {
      const theme = button.dataset.themeOption || "auto";
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch {
        // Ignore storage errors and keep theme in memory/url only.
      }
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

function renderMeta(meta, universities) {
  const el = document.getElementById("meta-summary");
  if (!el) return;
  const countries = new Set(universities.map((u) => u.country).filter(Boolean));
  el.innerHTML = `<p class="muted"><strong>${universities.length} universities</strong> across <strong>${countries.size} countries</strong> · Updated <strong>${formatDate(meta.updated_at)}</strong></p>`;
}

function renderOverview(universities) {
  const body = document.getElementById("overview-body");
  const search = document.getElementById("search");
  const regionFilter = document.getElementById("region-filter");
  const prev = document.getElementById("page-prev");
  const next = document.getElementById("page-next");
  const pageStatus = document.getElementById("page-status");
  const pagination = document.getElementById("overview-pagination");
  const countEl = document.getElementById("overview-count");
  const clearFilters = document.getElementById("clear-filters");
  const emptyState = document.getElementById("empty-state");
  const map = document.getElementById("overview-map");
  const mapLegend = document.getElementById("overview-map-legend");

  if (!body || !search || !regionFilter || !prev || !next || !pageStatus || !pagination || !countEl || !clearFilters || !emptyState) return;

  const controls = { body, search, regionFilter, prev, next, pageStatus, pagination, countEl, clearFilters, emptyState, map, mapLegend };
  let currentPage = 1;
  const params = new URLSearchParams(window.location.search);
  const regions = [...new Set(universities.map((u) => u.region).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  regionFilter.innerHTML = '<option value="">All regions</option>' + regions.map((region) => `<option value="${region}">${region}</option>`).join("");

  hydrateOverviewState(params, controls);
  currentPage = positiveInt(params.get("page"), 1);

  const filteredData = () => filterAndSortUniversities(universities, controls);

  function draw() {
    const filtered = filteredData();
    const size = 20;
    const totalPages = Math.max(1, Math.ceil(filtered.length / size));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * size;
    const pageRows = filtered.slice(start, start + size);

    controls.countEl.textContent = filtered.length
      ? `Showing ${start + 1}-${Math.min(start + size, filtered.length)} of ${filtered.length} universities`
      : "Showing 0 of 0 universities";
    controls.pagination.hidden = totalPages <= 1;
    controls.pageStatus.textContent = `Page ${currentPage} of ${totalPages}`;
    controls.prev.disabled = currentPage === 1;
    controls.next.disabled = currentPage === totalPages;
    controls.emptyState.hidden = filtered.length > 0;
    syncOverviewUrl(controls, currentPage);
    controls.body.innerHTML = pageRows.map(renderOverviewRow).join("");
    renderOverviewMap(filtered, pageRows, controls);
  }

  function resetAndDraw() {
    currentPage = 1;
    draw();
  }

  search.addEventListener("input", resetAndDraw);
  regionFilter.addEventListener("change", resetAndDraw);
  clearFilters.addEventListener("click", () => {
    resetOverviewControls(controls);
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

function hydrateOverviewState(params, controls) {
  if (params.get("search")) controls.search.value = params.get("search");
  if (params.get("region")) controls.regionFilter.value = params.get("region");
}

function filterAndSortUniversities(universities, controls) {
  const query = controls.search.value.toLowerCase().trim();
  const region = controls.regionFilter.value;

  return universities
    .filter((university) => !region || university.region === region)
    .filter((university) => !query || [university.name, university.country, university.region, university.city || "", ...(university.strengths || [])].join(" ").toLowerCase().includes(query))
    .sort(compareUniversities);
}

function syncOverviewUrl(controls, currentPage) {
  const nextParams = new URLSearchParams(window.location.search);
  controls.search.value ? nextParams.set("search", controls.search.value) : nextParams.delete("search");
  nextParams.delete("country");
  controls.regionFilter.value ? nextParams.set("region", controls.regionFilter.value) : nextParams.delete("region");
  nextParams.delete("sort");
  nextParams.delete("pageSize");
  currentPage > 1 ? nextParams.set("page", String(currentPage)) : nextParams.delete("page");
  const url = `${window.location.pathname}${nextParams.toString() ? `?${nextParams.toString()}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", url);
}

function resetOverviewControls(controls) {
  controls.search.value = "";
  controls.regionFilter.value = "";
}

function renderOverviewRow(university) {
  const score = scoreValue(university, "overall").toFixed(1);
  const research = scoreValue(university, "research").toFixed(1);
  const industry = scoreValue(university, "industry").toFixed(1);
  const citations = scoreValue(university, "citations").toFixed(1);
  const profile = internalProfileLink(university.slug);
  const spotlight = university.spotlight ? `<a href="./spotlight.html#${university.slug}">Spotlight</a>` : "";
  const rankingLink = externalLink("THE", university.ranking_links?.the);
  const title = university.official_url
    ? `<a class="university-link" href="${university.official_url}" target="_blank" rel="noreferrer"><strong>${university.name}</strong></a>`
    : `<strong>${university.name}</strong>`;
  return `
    <tr>
      <td data-label="Rank"><span class="table-rank">${university.rank}</span></td>
      <td data-label="University">
        ${title}
        <div class="table-subtext">${university.city ? `${university.city}, ` : ""}${university.region}</div>
        <div class="table-subtext">${[rankingLink, profile, spotlight].filter(Boolean).join(" · ")}</div>
      </td>
      <td data-label="Country">${countryFlag(university.country)} ${university.country}</td>
      <td data-label="Score"><span class="table-metric">${score}</span></td>
      <td data-label="Research">${research}</td>
      <td data-label="Industry">${industry}</td>
      <td data-label="Citations">${citations}</td>
    </tr>`;
}

function renderOverviewMap(rows, currentRows, controls) {
  if (!controls.map || !controls.mapLegend) return;
  const currentSlugs = new Set(currentRows.map((row) => row.slug));
  const mapped = rows.filter((row) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude));
  const usedRegions = Object.keys(REGION_COLORS).filter((region) => mapped.some((row) => row.region === region));

  controls.mapLegend.innerHTML = usedRegions.map((region) => `
    <span class="overview-map-region">
      <span class="overview-map-swatch" style="background:${REGION_COLORS[region] || "#2f6bff"}"></span>
      ${region}
    </span>`).join("");

  if (!rows.length) {
    controls.map.innerHTML = `<p class="muted">No universities match the current search or region filter.</p>`;
    return;
  }

  if (!mapped.length) {
    controls.map.innerHTML = `<p class="muted">No mapped universities match the current filter.</p>`;
    return;
  }

  const dots = mapped.map((row) => {
    const x = ((Number(row.longitude) + 180) / 360) * OVERVIEW_MAP_WIDTH;
    const y = ((90 - Number(row.latitude)) / 180) * OVERVIEW_MAP_HEIGHT;
    const radius = currentSlugs.has(row.slug) ? 4.6 : 2.9;
    const classes = `overview-map-dot${currentSlugs.has(row.slug) ? " is-current" : ""}`;
    const color = REGION_COLORS[row.region] || "#2f6bff";
    const label = `${row.name} — ${row.city ? `${row.city}, ` : ""}${row.country}`;
    return `<circle class="${classes}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius}" fill="${color}"><title>${label}</title></circle>`;
  }).join("");

  controls.map.innerHTML = `
    <svg class="overview-map-svg" viewBox="0 0 ${OVERVIEW_MAP_WIDTH} ${OVERVIEW_MAP_HEIGHT}" aria-hidden="true">
      <text class="overview-map-axis-label" x="10" y="20">90°N</text>
      <text class="overview-map-axis-label" x="10" y="${(OVERVIEW_MAP_HEIGHT / 2).toFixed(0)}">Equator</text>
      <text class="overview-map-axis-label" x="10" y="${OVERVIEW_MAP_HEIGHT - 12}">90°S</text>
      <text class="overview-map-axis-label" x="10" y="${OVERVIEW_MAP_HEIGHT - 28}">Current page results are highlighted</text>
      ${dots}
    </svg>`;
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
        <p class="table-subtext">Leading institutions across ${region}, ordered by the global ranking.</p>
        <ol>
          ${schools.slice(0, 3).map((u) => `<li><strong>#${u.rank}</strong> ${u.official_url ? `<a class="region-list-link" href="${u.official_url}" target="_blank" rel="noreferrer">${u.name}</a>` : u.name}</li>`).join("")}
        </ol>
      </article>`).join("");
}

function indexUniversitiesBySlug(universities) {
  return universities.reduce((lookup, university) => {
    if (!university.slug) {
      throw new Error(`University is missing slug: ${university.name || "unknown"}`);
    }
    if (lookup.has(university.slug)) {
      throw new Error(`Duplicate university slug: ${university.slug}`);
    }
    lookup.set(university.slug, university);
    return lookup;
  }, new Map());
}

function renderSpotlights(spotlights, universitiesBySlug) {
  const grid = document.getElementById("spotlight-grid");
  const list = document.getElementById("spotlight-list");

  if (grid) {
    grid.innerHTML = spotlights.spotlights
      .slice(0, 5)
      .map((spotlight) => {
        const university = universitiesBySlug.get(spotlight.slug);
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
            <p class="table-subtext">Dedicated research spotlight with labs, department links, and notable breakthroughs.</p>
          </article>`;
      }).join("");
  }

  if (list) {
    list.innerHTML = spotlights.spotlights.map((spotlight) => {
      const university = universitiesBySlug.get(spotlight.slug);
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

function showHomepageBootstrapFailure(message) {
  const summary = document.getElementById("meta-summary");
  const overviewBody = document.getElementById("overview-body");
  const overviewCount = document.getElementById("overview-count");
  const regions = document.getElementById("regions-grid");
  const spotlights = document.getElementById("spotlight-grid");
  const map = document.getElementById("overview-map");
  const mapLegend = document.getElementById("overview-map-legend");

  if (summary) {
    summary.innerHTML = `<p class="muted"><strong>Live summary data unavailable.</strong> ${message}</p>`;
  }
  if (map) map.innerHTML = `<p class="muted"><strong>Map unavailable.</strong><br>${message}</p>`;
  if (mapLegend) mapLegend.innerHTML = "";
  if (overviewCount) {
    overviewCount.textContent = "Ranking data is temporarily unavailable.";
  }
  if (overviewBody) {
    overviewBody.innerHTML = `<tr><td colspan="7" class="muted"><strong>Ranking data unavailable.</strong><br>${message}</td></tr>`;
  }
  if (regions) {
    regions.innerHTML = `<article class="region-card"><p class="muted"><strong>Region snapshot unavailable.</strong><br>${message}</p></article>`;
  }
  if (spotlights) {
    spotlights.innerHTML = `<article class="spotlight-item"><p class="muted"><strong>Spotlight data unavailable.</strong><br>${message}</p></article>`;
  }
}

function showSpotlightFallback(message) {
  const grid = document.getElementById("spotlight-grid");
  const list = document.getElementById("spotlight-list");
  if (grid) {
    grid.innerHTML = `<article class="spotlight-item"><p class="muted"><strong>Spotlight data unavailable.</strong><br>${message}</p></article>`;
  }
  if (list) {
    list.innerHTML = `<article class="panel"><p class="muted"><strong>Spotlight data unavailable.</strong><br>${message}</p></article>`;
  }
}

window.addEventListener("resize", syncTopbarOffset);
window.addEventListener("load", syncTopbarOffset);

initTheme();
syncTopbarOffset();

const needsDataBootstrap = [
  "meta-summary",
  "overview-body",
  "regions-grid",
  "spotlight-grid",
  "spotlight-list",
].some((id) => document.getElementById(id));

if (needsDataBootstrap) {
  loadJson(dataPath("universities.json"))
    .then((data) => {
      const universities = data.universities;
      const controls = document.getElementById("overview-controls");
      const pagination = document.getElementById("overview-pagination");

      if (controls) controls.hidden = false;
      if (pagination) pagination.hidden = false;

      renderMeta(data.meta, universities);
      renderOverview(universities);
      renderRegions(universities);

      return loadJson(dataPath("spotlights.json"))
        .then((spotlights) => {
          const universitiesBySlug = indexUniversitiesBySlug(universities);
          renderSpotlights(spotlights, universitiesBySlug);
        })
        .catch((error) => {
          showSpotlightFallback(`Live spotlight data could not be refreshed. ${error.message}`);
        });
    })
    .catch((error) => {
      const controls = document.getElementById("overview-controls");
      const pagination = document.getElementById("overview-pagination");
      if (controls) controls.hidden = true;
      if (pagination) pagination.hidden = true;
      showHomepageBootstrapFailure(`Live data could not be refreshed. Interactive controls are unavailable until data loads successfully. ${error.message}`);
    });
}
