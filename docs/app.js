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

function renderOverview(universities) {
  const body = document.getElementById("overview-body");
  if (!body) return;
  body.innerHTML = universities
    .map((u) => {
      const dept = u.department ? link(u.department.label, u.department.url) : "—";
      const labs = u.labs?.length
        ? u.labs.slice(0, 2).map((lab) => link(lab.label, lab.url)).join(" · ")
        : (u.selected_centers || []).join(", ") || "—";
      const spotlight = u.spotlight ? `<a href="./spotlight.html#${u.slug}">Spotlight</a>` : "";
      return `
        <tr>
          <td>${u.rank}<div class="muted">THE: ${u.rank_display || u.rank}</div></td>
          <td><strong>${u.name}</strong><div class="muted">THE score: ${u.scorecard.overall || "—"}</div></td>
          <td>${u.region}</td>
          <td>${u.founded || "—"}</td>
          <td>${[u.city, u.country].filter(Boolean).join(", ")}</td>
          <td><div>${dept}</div><div class="muted">${labs}</div></td>
          <td>${tagList(u.strengths)}</td>
          <td>${link("Official", u.official_url)} · ${link("THE", u.ranking_links.the)} ${spotlight ? `· ${spotlight}` : ""}</td>
        </tr>`;
    })
    .join("");

  const search = document.getElementById("search");
  if (!search) return;
  search.addEventListener("input", () => {
    const q = search.value.toLowerCase().trim();
    [...body.querySelectorAll("tr")].forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  });
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
    </div>`;
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
