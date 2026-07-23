# Shree Saraswati Secondary School Website

Static HTML/CSS/JS site - no build process.

## Running
- **Public**: Open `index.html` in browser
- **Admin**: Open `admin.html` (login: `amitrazbanc` / `school1122@`)

## Data
- All data in localStorage with `sss_` prefix
- `js/data.js`: DataStore CRUD + seed data on first load
- **Reset data**: DevTools → Application → Local Storage → clear `sss_*`

## Key Files
| File | Purpose |
|------|---------|
| `js/data.js` | DataStore API, NepaliDate, seed data |
| `js/main.js` | Renders public site from localStorage |
| `js/admin.js` | Admin CRUD operations |
| `css/style.css` | Public styles |
| `css/admin.css` | Admin styles |

## Design
- Primary: `#1a3a5c` | Accent: `#f5a623`
- Fonts: Playfair Display (headings), Noto Serif (body, Devanagari support)

## Gallery Categories
- Events: School buildings, trips
- Graduation: Farewell SLC 2082, SEE 2082
- Lab: Technical Students (208309xx, 208310xx, 208312xx files)

## Gotchas
- Google Maps iframes fail with `file://` - serve via localhost
- Teacher photo filenames in seed must match `assets/images/Teachers/*` exactly
- Admin image uploads convert to base64 (localStorage size limits apply)