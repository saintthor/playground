# P2P 区块链 Playground 部署指南

## 概述

P2P 区块链 Playground 是一个纯前端应用，可以部署到任何支持静态文件服务的环境中。本指南提供了多种部署方式的详细说明。

## 系统要求

### 开发环境
- Node.js 16.0+
- npm 8.0+
- 现代浏览器（Chrome 90+, Firefox 88+, Safari 14+, Edge 90+）

### 生产环境
- 静态文件服务器（Apache, Nginx, 或任何 HTTP 服务器）
- HTTPS 支持（推荐）
- 现代浏览器支持

## 快速部署

### 方法 1: 直接使用（推荐）

最简单的部署方式是直接使用现有文件：

```bash
# 1. 克隆或下载项目
git clone <repository-url>
cd p2p-blockchain-playground

# 2. 启动本地服务器
npm start
# 或者使用 Python
python3 -m http.server 8080
# 或者使用 Node.js
npx http-server . -p 8080 -o
```

### 方法 2: 开发模式

用于开发和测试：

```bash
# 1. 安装依赖
npm install

# 2. 运行测试
npm test

# 3. 启动开发服务器
npm run dev
```

### 方法 3: 生产构建

用于生产环境部署：

```bash
# 1. 安装依赖
npm install

# 2. 运行完整验证
npm run validate

# 3. 构建生产版本
npm run build

# 4. 部署 dist 目录到服务器
```

## 详细部署步骤

### 1. 准备环境

#### 检查 Node.js 版本
```bash
node --version  # 应该 >= 16.0
npm --version   # 应该 >= 8.0
```

#### 安装依赖
```bash
npm install
```

### 2. 代码质量检查

#### 运行测试
```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 交互式测试界面
npm run test:ui
```

#### 代码检查
```bash
# 检查代码质量
npm run lint

# 自动修复代码问题
npm run lint:fix
```

### 3. 构建和部署

#### 开发构建
```bash
npm run build:dev
```

#### 生产构建
```bash
npm run build
```

#### 清理构建文件
```bash
npm run clean
```

## 部署到不同平台

### 1. 本地开发服务器

#### 使用 Python
```bash
# Python 3
python3 -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

#### 使用 Node.js
```bash
# 安装 http-server
npm install -g http-server

# 启动服务器
http-server . -p 8080 -o
```

#### 使用 PHP
```bash
php -S localhost:8080
```

### 2. Apache 服务器

#### 配置文件 (.htaccess)
```apache
# 启用 HTTPS 重定向
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# 设置缓存策略
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/html "access plus 1 hour"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>

# 启用 Gzip 压缩
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# 安全头设置
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'"
</IfModule>
```

### 3. Nginx 服务器

#### 配置文件 (nginx.conf)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL 配置
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # 文档根目录
    root /path/to/p2p-blockchain-playground;
    index index.html;
    
    # 缓存策略
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location ~* \.(html)$ {
        expires 1h;
        add_header Cache-Control "public";
    }
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # 安全头
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'";
    
    # 主页面
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 4. GitHub Pages

#### 部署步骤
1. 将代码推送到 GitHub 仓库
2. 在仓库设置中启用 GitHub Pages
3. 选择源分支（通常是 main 或 gh-pages）
4. 访问 `https://username.github.io/repository-name`

#### GitHub Actions 自动部署
创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build project
      run: npm run build
    
    - name: Deploy to GitHub Pages
      if: github.ref == 'refs/heads/main'
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

### 5. Netlify

#### 部署步骤
1. 在 Netlify 中连接 GitHub 仓库
2. 设置构建命令：`npm run build`
3. 设置发布目录：`dist`
4. 部署设置会自动触发

#### netlify.toml 配置
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 6. Vercel

#### 部署步骤
1. 安装 Vercel CLI：`npm i -g vercel`
2. 在项目目录运行：`vercel`
3. 按照提示完成部署

#### vercel.json 配置
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

## 性能优化

### 1. 资源优化

#### 图片优化
- 使用现代图片格式（WebP, AVIF）
- 压缩图片文件
- 使用适当的图片尺寸

#### 代码优化
- 启用代码压缩
- 移除未使用的代码
- 使用代码分割

### 2. 缓存策略

#### 浏览器缓存
```javascript
// Service Worker 缓存策略
const CACHE_NAME = 'p2p-blockchain-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/index.js',
  '/src/styles/main.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});
```

#### CDN 配置
- 使用 CDN 加速静态资源
- 配置适当的缓存头
- 启用 Gzip/Brotli 压缩

### 3. 监控和分析

#### 性能监控
```javascript
// 性能监控代码
if ('performance' in window) {
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0];
    console.log('页面加载时间:', perfData.loadEventEnd - perfData.fetchStart);
  });
}
```

#### 错误追踪
```javascript
// 错误追踪
window.addEventListener('error', event => {
  console.error('JavaScript 错误:', event.error);
  // 发送错误报告到监控服务
});

window.addEventListener('unhandledrejection', event => {
  console.error('未处理的 Promise 拒绝:', event.reason);
  // 发送错误报告到监控服务
});
```

## 安全配置

### 1. HTTPS 配置

#### Let's Encrypt 证书
```bash
# 安装 Certbot
sudo apt-get install certbot

# 获取证书
sudo certbot certonly --webroot -w /path/to/webroot -d your-domain.com

# 自动续期
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. 安全头配置

#### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self';
  frame-ancestors 'none';
">
```

### 3. 访问控制

#### IP 白名单（如需要）
```nginx
# Nginx 配置
location / {
    allow 192.168.1.0/24;
    allow 10.0.0.0/8;
    deny all;
    
    try_files $uri $uri/ /index.html;
}
```

## 故障排除

### 1. 常见部署问题

#### 文件权限问题
```bash
# 设置正确的文件权限
chmod -R 644 /path/to/project
chmod 755 /path/to/project
find /path/to/project -type d -exec chmod 755 {} \;
```

#### MIME 类型问题
```apache
# Apache .htaccess
AddType application/javascript .js
AddType text/css .css
AddType image/svg+xml .svg
```

### 2. 性能问题

#### 检查资源加载
```javascript
// 检查资源加载时间
performance.getEntriesByType('resource').forEach(resource => {
  console.log(resource.name, resource.duration);
});
```

#### 内存使用监控
```javascript
// 监控内存使用
if ('memory' in performance) {
  console.log('内存使用:', performance.memory);
}
```

### 3. 兼容性问题

#### 浏览器检测
```javascript
// 检查浏览器支持
const checkSupport = () => {
  const required = [
    'fetch',
    'Promise',
    'Map',
    'Set',
    'crypto.subtle'
  ];
  
  const missing = required.filter(feature => {
    return !window[feature] && !window.crypto?.subtle;
  });
  
  if (missing.length > 0) {
    console.warn('不支持的功能:', missing);
    return false;
  }
  
  return true;
};
```

## 维护和更新

### 1. 版本管理

#### 语义化版本
- 主版本号：不兼容的 API 修改
- 次版本号：向下兼容的功能性新增
- 修订号：向下兼容的问题修正

#### 更新流程
1. 更新代码
2. 运行测试
3. 更新版本号
4. 构建新版本
5. 部署到生产环境
6. 验证部署结果

### 2. 备份策略

#### 代码备份
- 使用版本控制系统（Git）
- 定期推送到远程仓库
- 创建发布标签

#### 配置备份
- 备份服务器配置文件
- 备份 SSL 证书
- 备份部署脚本

### 3. 监控和日志

#### 访问日志分析
```bash
# 分析 Nginx 访问日志
tail -f /var/log/nginx/access.log | grep "p2p-blockchain"

# 分析错误日志
tail -f /var/log/nginx/error.log
```

#### 性能监控
- 设置性能监控告警
- 定期检查系统资源使用
- 监控用户访问模式

## 总结

本部署指南提供了多种部署方式，从简单的本地开发到复杂的生产环境部署。选择适合你需求的部署方式，并根据实际情况调整配置。

记住：
- 始终在部署前运行测试
- 使用 HTTPS 保护用户数据
- 定期更新和维护系统
- 监控系统性能和安全性

如有问题，请参考技术文档或联系开发团队。