# Changelog

All notable changes to this project will be documented in this file.

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
