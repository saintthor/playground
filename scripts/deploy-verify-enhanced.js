#!/usr/bin/env node

/**
 * 增强版部署验证脚本
 * P2P 区块链 Playground 部署后验证工具
 * 
 * 这个脚本用于验证部署后的应用程序是否正常工作，包括：
 * - 基础连接测试
 * - 静态资源可访问性
 * - 功能完整性检查
 * - 性能基准测试
 * - 安全配置验证
 * - 可访问性检查
 * - 浏览器兼容性验证
 * 
 * 使用方法：
 * node scripts/deploy-verify-enhanced.js [URL]
 * 
 * 示例：
 * node scripts/deploy-verify-enhanced.js http://localhost:8080
 * node scripts/deploy-verify-enhanced.js https://your-domain.com
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

/**
 * 增强版部署验证器类
 * 
 * 负责执行完整的部署后验证流程，确保应用程序
 * 在生产环境中正常工作。
 */
class EnhancedDeploymentVerifier {
    /**
     * 创建部署验证器实例
     * 
     * @param {string} [baseUrl] - 要验证的基础URL，默认从命令行参数获取
     */
    constructor(baseUrl = null) {
        this.baseUrl = baseUrl || process.argv[2] || 'http://localhost:8080';
        
        /** @type {Object} 验证结果统计 */
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            tests: []
        };
        
        /** @type {Object} 性能指标 */
        this.performanceMetrics = {
            pageLoadTime: 0,
            resourceLoadTimes: {},
            totalSize: 0,
            resourceSizes: {}
        };
        
        /** @type {number} 请求超时时间（毫秒） */
        this.timeout = 15000;
        
        /** @type {Object} 预期的安全头 */
        this.expectedSecurityHeaders = {
            'x-content-type-options': 'nosniff',
            'x-frame-options': ['DENY', 'SAMEORIGIN'],
            'x-xss-protection': '1; mode=block',
            'referrer-policy': true, // 任何值都可以
            'content-security-policy': true // 任何值都可以
        };
    }

    /**
     * 执行完整的部署验证流程
     * 
     * @async
     * @returns {Promise<void>}
     * @throws {Error} 当验证过程中发生严重错误时抛出
     */
    async verify() {
        console.log(`🔍 开始验证部署: ${this.baseUrl}`);
        console.log(`⏰ 验证时间: ${new Date().toLocaleString()}\n`);
        
        try {
            // 1. 基础连接测试
            await this.testBasicConnectivity();
            
            // 2. 静态资源测试
            await this.testStaticResources();
            
            // 3. 功能测试
            await this.testFunctionality();
            
            // 4. 性能测试
            await this.testPerformance();
            
            // 5. 安全测试
            await this.testSecurity();
            
            // 6. 可访问性测试
            await this.testAccessibility();
            
            // 7. 浏览器兼容性测试
            await this.testBrowserCompatibility();
            
            // 8. 生成报告
            this.generateReport();
            
        } catch (error) {
            console.error('❌ 部署验证失败:', error.message);
            this.addResult('fail', `验证过程异常: ${error.message}`);
            this.generateReport();
            process.exit(1);
        }
    }

    /**
     * 基础连接测试
     */
    async testBasicConnectivity() {
        console.log('🌐 基础连接测试...');
        
        try {
            // 测试主页面
            const mainPageResponse = await this.testUrl('/', '主页面访问');
            
            // 检查响应时间
            if (mainPageResponse.responseTime < 1000) {
                this.addResult('pass', `主页面响应时间: ${mainPageResponse.responseTime}ms (优秀)`);
            } else if (mainPageResponse.responseTime < 3000) {
                this.addResult('warning', `主页面响应时间: ${mainPageResponse.responseTime}ms (一般)`);
            } else {
                this.addResult('fail', `主页面响应时间: ${mainPageResponse.responseTime}ms (过慢)`);
            }
            
            // 测试 404 处理
            await this.testUrl('/nonexistent-page-12345', '404 页面处理', 404);
            
            // 测试常见路径
            const commonPaths = ['/index.html', '/src/', '/docs/'];
            for (const path of commonPaths) {
                try {
                    await this.testUrl(path, `路径访问: ${path}`, [200, 301, 302, 403, 404]);
                } catch (error) {
                    this.addResult('warning', `路径 ${path} 访问异常: ${error.message}`);
                }
            }
            
        } catch (error) {
            this.addResult('fail', `基础连接测试失败: ${error.message}`);
        }
        
        console.log('   ✅ 基础连接测试完成\n');
    }

    /**
     * 静态资源测试
     */
    async testStaticResources() {
        console.log('📁 静态资源测试...');
        
        const criticalResources = [
            { path: '/src/index.js', name: '主JavaScript文件', critical: true },
            { path: '/src/styles/main.css', name: '主CSS文件', critical: true },
            { path: '/index.html', name: '主HTML文件', critical: true }
        ];
        
        const documentationResources = [
            { path: '/docs/USER_MANUAL.md', name: '用户手册', critical: false },
            { path: '/docs/TECHNICAL_DOCUMENTATION.md', name: '技术文档', critical: false },
            { path: '/docs/API_REFERENCE.md', name: 'API参考', critical: false },
            { path: '/DEPLOYMENT.md', name: '部署指南', critical: false },
            { path: '/README.md', name: '项目说明', critical: false }
        ];
        
        // 测试关键资源
        for (const resource of criticalResources) {
            try {
                const response = await this.testUrl(resource.path, resource.name);
                
                // 记录资源大小
                if (response.body) {
                    const size = Buffer.byteLength(response.body, 'utf8');
                    this.performanceMetrics.resourceSizes[resource.path] = size;
                    this.performanceMetrics.totalSize += size;
                    
                    if (size > 0) {
                        this.addResult('pass', `${resource.name} 大小: ${this.formatBytes(size)}`);
                    } else {
                        this.addResult('warning', `${resource.name} 内容为空`);
                    }
                }
                
            } catch (error) {
                if (resource.critical) {
                    this.addResult('fail', `关键资源 ${resource.name} 无法访问: ${error.message}`);
                } else {
                    this.addResult('warning', `资源 ${resource.name} 无法访问: ${error.message}`);
                }
            }
        }
        
        // 测试文档资源
        for (const resource of documentationResources) {
            try {
                await this.testUrl(resource.path, resource.name);
            } catch (error) {
                this.addResult('warning', `文档 ${resource.name} 无法访问: ${error.message}`);
            }
        }
        
        console.log('   ✅ 静态资源测试完成\n');
    }

    /**
     * 功能测试
     */
    async testFunctionality() {
        console.log('⚙️ 功能测试...');
        
        try {
            // 获取主页面内容
            const mainPageContent = await this.fetchContent('/');
            
            // 检查必要的HTML元素和内容
            const requiredElements = [
                { selector: 'control-panel', name: '控制面板' },
                { selector: 'main-panel', name: '主面板' },
                { selector: 'log-panel', name: '日志面板' },
                { selector: 'P2P 区块链 Playground', name: '应用标题' },
                { selector: 'UIManager', name: 'UI管理器' },
                { selector: 'class App', name: '应用类' }
            ];
            
            for (const element of requiredElements) {
                if (mainPageContent.includes(element.selector)) {
                    this.addResult('pass', `页面包含必要元素: ${element.name}`);
                } else {
                    this.addResult('fail', `页面缺少必要元素: ${element.name}`);
                }
            }
            
            // 检查JavaScript模块加载
            const jsModulePatterns = [
                /import.*from.*['"]\.\/.*\.js['"]/g,
                /export.*class/g,
                /export.*function/g
            ];
            
            let jsModuleCount = 0;
            for (const pattern of jsModulePatterns) {
                const matches = mainPageContent.match(pattern);
                if (matches) {
                    jsModuleCount += matches.length;
                }
            }
            
            if (jsModuleCount > 0) {
                this.addResult('pass', `检测到 ${jsModuleCount} 个JavaScript模块引用`);
            } else {
                this.addResult('warning', '未检测到JavaScript模块引用');
            }
            
            // 检查CSS样式
            if (mainPageContent.includes('.css') || mainPageContent.includes('<style')) {
                this.addResult('pass', 'CSS样式文件正确引用');
            } else {
                this.addResult('warning', 'CSS样式文件引用可能缺失');
            }
            
            // 检查元数据
            const metaChecks = [
                { pattern: /<meta.*charset/i, name: '字符编码' },
                { pattern: /<meta.*viewport/i, name: '视口设置' },
                { pattern: /<title>/i, name: '页面标题' }
            ];
            
            for (const check of metaChecks) {
                if (check.pattern.test(mainPageContent)) {
                    this.addResult('pass', `页面包含${check.name}`);
                } else {
                    this.addResult('warning', `页面缺少${check.name}`);
                }
            }
            
        } catch (error) {
            this.addResult('fail', `功能测试失败: ${error.message}`);
        }
        
        console.log('   ✅ 功能测试完成\n');
    }

    /**
     * 性能测试
     */
    async testPerformance() {
        console.log('⚡ 性能测试...');
        
        try {
            // 测试页面加载时间
            const startTime = Date.now();
            const mainPageContent = await this.fetchContent('/');
            const loadTime = Date.now() - startTime;
            
            this.performanceMetrics.pageLoadTime = loadTime;
            
            if (loadTime < 1000) {
                this.addResult('pass', `页面加载时间: ${loadTime}ms (优秀)`);
            } else if (loadTime < 3000) {
                this.addResult('warning', `页面加载时间: ${loadTime}ms (一般)`);
            } else {
                this.addResult('fail', `页面加载时间: ${loadTime}ms (过慢)`);
            }
            
            // 测试资源大小
            const mainPageSize = Buffer.byteLength(mainPageContent, 'utf8');
            
            if (mainPageSize < 50000) { // 50KB
                this.addResult('pass', `主页面大小: ${this.formatBytes(mainPageSize)} (优秀)`);
            } else if (mainPageSize < 200000) { // 200KB
                this.addResult('warning', `主页面大小: ${this.formatBytes(mainPageSize)} (一般)`);
            } else {
                this.addResult('fail', `主页面大小: ${this.formatBytes(mainPageSize)} (过大)`);
            }
            
            // 测试并发请求性能
            const concurrentRequests = 5;
            const concurrentStartTime = Date.now();
            
            const promises = Array(concurrentRequests).fill().map(() => 
                this.fetchContent('/')
            );
            
            await Promise.all(promises);
            const concurrentTime = Date.now() - concurrentStartTime;
            
            if (concurrentTime < loadTime * 2) {
                this.addResult('pass', `并发请求性能良好: ${concurrentTime}ms`);
            } else {
                this.addResult('warning', `并发请求性能一般: ${concurrentTime}ms`);
            }
            
            // 测试资源压缩
            const headers = await this.fetchHeaders('/');
            if (headers['content-encoding']) {
                this.addResult('pass', `启用了内容压缩: ${headers['content-encoding']}`);
            } else {
                this.addResult('warning', '建议启用Gzip或Brotli压缩');
            }
            
            // 测试缓存策略
            if (headers['cache-control'] || headers['expires']) {
                this.addResult('pass', '配置了缓存策略');
            } else {
                this.addResult('warning', '建议配置适当的缓存策略');
            }
            
        } catch (error) {
            this.addResult('fail', `性能测试失败: ${error.message}`);
        }
        
        console.log('   ✅ 性能测试完成\n');
    }

    /**
     * 安全测试
     */
    async testSecurity() {
        console.log('🔒 安全测试...');
        
        try {
            // 测试HTTPS使用
            if (this.baseUrl.startsWith('https://')) {
                this.addResult('pass', '使用HTTPS安全连接');
            } else {
                this.addResult('warning', '建议使用HTTPS以提高安全性');
            }
            
            // 测试安全头
            const headers = await this.fetchHeaders('/');
            
            for (const [headerName, expectedValue] of Object.entries(this.expectedSecurityHeaders)) {
                const actualValue = headers[headerName];
                
                if (actualValue) {
                    if (expectedValue === true) {
                        // 只要存在即可
                        this.addResult('pass', `安全头存在: ${headerName}`);
                    } else if (Array.isArray(expectedValue)) {
                        // 检查是否为预期值之一
                        if (expectedValue.some(val => actualValue.toLowerCase().includes(val.toLowerCase()))) {
                            this.addResult('pass', `安全头正确: ${headerName} = ${actualValue}`);
                        } else {
                            this.addResult('warning', `安全头值可能不当: ${headerName} = ${actualValue}`);
                        }
                    } else if (actualValue.toLowerCase().includes(expectedValue.toLowerCase())) {
                        this.addResult('pass', `安全头正确: ${headerName} = ${actualValue}`);
                    } else {
                        this.addResult('warning', `安全头值不匹配: ${headerName} = ${actualValue}`);
                    }
                } else {
                    this.addResult('warning', `建议添加安全头: ${headerName}`);
                }
            }
            
            // 测试内容安全策略
            const csp = headers['content-security-policy'];
            if (csp) {
                if (csp.includes("'unsafe-inline'")) {
                    this.addResult('warning', 'CSP允许内联脚本，可能存在XSS风险');
                } else {
                    this.addResult('pass', 'CSP配置较为安全');
                }
            }
            
            // 测试敏感信息泄露
            const mainPageContent = await this.fetchContent('/');
            const sensitivePatterns = [
                { pattern: /password\s*[:=]\s*['"][^'"]+['"]/i, name: '硬编码密码' },
                { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i, name: 'API密钥' },
                { pattern: /secret\s*[:=]\s*['"][^'"]+['"]/i, name: '密钥信息' },
                { pattern: /token\s*[:=]\s*['"][^'"]+['"]/i, name: '访问令牌' }
            ];
            
            for (const { pattern, name } of sensitivePatterns) {
                if (pattern.test(mainPageContent)) {
                    this.addResult('fail', `检测到可能的敏感信息泄露: ${name}`);
                }
            }
            
        } catch (error) {
            this.addResult('fail', `安全测试失败: ${error.message}`);
        }
        
        console.log('   ✅ 安全测试完成\n');
    }

    /**
     * 可访问性测试
     */
    async testAccessibility() {
        console.log('♿ 可访问性测试...');
        
        try {
            const mainPageContent = await this.fetchContent('/');
            
            // 检查基本的可访问性特性
            const accessibilityChecks = [
                { pattern: /<html[^>]*lang=/i, name: '页面语言声明' },
                { pattern: /<img[^>]*alt=/i, name: '图片替代文本' },
                { pattern: /<button[^>]*aria-label=/i, name: '按钮可访问标签' },
                { pattern: /<input[^>]*aria-label=/i, name: '输入框可访问标签' },
                { pattern: /role\s*=/i, name: 'ARIA角色' },
                { pattern: /aria-/i, name: 'ARIA属性' }
            ];
            
            for (const check of accessibilityChecks) {
                if (check.pattern.test(mainPageContent)) {
                    this.addResult('pass', `可访问性特性: ${check.name}`);
                } else {
                    this.addResult('warning', `建议添加可访问性特性: ${check.name}`);
                }
            }
            
            // 检查颜色对比度提示
            if (mainPageContent.includes('color') || mainPageContent.includes('background')) {
                this.addResult('warning', '建议检查颜色对比度是否符合WCAG标准');
            }
            
        } catch (error) {
            this.addResult('warning', `可访问性测试失败: ${error.message}`);
        }
        
        console.log('   ✅ 可访问性测试完成\n');
    }

    /**
     * 浏览器兼容性测试
     */
    async testBrowserCompatibility() {
        console.log('🌐 浏览器兼容性测试...');
        
        try {
            const mainPageContent = await this.fetchContent('/');
            
            // 检查现代JavaScript特性
            const modernFeatures = [
                { pattern: /class\s+\w+/g, name: 'ES6类' },
                { pattern: /const\s+\w+/g, name: 'const声明' },
                { pattern: /let\s+\w+/g, name: 'let声明' },
                { pattern: /=>\s*{/g, name: '箭头函数' },
                { pattern: /async\s+function/g, name: '异步函数' },
                { pattern: /await\s+/g, name: 'await操作符' },
                { pattern: /import\s+.*from/g, name: 'ES6模块' }
            ];
            
            let modernFeatureCount = 0;
            for (const feature of modernFeatures) {
                const matches = mainPageContent.match(feature.pattern);
                if (matches) {
                    modernFeatureCount += matches.length;
                    this.addResult('pass', `使用现代JavaScript特性: ${feature.name} (${matches.length}次)`);
                }
            }
            
            if (modernFeatureCount > 0) {
                this.addResult('warning', '使用了现代JavaScript特性，建议提供polyfill以支持旧浏览器');
            }
            
            // 检查Web API使用
            const webApis = [
                'fetch(',
                'crypto.subtle',
                'localStorage',
                'sessionStorage',
                'addEventListener'
            ];
            
            for (const api of webApis) {
                if (mainPageContent.includes(api)) {
                    this.addResult('pass', `使用Web API: ${api}`);
                }
            }
            
            // 检查响应式设计
            if (mainPageContent.includes('viewport') && mainPageContent.includes('device-width')) {
                this.addResult('pass', '配置了移动端响应式设计');
            } else {
                this.addResult('warning', '建议配置移动端响应式设计');
            }
            
        } catch (error) {
            this.addResult('warning', `浏览器兼容性测试失败: ${error.message}`);
        }
        
        console.log('   ✅ 浏览器兼容性测试完成\n');
    }

    /**
     * 测试URL访问
     */
    async testUrl(path, description, expectedStatus = 200) {
        const startTime = Date.now();
        
        try {
            const response = await this.makeRequest(path);
            const responseTime = Date.now() - startTime;
            
            response.responseTime = responseTime;
            
            const expectedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
            
            if (expectedStatuses.includes(response.statusCode)) {
                this.addResult('pass', `${description}: HTTP ${response.statusCode} (${responseTime}ms)`);
            } else {
                this.addResult('fail', `${description}: 期望 HTTP ${expectedStatuses.join('/')}, 实际 HTTP ${response.statusCode}`);
            }
            
            return response;
        } catch (error) {
            this.addResult('fail', `${description}: 连接失败 - ${error.message}`);
            throw error;
        }
    }

    /**
     * 获取URL内容
     */
    async fetchContent(path) {
        const response = await this.makeRequest(path);
        return response.body;
    }

    /**
     * 获取响应头
     */
    async fetchHeaders(path) {
        const response = await this.makeRequest(path);
        return response.headers;
    }

    /**
     * 发起HTTP请求
     */
    makeRequest(path) {
        return new Promise((resolve, reject) => {
            try {
                const url = new URL(path, this.baseUrl);
                const client = url.protocol === 'https:' ? https : http;
                
                const options = {
                    hostname: url.hostname,
                    port: url.port,
                    path: url.pathname + url.search,
                    method: 'GET',
                    timeout: this.timeout,
                    headers: {
                        'User-Agent': 'EnhancedDeploymentVerifier/1.0.0'
                    }
                };
                
                const req = client.request(options, (res) => {
                    let body = '';
                    
                    res.on('data', (chunk) => {
                        body += chunk;
                    });
                    
                    res.on('end', () => {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: body
                        });
                    });
                });
                
                req.on('error', (error) => {
                    reject(new Error(`请求失败: ${error.message}`));
                });
                
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error(`请求超时 (${this.timeout}ms)`));
                });
                
                req.end();
            } catch (error) {
                reject(new Error(`URL解析失败: ${error.message}`));
            }
        });
    }

    /**
     * 添加测试结果
     */
    addResult(type, message) {
        this.results.tests.push({
            type: type,
            message: message,
            timestamp: new Date().toISOString()
        });
        
        switch (type) {
            case 'pass':
                this.results.passed++;
                break;
            case 'fail':
                this.results.failed++;
                break;
            case 'warning':
                this.results.warnings++;
                break;
        }
    }

    /**
     * 生成验证报告
     */
    generateReport() {
        console.log('📋 部署验证报告');
        console.log('=' .repeat(60));
        
        console.log(`\n🎯 验证目标: ${this.baseUrl}`);
        console.log(`⏰ 验证时间: ${new Date().toLocaleString()}`);
        
        console.log(`\n📊 测试统计:`);
        console.log(`   ✅ 通过: ${this.results.passed}`);
        console.log(`   ❌ 失败: ${this.results.failed}`);
        console.log(`   ⚠️  警告: ${this.results.warnings}`);
        console.log(`   📝 总计: ${this.results.tests.length}`);
        
        // 性能指标
        if (this.performanceMetrics.pageLoadTime > 0) {
            console.log(`\n⚡ 性能指标:`);
            console.log(`   页面加载时间: ${this.performanceMetrics.pageLoadTime}ms`);
            console.log(`   总资源大小: ${this.formatBytes(this.performanceMetrics.totalSize)}`);
        }
        
        // 详细结果
        const failedTests = this.results.tests.filter(t => t.type === 'fail');
        const warningTests = this.results.tests.filter(t => t.type === 'warning');
        
        if (failedTests.length > 0) {
            console.log(`\n❌ 失败的测试:`);
            failedTests.forEach((test, index) => {
                console.log(`   ${index + 1}. ${test.message}`);
            });
        }
        
        if (warningTests.length > 0) {
            console.log(`\n⚠️  警告和建议:`);
            warningTests.slice(0, 10).forEach((test, index) => {
                console.log(`   ${index + 1}. ${test.message}`);
            });
            if (warningTests.length > 10) {
                console.log(`   ... 还有 ${warningTests.length - 10} 个警告`);
            }
        }
        
        // 总体状态
        console.log(`\n🎯 验证结果:`);
        const passRate = ((this.results.passed / this.results.tests.length) * 100).toFixed(1);
        
        if (this.results.failed === 0) {
            if (this.results.warnings === 0) {
                console.log('🎉 部署验证完全通过！应用程序运行正常。');
            } else {
                console.log(`✅ 部署验证基本通过 (通过率: ${passRate}%)，有一些建议改进的地方。`);
            }
        } else {
            console.log(`❌ 部署验证失败 (通过率: ${passRate}%)，需要修复问题后重新部署。`);
        }
        
        // 改进建议
        if (this.results.failed > 0 || this.results.warnings > 0) {
            console.log(`\n💡 改进建议:`);
            if (this.results.failed > 0) {
                console.log('   1. 优先修复所有失败的测试项');
            }
            if (this.results.warnings > 0) {
                console.log('   2. 考虑实施警告中的安全和性能建议');
            }
            console.log('   3. 定期运行此验证脚本确保部署质量');
            console.log('   4. 监控生产环境的实际性能表现');
        }
        
        // 生成详细报告文件
        this.generateDetailedReports();
        
        // 设置退出码
        if (this.results.failed > 0) {
            process.exit(1);
        }
    }

    /**
     * 生成详细报告文件
     */
    generateDetailedReports() {
        // 生成JSON报告
        const jsonReport = {
            timestamp: new Date().toISOString(),
            baseUrl: this.baseUrl,
            results: this.results,
            performanceMetrics: this.performanceMetrics,
            summary: {
                success: this.results.failed === 0,
                totalTests: this.results.tests.length,
                passRate: ((this.results.passed / this.results.tests.length) * 100).toFixed(1),
                criticalIssues: this.results.failed,
                recommendations: this.results.warnings
            }
        };
        
        fs.writeFileSync('deployment-verification-report.json', JSON.stringify(jsonReport, null, 2));
        
        // 生成Markdown报告
        const markdownReport = this.generateMarkdownReport();
        fs.writeFileSync('deployment-verification-report.md', markdownReport);
        
        console.log('\n📄 详细报告已保存:');
        console.log('   - JSON格式: deployment-verification-report.json');
        console.log('   - Markdown格式: deployment-verification-report.md');
    }

    /**
     * 生成Markdown格式的报告
     */
    generateMarkdownReport() {
        const passRate = ((this.results.passed / this.results.tests.length) * 100).toFixed(1);
        
        return `# 部署验证报告

## 基本信息

- **验证目标**: ${this.baseUrl}
- **验证时间**: ${new Date().toLocaleString()}
- **验证工具**: EnhancedDeploymentVerifier v1.0.0

## 测试结果概览

| 指标 | 数值 |
|------|------|
| 总测试数 | ${this.results.tests.length} |
| 通过数量 | ${this.results.passed} |
| 失败数量 | ${this.results.failed} |
| 警告数量 | ${this.results.warnings} |
| 通过率 | ${passRate}% |

## 性能指标

| 指标 | 数值 |
|------|------|
| 页面加载时间 | ${this.performanceMetrics.pageLoadTime}ms |
| 总资源大小 | ${this.formatBytes(this.performanceMetrics.totalSize)} |

## 失败的测试

${this.results.tests.filter(t => t.type === 'fail').map((test, index) => 
    `${index + 1}. ${test.message}`
).join('\n')}

## 警告和建议

${this.results.tests.filter(t => t.type === 'warning').map((test, index) => 
    `${index + 1}. ${test.message}`
).join('\n')}

## 通过的测试

${this.results.tests.filter(t => t.type === 'pass').slice(0, 20).map((test, index) => 
    `${index + 1}. ${test.message}`
).join('\n')}

${this.results.tests.filter(t => t.type === 'pass').length > 20 ? 
    `\n... 还有 ${this.results.tests.filter(t => t.type === 'pass').length - 20} 个通过的测试` : ''}

## 总结

${this.results.failed === 0 ? 
    (this.results.warnings === 0 ? 
        '🎉 部署验证完全通过！应用程序运行正常。' : 
        '✅ 部署验证基本通过，有一些建议改进的地方。'
    ) : 
    '❌ 部署验证失败，需要修复问题后重新部署。'
}

## 改进建议

1. 优先修复所有失败的测试项
2. 考虑实施警告中的安全和性能建议
3. 定期运行验证脚本确保部署质量
4. 监控生产环境的实际性能表现
5. 建立持续集成/持续部署(CI/CD)流程

---

*报告生成时间: ${new Date().toISOString()}*
`;
    }

    /**
     * 格式化字节数
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const verifier = new EnhancedDeploymentVerifier();
    verifier.verify().catch(console.error);
}

module.exports = EnhancedDeploymentVerifier;