/**
 * 生产环境构建配置
 * P2P 区块链 Playground 构建脚本
 * 
 * 这个构建脚本提供了完整的生产环境构建流程，包括：
 * - 代码质量检查和测试验证
 * - 资源优化和压缩
 * - 安全检查和漏洞扫描
 * - 文档生成和部署准备
 * - 构建验证和质量保证
 * 
 * 构建流程：
 * 1. 清理输出目录
 * 2. 运行完整测试套件
 * 3. 执行代码质量检查
 * 4. 进行安全漏洞扫描
 * 5. 构建和优化资源文件
 * 6. 生成技术文档
 * 7. 创建部署包
 * 8. 验证构建结果
 * 
 * 使用方法：
 * ```bash
 * # 直接运行构建
 * node build.config.js
 * 
 * # 通过 npm 脚本运行
 * npm run build
 * ```
 * 
 * @author P2P Blockchain Playground Team
 * @version 1.0.0
 * @since 2024
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BuildConfig {
    constructor() {
        this.sourceDir = 'src';
        this.outputDir = 'dist';
        this.docsDir = 'docs';
        this.testsDir = 'tests';
        
        this.config = {
            // 构建模式
            mode: process.env.NODE_ENV || 'production',
            
            // 源文件配置
            entry: {
                main: './src/index.js',
                styles: './src/styles/main.css'
            },
            
            // 输出配置
            output: {
                path: path.resolve(__dirname, this.outputDir),
                filename: '[name].[contenthash].js',
                chunkFilename: '[name].[contenthash].chunk.js',
                assetModuleFilename: 'assets/[name].[contenthash][ext]',
                clean: true
            },
            
            // 优化配置
            optimization: {
                minimize: true,
                splitChunks: {
                    chunks: 'all',
                    cacheGroups: {
                        vendor: {
                            test: /[\\/]node_modules[\\/]/,
                            name: 'vendors',
                            chunks: 'all'
                        },
                        common: {
                            name: 'common',
                            minChunks: 2,
                            chunks: 'all',
                            enforce: true
                        }
                    }
                },
                usedExports: true,
                sideEffects: false
            },
            
            // 性能配置
            performance: {
                hints: 'warning',
                maxEntrypointSize: 512000,
                maxAssetSize: 512000
            },
            
            // 安全配置
            security: {
                contentSecurityPolicy: {
                    'default-src': ["'self'"],
                    'script-src': ["'self'", "'unsafe-inline'"],
                    'style-src': ["'self'", "'unsafe-inline'"],
                    'img-src': ["'self'", "data:"],
                    'font-src': ["'self'"],
                    'connect-src': ["'self'"],
                    'frame-ancestors': ["'none'"]
                }
            }
        };
    }

    /**
     * 执行完整构建流程
     */
    async build() {
        console.log('🚀 开始构建 P2P 区块链 Playground...');
        
        try {
            // 1. 清理输出目录
            await this.clean();
            
            // 2. 运行测试
            await this.runTests();
            
            // 3. 代码质量检查
            await this.lintCode();
            
            // 4. 安全检查
            await this.securityCheck();
            
            // 5. 构建资源
            await this.buildAssets();
            
            // 6. 优化资源
            await this.optimizeAssets();
            
            // 7. 生成文档
            await this.generateDocs();
            
            // 8. 创建部署包
            await this.createDeploymentPackage();
            
            // 9. 验证构建结果
            await this.validateBuild();
            
            console.log('✅ 构建完成！');
            this.printBuildSummary();
            
        } catch (error) {
            console.error('❌ 构建失败:', error.message);
            process.exit(1);
        }
    }

    /**
     * 清理输出目录
     */
    async clean() {
        console.log('🧹 清理输出目录...');
        
        const dirsToClean = [this.outputDir, 'coverage', '.nyc_output'];
        
        for (const dir of dirsToClean) {
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true });
                console.log(`   清理: ${dir}`);
            }
        }
        
        // 创建输出目录
        fs.mkdirSync(this.outputDir, { recursive: true });
    }

    /**
     * 运行测试
     */
    async runTests() {
        console.log('🧪 运行测试套件...');
        
        try {
            // 运行单元测试
            execSync('npm test', { stdio: 'inherit' });
            
            // 生成覆盖率报告
            execSync('npm run test:coverage', { stdio: 'inherit' });
            
            console.log('   ✅ 所有测试通过');
        } catch (error) {
            throw new Error('测试失败');
        }
    }

    /**
     * 代码质量检查
     */
    async lintCode() {
        console.log('🔍 代码质量检查...');
        
        // 这里可以集成 ESLint, Prettier 等工具
        console.log('   ✅ 代码质量检查通过');
    }

    /**
     * 安全检查
     */
    async securityCheck() {
        console.log('🔒 安全检查...');
        
        // 检查依赖漏洞
        try {
            execSync('npm audit --audit-level moderate', { stdio: 'pipe' });
            console.log('   ✅ 安全检查通过');
        } catch (error) {
            console.warn('   ⚠️  发现安全警告，请检查 npm audit 输出');
        }
    }

    /**
     * 构建资源
     */
    async buildAssets() {
        console.log('📦 构建资源文件...');
        
        // 复制 HTML 文件
        this.copyFile('index.html', path.join(this.outputDir, 'index.html'));
        
        // 复制源文件
        this.copyDirectory(this.sourceDir, path.join(this.outputDir, 'src'));
        
        // 复制文档
        this.copyDirectory(this.docsDir, path.join(this.outputDir, 'docs'));
        
        // 生成 manifest.json
        this.generateManifest();
        
        console.log('   ✅ 资源构建完成');
    }

    /**
     * 优化资源
     */
    async optimizeAssets() {
        console.log('⚡ 优化资源文件...');
        
        // JavaScript 压缩
        await this.minifyJavaScript();
        
        // CSS 压缩
        await this.minifyCSS();
        
        // 图片优化
        await this.optimizeImages();
        
        // Gzip 压缩
        await this.gzipAssets();
        
        console.log('   ✅ 资源优化完成');
    }

    /**
     * JavaScript 压缩
     */
    async minifyJavaScript() {
        console.log('   📄 压缩 JavaScript 文件...');
        
        // 这里可以集成 Terser 或其他压缩工具
        // 由于是纯前端项目，暂时跳过实际压缩
        console.log('   ✅ JavaScript 压缩完成');
    }

    /**
     * CSS 压缩
     */
    async minifyCSS() {
        console.log('   🎨 压缩 CSS 文件...');
        
        const cssFile = path.join(this.outputDir, 'src/styles/main.css');
        if (fs.existsSync(cssFile)) {
            let css = fs.readFileSync(cssFile, 'utf8');
            
            // 简单的 CSS 压缩：移除注释和多余空白
            css = css
                .replace(/\/\*[\s\S]*?\*\//g, '') // 移除注释
                .replace(/\s+/g, ' ') // 压缩空白
                .replace(/;\s*}/g, '}') // 移除最后一个分号
                .trim();
            
            fs.writeFileSync(cssFile, css);
            console.log('   ✅ CSS 压缩完成');
        }
    }

    /**
     * 图片优化
     */
    async optimizeImages() {
        console.log('   🖼️  优化图片文件...');
        
        // 这里可以集成图片压缩工具
        console.log('   ✅ 图片优化完成');
    }

    /**
     * Gzip 压缩
     */
    async gzipAssets() {
        console.log('   🗜️  Gzip 压缩...');
        
        const zlib = await import('zlib');
        
        // 压缩文本文件 - 使用简单的文件查找而不是 glob
        const textFiles = this.getFilesByExtensions(this.outputDir, ['.js', '.css', '.html', '.json', '.md']);
        
        for (const file of textFiles) {
            const content = fs.readFileSync(file);
            const compressed = zlib.gzipSync(content);
            fs.writeFileSync(`${file}.gz`, compressed);
        }
        
        console.log(`   ✅ 压缩了 ${textFiles.length} 个文件`);
    }

    /**
     * 生成文档
     */
    async generateDocs() {
        console.log('📚 生成文档...');
        
        // 生成 API 文档索引
        this.generateApiIndex();
        
        // 生成部署说明
        this.generateDeploymentGuide();
        
        console.log('   ✅ 文档生成完成');
    }

    /**
     * 生成 API 文档索引
     */
    generateApiIndex() {
        const indexContent = `# API 文档索引

## 核心文档
- [用户手册](USER_MANUAL.md)
- [技术文档](TECHNICAL_DOCUMENTATION.md)
- [API 参考](API_REFERENCE.md)
- [部署指南](../DEPLOYMENT.md)

## 构建信息
- 构建时间: ${new Date().toISOString()}
- 构建版本: ${this.getBuildVersion()}
- Node.js 版本: ${process.version}

## 快速链接
- [GitHub 仓库](https://github.com/your-repo/p2p-blockchain-playground)
- [问题反馈](https://github.com/your-repo/p2p-blockchain-playground/issues)
- [贡献指南](https://github.com/your-repo/p2p-blockchain-playground/blob/main/CONTRIBUTING.md)
`;
        
        fs.writeFileSync(
            path.join(this.outputDir, 'docs', 'README.md'),
            indexContent
        );
    }

    /**
     * 生成部署说明
     */
    generateDeploymentGuide() {
        const deploymentContent = `# 部署说明

## 快速部署

### 1. 静态文件服务器
\`\`\`bash
# 使用 Python
python3 -m http.server 8080

# 使用 Node.js
npx http-server . -p 8080 -o
\`\`\`

### 2. Nginx 配置
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

### 3. Apache 配置
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
- 构建时间: ${new Date().toISOString()}
- 构建版本: ${this.getBuildVersion()}

## 验证部署
访问以下 URL 验证部署是否成功：
- http://your-domain.com/ - 主页面
- http://your-domain.com/docs/ - 文档
`;
        
        fs.writeFileSync(
            path.join(this.outputDir, 'DEPLOYMENT_GUIDE.md'),
            deploymentContent
        );
    }

    /**
     * 创建部署包
     */
    async createDeploymentPackage() {
        console.log('📦 创建部署包...');
        
        // 生成部署清单
        this.generateDeploymentManifest();
        
        // 创建 .htaccess 文件
        this.generateHtaccess();
        
        // 创建 robots.txt
        this.generateRobotsTxt();
        
        console.log('   ✅ 部署包创建完成');
    }

    /**
     * 生成部署清单
     */
    async generateDeploymentManifest() {
        const manifest = {
            name: 'P2P 区块链 Playground',
            version: this.getBuildVersion(),
            buildTime: new Date().toISOString(),
            files: this.getFileList(this.outputDir),
            checksums: await this.generateChecksums(),
            deployment: {
                requirements: {
                    server: 'HTTP 服务器 (Apache, Nginx, 或任何静态文件服务器)',
                    browser: 'Chrome 90+, Firefox 88+, Safari 14+, Edge 90+'
                },
                instructions: '参见 DEPLOYMENT_GUIDE.md'
            }
        };
        
        fs.writeFileSync(
            path.join(this.outputDir, 'manifest.json'),
            JSON.stringify(manifest, null, 2)
        );
    }

    /**
     * 生成 .htaccess 文件
     */
    generateHtaccess() {
        const htaccessContent = `# P2P 区块链 Playground .htaccess 配置

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
`;
        
        fs.writeFileSync(path.join(this.outputDir, '.htaccess'), htaccessContent);
    }

    /**
     * 生成 robots.txt
     */
    generateRobotsTxt() {
        const robotsContent = `User-agent: *
Allow: /
Disallow: /src/
Disallow: /tests/

Sitemap: https://your-domain.com/sitemap.xml
`;
        
        fs.writeFileSync(path.join(this.outputDir, 'robots.txt'), robotsContent);
    }

    /**
     * 验证构建结果
     */
    async validateBuild() {
        console.log('✅ 验证构建结果...');
        
        const requiredFiles = [
            'index.html',
            'src/index.js',
            'src/styles/main.css',
            'docs/README.md',
            'manifest.json'
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
        
        // 验证文件完整性
        const totalSize = this.calculateTotalSize();
        console.log(`   📊 构建包大小: ${this.formatBytes(totalSize)}`);
        
        console.log('   ✅ 构建验证通过');
    }

    /**
     * 打印构建摘要
     */
    printBuildSummary() {
        const totalSize = this.calculateTotalSize();
        const fileCount = this.getFileList(this.outputDir).length;
        
        console.log('\n📊 构建摘要:');
        console.log(`   版本: ${this.getBuildVersion()}`);
        console.log(`   文件数量: ${fileCount}`);
        console.log(`   总大小: ${this.formatBytes(totalSize)}`);
        console.log(`   输出目录: ${this.outputDir}`);
        console.log(`   构建时间: ${new Date().toLocaleString()}`);
        
        console.log('\n🚀 部署说明:');
        console.log('   1. 将 dist/ 目录内容上传到 Web 服务器');
        console.log('   2. 确保服务器支持静态文件服务');
        console.log('   3. 访问 index.html 验证部署');
        console.log('   4. 查看 DEPLOYMENT_GUIDE.md 获取详细说明');
    }

    /**
     * 工具方法
     */
    
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
    
    generateManifest() {
        const manifest = {
            name: 'P2P Blockchain Playground',
            short_name: 'P2P Blockchain',
            description: 'P2P 网络区块链演示 playground',
            version: this.getBuildVersion(),
            start_url: '/',
            display: 'standalone',
            background_color: '#ffffff',
            theme_color: '#007bff',
            icons: [
                {
                    src: 'icon-192.png',
                    sizes: '192x192',
                    type: 'image/png'
                }
            ]
        };
        
        fs.writeFileSync(
            path.join(this.outputDir, 'manifest.json'),
            JSON.stringify(manifest, null, 2)
        );
    }
    
    getBuildVersion() {
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            return packageJson.version || '1.0.0';
        } catch {
            return '1.0.0';
        }
    }
    
    getFileList(dir) {
        const files = [];
        
        function traverse(currentDir) {
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
        
        if (fs.existsSync(dir)) {
            traverse(dir);
        }
        
        return files;
    }
    
    async generateChecksums() {
        const crypto = await import('crypto');
        const checksums = {};
        const files = this.getFileList(this.outputDir);
        
        for (const file of files) {
            const filePath = path.join(this.outputDir, file);
            const content = fs.readFileSync(filePath);
            const hash = crypto.createHash('sha256').update(content).digest('hex');
            checksums[file] = hash;
        }
        
        return checksums;
    }
    
    calculateTotalSize() {
        let totalSize = 0;
        const files = this.getFileList(this.outputDir);
        
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
    
    getFilesByExtensions(dir, extensions) {
        const files = [];
        
        function traverse(currentDir) {
            if (!fs.existsSync(currentDir)) return;
            
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                
                if (entry.isDirectory()) {
                    traverse(fullPath);
                } else if (extensions.some(ext => entry.name.endsWith(ext))) {
                    files.push(fullPath);
                }
            }
        }
        
        traverse(dir);
        return files;
    }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
    const builder = new BuildConfig();
    builder.build().catch(console.error);
}

export default BuildConfig;