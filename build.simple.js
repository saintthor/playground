#!/usr/bin/env node

/**
 * 简化版构建脚本 - 专注于文档和部署准备
 * P2P 区块链 Playground 文档和部署构建脚本
 * 
 * @author P2P Blockchain Playground Team
 * @version 1.0.0
 * @since 2024
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SimpleBuilder {
    constructor() {
        this.sourceDir = 'src';
        this.outputDir = 'dist';
        this.docsDir = 'docs';
        
        this.buildInfo = {
            version: this.getVersion(),
            buildTime: new Date().toISOString(),
            buildNumber: this.generateBuildNumber(),
            nodeVersion: process.version,
            environment: 'production'
        };
    }

    /**
     * 执行简化构建流程
     */
    async build() {
        console.log('🚀 开始文档和部署准备构建...\n');
        this.logBuildInfo();
        
        try {
            await this.cleanOutput();
            await this.buildAssets();
            await this.generateDocumentation();
            await this.createDeploymentPackage();
            await this.validateBuild();
            
            console.log('✅ 构建完成！');
            this.printBuildSummary();
            
        } catch (error) {
            console.error('❌ 构建失败:', error.message);
            process.exit(1);
        }
    }

    logBuildInfo() {
        console.log('📋 构建信息:');
        console.log(`   版本: ${this.buildInfo.version}`);
        console.log(`   构建号: ${this.buildInfo.buildNumber}`);
        console.log(`   Node.js 版本: ${this.buildInfo.nodeVersion}`);
        console.log(`   构建时间: ${this.buildInfo.buildTime}`);
        console.log('');
    }

    async cleanOutput() {
        console.log('🧹 清理输出目录...');
        
        if (fs.existsSync(this.outputDir)) {
            fs.rmSync(this.outputDir, { recursive: true, force: true });
        }
        
        fs.mkdirSync(this.outputDir, { recursive: true });
        console.log('   ✅ 输出目录清理完成');
    }

    async buildAssets() {
        console.log('📦 构建资源文件...');
        
        // 复制主要文件
        this.copyFile('index.html', path.join(this.outputDir, 'index.html'));
        this.copyDirectory(this.sourceDir, path.join(this.outputDir, 'src'));
        this.copyDirectory(this.docsDir, path.join(this.outputDir, 'docs'));
        
        // 复制其他重要文件
        const additionalFiles = ['README.md', 'LICENSE', 'DEPLOYMENT.md', 'package.json'];
        for (const file of additionalFiles) {
            if (fs.existsSync(file)) {
                this.copyFile(file, path.join(this.outputDir, file));
            }
        }
        
        this.generateBuildInfo();
        this.generateManifest();
        
        console.log('   ✅ 资源构建完成');
    }

    async generateDocumentation() {
        console.log('📚 生成文档...');
        
        this.generateApiIndex();
        this.generateDeploymentGuide();
        this.generateChangeLog();
        
        console.log('   ✅ 文档生成完成');
    }

    async createDeploymentPackage() {
        console.log('📦 创建部署包...');
        
        this.generateDeploymentManifest();
        this.generateHtaccess();
        this.generateRobotsTxt();
        this.generateNginxConfig();
        
        console.log('   ✅ 部署包创建完成');
    }

    async validateBuild() {
        console.log('✅ 验证构建结果...');
        
        const requiredFiles = [
            'index.html',
            'src/index.js',
            'src/styles/main.css',
            'docs/README.md',
            'build-info.json',
            'deployment-manifest.json'
        ];
        
        const missingFiles = [];
        for (const file of requiredFiles) {
            const filePath = path.join(this.outputDir, file);
            if (!fs.existsSync(filePath)) {
                missingFiles.push(file);
            }
        }
        
        if (missingFiles.length > 0) {
            throw new Error(`缺少必要文件: ${missingFiles.join(', ')}`);
        }
        
        const totalSize = this.calculateTotalSize();
        const fileCount = this.getAllFiles(this.outputDir).length;
        
        console.log(`   📊 构建包大小: ${this.formatBytes(totalSize)}`);
        console.log(`   📁 文件数量: ${fileCount}`);
        console.log('   ✅ 构建验证通过');
    }

    printBuildSummary() {
        const totalSize = this.calculateTotalSize();
        const fileCount = this.getAllFiles(this.outputDir).length;
        
        console.log('\n📊 构建摘要:');
        console.log(`   版本: ${this.buildInfo.version}`);
        console.log(`   构建号: ${this.buildInfo.buildNumber}`);
        console.log(`   文件数量: ${fileCount}`);
        console.log(`   总大小: ${this.formatBytes(totalSize)}`);
        console.log(`   输出目录: ${this.outputDir}`);
        console.log(`   构建时间: ${new Date().toLocaleString()}`);
        
        console.log('\n🚀 部署说明:');
        console.log('   1. 将 dist/ 目录内容上传到 Web 服务器');
        console.log('   2. 确保服务器支持静态文件服务');
        console.log('   3. 访问 index.html 验证部署');
        console.log('   4. 查看 DEPLOYMENT_GUIDE.md 获取详细说明');
        console.log('   5. 使用 deployment-manifest.json 验证文件完整性');
    }

    // 工具方法
    getVersion() {
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            return packageJson.version || '1.0.0';
        } catch {
            return '1.0.0';
        }
    }
    
    generateBuildNumber() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `${timestamp}-${random}`;
    }
    
    copyFile(src, dest) {
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(src, dest);
    }
    
    copyDirectory(src, dest) {
        if (!fs.existsSync(src)) return;
        
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        
        const entries = fs.readdirSync(src, { withFileTypes: true });
        
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
                this.copyDirectory(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
    
    getAllFiles(dir) {
        const files = [];
        
        function traverse(currentDir) {
            if (!fs.existsSync(currentDir)) return;
            
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                
                if (entry.isDirectory()) {
                    traverse(fullPath);
                } else {
                    files.push(path.relative(dir, fullPath));
                }
            }
        }
        
        traverse(dir);
        return files;
    }
    
    calculateTotalSize() {
        let totalSize = 0;
        const files = this.getAllFiles(this.outputDir);
        
        for (const file of files) {
            const filePath = path.join(this.outputDir, file);
            const stats = fs.statSync(filePath);
            totalSize += stats.size;
        }
        
        return totalSize;
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    generateBuildInfo() {
        fs.writeFileSync(
            path.join(this.outputDir, 'build-info.json'),
            JSON.stringify(this.buildInfo, null, 2)
        );
    }
    
    generateManifest() {
        const manifest = {
            name: 'P2P Blockchain Playground',
            short_name: 'P2P Blockchain',
            description: 'P2P 网络区块链演示 playground',
            version: this.buildInfo.version,
            start_url: '/',
            display: 'standalone',
            background_color: '#ffffff',
            theme_color: '#007bff'
        };
        
        fs.writeFileSync(
            path.join(this.outputDir, 'manifest.json'),
            JSON.stringify(manifest, null, 2)
        );
    }
    
    generateApiIndex() {
        const indexContent = `# API 文档索引

## 核心文档
- [用户手册](USER_MANUAL.md)
- [技术文档](TECHNICAL_DOCUMENTATION.md)
- [API 参考](API_REFERENCE.md)
- [部署指南](../DEPLOYMENT.md)

## 构建信息
- 构建时间: ${this.buildInfo.buildTime}
- 构建版本: ${this.buildInfo.version}
- 构建号: ${this.buildInfo.buildNumber}
- Node.js 版本: ${this.buildInfo.nodeVersion}

## 快速链接
- [GitHub 仓库](https://github.com/your-repo/p2p-blockchain-playground)
- [问题反馈](https://github.com/your-repo/p2p-blockchain-playground/issues)
- [贡献指南](https://github.com/your-repo/p2p-blockchain-playground/blob/main/CONTRIBUTING.md)

## 部署验证
使用以下命令验证部署：
\`\`\`bash
node scripts/deploy-verify.js https://your-domain.com
\`\`\`
`;
        
        fs.writeFileSync(
            path.join(this.outputDir, 'docs', 'README.md'),
            indexContent
        );
    }
    
    generateDeploymentGuide() {
        const deploymentContent = `# 部署说明

## 快速部署

### 1. 静态文件服务器
\`\`\`bash
# 使用 Python
python3 -m http.server 8080

# 使用 Node.js
npx http-server . -p 8080 -o

# 使用 PHP
php -S localhost:8080
\`\`\`

### 2. Nginx 配置示例
\`\`\`nginx
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
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
\`\`\`

### 3. Apache 配置示例
\`\`\`apache
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
\`\`\`

## 构建信息
- 构建时间: ${this.buildInfo.buildTime}
- 构建版本: ${this.buildInfo.version}
- 构建号: ${this.buildInfo.buildNumber}

## 验证部署
访问以下 URL 验证部署是否成功：
- http://your-domain.com/ - 主页面
- http://your-domain.com/docs/ - 文档

## 故障排除
1. 确保所有文件都已正确上传
2. 检查文件权限设置
3. 验证服务器配置
4. 查看浏览器控制台错误信息
`;
        
        fs.writeFileSync(
            path.join(this.outputDir, 'DEPLOYMENT_GUIDE.md'),
            deploymentContent
        );
    }
    
    generateChangeLog() {
        const changeLogContent = `# 更新日志

## [1.0.0] - ${new Date().toISOString().split('T')[0]}

### 新增功能
- ✅ 完整的 P2P 网络区块链模拟系统
- ✅ 基于 Web Crypto API 的密码学功能
- ✅ 实时网络状态可视化
- ✅ 交互式用户界面
- ✅ 完整的测试覆盖
- ✅ 性能优化和监控
- ✅ 错误处理和恢复机制
- ✅ 完整的文档和部署指南
- ✅ 增强的代码注释和技术文档
- ✅ 生产环境构建配置
- ✅ 自动化部署验证脚本
- ✅ 代码质量检查工具

### 技术特性
- 支持多节点 P2P 网络模拟
- 区块链创建、转移和验证
- 双花攻击检测和安全机制
- Base64 数据验证功能
- 实时日志和状态监控
- 响应式用户界面设计

### 部署支持
- 静态文件服务器部署
- Nginx 和 Apache 配置示例
- Docker 容器化支持（计划中）
- CI/CD 集成配置

### 文档完善
- 用户操作手册
- 技术实现文档
- API 参考文档
- 部署和维护指南

## 未来版本计划

### [1.1.0] - 计划中
- 🔄 WebRTC P2P 通信支持
- 🔄 更多攻击场景模拟
- 🔄 增强的分析和统计功能
- 🔄 移动端响应式支持
- 🔄 多语言国际化支持

### [2.0.0] - 规划中
- 📋 多链并行模拟
- 📋 智能合约模拟
- 📋 共识算法可视化
- 📋 高级网络拓扑
- 📋 实时协作功能
`;
        
        fs.writeFileSync(
            path.join(this.outputDir, 'CHANGELOG.md'),
            changeLogContent
        );
    }
    
    generateDeploymentManifest() {
        const manifest = {
            name: 'P2P 区块链 Playground',
            version: this.buildInfo.version,
            buildTime: this.buildInfo.buildTime,
            buildNumber: this.buildInfo.buildNumber,
            files: this.getAllFiles(this.outputDir),
            deployment: {
                requirements: {
                    server: 'HTTP 服务器 (Apache, Nginx, 或任何静态文件服务器)',
                    browser: 'Chrome 90+, Firefox 88+, Safari 14+, Edge 90+'
                },
                instructions: '参见 DEPLOYMENT_GUIDE.md',
                verification: {
                    command: 'node scripts/deploy-verify.js',
                    endpoints: [
                        '/',
                        '/docs/',
                        '/src/index.js',
                        '/manifest.json'
                    ]
                }
            },
            security: {
                contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
                headers: [
                    'X-Content-Type-Options: nosniff',
                    'X-Frame-Options: DENY',
                    'X-XSS-Protection: 1; mode=block'
                ]
            }
        };
        
        fs.writeFileSync(
            path.join(this.outputDir, 'deployment-manifest.json'),
            JSON.stringify(manifest, null, 2)
        );
    }
    
    generateHtaccess() {
        const htaccessContent = `# P2P 区块链 Playground .htaccess 配置

# 启用 Gzip 压缩
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/json
</IfModule>

# 缓存策略
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/html "access plus 1 hour"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>

# 安全头
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# MIME 类型
AddType application/javascript .js
AddType text/css .css
AddType image/svg+xml .svg

# 错误页面
ErrorDocument 404 /index.html

# 禁止访问敏感文件
<Files "*.json">
    <RequireAll>
        Require all denied
        Require uri manifest.json
        Require uri build-info.json
        Require uri deployment-manifest.json
    </RequireAll>
</Files>
`;
        
        fs.writeFileSync(path.join(this.outputDir, '.htaccess'), htaccessContent);
    }
    
    generateRobotsTxt() {
        const robotsContent = `User-agent: *
Allow: /
Disallow: /src/
Disallow: /tests/
Disallow: /*.json$

Sitemap: https://your-domain.com/sitemap.xml
`;
        
        fs.writeFileSync(path.join(this.outputDir, 'robots.txt'), robotsContent);
    }
    
    generateNginxConfig() {
        const nginxContent = `# P2P 区块链 Playground Nginx 配置示例
# 将此配置保存为 /etc/nginx/sites-available/p2p-blockchain-playground

server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;
    
    # 日志配置
    access_log /var/log/nginx/p2p-blockchain-playground.access.log;
    error_log /var/log/nginx/p2p-blockchain-playground.error.log;
    
    # 主页面
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 静态资源缓存
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
    }
    
    # HTML 文件缓存
    location ~* \\.html$ {
        expires 1h;
        add_header Cache-Control "public";
    }
    
    # JSON 文件处理
    location ~* \\.json$ {
        expires 1h;
        add_header Content-Type application/json;
    }
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
    
    # 安全头
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # 禁止访问敏感文件
    location ~ /\\. {
        deny all;
    }
    
    location ~ \\.(log|conf)$ {
        deny all;
    }
}

# HTTPS 配置 (可选)
# server {
#     listen 443 ssl http2;
#     server_name your-domain.com;
#     
#     ssl_certificate /path/to/certificate.crt;
#     ssl_certificate_key /path/to/private.key;
#     ssl_protocols TLSv1.2 TLSv1.3;
#     
#     # 其他配置与上面相同...
# }
`;
        
        fs.writeFileSync(path.join(this.outputDir, 'nginx.conf.example'), nginxContent);
    }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
    const builder = new SimpleBuilder();
    builder.build().catch(console.error);
}

export default SimpleBuilder;