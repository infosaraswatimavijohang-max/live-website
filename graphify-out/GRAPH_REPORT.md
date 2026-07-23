# Graph Report - .  (2026-07-24)

## Corpus Check
- 223 files · ~8,230,504 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 110 nodes · 155 edges · 16 communities detected
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.8)
- Token cost: 28,370 input · 6,352 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Nepali Calendar & Seed Data|Nepali Calendar & Seed Data]]
- [[_COMMUNITY_Admin CMS & Page Sections|Admin CMS & Page Sections]]
- [[_COMMUNITY_Admin Admissions CRUD|Admin Admissions CRUD]]
- [[_COMMUNITY_Gallery & Lightbox|Gallery & Lightbox]]
- [[_COMMUNITY_App Initialization & Renderers|App Initialization & Renderers]]
- [[_COMMUNITY_School Info Pages|School Info Pages]]
- [[_COMMUNITY_Product & Documentation|Product & Documentation]]
- [[_COMMUNITY_Exam Portal System|Exam Portal System]]
- [[_COMMUNITY_Annual Work Plan & Notice Board|Annual Work Plan & Notice Board]]
- [[_COMMUNITY_Teachers & Staff Display|Teachers & Staff Display]]
- [[_COMMUNITY_Admission Form Flow|Admission Form Flow]]
- [[_COMMUNITY_Design System|Design System]]
- [[_COMMUNITY_Stats Counters|Stats Counters]]
- [[_COMMUNITY_Supabase Client|Supabase Client]]
- [[_COMMUNITY_Events Timeline|Events Timeline]]
- [[_COMMUNITY_Testimonials Slider|Testimonials Slider]]

## God Nodes (most connected - your core abstractions)
1. `init()` - 19 edges
2. `seedData()` - 7 edges
3. `Shree Saraswati Secondary School` - 7 edges
4. `DataStore API (CRUD + Cache)` - 7 edges
5. `App Renderer (Public Site)` - 7 edges
6. `Exam & Gradesheet Management System` - 6 edges
7. `Supabase REST Client (supabase.js)` - 6 edges
8. `renderAnnualPlan()` - 5 edges
9. `Admin CMS (CRUD Operations)` - 5 edges
10. `Default Data Arrays (DEFAULT_TEACHERS, STAFF, GALLERY)` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Admin Login Authentication` --semantically_similar_to--> `Login / Auth System (Admin, Teacher, Student)`  [INFERRED] [semantically similar]
  js/admin.js → exam_portal.html
- `Staff Section` --references--> `Default Data Arrays (DEFAULT_TEACHERS, STAFF, GALLERY)`  [EXTRACTED]
  about.html → js/main.js
- `Supabase Backend (Exam Portal)` --calls--> `Supabase REST Client (supabase.js)`  [EXTRACTED]
  exam_portal.html → js/supabase.js
- `Teachers Section` --references--> `Default Data Arrays (DEFAULT_TEACHERS, STAFF, GALLERY)`  [EXTRACTED]
  index.html → js/main.js
- `Data Layer Overview (AGENTS.md)` --references--> `DataStore API (CRUD + Cache)`  [EXTRACTED]
  AGENTS.md → js/data.js

## Hyperedges (group relationships)
- **Three-Tier Architecture (DataStore -> Supabase -> Admin/Render)** — jsdata_DataStore, jssupabase_SupabaseClient, jsadmin_AdminCMS, jsmain_AppRenderer, jssupabase_SupabaseTableMap [EXTRACTED 1.00]
- **Exam System Data Flow (Classes, Subjects, Students, Marks, Exams)** — examportalhtml_ExamGradesheetSystem, examportalhtml_SupabaseBackend, examportalhtml_GradesheetPreview, examportalhtml_ClassLedger, examportalhtml_GradingScale, examportalhtml_LoginAuthSystem, jssupabase_SupabaseClient [EXTRACTED 1.00]
- **Nepali Calendar / Annual Plan System** — jsdata_NepaliDate, jsdata_BSYearVars, jsmain_AnnualPlanRenderer, indexhtml_AnnualWorkPlan, AnnualWorkPlan_BaisakhtoChaitra [EXTRACTED 1.00]
- **Brand & Design System (Color, Typography, Spacing, Voice)** — DESIGNmd_OKLCHColorSystem, DESIGNmd_TypographyScale, DESIGNmd_SpacingElevationMotion, AGENTSmd_DesignTokens, PRODUCTmd_ProductPurpose, PRODUCTmd_VoicePrinciples [INFERRED 0.90]

## Communities

### Community 0 - "Nepali Calendar & Seed Data"
Cohesion: 0.2
Nodes (12): bsDateFromAd(), bsMonthGrid(), seedData(), seedGallery(), seedLocalGallery(), seedLocalStaff(), seedLocalTeachers(), seedStaff() (+4 more)

### Community 1 - "Admin CMS & Page Sections"
Cohesion: 0.24
Nodes (14): Login / Auth System (Admin, Teacher, Student), Hero Section (Slideshow), Stats Counter (Students, Teachers, Graduates, Years), Admin CMS (CRUD Operations), Admin Login Authentication, DataStore API (CRUD + Cache), Image Compression (compressImage), NepaliDate Engine (B.S. Conversion) (+6 more)

### Community 2 - "Admin Admissions CRUD"
Cohesion: 0.17
Nodes (2): clearAllAdmissions(), showToast()

### Community 3 - "Gallery & Lightbox"
Cohesion: 0.22
Nodes (5): renderGallery(), renderGalleryImages(), renderGalleryMarquee(), renderSplitHero(), setupAdmissionForm()

### Community 4 - "App Initialization & Renderers"
Cohesion: 0.18
Nodes (11): init(), renderAbout(), renderEvents(), renderFooter(), renderHeader(), renderNotices(), renderPrograms(), setupHeaderScroll() (+3 more)

### Community 5 - "School Info Pages"
Cohesion: 0.25
Nodes (9): General Block, Principal Chhabilal Bhandari, Shree Saraswati Secondary School, Staff Section, Technical Block, Contact Information, Location Maps, Academic Programs (General & Technical) (+1 more)

### Community 6 - "Product & Documentation"
Cohesion: 0.25
Nodes (8): Admin Login (AGENTS.md), Data Layer Overview (AGENTS.md), Gallery Categories, Product Purpose & Brand Strategy, User Personas (Parents, Students, Admin), Voice & Tone Principles, Vision, Mission, Values, Gallery Section

### Community 7 - "Exam Portal System"
Cohesion: 0.4
Nodes (6): Class Ledger (A4/A3 Multi-Page Print), Exam & Gradesheet Management System, Global Sync Indicator (Loader Timer), Gradesheet Preview (Screen & Print), Nepal SEE-Style Grading Scale, Supabase Backend (Exam Portal)

### Community 8 - "Annual Work Plan & Notice Board"
Cohesion: 0.47
Nodes (6): Annual Work Plan 2083 B.S. (Monthly Activities), Annual Work Plan 2083 (Calendar), Notice Board, BS Year Calendar Constants (BS_YEAR, MONTH_ORDER, etc.), Annual Plan & BS Calendar Renderer, Notice List Page

### Community 9 - "Teachers & Staff Display"
Cohesion: 0.5
Nodes (4): getPlaceholderImage(), renderStaff(), renderTeachers(), renderTestimonials()

### Community 10 - "Admission Form Flow"
Cohesion: 0.5
Nodes (4): Admission Process, Classes Offered, Documents Required, Online Admission Form (6-Step)

### Community 11 - "Design System"
Cohesion: 0.67
Nodes (4): Design Tokens (AGENTS.md), OKLCH Color System, Spacing, Elevation, Motion System, Typography Scale

### Community 12 - "Stats Counters"
Cohesion: 0.67
Nodes (3): animateCounters(), renderStats(), startCounters()

### Community 13 - "Supabase Client"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Events Timeline"
Cohesion: 1.0
Nodes (1): Events Timeline

### Community 15 - "Testimonials Slider"
Cohesion: 1.0
Nodes (1): Testimonials Slider

## Knowledge Gaps
- **14 isolated node(s):** `Classes Offered`, `Documents Required`, `Admin Login (AGENTS.md)`, `Location Maps`, `Spacing, Elevation, Motion System` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Supabase Client`** (1 nodes): `supabase.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Events Timeline`** (1 nodes): `Events Timeline`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Testimonials Slider`** (1 nodes): `Testimonials Slider`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `showToast()` connect `Admin Admissions CRUD` to `Nepali Calendar & Seed Data`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `renderAnnualPlan()` connect `Nepali Calendar & Seed Data` to `Gallery & Lightbox`, `App Initialization & Renderers`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **What connects `Classes Offered`, `Documents Required`, `Admin Login (AGENTS.md)` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._