# Shree Saraswati Secondary School

Static HTML/CSS/JS site — no build, test, lint, or CI pipeline. No `package.json`. No `.gitignore`.

## Running

- **Public pages**: Open any `.html` directly in a browser (no build step). Contact/about maps are static `maps.app.goo.gl` links — **not** iframes. When Supabase is unreachable, `DataStore` falls back to `sss_` localStorage, so pages still render.
- **Admin**: `admin.html` — login with `adminUsername`/`adminPassword` from `site_settings` table; falls back to `amitrazbanc` / `school1122@` (`admin.js:25-26`, also seed defaults in `data.js:332-333`).
- **Exam Portal / Account**: `Login_portal.html` — standalone SPA (~8819 lines; see Exam Portal section for details), uses CDN supabase-js v2 (different stack from public pages).

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

## Verification

There is no test/lint/CI. The only syntax check is `node --check`: for `Login_portal.html` (and other big inline `<script>` blocks), extract the range between `<script>` / `</script>` and run `node --check` on it. In `Login_portal.html` the main inline `<script>` opens near line 1143 and runs to ~8816.

## Data architecture

- **Primary**: Supabase REST API via raw `fetch` (`js/supabase.js`). Column whitelist (`COLUMN_MAP`, `supabase.js:47`), in-flight request dedup (`_inFlight` map).
- **Fallback**: localStorage with `sss_` prefix. All `DataStore` ops write through to both.
- **`supabase` methods resolve, never reject on HTTP/network failure** — they return `{ data, error }`. `DataStore.get` therefore checks `error` and throws so its `catch` → localStorage fallback actually fires (`data.js`). Don't pattern-match `await` calls without checking `error`.
- **`HOMEPAGE_VISIBILITY` is local-only**: no Supabase table exists for it (mapped via `DataStore.LOCAL_ONLY_KEYS`, `data.js:13`), so `main.js:11` and `admin.js:115` never hit the network for it. Don't add it to `COLUMN_MAP`/SQL — visibility persists in `sss_HOMEPAGE_VISIBILITY`.
- **Cache**: `CacheManager` (`js/cache.js`) — two-tier (memory + localStorage, `sss_cache_` prefix) with per-key TTL. Used by `DataStore` in `data.js`.
- **Reset**: DevTools → Application → clear all `sss_*` and `sss_cache_*` keys.
- **Admin auth**: `sessionStorage` key `sss_admin_auth`.
- **Supabase project**: URL + anon key hardcoded in `js/supabase.js:9-10` (shared with `Login_portal.html`).

## Auto-seed (`seedData` in `js/data.js`)

Fires on **both** triggers:
1. `window.onload` in `data.js:755-761` (runs on every public page load)
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
- Dark mode: `[data-theme="dark"]` on `<html>` redefines the tokens (`style.css:30`). Theme persisted in `sss_theme` localStorage, initialized by an inline script at the top of every public page. Keep new colors working under both token sets.
- Full guidelines: `DESIGN.md` | Brand/voice: `PRODUCT.md`

## Layout

- Public pages render shared header/footer via `App.renderHeader()` / `App.renderFooter()`.
- Sections lazy-loaded via `IntersectionObserver` with 200px rootMargin; falls back to eager if `prefers-reduced-motion`.
- **Showcase marquees**: Gallery, Teachers, and Staff render as auto-scrolling strips — `.gallery-track` / `.teachers-track` / `.staff-track` inside an `overflow:hidden` wrapper, each `width:fit-content`, content doubled, `gmarquee` keyframes (`translateX(-50%)`) at 90s, pausing on hover. Cards are 260px wide (`flex:0 0 260px`); people cards (`.teacher-card` / `.staff-card`) narrow to 200px at ≤480px and 165px at ≤360px, while `.gallery-item` stays 260px. People cards use a 128px round photo.

## Annual Work Plan & Calendar (BS 2083)

- Source: `Details/Annual_Work_Plan_2083.xlsx` → `ANNUAL_PLAN` object in `data.js`. Months keyed by Nepali name, matched by `MONTH_ORDER` array.
- Calendar rendered by `renderBsCalendar()` in `main.js`. 9 color-coded types: Holiday, Exam, Meeting, Event, Celebration, Sports, Tour, Admin, Regular.
- Date parsing handles: `From X`, `X-Y` ranges, `Last Wed & Thu`, plain numbers — regular hyphens, not en-dashes.
- **BS 2083 month lengths** (`BS_MONTH_DAYS`, `data.js`): `[31,31,32,31,31,31,30,29,30,29,30,30]` (365 days) — verified against hamro patro. Anchors: Baisakh 1 = Apr 14 2026, Jestha 1 = May 15, Ashadh 1 = Jun 15, Shrawan 1 = Jul 17, Bhadra 1 = Aug 17, Ashwin 1 = Sep 17, Kartik 1 = Oct 18, Mangsir 1 = Nov 17, Poush 1 = Dec 16, Magh 1 = Jan 15 2027, Falgun 1 = Feb 13, Chaitra 1 = Mar 15.
- **Public holidays**: `BS_HOLIDAYS` object in `data.js` (keyed by Nepali month name → `{day, name}`), sourced from hamro patro's 2083 holiday list. `renderBsCalendar()` merges them into cells as `cal-holiday` (badge shows festival name), and `showMonthActivities()` lists them at the top of the plan panel. To change which holidays appear, edit `BS_HOLIDAYS`.
- `NepaliDate.convertToBS()` (used by `main.js` event timeline) delegates to `adToBs` from `bs_calendar.js` when loaded (falls back to its own 2083-anchored math otherwise); `bsDateFromAd()` stays anchored to Baisakh 1 2083 = Apr 14 2026. Both agree with hamro patro for the 2083 academic year; `convertToBS` also handles dates outside 2083 correctly via `adToBs`.

## BS (Nepali) date fields

- Every `<input type="date">` on `index.html`, `admin.html`, and `Login_portal.html` automatically shows a read-only BS date span under it (`js/bs_calendar.js`). `initBsDateDisplays()` uses a `MutationObserver` so dynamically-rendered inputs (exam rows, modals) get decorated too. The AD field stays the source of truth — the BS display is derived, never edited.
- Converter: `adToBs()` / `bsToAd()` cover BS 1975–2099 from the `BS_YEARS` month-length table in `bs_calendar.js` (epoch Baisakh 1 2000 BS = Apr 14 1943 AD). The 2083-only `BS_MONTH_DAYS`/`bsDateFromAd()` in `data.js` are separate and untouched.
- Persistence: BS values are saved alongside the AD values — `dob_bs` on `admissions`/`students`, `date_bs` on `notices`/`events`, `joining_date_bs` on `teachers`, `due_date_bs` on `assignments` (see `sql/007_bs_date_columns.sql`); exam dates ride inside the existing `exams.subject_marks` JSONB blob (`_startDateBs`, `_endDateBs`, `_publishFromBs`, `_publishUntilBs`). Nothing breaks pre-migration: public/admin writes go through `supabase.insert`/`update`/`upsert`, which detect a missing-column error (PGRST204) and retry once with `_bs` keys stripped (`js/supabase.js`); the exam portal has its own per-call retry-without-`_bs` fallbacks.
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
| `sql/009_exam_documents.sql` | `exam_documents` table + `exam_documents` storage bucket & RLS (for exported ledgers/gradesheets) |
| `sql/010_school_documents.sql` | `school_documents` table + `school_documents` storage bucket & RLS (Backup tab — file uploads with visibility controls) |
| `sql/011_subject_credit_hours.sql` | `subjects.credit_hour numeric DEFAULT 1` — powers credit-weighted GPA on Gradesheets/Class Ledgers |
| `sql/012_multi_category_discounts.sql` | Drops `student_discounts` `UNIQUE(student_id, academic_year)` so a student can have multiple discounts (per fee head) in one year |
| `sql/013_discount_months.sql` | `student_discounts.discount_months text DEFAULT 'all'` — whole-year or specific-BS-month scoping (monthly fee heads only) |

Each fee table has `public_all` RLS policy. Two other SQL files (`student_photo_updates.sql`, `teacher_photo_updates.sql`) are one-time data migrations, not schema changes.

## Exam Portal (`Login_portal.html`)

- Uses supabase-js v2 CDN (not the raw fetch client from public pages).
- Separate DB tables: `classes, subjects, teachers, students, exams, marks, images, assignments, notes`.
- On every load it syncs those relational tables into an `exam_portal_kv` table (`structure` + `auth` blobs); the app reads STRUCT from that blob. Photos are deliberately stripped before persisting (`persistStructure()`), so cached rows are image-less.
- Own auth (username/password per student/teacher), own caching (`examCache`), own column maps (`EXAM_COLUMNS` in `exam_helper.js`).
- **Export to Supabase storage**: the Class Ledger and Gradesheet views have a **Export** button (`exportLedgerNow()` / `exportGradesheetNow()` in the inline script). It archives the rendered document as a self-contained HTML file (all app `<style>` blocks inlined, `.no-print` chrome stripped, `@media print` rules dropped) into the `exam_documents` storage bucket under `YYYY-MM-DD/<ledgers|gradesheets>/<exam>-<class>[-<student>]-<ts>.html`, then records a row in the `exam_documents` table (see `sql/009_exam_documents.sql`). Export context is set by `GS_EXPORT_CTX`/`CL_EXPORT_CTX` inside `buildGradesheetHTML()`/`buildClassLedgerHTML()`.
- **STRUCT naming differs from DB columns**: classes use `name` not `class_label`, students use `name`/`roll`/`classId` not `full_name`/`school_roll_no`/`class_id`. Inline code maps between them via `EXAM_COLUMNS`.
- **Subject credit hours & GPA**: each subject has a `creditHour` in STRUCT (mapped from `subjects.credit_hour`, defaults to 1). Overall GPA on Gradesheets and Class Ledgers is credit-weighted: `Σ(grade point × credit hour) ÷ Σ(credit hour)` (formula per the "Gradesheet Back" reference); a `Cr. Hr.` column on the gradesheet is optional via the `showCreditHour` setting (default off; ledger prints credit hours on the Classes/Subjects tab only). Grade points follow the reference scale in `Gradesheet Back.docx`: A+ 4.0 → D 1.6 → NG 0.0, intervals 90-100 / 80-below 90 / … / 35-below 40 (D) / below 35 (NG) (`gradeScaleFor()`). One source of truth: the printed "Grading scale" footnotes on gradesheets/ledgers and the admin hint are all generated by `gradeScaleFootnoteText(false|true)` from `gradeScaleFor()`. Pre-migration DBs keep working — the subjects fetch/insert/update retry without the `credit_hour` column (same pattern as the `_bs` retries).
- **Include in gradesheet & ledger**: the exam's subject table has a per-subject checkbox (`examSubIncluded()` / `toggleExamSubjectInclude()`, flag stored as `exams.subjectMarks.<subj>.included`). Excluded subjects are filtered out of `buildGradesheetHTML()`, `buildClassLedgerHTML()`, `computeClassRanks()`, and `computeSubjectRanks()` — they don't print and don't count toward totals, GPA, or pass. Marks entry still shows all subjects. `applyClasswiseDefaultMarks()` preserves an existing `included` flag.
- `Login_portal.html` is a 8724-line file; the main inline `<script>` (line ~1136 onward) spans ~7580 lines — prefer targeted edits over bulk rewrites. Syntax-check it by extracting the `<script>` range and running `node --check`.

### Exam Portal credentials

- Student default password = roll number; teacher default password = username (first name). Passwords are plaintext columns on `students`/`teachers`, merged into the `exam_portal_kv` `structure`/`auth` rows.
- `pwdToggleHtml` only reveals the **default** password. Once the user changes it (`mustChangePassword === false`), admin sees "Changed by user (hidden)" and can no longer view it.
- Admin password recovery: students table **Reset Password** button → back to roll number (`resetStudentPassword`); the **Edit Student** modal also has a "New password (optional)" field, same as the teacher edit modal (`edit-stu-pass` → `submitEditStudent` sets `password` + `previousPassword` + `mustChangePassword: true`).

## Fee Management (in `Login_portal.html` Account module)

- Three fee scopes (`school`/`class`/`student`), three frequencies (`monthly`/`yearly`/`event`).
- Amount resolution: school→`fee_categories.amount`, class→`class_fees`, student→`student_fees`.
- Bill numbers auto-increment per fiscal year via `getNextBillNo()` (max `bill_no` + local `FEE_COLLS` array).
- Discounts: `student_discounts` table with `discount_type` (position/category/custom), `discount_percent`, `discount_amount`, `applies_to`. **Per-category model** (`sql/012`): a student may have multiple rows per year, each scoping `applies_to` to a specific fee head, a frequency (`monthly`/`yearly`/`event`), or `all`. For each fee head, matching rows' `discount_percent` STACK additively (capped at 100) — computed by `effectiveDiscount()`/`discAmt()` in `Login_portal.html`. `discount_amount` is NOT per-category: all rows' fixed amounts are summed (`totalFixedDiscount()`) and deducted once at bill/total level (a waiver line on the receipt), preserving pre-012 behavior. UI: the class Fees → Discounts & Scholarships manager renders per-student multi-row editors (`addDiscountRow`/`removeDiscountRow`/`saveDiscounts`); rows with no type or 0%+Rs0 are deleted on Save. Each row also stores `discount_months` (`'all'` or comma-separated BS month numbers 1–12, `sql/013`): **month scope only affects monthly-frequency fee heads** (yearly/event ignore it). The editor has a per-row month picker (`toggleMonthPicker`/`mthsAllToggle`/`mthsSync`); `effectiveDiscount(studentId, feeCat, month)` and `discAmt(base, feeCat, studentId, month)` filter by it when a month is passed (undefined month = whole-year view, no filtering). Monthly fees are ANNUALIZED (×12) in `studentTotalFees()`/`getDiscountedAmount()`, and collection-form monthly Checkboxes / `processCollection` charge per-month discounted amounts via `discAmt(..., month)`, so month-scoped discounts show correctly on balances. Pre-013 DBs keep working: `saveDiscounts` retries insert/update without `discount_months` on a missing-column error (`isMissingColumnErr`). Month inset in summary/collection labels via `discountMonthsLabel()`.
- Privileges: admin + `designation: 'Accountant'` + class teachers (scoped to own classes).

## Alumni (in `Login_portal.html`)

- Admin-only **Alumni** tab lists passed-out/left-school students (`ALUMNI.students`) and former staff (`ALUMNI.teachers`). Data lives in `alumni_students` / `alumni_teachers` tables (see `sql/008_alumni.sql`), loaded lazily by `loadAlumniData()` (cached via `ALUMNI_LOADED`).
- **Leave School** button (on each student row and staff card) calls `moveStudentToAlumni()` / `moveTeacherToAlumni()`. These COPY the row into the alumni table (with `left_on` timestamp + photo), then DELETE it from the active `students`/`teachers` table; fee/marks history is untouched. Credentials in the kv `structure`/`auth` blobs are removed when the active row is dropped.
- The in-memory alumni rows pushed by `move*ToAlumni()` use DB-shaped field names (`full_name`, `roll`, `class_id`, `photo_url`, `left_on`) so `renderAlumni()` reads them and the DB rows consistently — not the STRUCT/AUTH-shaped names.

## Backup / Documents (in `Login_portal.html`)

- **Backup** tab visible to admin, all teachers, and students. Upload PDF, DOCX, PNG, JPG, GIF, HTML files (max 10 MB) to the `school_documents` storage bucket. Metadata stored in `school_documents` table (see `sql/010_school_documents.sql`).
- **Categories**: `class_ledger`, `gradesheet`, `invoice`, `exam_paper`, `admit_card`, `assignment`, `notes`, `other`.
- **Visibility controls**: `public` (everyone), `private` (uploader + admin only), `class` (specific class students/teachers + admin), `student` (specific student + admin). Visibility is enforced client-side by `backupCanView()`.
- **Admin privileges**: full edit (title, description, category, visibility) and delete (storage file + metadata row). Teachers can only upload and view; students see only documents visible to them.
- **Search/filter**: by title/filename/uploader, category, doc type, and visibility. `BACKUP_FILTER` object drives client-side filtering.
- **Storage path**: `YYYY-MM-DD/<category>/<timestamp>_<sanitized-filename>`. Files uploaded to the public `school_documents` bucket.

## Domain

`saraswatisecschool.edu.np` — set in `CNAME` and the canonical tag in `index.html`.

## Notes

- `graphify-out/` (including `.graphify_*` files) — analysis artifacts, not part of the application.
- No `.gitignore` — git tracks everything. Large generated files (e.g. `sql/teacher_photo_updates.sql` at ~12 MB) are committed.
- `robots.txt` and `sitemap.xml` present at root.
- Git identity is NOT configured (no local or global `user.name`/`user.email`). Pass explicit identity on each commit so it matches repo history (`Amit Rajbanshi` / `infosaraswatimavijohang@gmail.com`), e.g. `git -c user.name="Amit Rajbanshi" -c user.email="infosaraswatimavijohang@gmail.com" commit -m "..."`.
- `Login_portal.html` is mostly a few giant single lines (max ~253 KB). Regex search across the repo (including that file) can blow up ripgrep's 65536-byte record limit; fixed-string/literal searches and searching single files are fine. Prefer the OpenCode `grep` tool confined to a specific file or `node --check` when working inside its inline `<script>`.
