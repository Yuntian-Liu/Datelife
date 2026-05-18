FROM node:20-alpine AS builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ .
RUN npm run build

FROM node:20-alpine AS runtime

# 安装 better-sqlite3 编译依赖（Python + 构建工具）
RUN apk add --no-cache python3 make g++

WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --production
COPY server/ .

# 复制前端构建产物
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3000
ENV NODE_ENV=production PORT=3000

CMD ["node", "index.js"]
