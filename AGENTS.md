# Shree Saraswati Secondary School

Static HTML/CSS/JS site — no build, test, lint, or CI pipeline. No `package.json`. No `.gitignore`.

## Running

- **Public pages**: Open any `.html` in a browser. Google Maps iframes require `localhost` (fail on `file://`).
- **Admin**: `admin.html` — login with `adminUsername`/`adminPassword` from `site_settings` table; falls back to `amitrazbanc` / `school1122@` (`admin.js:25-26`, also seed defaults in `data.js:324-325`).
- **Exam Portal / Account**: `Login_portal.html` — standalone SPA (~7400-line inline `<script>`), uses CDN supabase-js v2 (different stack from public pages).

## Script load order (critical)

```
supabase.js → cache.js → data.js → main.js (or admin.js)
```

- `index.html` loads all four with `defer` — the only page that does.
- `about.html`, `admissions.html`, `contact.html` load all four **synchronously** at end of `<body>`.
- **Exception**: `notices.html` loads only `supabase.js + cache.js + data.js` (no `main.js`) with an inline fetch script using `DataStore` + `ANNUAL_PLAN` directly.
- `Login_portal.html` loads only `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js` + `js/exam_helper.js`.

## Data architecture

- **Primary**: Supabase REST API via raw `fetch` (`js/supabase.js`). Column whitelist (`COLUMN_MAP`, `supabase.js:47`), in-flight request dedup (`_inFlight` map).
- **Fallback**: localStorage with `sss_` prefix. All `DataStore` ops write through to both.
- **Cache**: `CacheManager` (`js/cache.js`) — two-tier (memory + localStorage, `sss_cache_` prefix) with per-key TTL. Used by `DataStore` in `data.js`.
- **Reset**: DevTools → Application → clear all `sss_*` and `sss_cache_*` keys.
- **Admin auth**: `sessionStorage` key `sss_admin_auth`.
- **Supabase project**: URL + anon key hardcoded in `js/supabase.js:9-10` (shared with `Login_portal.html`).

## Auto-seed (`seedData` in `js/data.js`)

Fires on **both** triggers:
1. `window.onload` in `data.js:654-657` (runs on every public page load)
2. Admin login (`admin.js:16`) calls `seedData()` after auth check

Logic: if `site_settings` already exists → seeds teachers/staff/gallery only. If absent → seeds site_settings, slides, and about first, then teachers/staff/gallery.

## Key files

| File | Purpose |
|------|---------|
| `js/supabase.js` | Raw fetch client, `COLUMN_MAP`, in-flight dedup |
| `js/cache.js` | `CacheManager` — two-tier cache (memory + localStorage) with TTL |
| `js/data.js` | `DataStore`, `compressImage()`, `seedData()`, `NepaliDate`, `ANNUAL_PLAN` |
| `js/main.js` | Renders public site (`App` object, lazy sections via `IntersectionObserver`) |
| `js/admin.js` | Admin CRUD (`Admin` object) |
| `js/exam_helper.js` | Exam portal helpers (`EXAM_COLUMNS`, `examCache`, column mapping) |
| `css/style.css` | OKLCH tokens at `:root` (lines 3-27). `--header-h:72px` controls `scroll-padding-top` for anchor targets. Playfair Display + Noto Serif |
| `css/admin.css` | Admin dashboard styles |

## Image handling

Admin uploads → `compressImage(file, 800, 0.6)` → WebP base64 → stored inline (localStorage size limits apply). Teacher/staff photo filenames in seed data must match `assets/images/Teachers/*` and `assets/images/Staff/*` exactly.

## Design system

- Navy `oklch(0.29 0.045 260)`: headers, nav, footer, structure
- Teal `oklch(0.55 0.12 175)`: primary interactive accent — links, active states, CTAs
- Gold `oklch(0.72 0.13 85)`: warm accent for `btn-primary`, hero highlights, stars
- Prefer OKLCH tokens from `:root` over hex. Spacing base: 8px. Transitions: `0.35s cubic-bezier(0.22, 1, 0.36, 1)`.
- Full guidelines: `DESIGN.md` | Brand/voice: `PRODUCT.md`

## Layout

- Public pages render shared header/footer via `App.renderHeader()` / `App.renderFooter()`.
- Sections lazy-loaded via `IntersectionObserver` with 200px rootMargin; falls back to eager if `prefers-reduced-motion`.

## Annual Work Plan & Calendar (BS 2083)

- Source: `Details/Annual_Work_Plan_2083.xlsx` → `ANNUAL_PLAN` object in `data.js:517`. Months keyed by Nepali name, matched by `MONTH_ORDER` array (`data.js:613`).
- Calendar rendered by `renderBsCalendar()` in `main.js`. 9 color-coded types: Holiday, Exam, Meeting, Event, Celebration, Sports, Tour, Admin, Regular.
- Date parsing handles: `From X`, `X-Y` ranges, `Last Wed & Thu`, plain numbers — regular hyphens, not en-dashes.

## SQL migrations

Run in Supabase SQL Editor in numeric order:

| File | Tables |
|------|--------|
| `sql/001_performance_indexes.sql` | Performance indexes |
| `sql/002_required_columns.sql` | Required column additions |
| `sql/004_assignments_notes_queries.sql` | Assignments, notes, queries |
| `sql/006_fee_management.sql` | `fee_categories`, `class_fees`, `student_fees`, `fee_collections`, `bill_sequence`, `student_discounts` + RLS |

Each fee table has `public_all` RLS policy. Two other SQL files are one-time data migrations (student/teacher photo updates), not schema changes.

## Exam Portal (`Login_portal.html`)

- Uses supabase-js v2 CDN (not the raw fetch client from public pages).
- Separate DB tables: `classes, subjects, teachers, students, exams, marks, images, assignments, notes`.
- Own auth (username/password per student/teacher), own caching (`examCache`), own column maps (`EXAM_COLUMNS` in `exam_helper.js`).
- **STRUCT naming differs from DB columns**: classes use `name` not `class_label`, students use `name`/`roll`/`classId` not `full_name`/`school_roll_no`/`class_id`. Inline code maps between them via `EXAM_COLUMNS`.
- Inline `<script>` is ~7400 lines — prefer targeted edits over bulk rewrites.

## Fee Management (in `Login_portal.html` Account module)

- Three fee scopes (`school`/`class`/`student`), three frequencies (`monthly`/`yearly`/`event`).
- Amount resolution: school→`fee_categories.amount`, class→`class_fees`, student→`student_fees`.
- Bill numbers auto-increment per fiscal year via `getNextBillNo()` (max `bill_no` + local `FEE_COLLS` array).
- Discounts: `student_discounts` table with `discount_type` (position/category/custom), `discount_percent`, `discount_amount`, `applies_to`.
- Privileges: admin + `designation: 'Accountant'` + class teachers (scoped to own classes).

## Domain

`saraswatisecschool.edu.np` — set in `CNAME` + Google Search Console verification in `index.html`.

## Notes

- `graphify-out/` and `.graphify_*` files are analysis artifacts, not part of the application.
- No `.gitignore` — git tracks everything. Large generated files (e.g. `sql/teacher_photo_updates.sql` at ~12 MB) are committed.
- `robots.txt` and `sitemap.xml` present at root.
