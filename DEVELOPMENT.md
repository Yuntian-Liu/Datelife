# Datelife 开发文档

## 项目简介

一个用于管理食品保质期的 Web 平台。录入食品的生产日期和保质期，自动计算过期时间并标记状态（正常/临期/过期）。每个食品生成专属二维码，扫码即可查看详情。

## 背景

寝室零食太多，手动贴标签查保质期太麻烦。受无印良品二维码含生产日期的启发，想做数字化管理。

---

## 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 前端框架 | Vue 3 + Vite | Composition API |
| 样式方案 | Tailwind CSS v4 | @theme 自定义主题 |
| 后端 | Node.js + Express v5 | 同步 SQLite 驱动 |
| 数据库 | SQLite (better-sqlite3) | 单文件数据库 |
| 认证 | JWT (jsonwebtoken) | HMAC-SHA256, 30天有效期 |
| 邮件 | Resend API | 验证码发送 |
| 人机验证 | Cloudflare Turnstile | 防止自动化滥用 |
| 头像 | DiceBear API | 种子生成头像 |
| 部署 | Zeabur + 持久化卷 | /app/server/data |

---

## 功能规划

### MVP — 核心功能 ✅ 已完成

- [x] 食品录入：名称 + 生产日期 + 保质期天数 → 自动算过期日期
- [x] 食品列表：展示所有食品，显示状态（正常/临期/过期）
- [x] 状态判断：根据当前日期自动标记
  - 正常：距过期 > 14天
  - 临期：距过期 ≤ 14天
  - 过期：已超过保质期
- [x] 二维码生成：每个食品生成二维码，扫码查看详情页
- [x] 详情页：展示食品完整信息
- [x] 食品编辑/删除

### P1 — 增强功能 ✅ 已完成

- [x] 条形码识别：apibyte.cn API 查询商品名称
- [x] 扫码双模式：条形码（长框+引导线）和二维码（方框）
- [x] 响应式布局优化：
  - 手机端：底部胶囊导航栏 + 中间凸起"+"按钮
  - 电脑端：顶部 Header 导航 + 完整管理面板
- [x] 视觉风格打磨：
  - 草绿色系主色调（Tailwind v4 @theme）
  - 霞鹜文楷 + Nunito 字体
  - 大圆角卡片 + 左侧状态色条 + 轻阴影
  - 极淡绿灰全局背景

### P2 — 认证系统 ✅ 已完成

- [x] 完整登录/注册流程（邮箱验证码 + 密码双模式）
- [x] 用户数据隔离（foods.user_id 关联）
- [x] JWT 鉴权中间件（Bearer Token）
- [x] Cloudflare Turnstile 人机验证
- [x] Resend 邮件发送验证码
- [x] 用户协议 & 隐私政策（注册前必须同意）
- [x] 自动注册提示（未注册邮箱验证通过后自动创建账号）
- [x] PC 端 Header 设置入口（已登录显示头像+设置，未登录显示登录按钮）
- [x] 用户徽章系统（Badge）

### P3 — 锦上添花（部分已完成）

- [x] 条形码识别（v1.1.0-alpha）
- [x] 分类筛选 → 标签系统（v2.6.0-alpha / v2.7.0-alpha）
- [ ] 临期提醒（进入页面时提醒即将过期的食品）
- [ ] 批量录入
- [ ] 食品图片上传

---

## 认证系统设计

### 设计思路

做成大家都能用的产品，需要完整的登录/注册系统。基于 MyScore 成熟方案迁移优化。

### 认证方式

- **邮箱验证码登录** + **密码登录**（双模式）
- Cloudflare Turnstile 人机验证（仅发送验证码时需要）
- Resend API 发送 6 位数字验证码邮件

### 与 MyScore 对比：简化了什么

- 移除：邀请码机制、飞书绑定、内测标记
- 注册流程：5步 → 3步（邮箱 → 验证码 → 昵称+密码）
- 头像：注册时自动生成 DiceBear 头像种子
- 个性签名：移至资料编辑页

### 认证流程

```
输入邮箱 → 发送验证码(需Turnstile) → 输入验证码
  ├─ 已有账号 → 登录成功，返回 token
  └─ 新用户 → 填写昵称+密码 → 注册完成，返回 token
```

### 安全特性

- JWT：HMAC-SHA256 签名，30 天有效期
- 密码加密：scrypt + 16 字节随机盐 + timingSafeEqual
- 频率限制：IP 级别滑动窗口限流（发验证码 3 次/分钟）
- 验证码安全：5 分钟过期 + 最多 5 次尝试错误锁定

### API 路由表

| 方法 | 路径 | 认证 | Turnstile | 功能 |
|---|---|---|---|---|
| POST | `/api/auth/send-code` | 否 | 必须 | 发送验证码 |
| POST | `/api/auth/login-code` | 否 | - | 验证码登录 |
| POST | `/api/auth/login-password` | 否 | - | 密码登录 |
| POST | `/api/auth/register` | 否 | - | 注册（新用户） |
| GET | `/api/auth/profile` | Bearer | - | 获取用户资料 |
| PUT | `/api/auth/profile` | Bearer | - | 更新用户资料 |

### 数据库表设计

#### users 表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | 自增主键 |
| uid | INTEGER UNIQUE | 公开 UID，从 100000 起递增 |
| email | TEXT UNIQUE | 登录邮箱 |
| nickname | TEXT | 昵称 |
| avatar_seed | TEXT | DiceBear 头像种子 |
| bio | TEXT | 个性签名（默认空） |
| password_hash | TEXT | scrypt 哈希值 |
| salt | TEXT | 随机盐 |
| is_admin | INTEGER | 管理员标记（默认 0） |
| **badge** | **TEXT** | **用户徽章标识（见下方 Badge 系统）** |
| created_at / updated_at | TEXT | 时间戳 |

#### verification_codes 表

| 字段 | 类型 | 说明 |
|---|---|---|
| email | TEXT PRIMARY KEY | 邮箱 |
| code | TEXT | 6 位验证码 |
| expires_at | TEXT | 过期时间（5 分钟） |
| attempts | INTEGER | 尝试次数（最多 5 次） |

#### foods 表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PRIMARY KEY | 自增主键 |
| user_id | INTEGER | 所属用户 UID（NULL = 公开数据） |
| name | TEXT NOT NULL | 食品名称 |
| barcode | TEXT | 条形码（可选） |
| produce_date | TEXT NOT NULL | 生产日期 YYYY-MM-DD |
| shelf_life_days | INTEGER NOT NULL | 保质期天数 |
| expire_date | TEXT NOT NULL | 过期日期（自动计算） |
| category | TEXT | 分类（预留） |
| created_at / updated_at | TEXT | 时间戳 |

> **注意**：foods.user_id 允许 NULL，兼容认证系统上线前的历史数据。
> 无 user_id 的食品为公开数据，任何人可通过 `/f/:id` 详情页查看。

---

## 用户徽章 (Badge) 系统

### 设计目的

给特定用户添加纪念性身份标识（如「开发者」「内测」「共创者」），类似各平台的会员/VIP 标签。

### 徽章类型定义

文件位置：`client/src/utils/badges.js`

| badge 值 | 显示文字 | 视觉效果 |
|---|---|---|
| `developer` | 开发者 | 橙金渐变背景 + 白色粗体小字 |
| `early` | 内测 | 绿青渐变背景 + 白色粗体小字 |
| `co_creator` | 共创者 | 紫罗兰渐变背景 + 白色粗体小字 |

视觉效果：微圆角矩形、渐变底色、白色文字、10px 字号、轻微阴影。

### 显示位置

1. **设置页头像卡片**（主展示）：昵称右侧紧跟徽章标签
2. **设置页个人资料显示区**：昵称旁同步显示
3. **底部导航栏头像**：右上角彩色小圆点标记
4. **PC 端 Header 头像**：右上角彩色小圆点标记

### 如何给用户添加/修改徽章（运维操作）

**不需要改代码**，使用 `server/manage.js` 脚本操作数据库：

```bash
# 添加徽章（写操作需要加 --yes）
node server/manage.js "UPDATE users SET badge = 'developer' WHERE uid = 100000" --yes
node server/manage.js "UPDATE users SET badge = 'early' WHERE uid = 100001" --yes
node server/manage.js "UPDATE users SET badge = 'co_creator' WHERE uid = 100002" --yes

# 移除徽章
node server/manage.js "UPDATE users SET badge = NULL WHERE uid = 100000" --yes

# 查看当前所有有徽章的用户（只读，直接执行）
node server/manage.js "SELECT uid, nickname, badge FROM users WHERE badge IS NOT NULL"
```

> **说明**：`server/manage.js` 封装了 better-sqlite3，复用应用自身的 `DATABASE_PATH` 环境变量保证不会连错库，写操作默认预览 + 必须加 `--yes` 才执行。详见下方「数据库管理工具」章节。

### 如何新增徽章类型

1. 编辑 `client/src/utils/badges.js`，在 `BADGES` 对象中添加新的 key：

```js
export const BADGES = {
  // ... 已有的 ...
  vip: {
    label: 'VIP',
    style: 'bg-gradient-to-r from-rose-400 to-pink-400 text-white text-[10px] px-1.5 py-0.5 rounded-sm font-bold tracking-wide shadow-sm',
  },
}
```

2. 在 BottomNav.vue 和 HomeView.vue 的小圆点颜色判断中添加对应分支
3. 用 `node server/manage.js "UPDATE users SET badge = ..." --yes` 给目标用户赋值即可生效

---

## 邀请码 (Invite Code) 系统

### 设计目的

通过环境变量开关 `INVITE_MODE` 控制注册门槛：
- `true`：新用户注册必须输入有效邀请码 + 同意内测协议，否则无法发送验证邮件
- `false`：公开注册，所有邀请码逻辑自动跳过

### 拦截流程

```
新邮箱点击「发送验证码」
  → POST /api/auth/check-email  ← 新增接口
  → 邮件未注册 + INVITE_MODE=true
  → 前端展开邀请码输入区（amber 色卡片）
  → 用户输入邀请码 + 勾选内测协议
  → POST /api/auth/verify-invite  ← 新增接口（仅校验，不消耗）
  → 校验通过 → 自动重新调用 sendCode() 发送邮件
  → 注册完成 → 邀请码标记已用（used_by, used_at, use_count+1）
```

### 数据库表

```sql
CREATE TABLE invite_codes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT UNIQUE NOT NULL,          -- 邀请码
  used_by     INTEGER,                       -- 使用者 UID
  used_at     TEXT,                          -- 使用时间
  expires_at  TEXT,                          -- 过期时间（NULL = 永不过期）
  max_uses    INTEGER DEFAULT 1,             -- 最大使用次数
  use_count   INTEGER DEFAULT 0,             -- 已使用次数
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

### 种子邀请码（首次部署自动写入）

首次启动时表为空，自动插入 5 个一次性邀请码：
- `datelife-alpha-2026`
- `early-bird-2026`
- `inner-test-001` / `inner-test-002` / `inner-test-003`

后续重启/重新部署不会覆盖已有数据。

### 如何新增邀请码（运维操作）

```bash
# 一次性邀请码
node server/manage.js "INSERT INTO invite_codes (code) VALUES ('new-code')" --yes

# 可多次使用的邀请码
node server/manage.js "INSERT INTO invite_codes (code, max_uses) VALUES ('friend-batch-01', 10)" --yes

# 带过期时间的邀请码
node server/manage.js "INSERT INTO invite_codes (code, max_uses, expires_at) VALUES ('temp', 3, '2026-07-01 00:00:00')" --yes

# 查看所有邀请码及使用情况
node server/manage.js "SELECT code, use_count, max_uses, used_by, used_at, expires_at FROM invite_codes"
```

### 相关文件

| 文件 | 说明 |
|------|------|
| `server/lib/db.js:65-124` | `invite_codes` 表创建 + 种子数据插入 |
| `server/routes/auth.js:42-93` | `check-email` / `verify-invite` 接口 |
| `server/routes/auth.js:96-175` | `login-code` / `register` 改造 |
| `client/src/views/LoginView.vue:385-416` | 邀请码输入卡片 + 内测协议勾选 |
| `client/src/utils/betaAgreement.js` | 内测协议 HTML 内容 |
| `client/src/utils/api.js:72-79` | 前端 API 方法 (`checkEmail` / `verifyInvite`) |
| `.env` / `.env.example` | `INVITE_MODE` 开关 |

---

## 数据库管理工具

### `server/manage.js`

Zeabur 容器可能没有 `sqlite3` CLI，提供 Node.js 脚本直接操作 SQLite。

**特点**：
- 复用 `DATABASE_PATH` 环境变量，与生产应用连同一库
- WAL 模式自动启用
- 写操作默认预览（需加 `--yes` 确认）
- DDL（DROP/ALTER）需 `--yes --force` 二次确认
- 结果表格格式化输出

**用法**：
```bash
# 只读查询（直接执行）
node server/manage.js "SELECT * FROM invite_codes"

# 写操作预览（不加 --yes，仅预览）
node server/manage.js "INSERT INTO invite_codes (code) VALUES ('x')"
# → [预览] 即将执行... 加 --yes 确认执行

# 写操作执行（加 --yes）
node server/manage.js "INSERT INTO invite_codes (code) VALUES ('x')" --yes
# → [执行完成] 1 row(s) affected

# DDL 操作（加 --yes --force）
node server/manage.js "DROP TABLE old_table" --yes --force
```

**安全说明**：
- SELECT/PRAGMA 类只读操作无任何限制，直接执行
- INSERT/UPDATE/DELETE 类写操作默认只预览影响行数，不加 `--yes` 不执行
- DROP TABLE/ALTER TABLE 等 DDL 操作需要同时加 `--yes` 和 `--force`，防止误删表结构

---

## 前端设计

### 页面路由与权限

| 路由 | 页面 | 未登录 | 已登录 |
|---|---|---|---|
| `/` | 首页 | 欢迎/引导登录 | 食品列表（管理页） |
| `/login` | 登录页 | 3 步向导（邮箱→验证码→注册） | 重定向到首页 |
| `/f/:id` | 食品详情 | 纯展示 + 小登录按钮 | 展示 + 编辑/删除按钮 |
| `/settings` | 设置页 | 欢迎/引导登录 | 编辑资料 + 协议入口 |

### 二维码设计原则

- 每个食品生成唯一二维码，编码 URL 为 `/f/:id`
- 扫码直达详情页，不经过管理页面
- **核心原则：信息传达优先，不强制登录**
- 未登录：纯展示食品信息 + 不显眼的登录入口
- 已登录：出现编辑按钮（改/删），可管理自己的食品
- 分享给任何人都能看，不设门槛

### 响应式策略

**手机端（< md / 768px）：**
- 底部胶囊导航栏（固定定位）
- 中间凸起圆形 "+" 按钮（添加食品）
- 导航项：首页 + 设置（已登录显示头像）
- 无顶部 Header

**电脑端（≥ md / 768px）：**
- 顶部 sticky Header（品牌名 + 操作按钮）
- 已登录：「+ 添加食品」+ 头像 + 「设置」
- 未登录：「登录 →」（靠右对齐）
- 无底部导航栏

### 视觉风格

- **方向**：可爱温馨（圆角、柔和配色、有温度感）
- **语言**：纯中文界面
- **参考案例**：「有数」App（资产管理类应用）

#### 设计规范

- **主色调**：清新草绿色系（非荧光绿、非 AI 紫蓝渐变），自然不造作
- **背景**：极浅灰白或淡绿渐变（bg-bg），不抢眼
- **卡片**：白色底 + 大圆角(16-20px) + 轻微阴影 + 细边框
- **状态标签**：左侧色条 + 文字标签
  - 绿色（primary）= 正常 / 可食用
  - 黄色（yellow）= 临期
  - 红色（red）= 过期
- **底部导航**：胶囊形容器包裹图标 + 中间凸起圆形"+"按钮
- **字体**：
  - 品牌/标题：霞鹜文楷（LXGW WenKai）— 有温度的中文字体
  - 按钮/标签：Nunito — 轻量圆润无衬线
  - 正文/数字：系统默认 — 清晰易读
- **整体原则**：自然、干净、实用，拒绝矫揉造作的 AI 风

### 用户协议 & 隐私政策

- 文件位置：`client/src/utils/agreement.js`
- 两个 HTML 常量：`USER_AGREEMENT_HTML`（8 节）、`PRIVACY_POLICY_HTML`（10 节）
- 显示方式：Teleport 到 body 的模态弹窗（避免 z-index 问题）
- 触发入口：
  - 登录页 Step 1：协议复选框（必须勾选才能发送验证码）
  - 设置页底部：用户协议 / 隐私政策 链接

---

## 项目结构（当前）

```
Datelife/
├── client/                          # Vue 3 前端
│   ├── src/
│   │   ├── main.js                 # 入口
│   │   ├── App.vue                 # 根组件（provide auth 状态）
│   │   ├── router/index.js         # 路由配置（/, /login, /settings, /f/:id）
│   │   ├── components/
│   │   │   ├── BottomNav.vue       # 底部胶囊导航栏（手机端）
│   │   │   └── TurnstileWidget.vue # Cloudflare Turnstile 组件
│   │   ├── composables/
│   │   │   ├── useAuth.js          # 全局 Auth 状态单例
│   │   │   └── useConfirm.js       # 自定义确认弹窗
│   │   ├── views/
│   │   │   ├── HomeView.vue        # 首页（PC Header + 食品列表）
│   │   │   ├── LoginView.vue       # 登录/注册（3 步向导 + 协议弹窗）
│   │   │   ├── SettingsView.vue    # 设置页（资料编辑 + 协议入口 + 徽章展示）
│   │   │   └── FoodDetail.vue      # 食品详情页
│   │   └── utils/
│   │       ├── api.js              # API 封装（含 auth 方法）
│   │       ├── agreement.js        # 用户协议 + 隐私政策 HTML
│   │       └── badges.js           # 徽章配置表
│   └── package.json
│
├── server/                          # Express 后端
│   ├── index.js                    # 入口（挂载路由）
│   ├── routes/
│   │   ├── foods.js                # 食品 CRUD（含权限控制）
│   │   ├── auth.js                 # 认证路由（6 个端点）
│   │   └── barcode.js              # 条形码查询代理
│   ├── lib/
│   │   ├── db.js                   # SQLite（3 张表 + 自动迁移）
│   │   ├── jwt.js                  # JWT 签发/验证
│   │   ├── email.js                # Resend 邮件发送
│   │   └── qrcode.js               # 二维码生成
│   ├── middleware/
│   │   ├── auth.js                 # Bearer Token 鉴权中间件
│   │   ├── turnstile.js            # Turnstile 验证中间件
│   │   └── rateLimit.js            # 频率限制中间件
│   ├── data/                       # SQLite 数据库文件（持久化卷挂载点）
│   └── package.json
│
├── .env                             # 环境变量（JWT_SECRET, RESEND_API_KEY 等）
├── DEVELOPMENT.md                  # 开发文档（本文档）
├── RELEASE_SOP.md                  # 发版标准操作流程
├── CHANGELOG.md / CHANGELOG.zh-CN.md
└── README.md / README.zh-CN.md
```

---

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `PORT` | 否 | 服务端口（默认 3000） |
| `DATABASE_PATH` | 否 | SQLite 数据库路径（默认 server/data/datelife.db） |
| `JWT_SECRET` | **必填** | JWT 签名密钥（64 位随机 hex） |
| `RESEND_API_KEY` | **必填** | Resend 邮件 API 密钥 |
| `TURNSTILE_SITE_KEY` | **必填** | Turnstile 前端站点密钥 |
| `TURNSTILE_SECRET_KEY` | **必填** | Turnstile 后端验证密钥 |

---

## 部署说明

### Zeabur 配置

- **持久化卷**：挂载路径 `/app/server/data`（存储 SQLite 数据库）
- **域名**：需要绑定真实域名（Turnstile 校验域名绑定）
- **环境变量**：在 Zeabur 控制台配置上述必填变量

### 本地开发

```bash
# 终端 1：启动后端
cd server && node index.js

# 终端 2：启动前端
cd client && npm run dev
```

> 注意：Turnstile 在 localhost 下无法通过验证，需部署到正式域名测试完整认证流程。

---

## 开发日志

### 2026-05-18

- 项目立项，确定技术栈和功能规划
- 技术栈确定：Vue 3 + Vite + Tailwind CSS v4 + Express + SQLite(better-sqlite3)
- 样式方案确定：Tailwind CSS v4（@theme 自定义主题）
- 前端设计流程：先出页面原型 → 确认风格 → 再动手写
- 核心需求明确：食品录入、状态管理、二维码、条形码
- GitHub 仓库创建：https://github.com/Yuntian-Liu/Datelife
- 认证系统方案确定：基于 MyScore 迁移优化，邮箱验证码+密码双模式
- **开发策略调整**：MVP 优先，认证系统延后到 P2 阶段
- SQLite 选择确认：better-sqlite3 零配置，单文件数据库
- **v1.0.0-alpha 发布**：核心食品管理功能 + 二维码 + 响应式双视图
- **v1.1.0-alpha 发布**：条形码扫描识别（apibyte.cn API）
- **v1.2.0-alpha 发布**：扫码双模式 + 自定义确认弹窗 + HTTPS 支持
- **v1.2.1-alpha 发布**：手机扫码框尺寸优化

### 2026-05-19

- **v1.2.2-alpha 发布**：扫码框高度调整
- **v1.3.0-alpha 发布**：视觉大升级 — 底部导航 + 字体 + 草绿主题
- **v2.0.0-alpha 发布**：认证系统 + 徽章系统 + 协议政策 + 开发文档重写
- **认证系统完整实现**（P2 全部完成）：
  - 后端：users / verification_codes 表、JWT 签发、scrypt 密码加密
  - 后端：6 个认证 API 端点（send-code / login-code / login-password / register / profile）
  - 后端：3 个中间件（auth 鉴权 / Turnstile 验证 / 频率限制）
  - 后端：Resend 邮件发送（HTML 模板，绿色主题匹配 App）
  - 后端：foods 路由权限改造（user_id 隔离 + 公开详情页）
  - 前端：useAuth 全局状态单例 + Bearer Token 自动附加
  - 前端：LoginView 3 步向导（邮箱→验证码→注册）
  - 前端：TurnstileWidget 动态加载组件
  - 前端：SettingsView 双态（未登录欢迎 / 已登录资料编辑）
- **用户协议 & 隐私政策**：
  - 新建 agreement.js（用户协议 8 节 + 隐私政策 10 节）
  - 登录页：自动注册提示 + 协议复选框（gate 发送按钮）
  - 登录页/设置页：Teleport 弹窗展示协议内容
- **PC 端导航修复**：
  - HomeView Header 增加：已登录「+添加」+头像设置 / 未登录「登录→」
  - 登录按钮 ml-auto 靠右对齐
  - inject 补充 user 解构（修复头像不显示 bug）
- **用户徽章 (Badge) 系统**：
  - users 表新增 badge 字段（ALTER TABLE 兼容迁移）
  - 新建 badges.js 徽章配置（开发者/内测/共创者）
  - 设置页昵称旁显示渐变色徽章标签
  - 底部导航 + PC Header 头像右上角小圆点标记
  - 运维操作：SQL 一条命令即可给任意用户添加/修改/移除徽章
- **Zeabur 持久化卷配置完成**：挂载路径 /app/server/data

### 2026-05-20

- **v2.1.0-alpha 发布**：设置页重构 + 数据管理 + PWA 支持
- **v2.1.1-alpha 发布**：
  - 修复 PC 端登录后导航栏按钮靠左问题（ml-auto）
  - 新增全屏开发水印组件（Watermark.vue + SVG Data URI 平铺）
  - 新增 client/.env 前端环境变量支持（VITE_ENABLE_WATERMARK 开关）
- **v2.1.2-alpha 发布**：
  - 注册流程升级为 5 步向导（头像选择 + 个性签名 + 成功页）
  - 头像风格从 thumbs 切换为 lorelei
  - 开发模式自动跳过 Turnstile 和邮件发送
- **v2.1.3-alpha 发布**：
  - 设置页交互重构 — 去内联编辑，新增编辑资料二级页面
  - 头像修改功能 — 9 宫格选择器
  - 修复 localStorage 同步 bug
- **v2.1.4-alpha 发布**：
  - 品牌字体切换（Playfair Display + Noto Serif SC）
  - 设置页去 Header，导航栏扩展
- **v2.1.5-alpha 发布**：
  - PC 端返回按钮 + scrollbar-gutter 修复导航栏跳动
- **v2.5.0-alpha 发布**：全屏扫码 + 二维码批量打印 + 底部导航 + 诊断日志
  - 全屏扫码页（ScanView）：摄像头不再嵌入表单
  - 二维码批量打印页（QRCodesView）
  - 5 标签底部导航：首页 / 食品 / 二维码 / 扫码 / 设置
  - 桌面端导航栏（DesktopHeader）
  - 诊断日志系统：API 调用追踪、路由追踪、一键导出
  - 保质期单位切换：天/周/月
  - 首页重新设计为仪表盘：统计卡片 + 临期列表 + 快捷入口
  - 扫码页 UI 精调、自动恢复表单、超时提醒
- **v2.5.1-alpha 发布**：
  - 修复二维码扫码取景框正方形比例，居中显示
- **v2.5.2-alpha 发布**：
  - 修复设置页版本号不显示（__APP_VERSION__ 暴露给 Vue 模板）
- **v2.5.3-alpha 发布**：
  - 修复扫码页摄像头视频不充满容器（黑边）
  - 二维码取景框恢复正方形
  - 条形码取景框改为宽矩形
  - aspectRatio 改为根据屏幕实际比例动态计算
- **v2.5.4-alpha 发布**：
  - 修复扫码页摄像头异常放大（移除 object-fit: cover CSS）
  - 条形码取景框宽度加倍
- **v2.6.0-alpha 发布**：标签系统 + 首页改造 + 二维码彩色
  - 标签管理系统完善：录入彩色胶囊选择 + 已有标签补全 + 全局 8 标签上限
  - 标签筛选栏 + 标签管理页（全局删除 API + 前端管理界面）
  - 食品详情页彩色标签胶囊展示
  - 首页双栏改造：临期+已过期并排，删除快捷入口卡片，一屏展示
  - 二维码根据食品状态变颜色：绿/黄/红 + 卡片显示彩色剩余天数
  - 多处 Bug 修复：计数器全局化、computed 性能优化、Teleport 弹窗、ref 解包
### 2026-05-21

- **v2.7.0-alpha 发布**：标签持久化系统 + 排序切换 + 关于详情页 + 移动端优化 + 诊断日志全覆盖
  - 标签持久化：独立 `tags` 表 + INSERT OR IGNORE 幂等同步，移除食品标签不会全局删除
  - 标签管理页：8 标签上限 + 计数器 + POST /api/foods/tags 新建 API
  - 排序切换：搜索框旁胶囊形排序器（时钟图标=添加时间 / 红黄绿三圆点=到期紧急）
  - 关于详情页：二级弹窗（开发者 → GitHub → 反馈 → 版本日志三级弹窗 → 开发声明）
  - 食品详情页改为只读模式，移除编辑/删除按钮（统一从列表页管理）
  - 移动端全面优化：二维码卡片 3 位数字 + 筛选栏三字换行 + 卡片两行布局 + 标签面板右对齐
  - 搜索框改为胶囊形 + 排序切换器视觉统一
  - 条形码扫描器性能优化（FPS 降低 + 移除实验性 BarcodeDetector）
  - 诊断日志全覆盖：标签、排序、扫码、导出、资料编辑
  - 用户协议 & 隐私政策更新：标签持久化、诊断日志声明
  - 发版 SOP 扩展：新增 4 项发版前检查（日志/协议/版本日志/数据兼容）

- **v2.7.1-alpha 发布**：协议排版优化 + 文档更新
  - 用户协议排版优化：功能列表改 `<ul>`、账号安全拆列表、数据管理操作分段
  - 隐私政策排版优化：诊断日志拆 3 段 + 修复第七节 HTML 闭合标签 bug
  - README 路线图 P3 更新（勾选条形码识别+标签系统）+ 补充在线演示链接
  - 协议最后更新日期刷新至 2026-05-21
  - 版本日志弹窗重构：新增 `changelog.js` 独立数据文件（21 个版本完整日志）
  - 下拉选择器按 minor 分组 + 折叠/展开 + 固定 300px 高度上限
  - 内容区动态渲染，选中版本即时切换

- **v2.8.0-alpha 发布**：邀请码注册 + 徽章 UI 重构 + 数据库管理工具
  - 邀请码注册系统（P4）：
    - `INVITE_MODE` 环境变量开关，5 个种子邀请码（datelife-alpha-2026 等）
    - 新增 `check-email` / `verify-invite` 两个 API 端点
    - 发送邮件前拦截校验 → 省钱（Resend API 按发送计费）
    - 登录页邀请码输入卡片（amber 配色）+ 内测协议勾选
  - 内测协议（Beta Agreement）：
    - 新建 `client/src/utils/betaAgreement.js`，5 节独立 HTML 文档
    - 邀请码输入区内联展示 + 勾选确认
  - 数据库管理工具：
    - 新建 `server/manage.js`，Node.js + better-sqlite3 直接操作 SQLite
    - 写操作需 `--yes` 确认，DDL 需 `--yes --force` 二次确认
    - 复用 `DATABASE_PATH` 环境变量防止连错库
  - 徽章系统 UI 重构：
    - 圆点标记 → 渐变光环边框（3 处头像位置统一：首页 Header、底部导航、设置页）
  - 登录页 Tab 切换器：验证码登录 / 密码登录平滑切换 + URL query 参数同步
  - 开发文档大更新：
    - 新增「邀请码系统」完整章节（表结构、拦截流程、运维命令）
    - 新增「数据库管理工具」章节
    - 徽章运维操作更新为 manage.js 方式
  - 用户协议 & 隐私政策更新：邀请码注册说明 + 邀请码数据收集声明
  - 诊断日志新增 `userBadge` 字段
  - Bug 修复：
    - 邀请码验证 SQL 中 `datetime("now")` 双引号错误（改为单引号 + JS 双引号）
    - `LoginView.vue` 邀请码区域模板嵌套错误
    - `betaAgreement.js` 模板字面量末尾重复反引号

- **v2.8.1-alpha 发布**：鸿蒙/荣耀浏览器兼容 + 移动端交互修复
  - 鸿蒙/荣耀系统浏览器 Vue 渲染崩溃：build target 降级至 es2015（`client/vite.config.js`）
  - 移动端标签管理页删除按钮不可见：hover 依赖的 `opacity-0 group-hover:opacity-100` 改为 `opacity-100 md:opacity-0 md:group-hover:opacity-100`
  - 移动端添加食品页标签上限信息图标无法点击：触控区域 16px → 44px（`p-2`），`right-2.5` → `right-1` 补偿间距
  - 邀请码种子数据更新：除已使用的 `datelife-alpha-2026` 外，其余 10 个改为随机 6 位字母数字组合（`INSERT OR IGNORE` 幂等）

### 2026-05-22

- **v2.8.2-alpha 发布**：二维码 PDF 打印 + 筛选状态持久化
  - 二维码 PDF 打印：`jspdf` 前端生成，Canvas 合成卡片（彩色 QR + 数字 + 名称 + 日期），A4 五列网格排版（30 个/页），品牌标题 + 斜铺水印，多页自动分页
  - 食品管理筛选状态持久化：筛选/标签/搜索/排序写入 URL query，组件初始化从 URL 恢复，返回页面不丢失，底部导航重置筛选
  - PDF 生成诊断日志：进度分批上报 + 总耗时记录
  - 修复 SettingsView 版本日志弹窗默认选中旧版本（`selectedChangelog` 硬编码 v2.8.1）
  - SW 缓存名更新为 `datelife-v282a`

- **v2.9.0-alpha 发布**：食品库存管理 + 独立表单页 + 性能优化 + 版本更新提醒
  - 食品库存管理：quantity 列迁移，支持设置数量，「吃掉一件」按钮（Pac-Man 图标，署名 Royyan Wijaya），最后一件确认删除，Toast 液态玻璃风格居中
  - 添加/编辑食品独立路由页面：`FoodForm.vue` 从 `FoodsView.vue` 剥离，路由 `/foods/add`、`/foods/edit/:id`，扫码结果直达新增页
  - 数据导入标签冲突处理：导入时检测标签上限（8 个），弹窗支持选择性保留/放弃标签或去标签导入
  - 版本更新提醒：`App.vue` 中 `checkVersionUpdate()` 检测 localStorage 版本号，发版后首次打开弹窗展示 changelog
  - 路由懒加载：所有页面组件改为 `() => import(...)` 动态导入，Vite 自动拆分 chunk
  - keep-alive 组件缓存：`App.vue` 中 `<router-view>` 包裹 `<keep-alive>`，页面切换不销毁不重载
  - 关于页面重构：MIT 开源声明独立三级页面（`showOpenSource`），含许可证说明 + 开源资源致谢
  - PDF 二维码打印优化：水印移至最上层不遮挡二维码，页码 canvas 渲染避免字体兼容问题，失败卡片自动跳过
  - 诊断日志增强：`getSystemInfo()` 新增 `devicePixelRatio`、`maxTouchPoints`、`reducedMotion`，API 日志带摘要，SW/条码错误日志完善
  - 标签颜色分配防死循环保护：`while (used.includes(color))` 增加 `used.length < TAG_COLORS.length` 条件
  - SW 缓存名更新为 `datelife-v290a`
  - 版本号统一：`client/package.json`、`server/package.json`、README 徽章 → `2.9.0-alpha`
  - CHANGELOG.md / CHANGELOG.zh-CN.md 添加 v2.9.0-alpha 条目

- **v2.9.1-alpha 发布**：Toast 两行优化 + keep-alive 数据刷新 + SW 缓存更新
  - Toast 提示拆为两行显示，食品名过长时 `break-all` 自动换行，`max-w-[90vw] sm:max-w-sm` 防止撑满屏幕
  - keep-alive 缓存导致页面切换后数据不刷新：4 个主要页面（FoodsView / HomeView / QRCodesView / TagManageView）新增 `onActivated` 数据重载
  - Service Worker 缓存名更新至 `datelife-v291a`
  - 版本号统一：`client/package.json`、`server/package.json`、README 徽章 → `2.9.1-alpha`
  - **首次实践「用户/开发者双轨版本日志」策略**（见下方独立章节）

- **v2.9.2-alpha 发布**：路由加载过渡 + FoodDetail watch 修复
  - 路由加载过渡：新增 `RouteLoading.vue`，顶部 2.5px 绿色渐变滑动进度条（300ms 延迟），1.5s 后叠加液态玻璃温馨提示卡片（「稍等片刻」品牌字体标题 + 🍱 Datelife 正在为你准备页面...）
  - 进度条和卡片均有淡入淡出过渡动画，`keep-alive` 缓存命中时完全不显示（<300ms 即完成）
  - `App.vue` 中注册 `router.beforeEach` / `router.afterEach` 导航守卫，管理 loading 和 message 两个 timer
  - 修复 `FoodDetail.vue` watch `route.params.id` 在返回列表时 id 变 `undefined` 触发 `/foods/undefined` 404 请求（加 `if (id)` 判空）
  - 修正 `DEVELOPMENT.md` 双轨策略文档：`CHANGELOG.md` / `CHANGELOG.zh-CN.md` 均为开发者向（GitHub 公开），仅 `changelog.js` 为用户向
  - SW 缓存名更新为 `datelife-v292a`
  - 版本号统一：`client/package.json`、`server/package.json`、README 徽章 → `2.9.2-alpha`

- **v2.9.3-alpha 发布**：后台预加载 + FoodForm keep-alive 修复
  - 后台预加载：`App.vue` `onMounted` 中 3 秒后 `import()` 预载 QRCodesView (406KB)、ScanView (374KB)、SettingsView (41KB)，用户点到时秒开
  - 修复 `FoodForm.vue` keep-alive 导致的两个 bug：
    - 连续添加食品时表单不清空（缓存复用不触发 `onMounted`）
    - 编辑按钮跳到新增页（add/edit 共用组件，`editing` 未重新判断）
  - 修复方式：`onMounted` 初始化逻辑抽成 `initForm()`，同时加 `onActivated(initForm)`，每次从缓存恢复时重新判断新增/编辑模式
  - 用户向 changelog 新增「页面预加载优化」条目（属于特意优化的功能，可展示给用户）
  - SW 缓存名更新为 `datelife-v293a`
  - 版本号统一：`client/package.json`、`server/package.json`、README 徽章 → `2.9.3-alpha`

### 2026-05-23

- **v2.9.4-alpha 发布**：ScanView keep-alive 修复
  - 修复 `ScanView.vue` keep-alive 缓存导致扫码黑屏/模式错乱：
    - 离开扫码页时 `onDeactivated` 停摄像头、清扫描器实例
    - 返回扫码页时 `onActivated` 重新读取 `route.query.mode`、重新初始化扫描器
    - `mode` 从 `const` 改为 `ref`（`currentMode`），支持动态切换
  - SW 缓存名更新为 `datelife-v294a`
  - 版本号统一：`client/package.json`、`server/package.json`、README 徽章 → `2.9.4-alpha`

- **v2.9.5-alpha 发布**：keep-alive 双重初始化修复
  - 核心问题：keep-alive 首次挂载时 `onMounted` + `onActivated` 同时触发，导致双重初始化
  - 修复 `HomeView.vue`：`loadHome()` 加 `initLock` 防重入，消除首页数据双重请求
  - 修复 `FoodForm.vue`：`initForm()` 开头同步调用 `resetForm()`，消除 keep-alive 恢复时的旧数据闪烁
  - 修复 `ScanView.vue`：`initScan()` 加 `initLock` 防重入，消除首次打开时两个摄像头实例叠加导致的画面分裂
  - SW 缓存名更新为 `datelife-v295a`
  - 版本号统一：`client/package.json`、`server/package.json`、README 徽章 → `2.9.5-alpha`

- **v2.9.6-alpha 发布**：ScanView 变量引用错误修复
  - 修复 `ScanView.vue`：v2.9.4 将模块级 `const mode` 改为 `currentMode` ref 后，`onScanSuccess`（第 80 行）和 `startTimeoutTimer` 的 setTimeout 回调（第 96 行）仍引用不存在的 `mode` 变量
  - 两个回调执行时抛出 ReferenceError 崩溃：
    - `onScanSuccess` 崩溃 → `router.push` 未执行，扫码成功但无法跳转
    - setTimeout 回调崩溃 → `showTimeoutHint.value = true` 未执行，超时提示不弹窗
  - 修复方式：`{ mode }` → `{ mode: currentMode.value }`
  - SW 缓存名更新为 `datelife-v296a`
  - 版本号统一：`client/package.json`、`server/package.json`、README 徽章 → `2.9.6-alpha`

### 2026-05-24

- **v2.9.7-alpha 发布**：扫码链路修复 + UUID 迁移 + 手动条形码 + keep-alive 全面加固
  - **根因分析 — 扫码无响应**：`FoodForm.vue` 的 `initForm()` 中 `route.query.scanResult` 在多个 `await` 之后读取，Vue Router 在异步间隙中已将 query 清空（因为扫码页 `router.push` 带了 query 参数，组件挂载后 Router 内部会做清理），导致 `pendingScanResult` 为 null，`handleScanResult()` 从不执行
    - 修复：在 `initForm()` 第一行同步捕获 `const pendingScanResult = route.query.scanResult || null`，传参给 `handleScanResult(result)` 而非让函数内部再读 `route.query`
  - **根因分析 — 页面卡死**：添加 `watch(() => route.fullPath, () => initForm())` 处理 add/edit 同组件复用后，忘记在 import 语句中加入 `watch`，导致 setup 阶段 ReferenceError → 整个组件崩溃
  - **UUID 跨账号迁移系统**：
    - 问题：旧二维码编码数据库自增 ID (`/f/123`)，导入新账号后 ID 对应不同食品
    - 方案：每个食品生成 8 位短唯一 ID（字符集排除 o/0/l/1），QR 码改编 `/u/{uuid}`
    - 服务端：`db.js` 新增 `uuid` 列 + 唯一索引 + 启动时回填空值；`foods.js` POST 接受可选 `uuid` 字段；新增 `GET /by-uuid/:url` 公开端点
    - 前端：`FoodDetail.vue` 按路径前缀判断加载模式；`api.js` 新增 `getByUuid()` 方法；路由新增 `/u/:uuid`
    - 向后兼容：`handleScanResult()` 同时匹配 `/f/:id` 和 `/u/:uuid` 两种格式
  - **手动输入条形码**：`FoodForm.vue` 名称输入框旁新增铅笔图标按钮 → 弹窗输入 8-13 位条形码 → 调用已有 `barcode.lookup()` API → 自动填充名称
  - **keep-alive 全面加固**：
    - `App.vue` 白名单从无条件缓存改为显式 include 5 组件（排除 FoodForm/LoginView/FoodDetail）
    - 5 个缓存页面统一加 `defineOptions({ name })` + `initLock` 防重入模式
    - `SettingsView.vue` 新增 `onActivated(refreshFoodCount)` 解决返回时食品数量过期
    - `LoginView.vue` 新增 `onBeforeUnmount(clearInterval(timer))` 修复定时器泄漏
  - **超时弹窗优化**：`timeoutReminded` 标志位控制仅提醒一次；文案按 currentMode 区分（条形码→提示手动输入，二维码→提示继续）
  - SW 缓存名更新为 `datelife-v297a`
  - 版本号统一：`client/package.json`、`server/package.json`、README 徽章 → `2.9.7-alpha`
  - **停止双轨策略**：用户确认旧版本已覆盖完毕，changelog.js 只写本次真实改动

---

## 用户/开发者双轨版本日志策略

### 背景

当一个小版本（如 patch）只有少量修复、没有重磅新功能时，如果直接把真实改动推给用户，「版本更新提醒」弹窗会显得很寒酸——用户看到只有两三条修复，体验不好。但如果不升版本号，SW 缓存、CDN 缓存又无法刷新。

### 核心思路

**用户看到的 changelog 和开发者看到的 changelog 分开维护：**

| 受众 | 文件 | 内容策略 |
|------|------|----------|
| 用户 | `changelog.js`（决定弹窗内容和设置页版本日志） | 复制上一版用户向条目，末尾加一条模糊的「修复了一些体验问题」 |
| 开发者 | `CHANGELOG.md` / `CHANGELOG.zh-CN.md` | 写真实的技术改动（GitHub 上公开可见） |
| 开发者 | `DEVELOPMENT.md` | 写真实的开发日志 |

### 操作步骤

以 v2.9.1-alpha 为例（上一版是 v2.9.0-alpha）：

1. **`client/src/utils/changelog.js`**（唯一用户向文件）
   - 复制 `v2.9.0-alpha` 的全部条目
   - 在 `v2.9.1-alpha` 的 `sections` 中，复制 v2.9.0 的「新增」「优化」等章节
   - 末尾加一个「修复」章节，写一条模糊的 `修复了一些体验问题`
   - `changelogVersions` 数组头部插入 `'v2.9.1-alpha'`

2. **`CHANGELOG.md` / `CHANGELOG.zh-CN.md`**（开发者向，GitHub 公开）
   - 写真实的技术改动，按「Added / Changed / Fixed」分类
   - 例如：`Fixed: Toast overflow on mobile, keep-alive onActivated hooks, SW cache bump`

4. **`DEVELOPMENT.md`**
   - 在开发日志中写真实改动，标注「采用双轨策略」

5. **版本号更新**（无论大小版本都要做）
   - `client/package.json` → `version`
   - `server/package.json` → `version`
   - `README.md` / `README.zh-CN.md` → 徽章版本号
   - `client/public/sw.js` → `CACHE_NAME`
   - `client/src/views/SettingsView.vue` → `selectedChangelog` 默认值

### 适用场景

- Patch 版本，改动 ≤ 3 项，没有新增功能
- 为了刷新 SW 缓存或 CDN 缓存必须升版本号
- 不想让用户觉得「更新弹窗大材小用」

不适用：Major/Minor 版本有新功能时，正常写完整版本日志即可。
