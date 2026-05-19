# Changelog

All notable changes to this project will be documented in this file.

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
