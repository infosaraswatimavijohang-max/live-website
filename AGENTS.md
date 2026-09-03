# Shree Saraswati Secondary School

Static HTML/CSS/JS site — no build, test, lint, or CI pipeline. No `package.json`. No `.gitignore`.

## Running

- **Public pages**: Open any `.html` directly in a browser (no build step). Contact/about maps are static `maps.app.goo.gl` links — **not** iframes. When Supabase is unreachable, `DataStore` falls back to `sss_` localStorage, so pages still render.
- **Admin**: `admin.html` — login with `adminUsername`/`adminPassword` from `site_settings` table; falls back to `amitrazbanc` / `school1122@` (`admin.js:25-26`, also seed defaults in `data.js:306-307`).
- **Exam Portal / Account**: `Login_portal.html` — standalone SPA (7972-line file, ~6880-line inline `<script>`), uses CDN supabase-js v2 (different stack from public pages).

## Script load order (critical)

```
supabase.js → cache.js → data.js → [bs_calendar.js] → main.js (or admin.js)
```

`bs_calendar.js` is loaded by `index.html`, `admin.html`, and `Login_portal.html` — it provides AD↔BS conversion and auto-decorates `<input type="date">` with BS spans.

- `index.html` loads all five with `defer`.
- `about.html`, `admissions.html`, `contact.html` load four scripts **synchronously** at end of `<body>` (no `bs_calendar.js`).
- `admin.html` loads five scripts synchronously (`...admin.js` instead of `main.js`).
- **Exception**: `notices.html` loads only `supabase.js + cache.js + data.js` (no `main.js`) with an inline fetch script using `DataStore` + `ANNUAL_PLAN` directly.
- `Login_portal.html` loads `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js` + `js/exam_helper.js` + `js/bs_calendar.js`.

## Data architecture

- **Primary**: Supabase REST API via raw `fetch` (`js/supabase.js`). Column whitelist (`COLUMN_MAP`, `supabase.js:47`), in-flight request dedup (`_inFlight` map).
- **Fallback**: localStorage with `sss_` prefix. All `DataStore` ops write through to both.
- **Cache**: `CacheManager` (`js/cache.js`) — two-tier (memory + localStorage, `sss_cache_` prefix) with per-key TTL. Used by `DataStore` in `data.js`.
- **Reset**: DevTools → Application → clear all `sss_*` and `sss_cache_*` keys.
- **Admin auth**: `sessionStorage` key `sss_admin_auth`.
- **Supabase project**: URL + anon key hardcoded in `js/supabase.js:9-10` (shared with `Login_portal.html`).

## Auto-seed (`seedData` in `js/data.js`)

Fires on **both** triggers:
1. `window.onload` in `data.js:730-736` (runs on every public page load)
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
| `js/bs_calendar.js` | General AD↔BS converter (BS 1975–2099) + auto BS display. Loaded by `index.html`, `admin.html`, `Login_portal.html` |
| `css/style.css` | OKLCH tokens at `:root` (lines 3-27). `--header-h:72px` controls `scroll-padding-top` for anchor targets. Playfair Display + Noto Serif |
| `css/admin.css` | Admin dashboard styles |

## Image handling

- Admin uploads → `compressImage(file, 800, 0.6)` → WebP base64 → stored inline (localStorage size limits apply). Teacher/staff photo filenames in seed data must match `assets/images/Teaching Staff/*` and `assets/images/Non Teaching Staff/*` exactly.
- **Public gallery renders from local files** — `galleryData` in `js/data.js` (74 WebP images) points at `assets/images/<Folder>/<file>.webp`, URL-encoded (spaces `%20`, parentheses `%28`/`%29`). `App.renderGallery` in `main.js` always renders `galleryData` and appends admin-added extras (by id), with a `.catch` fallback — the public gallery never depends on Supabase.
- **Legacy storage workflow (superseded)**: `upload_gallery.ps1` + `sql/007_gallery_storage.sql` uploaded folders to the `gallery` bucket and rewrote `galleryData` with public storage URLs. Stale storage URLs caused a blank gallery, so the public gallery now uses local files only. The storage bucket/table remain for admin use.

## Design system

- Navy `oklch(0.29 0.045 260)`: headers, nav, footer, structure
- Teal `oklch(0.55 0.12 175)`: primary interactive accent — links, active states, CTAs
- Gold `oklch(0.72 0.13 85)`: warm accent for `btn-primary`, hero highlights, stars
- Prefer OKLCH tokens from `:root` over hex. Spacing base: 8px. Transitions: `0.35s cubic-bezier(0.22, 1, 0.36, 1)`.
- Dark mode: `[data-theme="dark"]` on `<html>` redefines the tokens (`style.css:29`). Theme persisted in `sss_theme` localStorage, initialized by an inline script at the top of every public page. Keep new colors working under both token sets.
- Full guidelines: `DESIGN.md` | Brand/voice: `PRODUCT.md`

## Layout

- Public pages render shared header/footer via `App.renderHeader()` / `App.renderFooter()`.
- Sections lazy-loaded via `IntersectionObserver` with 200px rootMargin; falls back to eager if `prefers-reduced-motion`.
- **Showcase marquees**: Gallery, Teachers, and Staff render as auto-scrolling strips — `.gallery-track` / `.teachers-track` / `.staff-track` inside an `overflow:hidden` wrapper, each `width:fit-content`, content doubled, `gmarquee` keyframes (`translateX(-50%)`) at 90s, pausing on hover. Cards are 260px wide (`flex:0 0 260px`; 165px on small phones), people cards use a 128px round photo.

## Annual Work Plan & Calendar (BS 2083)

- Source: `Details/Annual_Work_Plan_2083.xlsx` → `ANNUAL_PLAN` object in `data.js`. Months keyed by Nepali name, matched by `MONTH_ORDER` array.
- Calendar rendered by `renderBsCalendar()` in `main.js`. 9 color-coded types: Holiday, Exam, Meeting, Event, Celebration, Sports, Tour, Admin, Regular.
- Date parsing handles: `From X`, `X-Y` ranges, `Last Wed & Thu`, plain numbers — regular hyphens, not en-dashes.
- **BS 2083 month lengths** (`BS_MONTH_DAYS`, `data.js`): `[31,31,32,31,31,31,30,29,30,29,30,30]` (365 days) — verified against hamro patro. Anchors: Baisakh 1 = Apr 14 2026, Jestha 1 = May 15, Ashadh 1 = Jun 15, Shrawan 1 = Jul 17, Bhadra 1 = Aug 17, Ashwin 1 = Sep 17, Kartik 1 = Oct 18, Mangsir 1 = Nov 17, Poush 1 = Dec 16, Magh 1 = Jan 15 2027, Falgun 1 = Feb 13, Chaitra 1 = Mar 15.
- **Public holidays**: `BS_HOLIDAYS` object in `data.js` (keyed by Nepali month name → `{day, name}`), sourced from hamro patro's 2083 holiday list. `renderBsCalendar()` merges them into cells as `cal-holiday` (badge shows festival name), and `showMonthActivities()` lists them at the top of the plan panel. To change which holidays appear, edit `BS_HOLIDAYS`.
- `NepaliDate.convertToBS()` (used by `main.js` event timeline) and `bsDateFromAd()` are both anchored to Baisakh 1 2083 = Apr 14 2026 and agree with hamro patro for the 2083 academic year.

## BS (Nepali) date fields

- Every `<input type="date">` on `index.html`, `admin.html`, and `Login_portal.html` automatically shows a read-only BS date span under it (`js/bs_calendar.js`). `initBsDateDisplays()` uses a `MutationObserver` so dynamically-rendered inputs (exam rows, modals) get decorated too. The AD field stays the source of truth — the BS display is derived, never edited.
- Converter: `adToBs()` / `bsToAd()` cover BS 1975–2099 from the `BS_YEARS` month-length table in `bs_calendar.js` (epoch Baisakh 1 2000 BS = Apr 14 1943 AD). The 2083-only `BS_MONTH_DAYS`/`bsDateFromAd()` in `data.js` are separate and untouched.
- Persistence: BS values are saved alongside the AD values — `dob_bs` on `admissions`/`students`, `date_bs` on `notices`/`events`, `joining_date_bs` on `teachers`, `due_date_bs` on `assignments` (see `sql/007_bs_date_columns.sql`); exam dates ride inside the existing `exams.subject_marks` JSONB blob (`_startDateBs`, `_endDateBs`, `_publishFromBs`, `_publishUntilBs`). Nothing breaks pre-migration: public/admin writes go through `supabase.insert`/`update`, which detect a missing-column error (PGRST204) and retry once with `_bs` keys stripped (`js/supabase.js`); the exam portal has its own per-call retry-without-`_bs` fallbacks.
- If a form sets a date input's value programmatically (e.g. admin edit), call `updateBsDate(inputEl)` after — `setVal()`/`clearForm()` in `admin.js` already do.

## SQL migrations

Run in Supabase SQL Editor in numeric order:

| File | Tables |
|------|--------|
| `sql/001_performance_indexes.sql` | Performance indexes |
| `sql/002_required_columns.sql` | Required column additions |
| `sql/004_assignments_notes_queries.sql` | Assignments, notes, queries |
| `sql/006_fee_management.sql` | `fee_categories`, `class_fees`, `student_fees`, `fee_collections`, `bill_sequence`, `student_discounts` + RLS |
| `sql/007_bs_date_columns.sql` | BS date columns: `admissions.dob_bs`, `notices.date_bs`, `events.date_bs`, `students.dob_bs`, `teachers.joining_date_bs`, `assignments.due_date_bs` |
| `sql/007_gallery_storage.sql` | Legacy — public `gallery` storage bucket + `storage.objects` RLS (no longer required; public gallery renders local `galleryData` files) |
| `sql/008_alumni.sql` | `alumni_students`, `alumni_teachers` + `public_all` RLS |

Each fee table has `public_all` RLS policy. Two other SQL files (`student_photo_updates.sql`, `teacher_photo_updates.sql`) are one-time data migrations, not schema changes.

## Exam Portal (`Login_portal.html`)

- Uses supabase-js v2 CDN (not the raw fetch client from public pages).
- Separate DB tables: `classes, subjects, teachers, students, exams, marks, images, assignments, notes`.
- On every load it syncs those relational tables into an `exam_portal_kv` table (`structure` + `auth` blobs); the app reads STRUCT from that blob. Photos are deliberately stripped before persisting (`persistStructure()`), so cached rows are image-less.
- Own auth (username/password per student/teacher), own caching (`examCache`), own column maps (`EXAM_COLUMNS` in `exam_helper.js`).
- **STRUCT naming differs from DB columns**: classes use `name` not `class_label`, students use `name`/`roll`/`classId` not `full_name`/`school_roll_no`/`class_id`. Inline code maps between them via `EXAM_COLUMNS`.
- `Login_portal.html` is a ~7970-line file; the main inline `<script>` spans lines 1091–7969 (~6880 lines of JS between the tags) — prefer targeted edits over bulk rewrites. Syntax-check it by extracting that range and running `node --check`.

### Exam Portal credentials

- Student default password = roll number; teacher default password = username (first name). Passwords are plaintext columns on `students`/`teachers`, merged into the `exam_portal_kv` `structure`/`auth` rows.
- `pwdToggleHtml` only reveals the **default** password. Once the user changes it (`mustChangePassword === false`), admin sees "Changed by user (hidden)" and can no longer view it.
- Admin password recovery: students table **Reset Password** button → back to roll number (`resetStudentPassword`); the **Edit Student** modal also has a "New password (optional)" field, same as the teacher edit modal (`edit-stu-pass` → `submitEditStudent` sets `password` + `previousPassword` + `mustChangePassword: true`).

## Fee Management (in `Login_portal.html` Account module)

- Three fee scopes (`school`/`class`/`student`), three frequencies (`monthly`/`yearly`/`event`).
- Amount resolution: school→`fee_categories.amount`, class→`class_fees`, student→`student_fees`.
- Bill numbers auto-increment per fiscal year via `getNextBillNo()` (max `bill_no` + local `FEE_COLLS` array).
- Discounts: `student_discounts` table with `discount_type` (position/category/custom), `discount_percent`, `discount_amount`, `applies_to`.
- Privileges: admin + `designation: 'Accountant'` + class teachers (scoped to own classes).

## Alumni (in `Login_portal.html`)

- Admin-only **Alumni** tab lists passed-out/left-school students (`ALUMNI.students`) and former staff (`ALUMNI.teachers`). Data lives in `alumni_students` / `alumni_teachers` tables (see `sql/008_alumni.sql`), loaded lazily by `loadAlumniData()` (cached via `ALUMNI_LOADED`).
- **Leave School** button (on each student row and staff card) calls `moveStudentToAlumni()` / `moveTeacherToAlumni()`. These COPY the row into the alumni table (with `left_on` timestamp + photo), then DELETE it from the active `students`/`teachers` table; fee/marks history is untouched. Credentials in the kv `structure`/`auth` blobs are removed when the active row is dropped.
- The in-memory alumni rows pushed by `move*ToAlumni()` use DB-shaped field names (`full_name`, `roll`, `class_id`, `photo_url`, `left_on`) so `renderAlumni()` reads them and the DB rows consistently — not the STRUCT/AUTH-shaped names.

## Domain

`saraswatisecschool.edu.np` — set in `CNAME` + canonical tag in `index.html`. Note: the `google-site-verification` meta (`index.html:16`) is still the placeholder `YOUR_GOOGLE_VERIFICATION_CODE`.

## Notes

- `graphify-out/` and `.graphify_*` files are analysis artifacts, not part of the application.
- No `.gitignore` — git tracks everything. Large generated files (e.g. `sql/teacher_photo_updates.sql` at ~12 MB) are committed.
- `robots.txt` and `sitemap.xml` present at root.
- Git identity is NOT configured in this repo. To commit/push, pass explicit identity on each command, e.g. `git -c user.name="Amit Rajbanshi" -c user.email="infosaraswatimavijohang@gmail.com" commit -m "..."` (repo commits use this author).
