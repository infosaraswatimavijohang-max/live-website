# Shree Saraswati Secondary School — Website

Public-facing website + exam portal + account/fee management system for a rural Nepali secondary school in Satyawati-6, Johang, Gulmi, Lumbini Province.

## Tech Stack
Static HTML/CSS/JS — no build process. Data via Supabase REST API + localStorage fallback. Exam portal uses supabase-js v2 CDN.

## Pages & Modules

| Page | Purpose |
|------|---------|
| `index.html` | Home: hero, about, stats, notice board, annual calendar, programs, teachers/staff, gallery, events, testimonials |
| `about.html` | School history, vision, mission, head teacher message, stats |
| `admissions.html` | Online 6-step admission form with file uploads |
| `contact.html` | Address, phone, Google Maps, inquiry form |
| `notices.html` | Notice board with monthly events from annual work plan |
| `admin.html` | CRUD for all public content (login from `site_settings` table) |
| `Login_portal.html` | Exam portal (gradesheets, marks, assignments) + **Account/Fee Management** module |

## Account / Fee Management (in `Login_portal.html`)
- Three-tier fee scope: **school-wide** (same for all), **per-class** (uniform per class), **per-student** (individual)
- Fee frequencies: `monthly`, `yearly`, `event`
- Collection form with Nepali month checkboxes, yearly/event inputs, real-time total
- Auto-incrementing bill numbers per fiscal year (stored in `bill_sequence` table)
- A5 bill receipt with school name, address, PAN, student/class details
- Discounts & scholarships: position/category/custom types, `applies_to` scoping (monthly/yearly/event/specific fee)
- Recent collections with search filters (bill no, class, student), batch delete
- Per-student fee detail view (month-by-month paid/due matrix)

## Data Architecture
- **Primary**: Supabase REST API via raw `fetch` (`js/supabase.js`)
- **Fallback**: localStorage with `sss_` prefix — all DataStore ops write through to both
- **Two-tier cache**: memory + localStorage with TTL (`js/cache.js`)
- **Gallery**: the public gallery renders directly from local `assets/images/<Folder>/` files listed in `galleryData` (`js/data.js`, 74 WebP images) with admin-added extras appended — no Supabase storage dependency
- **Reset**: DevTools → Application → clear `sss_*` and `sss_cache_*` keys

## Key Files
| File | Purpose |
|------|---------|
| `js/supabase.js` | Raw fetch client, column whitelist, in-flight dedup |
| `js/cache.js` | Two-tier cache (memory + localStorage) with TTL |
| `js/data.js` | DataStore CRUD + `compressImage()` + `seedData()` + `NepaliDate` + `ANNUAL_PLAN` |
| `js/main.js` | Renders public site (`App` object, lazy sections via `IntersectionObserver`) |
| `js/admin.js` | Admin CRUD (`Admin` object) |
| `js/exam_helper.js` | Exam portal helpers (column map, cache, dedup) |
| `css/style.css` | Public styles (all OKLCH tokens, Playfair Display + Noto Serif) |
| `css/admin.css` | Admin dashboard styles |
| `Login_portal.html` | Exam portal + Account module (~6800 lines, inline `<script>`) |
| `sql/006_fee_management.sql` | Migration for fee tables, student_discounts, RLS policies |

## SQL Migrations
Run in Supabase SQL Editor in order:
| File | Purpose |
|------|---------|
| `sql/001_performance_indexes.sql` | Performance indexes |
| `sql/002_required_columns.sql` | Required column additions |
| `sql/004_assignments_notes_queries.sql` | Assignments, notes, queries |
| `sql/006_fee_management.sql` | Fee tables: `fee_categories`, `class_fees`, `student_fees`, `fee_collections`, `bill_sequence`, `student_discounts` + RLS policies |

## Exam Portal (`Login_portal.html`)
- Uses supabase-js v2 from CDN (different stack from public site)
- Own DB tables: `classes, subjects, teachers, students, exams, marks, images, assignments, notes`
- Own auth (username/password per student/teacher), own caching (`examCache`)
- Shares the **same Supabase project** as public site

## Annual Work Plan & Calendar (BS 2083)
- Source: `Details/Annual_Work_Plan_2083.xlsx` → `ANNUAL_PLAN` in `data.js`
- Calendar rendered by `renderBsCalendar()` in `main.js`
- Color-coded types (9): Holiday, Exam, Meeting, Event, Celebration, Sports, Tour, Admin, Regular
- Month lengths (`BS_MONTH_DAYS`) verified against hamro patro; `BS_HOLIDAYS` overlays hamro patro's public holidays on the calendar

## Design Tokens
- **Navy**: headers, nav, footer, structure
- **Teal**: primary interactive accent
- **Gold**: warm accent for CTAs
- Prefer OKLCH tokens from `:root` in `style.css`
- Playfair Display (headings) + Noto Serif (body)

## Domain
`saraswatisecschool.edu.np` (set in `CNAME` + Google Search Console verification in `index.html`)
