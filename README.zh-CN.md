# Datelife

<p align="right">
  中文 | <a href="README.md">English</a>
</p>

<p align="center">
  <strong>食品日期管理平台</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-2.7.0--alpha-blue" alt="Version" />
  <img src="https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vue.js&logoColor=white" alt="Vue" />
  <img src="https://img.shields.io/badge/Express-Node.js-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## 简介

寝室零食太多，手动贴标签查保质期太麻烦？**Datelife** 帮你数字化管理所有食品的保质期。

录入生产日期和保质期，自动计算过期时间并标记状态。每个食品生成专属二维码，打印标签贴在包装上，**扫码即可查看详情**。

## 功能

### 核心功能

| 功能 | 说明 |
|------|------|
| 食品录入 | 名称 + 生产日期 + 保质期天数 → 自动计算过期日期 |
| 状态判断 | **可食用** (>14天) / **临期** (≤14天) / **已过期** |
| 二维码生成 | 每个食品专属二维码，扫码直达详情页 |
| 详情展示 | 完整信息 + 状态 + 可打印二维码 |
| 编辑删除 | 随时修改或移除记录 |
| 用户认证 | 邮箱验证码登录 + 密码登录 |
| 徽章系统 | 开发者/内测/共创者徽章标识 |
| 数据导入导出 | JSON 格式备份，支持去重 |
| PWA 支持 | 可添加到桌面，离线缓存 |

### 响应式设计

- **PC 端**：表格视图，宽屏管理面板，信息密度高
- **手机端**：卡片列表，紧凑布局，适合单手操作
- **详情页**：PC 左右分栏 / 手机上下堆叠

## 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 前端 | Vue 3 + Vite | 渐进式框架，快速开发 |
| 样式 | Tailwind CSS v4 | 原子化 CSS，高度可定制 |
| 认证 | JWT + Cloudflare Turnstile | Token 认证 + 人机验证 |
| 邮件 | Resend API | 验证码发送 |
| 后端 | Express.js | 轻量级 Node.js 框架 |
| 数据库 | SQLite (better-sqlite3) | 零配置，文件型数据库 |
| 二维码 | qrcode (node-qrcode) | 轻量级二维码生成 |

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装

```bash
# 克隆仓库
git clone https://github.com/Yuntian-Liu/Datelife.git
cd Datelife

# 安装后端依赖
cd server && npm install

# 安装前端依赖
cd ../client && npm install
```

### 开发模式

```bash
# 终端 1：启动后端（端口 3000）
cd server && npm run dev

# 终端 2：启动前端（端口 5173，自动代理 API 到后端）
cd client && npm run dev
```

打开 http://localhost:5173 即可访问。

### 生产部署

```bash
# 构建前端
cd client && npm run build

# 启动服务（NODE_ENV=production 自动 serve 前端静态文件）
cd server && NODE_ENV=production npm start
```

环境变量：

```bash
PORT=3000                  # 服务端口
NODE_ENV=production        # 生产模式
BASE_URL=https://your-domain.com  # 二维码中编码的 URL 前缀
DATABASE_PATH=./data/datelife.db  # 数据库文件路径
```

## 项目结构

```
Datelife/
├── client/                    # Vue 3 前端
│   ├── src/
│   │   ├── main.js           # 入口 + Service Worker 注册
│   │   ├── App.vue           # 根组件
│   │   ├── router/index.js   # 路由配置
│   │   ├── utils/
│   │   │   ├── api.js        # API 封装（auth、foods、barcode）
│   │   │   ├── badges.js     # 徽章定义
│   │   │   └── agreement.js  # 用户协议 / 隐私政策 HTML
│   │   ├── composables/      # Vue 组合式函数
│   │   │   ├── useAuth.js    # 认证状态管理
│   │   │   └── useConfirm.js # 确认弹窗组合式函数
│   │   ├── components/       # 可复用组件
│   │   │   ├── BottomNav.vue  # 移动端浮动导航栏
│   │   │   ├── ConfirmDialog.vue
│   │   │   └── TurnstileWidget.vue
│   │   └── views/
│   │       ├── HomeView.vue  # 首页（表格/卡片双视图）
│   │       ├── FoodDetail.vue # 详情页（含二维码）
│   │       └── SettingsView.vue # 设置页（含数据管理）
│   ├── public/
│   │   ├── manifest.json     # PWA 清单
│   │   ├── sw.js            # Service Worker
│   │   └── favicon.svg      # 应用图标（便当 emoji）
│   └── vite.config.js        # Vite 配置（Tailwind + 代理）
│
├── server/                    # Express 后端
│   ├── index.js              # 入口（含生产环境静态文件服务）
│   ├── routes/
│   │   ├── foods.js          # 食品 CRUD + 二维码接口
│   │   ├── barcode.js        # 条形码查询接口
│   │   └── auth.js           # 认证接口（登录、注册、资料）
│   ├── lib/
│   │   ├── db.js             # SQLite 数据库层
│   │   ├── jwt.js            # JWT Token 工具
│   │   └── email.js         # Resend 邮件发送
│   └── middleware/
│       └── auth.js           # 认证中间件（必选 / 可选）
│
├── DEVELOPMENT.md             # 开发文档
└── .env.example              # 环境变量模板
```

## 路线图

- [x] MVP：食品 CRUD + 状态计算 + 二维码 + 响应式布局
- [x] P1：认证系统（邮箱验证码 + 密码登录）+ 徽章系统
- [x] P2：设置页重构 + 数据管理（导入/导出）+ PWA 支持
- [ ] P3：条形码识别、分类筛选、临期提醒、批量录入

## 体验使用

欢迎体验 Datelife！如果你也在为食品保质期管理头疼，不妨试试这个工具。

- 在线演示（部署后补充）
- 本地运行请参考上方「快速开始」部分

## 反馈与贡献

Datelife 还在早期阶段，非常欢迎你的反馈和贡献！

- **Bug 反馈** → [提交 Issue](https://github.com/Yuntian-Liu/Datelife/issues)
- **功能建议** → [提交 Issue](https://github.com/Yuntian-Liu/Datelife/issues)
- **代码贡献** → Fork 后提交 PR

## 联系方式

有任何问题或建议，欢迎随时联系：

- **邮箱**：[liuyuntian@ytunx.com](mailto:liuyuntian@ytunx.com)
- **GitHub**：[Yuntian-Liu](https://github.com/Yuntian-Liu)

## 许可证

[MIT](LICENSE)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Yuntian-Liu">Yuntian</a>
</p>
