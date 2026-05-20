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

### P3 — 锦上添花（待开发）

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

### 如何给用户添加/修改徽章

**不需要改代码**，直接在 Zeabur 终端或数据库管理工具执行 SQL：

```sql
-- 添加徽章
UPDATE users SET badge = 'developer' WHERE uid = 100000;
UPDATE users SET badge = 'early' WHERE uid = 100001;
UPDATE users SET badge = 'co_creator' WHERE uid = 100002;

-- 移除徽章
UPDATE users SET badge = NULL WHERE uid = 100000;

-- 查看当前所有有徽章的用户
SELECT uid, nickname, badge FROM users WHERE badge IS NOT NULL;
```

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
3. 用 SQL 给目标用户赋值即可生效

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
- **v1.2.2-alpha 发布**：扫码框高度调整
- **v1.3.0-alpha 发布**：视觉大升级 — 底部导航 + 字体 + 草绿主题

### 2026-05-19

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
- **v2.1.5-alpha 发布**：
  - PC 端返回按钮 + scrollbar-gutter 修复导航栏跳动
- **v2.1.4-alpha 发布**：
  - 品牌字体切换（Playfair Display + Noto Serif SC）
  - 设置页去 Header，导航栏扩展
- **v2.1.3-alpha 发布**：
  - 设置页交互重构 — 去内联编辑，新增编辑资料二级页面
  - 头像修改功能 — 9 宫格选择器
  - 修复 localStorage 同步 bug
- **v2.1.2-alpha 发布**：
  - 注册流程升级为 5 步向导（头像选择 + 个性签名 + 成功页）
  - 头像风格从 thumbs 切换为 lorelei
  - 开发模式自动跳过 Turnstile 和邮件发送
- **v2.1.1-alpha 发布**：
  - 修复 PC 端登录后导航栏按钮靠左问题（ml-auto）
  - 新增全屏开发水印组件（Watermark.vue + SVG Data URI 平铺）
  - 新增 client/.env 前端环境变量支持（VITE_ENABLE_WATERMARK 开关）
