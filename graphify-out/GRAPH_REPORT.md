# Graph Report - .  (2026-07-29)

## Corpus Check
- Large corpus: 228 files · ~8,256,649 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 174 nodes · 277 edges · 14 communities detected
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.76)
- Token cost: 28,370 input · 6,352 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Public Site Rendering|Public Site Rendering]]
- [[_COMMUNITY_Project Architecture & Docs|Project Architecture & Docs]]
- [[_COMMUNITY_School Calendar & Events|School Calendar & Events]]
- [[_COMMUNITY_Fee Management & Roles|Fee Management & Roles]]
- [[_COMMUNITY_Admin UI Helpers|Admin UI Helpers]]
- [[_COMMUNITY_Design System & Brand|Design System & Brand]]
- [[_COMMUNITY_Exam Portal Helpers|Exam Portal Helpers]]
- [[_COMMUNITY_Data Seeding & Compression|Data Seeding & Compression]]
- [[_COMMUNITY_Authentication & Authz|Authentication & Authz]]
- [[_COMMUNITY_Login Portal Page|Login Portal Page]]
- [[_COMMUNITY_Auth System|Auth System]]
- [[_COMMUNITY_Fee Scope Model|Fee Scope Model]]
- [[_COMMUNITY_Fee Frequency Model|Fee Frequency Model]]
- [[_COMMUNITY_Eco Club|Eco Club]]

## God Nodes (most connected - your core abstractions)
1. `AGENTS.md â€” Developer Instructions` - 20 edges
2. `Annual Work Plan 2083 B.S.` - 16 edges
3. `about.html â€” About Page` - 14 edges
4. `index.html â€” Homepage` - 13 edges
5. `Shree Saraswati Secondary School (Entity)` - 11 edges
6. `init()` - 10 edges
7. `Login_portal.html â€” Exam Portal + Account Module` - 10 edges
8. `notices.html â€” Notices Page` - 9 edges
9. `admin.html â€” Admin Dashboard` - 9 edges
10. `README.md â€” Project Readme` - 9 edges

## Surprising Connections (you probably didn't know these)
- `renderAnnualPlan()` --calls--> `bsDateFromAd()`  [INFERRED]
  js\main.js → js\data.js
- `setupAdmissionForm()` --calls--> `reset()`  [INFERRED]
  js\main.js → js\exam_helper.js
- `Brand Strategy â€” Warm, Dignified, Grounded` --rationale_for--> `Shree Saraswati Secondary School (Entity)`  [EXTRACTED]
  PRODUCT.md → index.html
- `Design Principle â€” Photography is the Hero` --rationale_for--> `Shree Saraswati Secondary School (Entity)`  [EXTRACTED]
  PRODUCT.md → index.html
- `clearAllAdmissions()` --calls--> `showToast()`  [INFERRED]
  js\admin.js → js\data.js

## Hyperedges (group relationships)
- **Public-Facing Pages (shared header/footer/data stack)** — index_html, about_html, admissions_html, contact_html, notices_html [EXTRACTED 1.00]
- **Data Architecture (Supabase + localStorage + cache)** — supabase_backend, localStorage_fallback, two_tier_cache, DataStore [EXTRACTED 1.00]
- **Script Dependency Chain (supabase.js â†’ cache.js â†’ data.js â†’ main.js/admin.js)** — js_supabase_js, js_cache_js, js_data_js, js_main_js, js_admin_js [EXTRACTED 1.00]
- **Design System Tokens (Navy + Teal + Gold)** — design_token_navy, design_token_teal, design_token_gold [EXTRACTED 1.00]
- **Typography Stack (Playfair Display + Noto Serif)** — typography_playfair_display, typography_noto_serif [EXTRACTED 1.00]
- **Brand Strategy Principles (warm, landscape colors, photography hero, no filler)** — brand_strategy_warm_dignified, brand_strategy_landscape_colors, brand_strategy_photography_hero, brand_strategy_no_filler [EXTRACTED 1.00]
- **School Blocks (General + Technical)** — general_block, technical_block [EXTRACTED 1.00]
- **Login Portal Modules (Exam Portal + Fee Management)** — Login_portal_html, exam_portal_module, fee_management_module [EXTRACTED 1.00]
- **Admin CMS Sections (slides, notices, programs, teachers, staff, gallery, events, testimonials, marquee, admissions)** — admin_html, js_admin_js, css_admin_css [EXTRACTED 1.00]
- **Core Documentation Files (AGENTS, DESIGN, PRODUCT, README)** — AGENTS_md, DESIGN_md, PRODUCT_md, README_md [EXTRACTED 1.00]
- **Fee Management System** — filestem_fee_categories_table, filestem_class_fees_table, filestem_student_fees_table, filestem_fee_collections_table, filestem_bill_sequence_table, filestem_student_discounts_table, filestem_fee_scope_model, filestem_fee_frequency_model, filestem_discount_model, filestem_collection_process, filestem_get_next_bill_no, filestem_update_collection_total [EXTRACTED 1.00]
- **Authentication Flow** — filestem_auth_system, filestem_session_object, filestem_auth_object, filestem_struct_object, filestem_handle_login, filestem_change_password, filestem_role_admin, filestem_role_teacher, filestem_role_student [EXTRACTED 1.00]
- **Navigation Structure** — filestem_admin_nav, filestem_teacher_nav, filestem_student_nav, filestem_render_account, filestem_render_teachers, filestem_render_admit_cards [EXTRACTED 1.00]
- **Staff Categorization Model** — filestem_staff_categorization, filestem_designation_options, filestem_render_teachers, filestem_role_teacher [EXTRACTED 1.00]
- **Annual Plan 12-Month Sequence (Baisakh to Chaitra)** — Month_Baisakh, Month_Jestha, Month_Ashadh, Month_Shrawan, Month_Bhadra, Month_Ashwin, Month_Kartik, Month_Mangsir, Month_Poush, Month_Magh, Month_Falgun, Month_Chaitra, AnnualWorkPlan_2083 [EXTRACTED 1.00]
- **Graph Analysis Structure (Report + Communities + Renderer + Hyperedge)** — Graph_GraphReport, Graph_Community_AnnualWorkPlan, Graph_Community_NepaliCalendar, Graph_renderAnnualPlan, Graph_Hyperedge_NepaliCalendar [EXTRACTED 1.00]
- **School Governance & Responsibility Actors** — Responsible_Principal, Responsible_ExamCommittee, Responsible_ECACoordinator, Responsible_ClassTeachers, Responsible_SportsCommittee, Responsible_EcoClub, Responsible_SMC [EXTRACTED 1.00]

## Communities

### Community 0 - "Public Site Rendering"
Cohesion: 0.09
Nodes (25): bsDateFromAd(), bsMonthGrid(), animateCounters(), getPlaceholderImage(), init(), _lazyLoadSections(), renderAnnualPlan(), renderBsCalendar() (+17 more)

### Community 1 - "Project Architecture & Docs"
Cohesion: 0.16
Nodes (28): AGENTS.md â€” Developer Instructions, Admin Object (Admin CRUD), App Object (Public Site Renderer), DataStore CRUD Interface, Login_portal.html â€” Exam Portal + Account Module, README.md â€” Project Readme, about.html â€” About Page, admin.html â€” Admin Dashboard (+20 more)

### Community 2 - "School Calendar & Events"
Cohesion: 0.09
Nodes (31): Student Admissions & Registration, Celebrations (Annual, Children's Day, Education Day), Competitions (Speech, Quiz, Dance, Essay, Sports), Examinations (Terminal, Pre-board, SEE, Annual), Staff Meetings & Planning, Vacations (Dashain, Tihar, Annual), Annual Work Plan 2083 B.S., Community: Annual Work Plan & Notice Board (+23 more)

### Community 3 - "Fee Management & Roles"
Cohesion: 0.1
Nodes (23): isAccountPrivileged(), ADMIN_NAV Array, bill_sequence Table, class_fees Table, Fee Collection Process, DESIGNATION_OPTIONS, Discount Model (position/category/custom), exam_portal_kv Table (+15 more)

### Community 4 - "Admin UI Helpers"
Cohesion: 0.18
Nodes (3): clearAllAdmissions(), showToast(), Critical Script Load Order (supabase.js â†’ cache.js â†’ data.js â†’ main.js/admin.js)

### Community 5 - "Design System & Brand"
Cohesion: 0.18
Nodes (11): DESIGN.md â€” Design System, PRODUCT.md â€” Brand & Product Voice, Color Strategy â€” Nepali Landscape (green hills, blue sky, red accents), Design Principle â€” Every Section Earns Its Place, No Filler, Design Principle â€” Photography is the Hero, Brand Strategy â€” Warm, Dignified, Grounded, Design Token â€” Gold (oklch 0.72 0.13 85), Design Token â€” Navy (oklch 0.29 0.045 260) (+3 more)

### Community 6 - "Exam Portal Helpers"
Cohesion: 0.24
Nodes (5): examCols(), examCountBytes(), examSelect(), log(), reset()

### Community 7 - "Data Seeding & Compression"
Cohesion: 0.33
Nodes (7): seedData(), seedGallery(), seedLocalGallery(), seedLocalStaff(), seedLocalTeachers(), seedStaff(), seedTeachers()

### Community 8 - "Authentication & Authz"
Cohesion: 0.5
Nodes (5): AUTH Object, Change Password Flow, Grade Scale (Nepal SEE-style), handleLogin(), STRUCT Object

### Community 9 - "Login Portal Page"
Cohesion: 1.0
Nodes (1): Login Portal

### Community 10 - "Auth System"
Cohesion: 1.0
Nodes (1): Authentication System

### Community 11 - "Fee Scope Model"
Cohesion: 1.0
Nodes (1): Fee Scope Model (school/class/student)

### Community 12 - "Fee Frequency Model"
Cohesion: 1.0
Nodes (1): Fee Frequency Model (monthly/yearly/event)

### Community 13 - "Eco Club"
Cohesion: 1.0
Nodes (1): Eco Club

## Knowledge Gaps
- **32 isolated node(s):** `DataStore CRUD Interface`, `App Object (Public Site Renderer)`, `Admin Object (Admin CRUD)`, `Design Token â€” Navy (oklch 0.29 0.045 260)`, `Design Token â€” Gold (oklch 0.72 0.13 85)` (+27 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Login Portal Page`** (1 nodes): `Login Portal`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth System`** (1 nodes): `Authentication System`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Fee Scope Model`** (1 nodes): `Fee Scope Model (school/class/student)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Fee Frequency Model`** (1 nodes): `Fee Frequency Model (monthly/yearly/event)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Eco Club`** (1 nodes): `Eco Club`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AGENTS.md â€” Developer Instructions` connect `Project Architecture & Docs` to `Public Site Rendering`, `Admin UI Helpers`, `Data Seeding & Compression`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `setupAdmissionForm()` connect `Public Site Rendering` to `Exam Portal Helpers`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `reset()` connect `Exam Portal Helpers` to `Public Site Rendering`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **What connects `DataStore CRUD Interface`, `App Object (Public Site Renderer)`, `Admin Object (Admin CRUD)` to the rest of the system?**
  _32 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Public Site Rendering` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `School Calendar & Events` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Fee Management & Roles` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._