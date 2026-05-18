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

## 数据库设计

### foods 表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PRIMARY KEY | 自增主键 |
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
├── client/          # Vue 3 前端
├── server/          # Express 后端
├── DEVELOPMENT.md   # 本文档
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
