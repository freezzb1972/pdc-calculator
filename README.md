# PDC Calculator - EMC暗室配电方案计算工具

## 快速开始

```bash
# 安装依赖
npm install

# 构建前端
npm run build

# 开发模式 (前后端同时启动)
npm run dev

# 生产模式
npm start
```

## 生产部署 (pm2 + Nginx)

### 1. 安装 pm2
```bash
npm install -g pm2
```

### 2. 构建并启动
```bash
npm run build
pm2 start ecosystem.config.json
pm2 save
pm2 startup
```

### 3. Nginx 反向代理配置
```nginx
server {
    listen 80;
    server_name pdc.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 端口
- 开发: 前端 5173 / 后端 3001
- 生产: 3001 (通过 Nginx 反代)

## 数据结构
项目 → 房间 → 回路 → 线缆段 → 设备
