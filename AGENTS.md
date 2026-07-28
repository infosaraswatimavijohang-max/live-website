# Shree Saraswati Secondary School

Static HTML/CSS/JS site — no build/test/lint/CI pipeline, no package.json.

## Running
- **Public pages**: Open any `.html` in a browser. Google Maps iframes require `localhost` (fail on `file://`).
- **Admin**: `admin.html` — login via `site_settings` table in Supabase (no hardcoded fallback)
- **Exam Portal / Account**: `Login_portal.html` — standalone SPA, uses CDN supabase-js v2, ~7K-line inline `<script>`

## Script load order (critical)
```
supabase.js → cache.js → data.js → main.js (or admin.js)
```
`index.html` uses `defer`; other pages load scripts synchronously at end of `<body>`.
**Exception**: `notices.html` loads only `supabase.js + cache.js + data.js` (no `main.js`) with inline script.

## Data architecture
- **Primary**: Supabase REST API via raw `fetch` (`js/supabase.js` — not supabase-js client on public pages)
- **Fallback**: localStorage with `sss_` prefix — all `DataStore` ops write through to both
- **Cache**: two-tier (memory + localStorage, `sss_cache_` prefix) with per-key TTL in `js/cache.js`
- **Reset**: DevTools → Application → clear all `sss_*` and `sss_cache_*` keys
- **Admin auth**: `sessionStorage` (`sss_admin_auth`), credentials from `site_settings` table
- **Auto-seed**: `seedData()` runs on `window.onload` (`data.js:654`) — checks if `site_settings` exists, seeds teachers/staff/gallery on subsequent loads
- **Supabase project**: URL + anon key hardcoded in `js/supabase.js:9-10`

## Key files
| File | Purpose |
|------|---------|
| `js/supabase.js` | Raw fetch client, column whitelist (`COLUMN_MAP`), in-flight dedup |
| `js/cache.js` | Two-tier cache (memory + localStorage) with per-key TTL |
| `js/data.js` | DataStore CRUD + `compressImage()` + `seedData()` + `NepaliDate` + `ANNUAL_PLAN` |
| `js/main.js` | Renders public site (`App` object, lazy sections via `IntersectionObserver`) |
| `js/admin.js` | Admin CRUD (`Admin` object) |
| `js/exam_helper.js` | Exam portal helpers (`EXAM_COLUMNS`, `examCache`, dedup) |
| `css/style.css` | Public styles (OKLCH tokens lines 3-27, Playfair Display + Noto Serif) |
| `css/admin.css` | Admin dashboard styles |
| `Login_portal.html` | Exam portal + Account module (~7000 lines, inline `<script>`) |

## Image handling
- Admin uploads → `compressImage(file)` (`data.js:250`) → WebP base64 at 800px/0.6 quality → stored inline (localStorage size limits apply)
- Teacher/staff photo filenames in seed data must match `assets/images/Teachers/*` and `assets/images/Staff/*` exactly

## Design system
- **Navy** `oklch(0.29 0.045 260)`: headers, nav, footer, structure
- **Teal** `oklch(0.55 0.12 175)`: primary interactive accent — links, active states, CTAs
- **Gold** `oklch(0.72 0.13 85)`: warm accent for `btn-primary`, hero highlights, stars
- Prefer OKLCH tokens from `:root` (`css/style.css:3-27`) over hex values
- Spacing base: 8px | Transitions: `0.35s cubic-bezier(0.22, 1, 0.36, 1)`
- Full design guidelines: `DESIGN.md` | Brand/product voice: `PRODUCT.md`

## Layout
- Public pages: shared header/footer rendered by `App.renderHeader()` / `App.renderFooter()` via DataStore
- Sections lazy-loaded via `IntersectionObserver` with 200px rootMargin (falls back to eager if `prefers-reduced-motion`)

## Annual Work Plan & Calendar (BS 2083)
- Source: `Details/Annual_Work_Plan_2083.xlsx` → `ANNUAL_PLAN` object in `data.js`
- Calendar rendered by `renderBsCalendar()` in `main.js` — date parsing via regex, `Last Wed & Thu` dynamically calculated
- Color-coded types (9): Holiday, Exam, Meeting, Event, Celebration, Sports, Tour, Admin, Regular
- Date parsing handles: `From X`, `X-Y` ranges, `Last Wed & Thu`, plain numbers — regular hyphens only (not en-dashes)

## Fee Management (in `Login_portal.html` Account module)
- **Fee categories**: three scopes (`school`/`class`/`student`), three frequencies (`monthly`/`yearly`/`event`)
- **Amount resolution**: school→`fee_categories.amount`, class→`class_fees`, student→`student_fees`
- **Collection form**: Nepali month checkboxes, yearly checkboxes, event amount inputs; real-time total via `updateCollectionTotal()`
- **Bill numbers**: auto-increment per fiscal year via `getNextBillNo()` — derived from max `bill_no` in `fee_collections` + local `FEE_COLLS`
- **Discounts/scholarships**: `student_discounts` table with `discount_type` (position/category/custom), `discount_percent`, `discount_amount`, `applies_to` (all/monthly/yearly/event/specific fee category)
- **Per-student detail**: expandable fee matrix per student, showing paid/due months per fee category
- **Recent Collections**: searchable by bill no, class, student; batch delete via checkboxes
- **Privileges**: admin + `designation: 'Accountant'` + class teachers (scoped to their own class(es))

## SQL migrations
| File | Tables created |
|------|----------------|
| `sql/001_performance_indexes.sql` | Performance indexes |
| `sql/002_required_columns.sql` | Required column additions |
| `sql/004_assignments_notes_queries.sql` | Assignments, notes, queries |
| `sql/006_fee_management.sql` | `fee_categories`, `class_fees`, `student_fees`, `fee_collections`, `bill_sequence`, `student_discounts` + RLS policies |

Run all in Supabase SQL Editor in numeric order. Each fee table has `public_all` RLS policy.

## Exam Portal (`Login_portal.html`)
- Uses supabase-js v2 from CDN (different stack from public site — raw `fetch` is NOT used here)
- Separate DB tables: `classes, subjects, teachers, students, exams, marks, images, assignments, notes`
- SQL migrations in `sql/` — run in Supabase SQL Editor after tables exist
- Own auth (username/password per student/teacher), own caching (`examCache`), own column maps (`EXAM_COLUMNS` in `exam_helper.js`)
- Shares the **same Supabase project** (same URL/anon key)

## Exam portal table STRUCT conventions (important)
- STRUCT classes use `name` not `class_label`
- STRUCT students use `name` (not `full_name`), `roll` (not `school_roll_no`), `classId` (not `class_id`)
- These differ from the Supabase column names in `EXAM_COLUMNS` — the inline code maps between them

## Domain
- `saraswatisecschool.edu.np` (set in `CNAME` + Google Search Console verification in `index.html`)

## Notes
- No build, test, lint, or typecheck commands exist
- `graphify-out/` and `.graphify_*` files are analysis artifacts, not part of the application
- `Login_portal.html` has ~7000 lines of inline JS — prefer targeted edits over bulk rewrites
