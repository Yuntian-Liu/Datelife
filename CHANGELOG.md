# Changelog

All notable changes to this project will be documented in this file.

---

## [2.9.7-alpha] - 2026-05-24

### Added

- Manual barcode input: users can type 8-13 digit barcode numbers when scanning is difficult, with automatic product name lookup via apibyte.cn API
- UUID-based cross-account migration: QR codes now encode a unique 8-char short ID (`/u/{uuid}`) instead of database auto-increment ID (`/f/:id}`), surviving import/export to different accounts while maintaining backward compatibility with old QR format
- `GET /api/foods/by-uuid/:uuid` public endpoint for UUID-based food lookup (no auth required, matching existing `/f/:id` behavior)

### Fixed

- `FoodForm.vue` scan callback silently dropped: `route.query.scanResult` was captured after `await` calls, losing the value due to Vue Router query race condition — fixed by capturing `pendingScanResult` synchronously at the top of `initForm()` and passing it directly to `handleScanResult(result)`
- `FoodForm.vue` ReferenceError crash on mount: `watch` was used at line 247 but not imported from Vue, causing entire component setup to fail and freezing the page
- `LoginView.vue` countdown timer leak: `setInterval` was never cleared on component unmount, now properly cleaned up via `onBeforeUnmount(clearInterval(timer))`

### Changed

- `<keep-alive>` whitelist narrowed from caching all routes to explicit 5-component include list (`HomeView`, `FoodsView`, `QRCodesView`, `ScanView`, `SettingsView`), excluding `FoodForm`, `LoginView`, `FoodDetail`
- All 5 cached views now have `defineOptions({ name })` for keep-alive matching and `initLock` pattern to prevent `onMounted` + `onActivated` double-fire
- Scan timeout hint now fires once per scan session (via `timeoutReminded` flag) with mode-specific messaging (barcode suggests manual input, qrcode suggests continuing)
- SettingsView food count refreshes on page return via `onActivated(refreshFoodCount)`
- FoodDetail supports dual-mode loading by route path prefix (`/u/:uuid` vs `/f/:id`) with `watch` on both params
- SW cache name updated to `datelife-v297a`

---

## [2.9.6-alpha] - 2026-05-23

### Fixed

- `ScanView.vue` ReferenceError crash after v2.9.4 changed module-level `const mode` to `currentMode` ref: `onScanSuccess` and `startTimeoutTimer` callbacks still referenced the now-undefined `mode` variable, causing scan results to be silently dropped and the 10s timeout hint to never appear

---

## [2.9.5-alpha] - 2026-05-23

### Fixed

- `HomeView.vue` keep-alive causing duplicate `GET /foods` on first mount (`onMounted` + `onActivated` both firing): added `initLock` guard to `loadHome()`
- `FoodForm.vue` keep-alive causing stale data flash on re-entry (cached old form data visible before async refresh): added `resetForm()` at start of `initForm()` 
- `ScanView.vue` keep-alive causing split-screen on first open (two camera instances from dual `initScan()` calls): added `initLock` guard

---

## [2.9.4-alpha] - 2026-05-23

### Fixed

- `ScanView.vue` keep-alive cache causing black screen / wrong scan mode: added `onDeactivated` to stop camera and `onActivated` to re-init with correct mode

---

## [2.9.3-alpha] - 2026-05-22

### Added

- Background preloading: heavy route chunks (QRCodesView, ScanView, SettingsView) auto-load 3s after app mount, eliminating first-visit download waits

### Fixed

- `FoodForm.vue` keep-alive cache causing stale form data on re-entry (extracted `initForm()`, added `onActivated`)
- `FoodForm.vue` edit mode not activating after keep-alive reuse (add/edit share same component, `onMounted` didn't re-check mode)

---

## [2.9.2-alpha] - 2026-05-22

### Added

- Route loading indicator: `RouteLoading.vue` with animated green progress bar + glassmorphism warm message card for first-time lazy-loaded page visits

### Fixed

- `FoodDetail.vue` triggering `GET /foods/undefined` 404 when navigating back to list (added id guard in `watch`)

---

## [2.9.1-alpha] - 2026-05-22

### Fixed

- Toast overflow on mobile with long food names: split into two lines with `break-all` wrapping
- Keep-alive cached pages not refreshing data after navigation: added `onActivated` hooks to 4 main views
- Service Worker cache name bumped to `v291a`

---

## [2.9.0-alpha] - 2026-05-22

### Added

- Food inventory management: set quantity per item, "eat one" button to decrement, auto-delete when last one consumed with "burp~" toast
- Add/edit food standalone route pages (/foods/add, /foods/edit/:id), separated from the list view
- Tag conflict resolution during data import: detect tag limit, support selective tag retention or strip-tags import
- Version update notification: auto-show changelog modal on first visit after a new release

### Changed

- Page switching performance leap: route lazy loading + keep-alive component caching, instant page transitions
- About page restructured: open source declaration moved to third-level page with MIT license notice and attribution for icon author Royyan Wijaya
- Toast notifications: glassmorphism style, centered display, green variant for last-item deletion
- PDF QR code printing: watermark moved to top layer, page numbers rendered via canvas to avoid font issues, failed cards auto-skipped
- Tag color allocation algorithm: infinite loop guard
- Diagnostic logs enhanced: new device info fields (devicePixelRatio / maxTouchPoints / reducedMotion), API request summaries, SW/barcode error log improvements

---

## [2.8.2-alpha] - 2026-05-22

### Added

- QR code PDF printing: download A4 layout PDF, 5-column grid (30/pg), branded title + diagonal watermark, multi-page auto-pagination

### Changed

- Food management filter state persistence: filter/tag/search/sort state synced to URL query params, auto-restored on back navigation

---

## [2.8.1-alpha] - 2026-05-21

### Fixed

- HarmonyOS/Honor browser Vue render crash: build target downgraded to es2015
- Mobile tag management delete button invisible: hover-dependent opacity changed to md breakpoint always-visible
- Mobile add-food tag limit info icon unclickable: touch target 16px → 44px

---

## [2.8.0-alpha] - 2026-05-21

### Added

- Invite code registration system: INVITE_MODE env var toggle + 5 seed invite codes, check-email / verify-invite endpoints
- Beta agreement (betaAgreement.js): standalone HTML document, inline display in invite code input area
- Database management script server/manage.js: SQLite operations via Node.js with --yes confirmation guard
- Login page verification code / password tab switcher with URL query parameter sync

### Improved

- Badge system UI overhaul: dots replaced with gradient ring borders, unified across all avatar locations
- User agreement & privacy policy: added invite code registration info + invite code data collection notice
- Diagnostic logs: added userBadge field for better badge issue troubleshooting
- Development docs: added invite code system + database management tool chapters, updated badge operations guide

### Fixed

- Invite code validation SQL: `datetime("now")` double-quotes treated as column name by SQLite
- LoginView.vue invite code area template nesting error causing invite input to not render

---

## [2.7.1-alpha] - 2026-05-21

### Improved

- User agreement layout: feature list changed to `<ul>` items, account security responsibilities split into list items, data management section split into paragraphs
- Privacy policy layout: diagnostic log paragraph split into 3 sections, fixed HTML structure bug (missing closing tags in Section 7)
- README roadmap P3 update: checked off completed barcode recognition and tag system (category filters)
- README added online demo link: datelife.ytunx.com
- Agreement & privacy policy last updated date refreshed to 2026-05-21
- Changelog dialog restructured: extracted data into standalone `changelog.js` with full history of 21 versions
- Changelog dropdown grouped by minor version (2.7.x / 2.6 / 2.5.x …) with collapsible groups
- Changelog content area now dynamically renders selected version, keeping dialog height fixed

### Fixed

- Missing `</p>` and `</div>` closing tags at end of privacy policy Section 7, could cause display issues for subsequent sections

---

## [2.7.0-alpha] - 2026-05-21

### Added

- Tag persistence system: independent `tags` table, removing tag from food no longer deletes it globally
- Tag management page: 8-tag limit with counter + create tag API (POST /api/foods/tags)
- Sort toggle: capsule-shaped sorter next to search box (by add time / by expiry urgency)
- About detail page: developer info, GitHub open source link, feedback email, version log
- Food detail page now read-only mode (edit/delete buttons removed)

### Improved

- Mobile QR code card: 3-digit days indicator instead of two-column text
- Mobile filter bar: 3-char button labels auto line-break on mobile
- Mobile food card: two-line layout for remaining days + date
- Tag filter dropdown: right-aligned on mobile, vertical layout
- Search box restyled as capsule, unified with sort toggle
- Barcode scanner: reduced FPS, removed experimental BarcodeDetector for performance
- Diagnostic logger coverage: tags, sort, scan, export, profile editing
- User agreement & privacy policy: tag persistence, diagnostic log declarations

### Fixed

- Food detail page back button navigated to home instead of previous page

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

## [1.2.2-alpha] - 2026-05-19

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

## [Unreleased]

To be released.
