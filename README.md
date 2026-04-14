# Top Universities for CS, AI/ML, and Data Science

[![Updated 2026](https://img.shields.io/badge/updated-2026-blue)](./docs/data/universities.json)
[![Top 200](https://img.shields.io/badge/list-top--200-success)](./docs/)
[![GitHub Pages Ready](https://img.shields.io/badge/GitHub%20Pages-ready-black)](./docs/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Public Repo](https://img.shields.io/badge/repo-public-lightgrey)](./README.md)
[![Donate via Stripe](https://img.shields.io/badge/donate-stripe-635bff?logo=stripe&logoColor=white)](https://buy.stripe.com/8x200i8bSgVe3Vl3g8bfO00)

Research-friendly directory of the **top 200 universities in the world for Computer Science, AI/ML, and closely related data science fields**.

Created by **[Diego Marinho](https://dmoliveira.github.io/my-cv-public/cv/human/)**.

## What this includes

- global top-200 directory
- region views for easier navigation
- official links, founded year, location, strengths, and score snapshots
- spotlight pages for especially influential universities
- methodology + update year
- static site ready for **GitHub Pages** from `/docs`

## Open the site

Serve `/docs` locally because the site loads JSON with `fetch()`:

```bash
python3 -m http.server 8000 -d docs
```

- Main site: [http://localhost:8000/index.html](http://localhost:8000/index.html)
- Spotlight pages: [http://localhost:8000/spotlight.html](http://localhost:8000/spotlight.html)
- Methodology: [http://localhost:8000/methodology.html](http://localhost:8000/methodology.html)
- Custom domain guide: [http://localhost:8000/custom-domain.html](http://localhost:8000/custom-domain.html)

## Data notes

- Base ranking source: **Times Higher Education Computer Science World University Rankings 2026**.
- Metadata enrichment: **ROR** plus official university research pages for spotlight institutions.
- This is **not** an aggregated ranking; the ordered list follows THE's 2026 Computer Science ranking and is enriched for navigation/research use.
- If an automated official-site match looked unreliable, the field is left blank on purpose.
- This repo is a practical curated directory, not an official publication of any ranking body.

## Rebuild data

```bash
python3 scripts/build_data.py
```
