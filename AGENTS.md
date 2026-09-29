# Shree Saraswati Secondary School

Static HTML/CSS/JS site — no build, test, lint, or CI. No `package.json`, no `.gitignore`, no
`.github/`, no editor config. Node is only used for `node --check` (below).

## Running

- **Public pages**: open any `.html` directly in a browser. No dev server, no bundler.
- **Admin**: `admin.html` — login via `adminUsername`/`adminPassword` from the `site_settings`
  table, falling back to `amitrazbanc` / `school1122@` (`js/admin.js:25-26`; seed defaults at
  `js/data.js:372-373`, re-defaulted at `js/admin.js:157-161`).
- **Exam Portal / Account**: `Login_portal.html` — standalone SPA, 9005 lines, ~7.8k of which is
  one inline `<script>`. Uses CDN supabase-js v2, a *different* stack from the public pages.
- Contact/about maps are static `maps.app.goo.gl` links, **not** iframes.

## Verify your change (the only check in this repo)

No test suite. Two things are worth running after editing JS:

```powershell
# 1. plain files
node --check js/main.js            # or admin.js / data.js / supabase.js / cache.js / exam_helper.js / bs_calendar.js

# 2. the big inline <script> in Login_portal.html — extract by locating the tags, not by hardcoded lines
$l = [System.IO.File]::ReadAllLines("$PWD\Login_portal.html")
$o = [Array]::IndexOf($l, '<script>', 1100); $c = [Array]::IndexOf($l, '</script>', $o)
[System.IO.File]::WriteAllLines("$env:TEMP\portal_check.js", $l[($o+1)..($c-1)], (New-Object System.Text.UTF8Encoding $false))
node --check "$env:TEMP\portal_check.js"
```

Today that block opens at line 1143 and closes at 9002. Use the tag-locating version — the numbers
drift with every commit.

`js/bs_calendar.js` is also CommonJS-loadable (`module.exports` at `bs_calendar.js:315`), so BS/AD
conversion is unit-testable from the shell. This is the fastest way to validate date work:

```powershell
node -e "const b=require('./js/bs_calendar.js');console.log(b.adToBs(new Date('2026-04-14T00:00:00Z')))"   # -> year 2083, month 1, day 1
```

Anchors that must always hold (all verified): `2026-04-14`→2083-01-01, `2026-05-15`→2083-02-01,
`2026-10-18`→2083-07-01, `2027-01-15`→2083-10-01, `2027-03-15`→2083-12-01.

## Script load order (breaking changes come from here)

```
supabase.js → cache.js → data.js → [bs_calendar.js] → main.js (or admin.js)
```

`data.js` reads globals defined by the files before it, so order is load-bearing.

- `index.html` (504-508) loads all five with `defer`.
- `about.html`, `admissions.html`, `contact.html` load four scripts **synchronously** at end of
  `<body>` (220-223 etc.), **without** `bs_calendar.js`.
- `admin.html` (395-399) loads five scripts synchronously, `admin.js` instead of `main.js`.
- **Exception** `notices.html` (125-162): loads only `supabase.js + cache.js + data.js`, then one
  inline IIFE that consumes the `bsDateFromAd` / `MONTH_ORDER` / `ANNUAL_PLAN` / `DataStore` globals
  directly. It does **not** load `main.js`, so `App.*` is unavailable there.
- `Login_portal.html` (13-16): CDN supabase-js v2 + `js/exam_helper.js` + `js/bs_calendar.js`.

## Data architecture

- **Primary**: Supabase REST via raw `fetch` (`js/supabase.js`; project URL + anon key at
  `supabase.js:9-10`, shared with `Login_portal.html`). Column whitelist `COLUMN_MAP`
  (`supabase.js:47`); in-flight request dedup via `_inFlight` (`supabase.js:67`).
- **Fallback**: localStorage `sss_` prefix. Every `DataStore` op writes through to both.
- **`supabase` methods resolve, they never reject on HTTP/network failure** — they return
  `{ data, error }`. `DataStore.get` checks `error` and throws so its `catch` → localStorage
  fallback actually fires. Never write `await supabase.x()` and read `.data` without checking
  `error` first; this is the single most common source of silently-empty pages.
- **`HOMEPAGE_VISIBILITY` is local-only**: no Supabase table exists. It is listed in
  `DataStore.LOCAL_ONLY_KEYS` (`data.js:13`), which short-circuits the network in every op, so
  `main.js:11` and `admin.js:115` stay local. Don't add it to `COLUMN_MAP` or SQL.
- **Cache**: `CacheManager` (`js/cache.js`) — memory + localStorage (`sss_cache_` prefix,
  `cache.js:13`), per-key TTL, `remember(key, fetcher, ttl)` helper.
- **Admin auth**: `sessionStorage` key `sss_admin_auth` (`admin.js:11,29`).
- **Reset state**: DevTools → Application → clear all `sss_*` and `sss_cache_*`.
- **Schema-migration resilience**: writes go through `supabase.insert/update/upsert`, which detect a
  missing-column error (PGRST204 / "column ... does not exist", `supabase.js:132`) and **retry once
  with all `_*_bs` keys stripped** (`supabase.js:136-140, 188, 206, 225`). `Login_portal.html` has
  its own per-call equivalents (`isMissingColumnErr`) for `credit_hour` and `discount_months`. So a
  not-yet-migrated DB degrades instead of breaking — keep that retry pattern when adding columns.

## Auto-seed (`seedData`, `data.js:347`)

Fires from **both** `window.onload` (`data.js:796-797`, so on every public page load) *and* admin
login (`admin.js:16`). If `site_settings` already exists it seeds teachers/staff/gallery only;
otherwise it seeds `site_settings`, slides, and `about` first.

## Key files

| File | Purpose |
|------|---------|
| `js/supabase.js` | Raw fetch client, `COLUMN_MAP`, in-flight dedup, `_bs` strip-retry |
| `js/cache.js` | `CacheManager` — two-tier cache (memory + localStorage) with TTL |
| `js/data.js` | `DataStore`, `compressImage()`, `seedData()`, `NepaliDate`, `ANNUAL_PLAN`, `BS_HOLIDAYS`, `BS_MONTH_DAYS` |
| `js/main.js` | Renders public site (`App` object, lazy sections via `IntersectionObserver`) |
| `js/admin.js` | Admin CRUD (`Admin` object) |
| `js/exam_helper.js` | `EXAM_COLUMNS`, `examCache`, `examCols()` |
| `js/bs_calendar.js` | AD↔BS for BS 1975–2099 + auto BS date decoration. `module.exports` at line 315 |
| `css/style.css` | OKLCH tokens at `:root` (lines 3-28), dark overrides at 30 |
| `css/admin.css` | Admin dashboard styles |

## Images

- Admin uploads → `compressImage(file)` (`data.js:298`) — call sites pass only the File; defaults are
  `maxWidth=800`, `quality=0.6`, output WebP base64 via `canvas.toDataURL`. Stored **inline**, so
  localStorage quota applies. It resolves `null` on any decode error rather than rejecting.
- Seed-data teacher/staff photo filenames must match `assets/images/Teaching Staff/*` and
  `assets/images/Non Teaching Staff/*` exactly.
- **Public gallery never touches Supabase**: `galleryData` in `js/data.js` holds 74 hardcoded
  `assets/images/<Folder>/<file>.webp` paths, URL-encoded (spaces `%20`, parens `%28`/`%29`).
  `App.renderGallery` (`main.js:556`) always renders `galleryData`, then appends any admin-added
  extras by id. A storage outage can't blank it.
- Legacy/superseded: `upload_gallery.ps1` + `sql/007_gallery_storage.sql` rewrote `galleryData` to
  public storage URLs, which went stale and blanked the gallery. The bucket/table remain for admin
  use only — do not re-point `galleryData` at storage.

## Design system

Navy `oklch(0.29 0.045 260)` = structure; teal `oklch(0.55 0.12 175)` = primary interactive accent;
gold `oklch(0.72 0.13 85)` = `btn-primary` / stars. Prefer the `:root` tokens over raw hex; spacing
base is 8px; standard transition `0.35s cubic-bezier(0.22, 1, 0.36, 1)`. Full spec in `DESIGN.md`,
brand/voice in `PRODUCT.md`.

- Dark mode is `[data-theme="dark"]` on `<html>` (`style.css:30`) redefining the same tokens. Every
  page inlines a script at the top of `<body>` that sets `data-theme` from `sss_theme` in
  localStorage — keep any new color working under both token sets.
- **`--header-h` is declared twice** (`style.css:25` and `:26`); line 26
  (`calc(72px + env(safe-area-inset-top))`) always wins. It drives `scroll-padding-top` for anchor
  targets, so editing line 25 alone does nothing.

## Layout

- Public pages get their header/footer from `App.renderHeader()` / `App.renderFooter()` — the markup
  is not in the HTML files.
- Sections lazy-load via `IntersectionObserver` (`main.js:96`, 200px rootMargin) and fall back to
  eager rendering under `prefers-reduced-motion`.
- **Four marquee strips**, each an `overflow:hidden` wrapper around a `width:fit-content` track whose
  HTML content is **emitted twice** so `translateX(-50%)` loops seamlessly (e.g. `main.js:540,553,585`
  — `'<div class="X-track">' + cards + cards + '</div>'`):
  - `.gallery-track`, `.teachers-track`, `.staff-track` → `@keyframes gmarquee`, 90s, paused by
    CSS `:hover` (`style.css:179-181, 367-369, 379-384`).
  - `.testimonials-track` → `@keyframes tmarquee`, 40s, and because it sits inside a masked
    `.testimonials-slider` it pauses via **JS** `mouseenter`/`mouseleave` listeners
    (`main.js:615-620`, `style.css:399-408`) — don't "fix" it to CSS-only.
  - Cards are 260px (`flex:0 0 260px`); people cards narrow to 200px at ≤480px and 165px at ≤360px,
    while `.gallery-item` stays 260px. People cards use a 128px round photo.
  - If you change how many cards render, you must keep the content doubled or the loop jumps.

## Annual Work Plan & Calendar (BS 2083)

- `Details/Annual_Work_Plan_2083.xlsx` → `ANNUAL_PLAN` (`data.js:575`), months keyed by Nepali name,
  matched via `MONTH_ORDER` (`data.js:671`).
- `renderBsCalendar(monthIdx, highlightDay)` (`main.js:354`) and `showMonthActivities(month)`
  (`main.js:450`). 9 color-coded types: Holiday, Exam, Meeting, Event, Celebration, Sports, Tour,
  Admin, Regular.
- Date parsing accepts `From X`, `X-Y` ranges, `Last Wed & Thu`, and plain numbers — with **regular
  hyphens, not en-dashes**.
- `BS_MONTH_DAYS` (`data.js:753`) = `[31,31,32,31,31,31,30,29,30,29,30,30]` (365). Verified against
  hamro patro and against `adToBs` from `bs_calendar.js` — if you change one, change the other and
  re-run the round-trip check above.
- `BS_HOLIDAYS` (`data.js:674`) — month name → `{day, name}`, from hamro patro's 2083 list. Both
  calendar renderers merge it in as `cal-holiday` with a festival-name badge. Edit this object to
  change which holidays appear.
- Two independent BS implementations exist and must not be conflated:
  - `data.js`: 2083-only, `BS_MONTH_DAYS` + `bsDateFromAd()` (anchored Baisakh 1 2083 = Apr 14 2026).
  - `bs_calendar.js`: general `BS_YEARS` table for BS 1975–2099 (epoch Baisakh 1 2000 = Apr 14 1943).
  `NepaliDate.convertToBS()` delegates to `adToBs` when `bs_calendar.js` is loaded, so results differ
  depending on script load order for dates outside 2083. The four non-index public pages do **not**
  load `bs_calendar.js`.

## BS (Nepali) date fields

- Every `<input type="date">` on `index.html`, `admin.html`, and `Login_portal.html` is
  auto-decorated with a read-only BS span under it by `initBsDateDisplays()`
  (`bs_calendar.js:286`), which installs a `MutationObserver` so dynamically rendered inputs (exam
  rows, modals) get it too. The AD input stays the source of truth; the BS span is derived, never
  editable.
- If you set a date input's value programmatically, call `updateBsDate(el)` afterwards —
  `setVal()`/`clearForm()` in `admin.js:682-692` already do.
- Persistence: BS values are written alongside AD into dedicated columns —
  `admissions.dob_bs`, `students.dob_bs`, `notices.date_bs`, `events.date_bs`,
  `teachers.joining_date_bs`, `assignments.due_date_bs` (`sql/007_bs_date_columns.sql`). Exam dates
  instead ride inside the existing `exams.subject_marks` JSONB as `_startDateBs`, `_endDateBs`,
  `_publishFromBs`, `_publishUntilBs`. Pre-migration DBs keep working via the strip-retry described
  under Data architecture.

## SQL migrations

Paste into the Supabase SQL Editor in numeric order. Not idempotent-guarded as a set, so track which
have been applied; a missing one degrades features rather than breaking pages.

| File | Adds |
|------|------|
| `sql/001_performance_indexes.sql` | Performance indexes |
| `sql/002_required_columns.sql` | Required column additions |
| `sql/004_assignments_notes_queries.sql` | `assignments`, `notes`, queries |
| `sql/006_fee_management.sql` | `fee_categories`, `class_fees`, `student_fees`, `fee_collections`, `bill_sequence`, `student_discounts` + `public_all` RLS |
| `sql/007_bs_date_columns.sql` | The six `*_bs` date columns above |
| `sql/008_alumni.sql` | `alumni_students`, `alumni_teachers` + `public_all` RLS |
| `sql/009_exam_documents.sql` | `exam_documents` table + bucket & RLS (exported ledgers/gradesheets) |
| `sql/010_school_documents.sql` | `school_documents` table + bucket & RLS (Backup tab) |
| `sql/011_subject_credit_hours.sql` | `subjects.credit_hour numeric DEFAULT 1` |
| `sql/012_multi_category_discounts.sql` | Drops `student_discounts` `UNIQUE(student_id, academic_year)` |
| `sql/013_discount_months.sql` | `student_discounts.discount_months text DEFAULT 'all'` |

`sql/007_gallery_storage.sql` is superseded and only needed for admin gallery storage.
`sql/student_photo_updates.sql` and `sql/teacher_photo_updates.sql` (~12 MB) are one-time data
migrations, not schema.

## Exam Portal (`Login_portal.html`)

- **Edit surgically.** The file is mostly a handful of enormous single lines (max ~253 KB). Prefer
  targeted `edit` calls over bulk rewrites, and always finish with the `node --check` recipe above.
- Uses CDN supabase-js v2, its own auth (username/password per student/teacher), its own cache
  (`examCache`), and its own column map (`EXAM_COLUMNS` in `js/exam_helper.js`) — a completely
  separate stack from the public pages, sharing only the Supabase project.
- On every load it syncs the relational tables (`classes, subjects, teachers, students, exams, marks,
  images, assignments, notes`) into a single `exam_portal_kv` table as `structure` + `auth` blobs;
  the app reads `STRUCT` from that blob. Photos are deliberately stripped before persisting
  (`persistStructure()`), so cached rows are image-less.
- **STRUCT field names deliberately differ from DB column names**: classes use `name` not
  `class_label`; students use `name` / `roll` / `classId` not `full_name` / `school_roll_no` /
  `class_id`. Inline mapping goes through `EXAM_COLUMNS`. Don't "tidy" these apart.
- `EXAM_COLUMNS.subjects` in `exam_helper.js` intentionally omits `credit_hour` — subjects are fetched
  in a *separate* query (`Login_portal.html` subjects loader) that requests `credit_hour` and retries
  without it on a missing-column error, so a pre-011 schema doesn't fail the whole select.
- **Export to storage**: Gradesheet and Class Ledger have an Export button (`exportGradesheetNow()` /
  `exportLedgerNow()`). It serializes the rendered document as a self-contained HTML file (all app
  `<style>` blocks inlined, `.no-print` chrome stripped, `@media print` rules dropped) into the
  `exam_documents` bucket at `YYYY-MM-DD/<ledgers|gradesheets>/<exam>-<class>[-<student>]-<ts>.html`,
  then inserts a row into `exam_documents`. Context is threaded through the globals
  `GS_EXPORT_CTX` / `CL_EXPORT_CTX`, set inside `buildGradesheetHTML()` / `buildClassLedgerHTML()` —
  those builders are shared by screen and export paths, so guard new markup accordingly.
- **Credit-weighted GPA**: each subject carries `creditHour` in STRUCT (from `subjects.credit_hour`,
  default 1). Overall GPA is `Σ(grade point × credit hour) ÷ Σ(credit hour)`. The `Cr. Hr.` column on
  the gradesheet is toggled by the `showCreditHour` setting (default off; the ledger always prints
  credit hours on the Classes/Subjects tab). `gradeScaleFor()` is the single source of grade points
  (A+ 4.0 → D 1.6 → NG 0.0, cut-offs 90 / 80 / … / 35 per the `Gradesheet Back.docx` reference), and
  every printed "Grading scale" footnote plus the admin hint comes from
  `gradeScaleFootnoteText(false|true)`. Change the scale in one place only.
- **Include-in-gradesheet flag**: each exam subject has a checkbox (`examSubIncluded()` /
  `toggleExamSubjectInclude()`), persisted as `exams.subjectMarks.<subj>.included`. Excluded subjects
  are filtered out of `buildGradesheetHTML()`, `buildClassLedgerHTML()`, `computeClassRanks()`, and
  `computeSubjectRanks()` — they don't print and don't count toward totals, GPA, or pass. Marks entry
  still shows all subjects, and `applyClasswiseDefaultMarks()` preserves an existing `included` flag.

### Exam Portal credentials

- Student default password = roll number; teacher default password = username (first name).
  Passwords are **plaintext columns** on `students`/`teachers`, copied into the `exam_portal_kv`
  `structure`/`auth` blobs.
- `pwdToggleHtml` can only reveal the *default* password. After the user changes it
  (`mustChangePassword === false`) the admin sees "Changed by user (hidden)" and cannot view it.
- Admin recovery: the students table **Reset Password** button restores the roll number
  (`resetStudentPassword`); the **Edit Student** modal has a "New password (optional)" field, same
  as the teacher modal (`edit-stu-pass` → `submitEditStudent` sets `password`, `previousPassword`,
  `mustChangePassword: true`).

### In-app database setup banners

`Login_portal.html` embeds its own "REQUIRED ONE-TIME DATABASE SETUP" comment blocks (around char
offsets 71k-79k) with ready-to-paste SQL for things not covered by `sql/`: Designations / Class
Teacher (`teachers.class_teacher_of`), Subject Credit Hours (`subjects.credit_hour`), Assignments &
Notes/Notices (`assignments`/`notes` tables, `file_name` columns), and login credentials + photos.
Search the file for `REQUIRED ONE-TIME` when a portal feature reports missing data.

## Fee Management (Account module in `Login_portal.html`)

- Three scopes (`school` / `class` / `student`) × three frequencies (`monthly` / `yearly` / `event`).
  Amount resolution: school → `fee_categories.amount`, class → `class_fees`, student → `student_fees`.
- Bill numbers auto-increment per fiscal year via `getNextBillNo()` (max existing `bill_no`, tracked
  against the local `FEE_COLLS` array).
- Privileges: admin + `designation: 'Accountant'` + class teachers (scoped to their own classes).
- **Discounts are per-category and stack** (`sql/012`, `sql/013`). A student may have multiple
  `student_discounts` rows per `academic_year`, each scoping `applies_to` to a fee head, a frequency
  (`monthly`/`yearly`/`event`), or `all`. Matching rows' `discount_percent` **stack additively, capped
  at 100** (`effectiveDiscount()` / `discAmt()`), while fixed `discount_amount` is *not* per-category:
  all rows' amounts are summed (`totalFixedDiscount()`) and deducted once at bill level as a waiver
  line, which preserves pre-012 behavior.
- `discount_months` (`'all'` or comma-separated BS month numbers 1-12) applies **only to
  monthly-frequency** fee heads; yearly/event ignore it. `effectiveDiscount(studentId, feeCat, month)`
  and `discAmt(base, feeCat, studentId, month)` filter on it only when a month is passed (undefined
  month = whole-year view, no filtering). Monthly fees are **annualized (×12)** in
  `studentTotalFees()` / `getDiscountedAmount()`, and the collection form charges per-month
  discounted amounts via `discAmt(..., month)` so month-scoped discounts show correctly on balances.
- UI: class Fees → Discounts & Scholarships renders per-student multi-row editors
  (`addDiscountRow` / `removeDiscountRow` / `saveDiscounts` / `toggleMonthPicker` / `mthsAllToggle` /
  `mthsSync`). Rows with no type, or 0% + Rs 0, are **deleted** on Save. `discountMonthsLabel()` renders
  the month inset in summary/collection labels. `saveDiscounts` retries without `discount_months` on
  a missing-column error.

## Alumni (`Login_portal.html`)

- Admin-only **Alumni** tab lists `ALUMNI.students` and `ALUMNI.teachers`, loaded lazily by
  `loadAlumniData()` (guarded by `ALUMNI_LOADED`), from `alumni_students` / `alumni_teachers`
  (`sql/008_alumni.sql`).
- **Leave School** (`moveStudentToAlumni()` / `moveTeacherToAlumni()`) **copies** the row into the
  alumni table (with `left_on` timestamp + photo) and then **deletes** it from the active
  `students`/`teachers` table. Fee and marks history is untouched; the credentials held in the kv
  `structure`/`auth` blobs go away with the active row. This is a destructive two-step — don't
  collapse it into an update.
- The in-memory rows pushed by `move*ToAlumni()` deliberately use **DB-shaped** field names
  (`full_name`, `roll`, `class_id`, `photo_url`, `left_on`) rather than the STRUCT/AUTH shapes, so
  `renderAlumni()` reads local and DB rows identically.

## Backup / Documents (`Login_portal.html`)

- **Backup** tab is visible to admin, all teachers, and all students. Uploads PDF, DOCX, PNG, JPG,
  GIF, HTML up to 10 MB into the public `school_documents` bucket; metadata in the `school_documents`
  table (`sql/010_school_documents.sql`).
- Storage path: `YYYY-MM-DD/<category>/<timestamp>_<sanitized-filename>`.
- Categories: `class_ledger`, `gradesheet`, `invoice`, `exam_paper`, `admit_card`, `assignment`,
  `notes`, `other`.
- Visibility is enforced **client-side only** by `backupCanView()`: `public`, `private` (uploader +
  admin), `class` (that class's students/teachers + admin), `student` (that student + admin). Because
  the bucket is public, do not treat this as a security boundary.
- Admin gets full edit + delete (storage object *and* metadata row); teachers may upload and view
  only; students see only what passes `backupCanView()`. Filtering is driven by the `BACKUP_FILTER`
  object (title/filename/uploader, category, doc type, visibility).

## Domain

`saraswatisecschool.edu.np` — set in `CNAME`, in the canonical tag, and in absolute `og:image` /
`twitter:image` URLs in the page `<head>`s. `robots.txt` and `sitemap.xml` live at the root.

## Repo notes / gotchas

- **Git identity is not configured** (no local or global `user.name`/`user.email`), so every commit
  must pass it explicitly or it fails:
  ```powershell
  git -c user.name="Amit Rajbanshi" -c user.email="infosaraswatimavijohang@gmail.com" commit -m "..."
  ```
- **No `.gitignore`** — git tracks all 176 files, including `graphify-out/` (analysis artifacts, not
  part of the app) and the 12 MB `sql/teacher_photo_updates.sql`. Don't add throwaway files to the
  repo root expecting them to be ignored.
- **Never run a repo-wide regex search that includes `Login_portal.html`** — ripgrep dies with
  `Ripgrep JSON record exceeded 65536 bytes` because of the giant single lines. Search that file with
  fixed strings against a single file, or use the OpenCode `grep` tool on a specific file, or work
  from `node --check`.
- Working tree is normally clean; check `git status` before assuming your edits are the only changes.
