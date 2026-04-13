async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

function link(label, url) {
  return url ? `<a href="${url}" target="_blank" rel="noreferrer">${label}</a>` : "—";
}

function tagList(items = []) {
  return items.map((item) => `<span class="tag">${item}</span>`).join("");
}

function numericScore(value) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const matches = String(value).match(/\d+(?:\.\d+)?/g);
  if (!matches || !matches.length) return 0;
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

function renderOverview(universities) {
  const body = document.getElementById("overview-body");
  const search = document.getElementById("search");
  const countryFilter = document.getElementById("country-filter");
  const sortBy = document.getElementById("sort-by");
  const countEl = document.getElementById("overview-count");
  if (!body || !search || !countryFilter || !sortBy || !countEl) return;

  const countries = [...new Set(universities.map((u) => u.country).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  countryFilter.innerHTML = '<option value="">All countries</option>' + countries.map((country) => `<option value="${country}">${country}</option>`).join("");

  function draw() {
    const q = search.value.toLowerCase().trim();
    const country = countryFilter.value;
    const sort = sortBy.value;
    const filtered = universities
      .filter((u) => !country || u.country === country)
      .filter((u) => {
        if (!q) return true;
        return [u.name, u.country, u.region, u.city || "", ...(u.strengths || [])].join(" ").toLowerCase().includes(q);
      })
      .sort((a, b) => compareUniversities(a, b, sort));

    countEl.textContent = `${filtered.length} universities shown`;
    body.innerHTML = filtered
      .map((u) => {
        const dept = u.department ? link(u.department.label, u.department.url) : "—";
        const researchLinks = u.labs?.length
          ? u.labs.slice(0, 2).map((lab) => link(lab.label, lab.url)).join(" · ")
          : "—";
        const spotlight = u.spotlight ? `<a href="./spotlight.html#${u.slug}">Spotlight</a>` : "";
        return `
          <tr>
            <td>${u.rank}<div class="muted">THE: ${u.rank_display || u.rank}</div></td>
            <td><strong>${u.name}</strong><div class="muted">THE score: ${u.scorecard.overall || "—"}</div></td>
            <td>${u.region}</td>
            <td>${u.founded || "—"}</td>
            <td>${[u.city, u.country].filter(Boolean).join(", ")}</td>
            <td><div>${dept}</div><div class="muted">${researchLinks}</div></td>
            <td>${tagList(u.strengths)}</td>
            <td>${link("Official", u.official_url)} · ${link("THE", u.ranking_links.the)} ${spotlight ? `· ${spotlight}` : ""}</td>
          </tr>`;
      })
      .join("");
  }

  [search, countryFilter, sortBy].forEach((el) => el.addEventListener("input", draw));
  countryFilter.addEventListener("change", draw);
  sortBy.addEventListener("change", draw);
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
          ${schools.map((u) => `<li><strong>#${u.rank}</strong> ${u.name}</li>`).join("")}
        </ol>
      </article>`)
    .join("");
}

function renderSpotlights(spotlights, universities) {
  const targets = [document.getElementById("spotlight-grid"), document.getElementById("spotlight-list")].filter(Boolean);
  if (!targets.length) return;
  const cards = spotlights.spotlights
    .map((s) => {
      const uni = universities.find((u) => u.slug === s.slug);
      return `
        <article class="panel card" id="${s.slug}">
          <p class="eyebrow">Rank #${uni?.rank || "—"}</p>
          <h3>${s.name}</h3>
          <p>${(s.advances || []).join(" ")}</p>
          <div>${tagList(s.strengths)}</div>
          <p><strong>Department:</strong> ${link(s.department.label, s.department.url)}</p>
          <p><strong>Labs:</strong> ${(s.labs || []).map((lab) => link(lab.label, lab.url)).join(" · ")}</p>
          <p><strong>Research:</strong> ${(s.research_links || []).map((r) => link(r.label, r.url)).join(" · ")}</p>
          <p><strong>Papers / breakthroughs:</strong> ${(s.papers || []).map((p) => link(p.title, p.url)).join(" · ")}</p>
        </article>`;
    })
    .join("");
  targets.forEach((el) => (el.innerHTML = cards));
}

Promise.all([loadJson("./data/universities.json"), loadJson("./data/spotlights.json")])
  .then(([data, spotlights]) => {
    renderMeta(data.meta, data.universities);
    renderOverview(data.universities);
    renderRegions(data.universities);
    renderSpotlights(spotlights, data.universities);
  })
  .catch((error) => {
    const target = document.getElementById("meta-summary") || document.body;
    target.innerHTML = `<p><strong>Could not load site data.</strong><br>${error.message}</p>`;
  });
