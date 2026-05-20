# Changelog

All notable changes to this project will be documented in this file.

---

## [2.6.0-alpha] - 2026-05-20

### Added

- Complete tag management system: colored capsule tag input with auto-complete, 8-tag global limit
- Tag filter bar: filter food list by tags
- Tag management page: Settings → Data Management → Tag Management, global tag deletion API
- Tag display on food detail page: colored capsules
- Global tag deletion API: DELETE /api/foods/tags/:tagName
- Database `tags` column migration (TEXT DEFAULT '[]')
- Homepage expired foods section: side-by-side with expiring soon, max 2 items, friendly empty state
- QR code status-based color coding: green/amber/red
- QR code card shows remaining days with color

### Improved

- Homepage streamlined: removed shortcut cards, replaced with expiring+expired dual-column single-screen layout
- Tag input disabled + ℹ icon tip when global limit reached
- QR code card expiry date and remaining days side-by-side on one line

### Fixed

- Tag counter now uses global `allTags.length` to reflect system-wide tag count
- Template inline `.filter()` replaced with `computed` property for performance
- Limit modal uses `<Teleport to="body">` to ensure proper rendering
- Tag management delete dialog `tagCounts` correctly unwraps ref (`.value`)
- Tag management icon replaced with standard Heroicons tag shape

---

## [2.5.4-alpha] - 2026-05-20

### Fixed

- Scan page camera video abnormally zoomed in (removed `object-fit: cover` CSS)
- Barcode scan viewfinder too narrow (width doubled)

---

## [2.5.3-alpha] - 2026-05-20

### Fixed

- Scan page camera video not filling container (black bars around edges)
- QR code scan viewfinder compressed into vertical rectangle (restored to square)
- Barcode scan viewfinder too tall (changed to wide rectangle matching barcode shape)

### Changed

- `aspectRatio` now dynamically calculated from actual screen dimensions instead of hardcoded values
- Added CSS rule forcing `object-fit: cover` on scanner video element

---

## [2.5.2-alpha] - 2026-05-20

### Fixed

- Settings page version number not displaying due to `__APP_VERSION__` not exposed to Vue template

---

## [2.5.1-alpha] - 2026-05-20

### Fixed

- QR code scan viewfinder: square aspect ratio restored and centered on screen

---

## [2.5.0-alpha] - 2026-05-20

### Added

- Full-screen scan page (ScanView) — camera no longer embedded in form
- Scan timeout hint after 10s with retry / go back options
- QR code batch print page (QRCodesView)
- 5-tab bottom navigation: Home / Foods / QR Codes / Scan / Settings
- Desktop navigation header (DesktopHeader)
- Diagnostic log system: API call tracking, route tracking, one-tap export
- Shelf life unit switching: days / weeks / months
- Detail page displays shelf life in original input unit
- Dev environment real JWT mock login (`/api/auth/dev-login`)

### Changed

- Mobile food cards now have inline edit/delete icon buttons
- Settings page layout reordered: Data Management above About
- About section reordered: Version → User Agreement → Privacy Policy → Export Logs
- Home page redesigned as dashboard: stat cards + expiring soon list + quick links
- Scan page UI refined to match overall design language
- Scan page automatically restores add/edit form on return

### Fixed

- Desktop "+" add button not working on non-/foods pages
- Scan page back button unresponsive when camera not yet initialized
- Barcode scanning performance — added format filter list + BarcodeDetector API

---

## [2.1.5-alpha] - 2026-05-20

### Fixed

- PC settings page missing back button — added desktop-only "返回首页" link
- Nav bar jumping when switching pages — `scrollbar-gutter: stable` reserves scrollbar space

---

## [2.1.4-alpha] - 2026-05-20

### Changed

- Brand font switched to Playfair Display + Noto Serif SC — elegant English serif + refined Chinese Song
- Settings page header removed — navigation via BottomNav now covers / and /settings
- Settings page bottom padding added — prevents BottomNav from covering content

---

## [2.1.3-alpha] - 2026-05-20

### Added

- Edit profile secondary page — avatar selection (9-grid), nickname/bio editing, save
- "Edit" button on settings page — replaces old inline editing

### Changed

- Settings page interaction redesign — profile rows are now read-only, editing goes through secondary page
- Avatar picker panel matches registration style — compact bottom sheet

### Fixed

- localStorage not synced after saving profile — changes no longer lost on refresh

---

## [2.1.2-alpha] - 2026-05-20

### Added

- 5-step registration wizard — email verification → password → avatar selection → profile → success page
- 9-grid avatar selector with Lorelei style and "refresh" button
- Bio field during registration
- Registration success page with UID display and confetti animation

### Changed

- Avatar style switched from DiceBear `thumbs` to `lorelei`
- Dev mode auto-bypasses Turnstile human verification (frontend + backend)
- Dev mode verification code logged to console instead of calling Resend API

---

## [2.1.1-alpha] - 2026-05-20

### Added

- Full-screen dev watermark — diagonal tiling with "Preview" label + site URL, prevents screenshot leaks
- Watermark toggle via `VITE_ENABLE_WATERMARK` env var in `client/.env`, one-click disable for production
- Gitignore whitelist for `client/.env` (non-sensitive frontend config only)

### Fixed

- PC header alignment — logged-in "Add Food" + avatar now right-aligned with `ml-auto`

---

## [2.1.0-alpha] - 2026-05-20

### Added

- Settings page UI redesign — grouped icon list layout inspired by "有数" app design
- Data management — JSON export/import for food data with deduplication support
- PWA support — add to homescreen, Service Worker offline caching strategy
- Brand banner card — green gradient showing managed food count
- Dev-mode mock login button (auto-removed in production)

### Improved

- Settings page sections: Profile / Data Management / About / Account & Security
- Each setting row has a colored icon (blue/amber/green/violet/red/gray)
- Logout now shows confirmation dialog (useConfirm)
- Branded login prompt for unauthenticated users — banner + icon-enhanced feature list
- Version number displayed at top of About section

### Fixed

- Import data deduplication issue (dedup by name+produce_date)

---

## [1.3.0-alpha] - 2026-05-19

### Added

- Bottom capsule navigation bar (mobile only) with raised center "+" button
- LXGW WenKai (霞鹜文楷) + Nunito custom fonts via Google Fonts
- Tailwind v4 custom theme — grass-green primary color palette

### Improved

- Global visual upgrade: enhanced card shadows + status color stripes (left border)
- Background color changed to soft green-gray (bg-bg)
- Confirmation dialog — rounder corners and softer shadows matching new style
- Back button on detail page — capsule shape with icon

---

## [1.2.2-alpha] - 2026-05-18

### Fixed

- Scan frame height — increased barcode scan frame height for better usability

---

## [1.2.1-alpha] - 2026-05-18

### Improved

- Mobile scan frame size — smaller scan box on mobile for better barcode/QR code alignment and focus

---

## [1.2.0-alpha] - 2026-05-18

### Added

- Scan mode selection — choose between barcode or QR code scanning
- QR code scanning — scan existing food QR codes to auto-fill names
- Custom confirmation dialog — replaces browser native confirm for delete actions

### Improved

- Mobile camera support — HTTPS enabled for camera access on mobile devices
- Scan guide line — only shows in barcode mode, hidden in QR code mode

### Fixed

- Mobile camera access — added HTTPS support to enable camera on mobile browsers

---

## [1.1.0-alpha] - 2026-05-18

### Added

- Barcode scanning — scan product barcodes to auto-fill food names (apibyte.cn API)
- Scan guide line — green gradient line in scan frame to help align barcodes

### Improved

- Scan UX — barcode scanner integrated into add-food form with icon next to name input
- Detail page layout — QR code tip text split into two lines for better readability

### Tech

- New `/api/barcode/:code` route proxying barcode lookup API
- dotenv for `.env` configuration
- html5-qrcode for camera-based barcode scanning

---

## [1.0.0] - 2026-05-18

### Added

- Core food management — create, edit, and delete food items
- Automatic expiration status calculation — Edible (>14 days) / Expiring Soon (≤14 days) / Expired
- QR code generation — unique QR code per food item, scan to view details instantly
- Responsive dual-view layout
  - Desktop: table view with full-width management panel
  - Mobile: card list with compact layout for one-handed use
  - Detail page: desktop side-by-side / mobile stacked layout
- Food detail page — full info display + printable QR code
- Delete confirmation dialog to prevent accidental removals

### Tech Stack

- Frontend: Vue 3 + Vite + Tailwind CSS + Vue Router
- Backend: Express.js + better-sqlite3 (SQLite)
- QR Code: node-qrcode

---

## [2.0.0-alpha] - 2026-05-19

### Added

- **Authentication system** — email verification code + password dual-mode login/register
- JWT authentication (HMAC-SHA256, 30-day expiry) with Bearer token middleware
- Cloudflare Turnstile human verification (required before sending verification codes)
- Resend API integration for sending 6-digit verification code emails
- User Agreement & Privacy Policy — must agree before registration
- Auto-registration hint — unregistered emails auto-create account after verification
- **User Badge system** — Developer / Early Tester / Co-creator badges (configurable via SQL)
- Login page with 3-step wizard (email → verification code → register)
- Settings page dual-state (welcome for guests / profile editing for logged-in users)
- PC Header navigation — avatar + settings for logged-in users, login button for guests

### Improved

- Foods route now enforces user data isolation via `user_id` permission checks
- Legacy food data remains publicly accessible (`user_id` allows NULL)
- Password security: scrypt hashing + random salt + timingSafeEqual comparison
- Rate limiting: IP-based sliding window (3 sends/minute for verification codes)
- Development docs fully rewritten with better formatting and new feature documentation

---

## [Unreleased]

To be released.
