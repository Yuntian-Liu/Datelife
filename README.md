# Datelife

<p align="right">
  <a href="README.zh-CN.md">中文</a> | English
</p>

<p align="center">
  <strong>Food Expiration Date Manager</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-2.9.8--alpha-blue" alt="Version" />
  <img src="https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vue.js&logoColor=white" alt="Vue" />
  <img src="https://img.shields.io/badge/Express-Node.js-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## About

Too many snacks in the dorm? Tired of manually checking expiration dates? **Datelife** digitizes your food shelf life management.

Enter production dates and shelf life, and let Datelife automatically calculate expiration status. Each food item gets a unique QR code — **scan to view details instantly**.

## Features

### Core Features

| Feature | Description |
|---------|-------------|
| Food Entry | Name + Production Date + Shelf Life → Auto-calculate expiry |
| Status Detection | **Edible** (>14 days) / **Expiring Soon** (≤14 days) / **Expired** |
| QR Code | Unique QR code per food item, scan to view details |
| Barcode Scan | Barcode lookup via apibyte.cn API + QR code scanner |
| Tag System | Custom tags with global persistent storage, 8-tag limit, tag filters |
| Detail View | Full info + status + printable QR code |
| Edit & Delete | Modify or remove records anytime |
| User Auth | Email verification code + password login + invite code system |
| Badge System | Developer / Beta Tester / Co-creator badges with gradient rings |
| Data Export/Import | JSON backup with deduplication support |
| PWA | Add to homescreen, offline caching via Service Worker |

### Responsive Design

- **Desktop**: Table view with full-width management panel
- **Mobile**: Card list with compact layout for one-handed use
- **Detail Page**: Desktop side-by-side / Mobile stacked layout

## Tech Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Frontend | Vue 3 + Vite | Progressive framework, fast DX |
| Styling | Tailwind CSS v4 | Atomic CSS, highly customizable |
| Auth | JWT + Cloudflare Turnstile | Token auth + human verification |
| Email | Resend API | Verification code delivery |
| Backend | Express.js | Lightweight Node.js framework |
| Database | SQLite (better-sqlite3) | Zero-config, file-based |
| QR Code | qrcode (node-qrcode) | Lightweight QR generation |

## Quick Start

### Prerequisites

- Node.js >= 18
- npm >= 9

### Installation

```bash
# Clone the repo
git clone https://github.com/Yuntian-Liu/Datelife.git
cd Datelife

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

### Development

```bash
# Terminal 1: Start backend (port 3000)
cd server && npm run dev

# Terminal 2: Start frontend (port 5173, proxies API to backend)
cd client && npm run dev
```

Open http://localhost:5173 to get started.

### Production Build

```bash
# Build frontend
cd client && npm run build

# Start server (NODE_ENV=production serves frontend static files)
cd server && NODE_ENV=production npm start
```

Environment variables:

```bash
PORT=3000                  # Server port
NODE_ENV=production        # Production mode
BASE_URL=https://your-domain.com  # URL prefix encoded in QR codes
DATABASE_PATH=./data/datelife.db  # Database file path
```

## Project Structure

```
Datelife/
├── client/                    # Vue 3 Frontend
│   ├── src/
│   │   ├── main.js           # Entry point + SW registration
│   │   ├── App.vue           # Root component + global dialogs
│   │   ├── router/index.js   # Router config
│   │   ├── utils/
│   │   │   ├── api.js        # API client (auth, foods, barcode)
│   │   │   ├── badges.js     # Badge definitions (developer/early/co_creator)
│   │   │   ├── agreement.js  # User agreement & privacy policy HTML
│   │   │   ├── betaAgreement.js # Beta agreement HTML
│   │   │   ├── changelog.js  # Changelog data (23 versions)
│   │   │   └── logger.js     # Diagnostic logger (API calls, route, export)
│   │   ├── composables/      # Vue composables
│   │   │   ├── useAuth.js    # Global auth state singleton
│   │   │   └── useConfirm.js # Confirm dialog composable
│   │   ├── components/       # Reusable components
│   │   │   ├── BottomNav.vue  # Mobile floating capsule nav
│   │   │   ├── DesktopHeader.vue # Desktop top nav bar
│   │   │   ├── ConfirmDialog.vue
│   │   │   ├── Watermark.vue  # Dev watermark overlay
│   │   │   └── TurnstileWidget.vue
│   │   └── views/
│   │       ├── HomeView.vue  # Home (dashboard dual-view)
│   │       ├── FoodDetail.vue # Food detail (with QR code)
│   │       ├── ScanView.vue  # Full-screen barcode/QR scanner
│   │       ├── QRCodesView.vue # Printable QR code sheet
│   │       ├── EditProfile.vue # Profile editor
│   │       ├── AboutView.vue # About page (dev info, feedback)
│   │       ├── LoginView.vue  # Login/register 3-step wizard
│   │       └── SettingsView.vue # Settings (profile, data, changelog)
│   ├── public/
│   │   ├── manifest.json     # PWA manifest
│   │   ├── sw.js            # Service Worker (cache-first strategy)
│   │   └── favicon.png      # App icon
│   └── vite.config.js        # Vite config (Tailwind + proxy)
│
├── server/                    # Express Backend
│   ├── index.js              # Entry point (serves static in prod)
│   ├── manage.js             # DB management CLI (--yes guard)
│   ├── routes/
│   │   ├── foods.js          # Food CRUD + QR code + tags
│   │   ├── barcode.js        # Barcode lookup proxy
│   │   └── auth.js           # Auth (login, register, profile, invite)
│   ├── lib/
│   │   ├── db.js             # SQLite (5 tables + auto-migration)
│   │   ├── jwt.js            # JWT token utilities
│   │   ├── email.js         # Resend email (dev mode bypass)
│   │   └── qrcode.js         # QR code generation
│   └── middleware/
│       ├── auth.js           # Auth middleware (required/optional)
│       ├── turnstile.js      # Cloudflare Turnstile verification
│       └── rateLimit.js      # IP-based sliding window limiter
│
├── DEVELOPMENT.md             # Development docs
└── .env.example              # Env variable template
```

## Roadmap

- [x] MVP: Food CRUD + status calculation + QR codes + responsive layout
- [x] P1: Auth system (email + password + invite code) + Badge system + user agreement
- [x] P2: Settings page redesign + Data management (export/import) + PWA support
- [x] P3: Barcode recognition, tag system, changelog viewer, scan page
- [x] P4: Invite code registration, beta agreement, DB management CLI
- [ ] Future: Expiration alerts, batch entry, image upload

## Try It Out

Feel free to try Datelife! If you're also struggling with food expiration management, give it a spin.

- Online demo: [datelife.ytunx.com](https://datelife.ytunx.com)
- Local setup: see "Quick Start" section above

## Feedback & Contributions

Datelife is in its early stages — your feedback and contributions are highly welcome!

- **Bug Reports** → [Open an Issue](https://github.com/Yuntian-Liu/Datelife/issues)
- **Feature Requests** → [Open an Issue](https://github.com/Yuntian-Liu/Datelife/issues)
- **Pull Requests** → Fork and submit a PR

## Contact

For any questions or suggestions, feel free to reach out:

- **Email**: [liuyuntian@ytunx.com](mailto:liuyuntian@ytunx.com)
- **GitHub**: [Yuntian-Liu](https://github.com/Yuntian-Liu)

## License

[MIT](LICENSE)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Yuntian-Liu">Yuntian</a>
</p>
