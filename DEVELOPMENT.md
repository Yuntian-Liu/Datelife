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

### P0 - 核心功能（必须完成）

- [ ] 食品录入：名称 + 生产日期 + 保质期天数 → 自动算过期日期
- [ ] 食品列表：展示所有食品，显示状态（正常/临期/过期）
- [ ] 状态判断：根据当前日期自动标记
  - 正常：距过期 > 14天
  - 临期：距过期 ≤ 14天
  - 过期：已超过保质期
- [ ] 二维码生成：每个食品生成二维码，扫码查看详情页
- [ ] 详情页：展示食品完整信息（名称、生产日期、保质期、过期日期、状态）

### P1 - 增强功能（优先实现）

- [ ] 条形码识别：通过 Open Food Facts API，扫描条形码自动获取食品名称
- [ ] 食品删除/编辑
- [ ] 响应式布局：手机录入+扫码查看，电脑整体管理

### P2 - 锦上添花（时间允许）

- [ ] 食品分类（零食/饮料/速食等）
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

## 项目结构（待搭建）

```
Datelife/
├── client/                      # Vue 3 前端
│   ├── src/
│   │   ├── main.js
│   │   ├── App.vue
│   │   ├── router/index.js     # 路由配置
│   │   ├── stores/auth.js      # Pinia 认证 store
│   │   ├── components/
│   │   │   ├── LoginModal.vue  # 登录/注册弹窗
│   │   │   └── ...
│   │   ├── views/              # 页面组件
│   │   └── utils/api.js        # API 封装
│
├── server/                      # Express 后端
│   ├── index.js                # 入口
│   ├── middleware/             # auth, rateLimit, turnstile
│   ├── routes/auth.js          # 认证路由
│   ├── routes/foods.js         # 食品路由
│   └── lib/
│       ├── db.js               # SQLite 操作
│       ├── auth.js             # JWT/邮件/登录逻辑
│       └── email.js            # Resend 邮件
│
├── DEVELOPMENT.md              # 开发文档（本文档）
└── README.md
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
