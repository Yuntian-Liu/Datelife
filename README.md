# Datelife

<p align="right">
  <a href="README.zh-CN.md">中文</a> | English
</p>

<p align="center">
  <strong>Food Expiration Date Manager</strong>
</p>

<p align="center">
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
| Detail View | Full info + status + printable QR code |
| Edit & Delete | Modify or remove records anytime |

### Responsive Design

- **Desktop**: Table view with full-width management panel
- **Mobile**: Card list with compact layout for one-handed use
- **Detail Page**: Desktop side-by-side / Mobile stacked layout

## Tech Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Frontend | Vue 3 + Vite | Progressive framework, fast DX |
| Styling | Tailwind CSS | Atomic CSS, highly customizable |
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
│   │   ├── main.js           # Entry point
│   │   ├── App.vue           # Root component
│   │   ├── router/index.js   # Router config
│   │   ├── utils/api.js      # API client
│   │   └── views/
│   │       ├── HomeView.vue  # Home (table/card dual view)
│   │       └── FoodDetail.vue # Detail page (with QR code)
│   └── vite.config.js        # Vite config (Tailwind + proxy)
│
├── server/                    # Express Backend
│   ├── index.js              # Entry point (serves static files in prod)
│   ├── routes/foods.js       # Food CRUD + QR code endpoints
│   └── lib/db.js             # SQLite database layer
│
├── DEVELOPMENT.md             # Development docs
└── .env.example              # Env variable template
```

## Roadmap

- [x] MVP: Food CRUD + status calculation + QR codes + responsive layout
- [ ] P1: Barcode recognition (Open Food Facts API), category filters, visual polish
- [ ] P2: Auth system (email verification + password login)
- [ ] P3: Expiration alerts, batch entry, photo upload

## Try It Out

Feel free to try Datelife! If you're also struggling with food expiration management, give it a spin.

- Online demo (coming after deployment)
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
