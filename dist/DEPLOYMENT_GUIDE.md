# 部署说明

## 快速部署

### 1. 静态文件服务器
```bash
# 使用 Python
python3 -m http.server 8080

# 使用 Node.js
npx http-server . -p 8080 -o

# 使用 PHP
php -S localhost:8080
```

### 2. Nginx 配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 启用 Gzip
    gzip on;
    gzip_types text/plain text/css application/javascript;
    
    # 缓存策略
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3. Apache 配置示例
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/dist
    
    <Directory /path/to/dist>
        AllowOverride All
        Require all granted
    </Directory>
    
    # 启用压缩
    LoadModule deflate_module modules/mod_deflate.so
    <Location />
        SetOutputFilter DEFLATE
    </Location>
</VirtualHost>
```

## 构建信息
- 构建时间: 2025-07-25T10:35:51.176Z
- 构建版本: 1.0.0
- 构建号: mdior6yx-jnp3ks

## 验证部署
访问以下 URL 验证部署是否成功：
- http://your-domain.com/ - 主页面
- http://your-domain.com/docs/ - 文档

## 故障排除
1. 确保所有文件都已正确上传
2. 检查文件权限设置
3. 验证服务器配置
4. 查看浏览器控制台错误信息
