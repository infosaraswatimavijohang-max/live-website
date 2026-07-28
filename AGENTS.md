# Shree Saraswati Secondary School

Static HTML/CSS/JS site — no build process, no package.json.

## Running
- **Public**: Open any `.html` in a browser. Google Maps iframes require `localhost` (fail on `file://`).
- **Admin**: `admin.html` (login: `amitrazbanc` / `school1122@`)
- **Exam Portal**: `Login_portal.html` — separate SPA, uses CDN supabase-js v2.

## Script load order (critical)
```
supabase.js → cache.js → data.js → main.js (or admin.js)
```
`index.html` uses `defer`; other pages load scripts synchronously at end of `<body>`.
**Exception**: `notices.html` loads only `supabase.js + cache.js + data.js` (no `main.js`) with inline script.

## Data architecture
- **Primary**: Supabase REST API (raw `fetch`, **not** supabase-js client on public pages)
- **Fallback**: localStorage with `sss_` prefix — all `DataStore` ops write through to both
- **Reset**: DevTools → Application → clear `sss_*` and `sss_cache_*` keys
- **Admin auth**: `sessionStorage` (`sss_admin_auth`), credentials from `site_settings` table
- **Auto-seed**: `seedData()` runs on `window.onload` (`data.js:654`) — checks if `site_settings` exists, seeds teachers/staff/gallery on subsequent loads

## Key files
| File | Purpose |
|------|---------|
| `js/supabase.js` | Raw fetch client, column whitelist, in-flight dedup |
| `js/cache.js` | Two-tier cache (memory + localStorage) with TTL |
| `js/data.js` | DataStore CRUD + `compressImage()` + `seedData()` + `NepaliDate` + `ANNUAL_PLAN` |
| `js/main.js` | Renders public site (`App` object, lazy sections via `IntersectionObserver`) |
| `js/admin.js` | Admin CRUD (`Admin` object, including `compressImage` calls) |
| `js/exam_helper.js` | Exam portal helpers (separate column map, cache, dedup) |
| `css/style.css` | Public styles (all OKLCH tokens, Playfair Display + Noto Serif) |
| `css/admin.css` | Admin dashboard styles |
| `Login_portal.html` | Standalone exam portal (5669 lines, inline `<script>`) |

## Image handling
- Admin uploads → `compressImage(file)` in `data.js:250` → WebP base64 at 800px/0.6 quality → stored inline (localStorage size limits apply)
- Teacher/staff photo filenames in seed data must match `assets/images/Teachers/*` and `assets/images/Staff/*` exactly

## Annual Work Plan & Calendar (BS 2083)
- Source: `Details/Annual_Work_Plan_2083.xlsx` → `ANNUAL_PLAN` object in `data.js`
- Calendar rendered by `renderBsCalendar()` in `main.js` — date parsing via regex, `Last Wed & Thu` dynamically calculated
- Color-coded types (9): Holiday, Exam, Meeting, Event, Celebration, Sports, Tour, Admin, Regular
- Date parsing handles: `From X`, `X-Y` ranges, `Last Wed & Thu`, plain numbers — regular hyphens only (not en-dashes)

## Exam Portal (`Login_portal.html`)
- Uses supabase-js v2 from CDN (different stack from public site)
- Separate DB tables: `classes, subjects, teachers, students, exams, marks, images, assignments, notes`
- SQL migrations in `sql/` — run in Supabase SQL Editor after tables exist
- Own auth (username/password per student/teacher), own caching (`examCache`), own column maps (`EXAM_COLUMNS`)
- Shares the **same Supabase project** (`SUPABASE_URL`/`SUPABASE_ANON_KEY` identical to `js/supabase.js`)

## Design tokens
- **Navy** (`oklch(0.29 0.045 260)`, approx `#1a3a5c`): headers, nav, footer, structure
- **Teal** (`oklch(0.55 0.12 175)`): primary interactive accent — links, active states, icons, badges, selection
- **Gold** (`oklch(0.72 0.13 85)`): warm accent for CTAs (`btn-primary`), hero highlights, section dividers, stars
- Prefer OKLCH tokens from `:root` in `style.css` (lines 3-27) over hex values for new CSS
- Spacing base: 8px | Transitions: 0.35s cubic-bezier(0.22, 1, 0.36, 1)

## Layout
- Public pages: shared header/footer rendered by `App.renderHeader()` / `App.renderFooter()` via DataStore
- Sections lazy-loaded via `IntersectionObserver` with 200px rootMargin (falls back to eager if `prefers-reduced-motion`)

## Domain
- `saraswatisecschool.edu.np` (set in `CNAME` + Google Search Console verification in `index.html`)