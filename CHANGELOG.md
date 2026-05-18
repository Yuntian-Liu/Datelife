# Changelog

All notable changes to this project will be documented in this file.

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
