# Datelife - 食品日期管理平台

## 项目简介

一个用于管理食品保质期的 Web 平台。录入食品的生产日期和保质期，自动计算过期时间并标记状态（正常/临期/过期）。每个食品生成专属二维码，扫码即可查看详情。

## 背景

寝室零食太多，手动贴标签查保质期太麻烦。受无印良品二维码含生产日期的启发，想做数字化管理。

## 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 前端框架 | Vue 3 + Vite | 首次使用 Vue，学习为主 |
| 样式方案 | Tailwind CSS | 原子化 CSS，自由度高，搭配 Vue 使用 |
| 后端 | Node.js + Express | 熟悉的方案 |
| 数据库 | SQLite (better-sqlite3) | 新尝试，替代 JSON 存储 |
| 部署 | Zeabur | 熟悉的部署平台 |

## 功能规划

### MVP — 核心功能（第一阶段，优先完成）

> **开发策略**：先跑通最小可用版本，确认核心逻辑无误后再叠加其他功能。认证系统等复杂后端功能延后，避免初期复杂度过高。

- [ ] 食品录入：名称 + 生产日期 + 保质期天数 → 自动算过期日期
- [ ] 食品列表：展示所有食品，显示状态（正常/临期/过期）
- [ ] 状态判断：根据当前日期自动标记
  - 正常：距过期 > 14天
  - 临期：距过期 ≤ 14天
  - 过期：已超过保质期
- [ ] 二维码生成：每个食品生成二维码，扫码查看详情页
- [ ] 详情页：展示食品完整信息（名称、生产日期、保质期、过期日期、状态）
- [ ] 食品编辑/删除

### P1 — 增强功能（MVP 跑通后再加）

- [ ] 条形码识别：通过 Open Food Facts API，扫描条形码自动获取食品名称
- [ ] 响应式布局优化：手机扫码为主 + 电脑管理面板
- [ ] 食品分类筛选 / 排序
- [ ] 视觉风格打磨（草绿色调、圆角卡片、温馨感）

### P2 — 认证系统（核心体验验证后接入）

- [ ] 完整登录/注册流程（邮箱验证码 + 密码双模式）
- [ ] foods 表增加 user_id 字段，用户数据隔离
- [ ] JWT 鉴权中间件
- [ ] Cloudflare Turnstile 人机验证
- [ ] Resend 邮件发送验证码

### P3 — 锦上添花（时间允许）

- [ ] 临期提醒（进入页面时提醒即将过期的食品）
- [ ] 批量录入
- [ ] 食品图片上传

## 认证系统设计

### 设计思路
做成大家都能用的产品，需要完整的登录/注册系统。基于 MyScore 已成熟方案迁移优化。

### 认证方式
- **邮箱验证码登录** + **密码登录**（双模式）
- Cloudflare Turnstile 人机验证（仅发送验证码时）
- Resend API 发送 6 位数字验证码邮件

### 与 MyScore 对比：简化了什么
- 移除：邀请码机制、飞书绑定、内测标记
- 注册流程：5步 → 3步（邮箱 → 验证码 → 昵称+密码）
- 头像：注册时用默认值，后续可改
- 个性签名：移至资料编辑页

### 认证流程
```
输入邮箱 → 发送验证码(需Turnstile) → 输入验证码
  ├─ 已有账号 → 登录成功，返回 token
  └─ 新用户 → 填写昵称+密码 → 注册完成，返回 token
```

### 安全特性（从 MyScore 复用）
- JWT：自研 HMAC-SHA256，30天有效期
- 密码加密：scrypt + 16字节随机盐 + timingSafeEqual
- 频率限制：IP+路径滑动窗口限流（发验证码3次/分钟）
- 验证码安全：5分钟过期 + 最多5次尝试

### API 路由

| 方法 | 路径 | 认证 | Turnstile | 功能 |
|---|---|---|---|---|
| POST | `/api/auth/send-code` | 否 | 必须 | 发送验证码 |
| POST | `/api/auth/login-code` | 否 | - | 验证码登录 |
| POST | `/api/auth/login-password` | 否 | - | 密码登录 |
| POST | `/api/auth/register` | 否 | - | 注册 |
| GET | `/api/auth/profile` | Bearer | - | 获取/更新用户资料 |
| PUT | `/api/auth/profile` | Bearer | - | 更新用户资料 |

### users 表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | 自增主键 |
| uid | INTEGER UNIQUE | 公开 UID，从100000起 |
| email | TEXT UNIQUE | 登录邮箱 |
| nickname | TEXT | 昵称 |
| avatar_seed | TEXT | DiceBear 头像种子 |
| bio | TEXT | 个性签名 |
| password_hash | TEXT | scrypt 哈希值 |
| salt | TEXT | 随机盐 |
| is_admin | INTEGER | 管理员标记 |
| created_at / updated_at | TEXT | 时间戳 |

### verification_codes 表

| 字段 | 类型 | 说明 |
|---|---|---|
| email | TEXT PRIMARY KEY | 邮箱 |
| code | TEXT | 6位验证码 |
| expires_at | TEXT | 过期时间(5分钟) |
| attempts | INTEGER | 尝试次数(最多5次) |

## 前端设计

### 页面路由与权限

| 路由 | 页面 | 未登录 | 已登录 |
|---|---|---|---|
| `/` | 首页 | 引导登录（轻量） | 食品列表（管理页） |
| `/f/:id` | 食品详情 | 纯展示+小登录按钮 | 展示+编辑按钮（改/删） |
| `/settings` | 设置页 | - | 编辑资料 |

### 二维码设计
- 每个食品生成唯一二维码，编码 URL 为 `/f/:id`（如 `datelife.com/f/abc123`）
- 扫码直接进入该食品详情页，不经过管理页面
- **核心原则：信息传达优先，不强制登录**
- 未登录：纯展示食品信息 + 不显眼的登录入口
- 登录后：出现编辑按钮（改/删），可管理自己的食品
- 分享给任何人都能看，不设门槛

### 响应式策略
- 手机端：扫码查看为主 + 紧凑录入界面
- 电脑端：完整管理面板 + 批量操作
- 基于 MyScore 的响应式实践经验优化

### 视觉风格
- **方向**：可爱温馨（圆角、柔和配色、有温度感）
- **语言**：纯中文界面
- **参考案例**：「有数」App（资产管理类应用）

#### 设计语言提取（来自参考图）
- **主色调**：清新草绿色系（非荧光绿、非 AI 紫蓝渐变），自然不造作
- **背景**：极浅灰白或淡绿渐变，不抢眼
- **卡片**：白色底 + 大圆角(16-20px) + 轻微阴影
- **状态标签**：小圆点 + 文字标签，克制简洁
  - 绿色 = 正常 / 可食用
  - 黄色/橙色 = 临期
  - 红色 = 过期
- **底部导航**：胶囊形容器包裹图标 + 右下角悬浮圆形"+"按钮（录入食品）
- **筛选/分类**：横向滚动圆角标签组
- **列表项**：左侧缩略图/图标 + 名称 + 关键信息 + 右侧状态标签
- **设置页**：彩色图标 + 分组卡片 + 开关/箭头
- **字体**：
  - 标题/品牌名：使用有特色的圆润感中文字体（非普通黑体），如站酷快乐体/霞鹜文楷/思源圆体
  - 按钮/标签：轻量圆润无衬线（如 Nunito / Quicksand）
  - 正文/数字：保持清晰易读即可
  - 原则：品牌和交互元素有辨识度，正文不抢戏
- **整体原则**：自然、干净、实用，拒绝矫揉造作的渐变色和 AI 风

## 数据库设计

### foods 表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PRIMARY KEY | 自增主键 |
| user_id | INTEGER | 所属用户（外键关联 users.id） |
| name | TEXT NOT NULL | 食品名称 |
| barcode | TEXT | 条形码（可选） |
| produce_date | TEXT NOT NULL | 生产日期 YYYY-MM-DD |
| shelf_life_days | INTEGER NOT NULL | 保质期天数 |
| expire_date | TEXT NOT NULL | 过期日期（自动计算） |
| category | TEXT | 分类（可选） |
| created_at | TEXT | 录入时间 |
| updated_at | TEXT | 更新时间 |

## 项目结构

### MVP 阶段结构（先搭这个）

```
Datelife/
├── client/                      # Vue 3 前端
│   ├── src/
│   │   ├── main.js
│   │   ├── App.vue
│   │   ├── router/index.js     # 路由配置
│   │   ├── components/
│   │   │   ├── FoodCard.vue    # 食品卡片
│   │   │   ├── FoodForm.vue    # 录入/编辑表单
│   │   │   └── QRCodeDisplay.vue  # 二维码展示
│   │   ├── views/
│   │   │   ├── HomeView.vue    # 首页（食品列表）
│   │   │   └── FoodDetail.vue  # 详情页 /f/:id
│   │   └── utils/api.js        # API 封装
│
├── server/                      # Express 后端
│   ├── index.js                # 入口
│   ├── routes/foods.js         # 食品 CRUD 路由
│   └── lib/
│       ├── db.js               # SQLite 操作（仅 foods 表）
│       └── qrcode.js           # 二维码生成
│
├── DEVELOPMENT.md              # 开发文档（本文档）
└── README.md
```

### 后续扩展（认证系统接入后新增）

```
├── server/
│   ├── middleware/             # 新增：auth, rateLimit, turnstile
│   ├── routes/auth.js          # 新增：认证路由
│   └── lib/
│       ├── auth.js             # 新增：JWT/邮件/登录逻辑
│       └── email.js            # 新增：Resend 邮件
├── client/src/
│   ├── stores/auth.js          # 新增：Pinia 认证 store
│   └── components/
│       ├── LoginModal.vue      # 新增：登录/注册弹窗
│       └── TurnstileWidget.vue # 新增：人机验证组件
```

## 开发日志

### 2026-05-18
- 项目立项，确定技术栈和功能规划
- 技术栈：Vue 3 + Vite + Tailwind CSS + Express + SQLite(better-sqlite3)
- 样式方案确定：Tailwind CSS（非 UI 组件库，自由度更高）
- 前端设计流程：先出页面原型 → 确认风格 → 再动手写
- 核心需求明确：食品录入、状态管理、二维码、条形码
- GitHub 仓库已创建：https://github.com/Yuntian-Liu/Datelife
- 认证系统方案确定：基于 MyScore 迁移优化，邮箱验证码+密码双模式
- 认证系统设计写入开发文档（users表、verification_codes表、API路由、安全特性）
- foods 表新增 user_id 字段关联用户
- 前端设计确定：扫码直达详情页（`/f/:id`），未登录只读、已登录可编辑
- 页面路由与权限规划完成
- **开发策略调整**：MVP 优先，认证系统延后到 P2 阶段
  - 理由：先跑通核心链路（录入→计算→展示→扫码），确认功能无误后再叠加复杂功能
  - MVP 不含用户系统，foods 表暂不加 user_id，后续接入认证时再加
- **SQLite 选择确认**：better-sqlite3 零配置（npm install 即用），一个 .db 文件就是数据库
  - 不是常驻服务进程，不吃服务器内存，8G 内存新加坡 VPS 完全够用
  - 比 JSON 文件更好用（无需手动 parse/stringify，查询更方便）
- **glm-cc-tps 插件安装完成**：Claude Code 状态行显示 Token 用量/GLM 配额
- **项目结构更新**：MVP 阶段精简为最小文件集，认证相关文件标注为后续扩展
