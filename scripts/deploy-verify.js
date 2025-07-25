#!/usr/bin/env node

/**
 * 部署验证脚本
 * P2P 区块链 Playground 部署后验证工具
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

class DeploymentVerifier {
    constructor(baseUrl = 'http://localhost:8080') {
        this.baseUrl = baseUrl;
        this.results = {
            passed: [],
            failed: [],
            warnings: []
        };
    }

    /**
     * 执行完整的部署验证
     */
    async verify() {
        console.log('🔍 开始部署验证...\n');
        console.log(`📍 验证地址: ${this.baseUrl}\n`);
        
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
            
            // 6. 兼容性测试
            await this.testCompatibility();
            
            // 7. 生成报告
            this.generateReport();
            
        } catch (error) {
            console.error('❌ 部署验证失败:', error.message);
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
            const response = await this.makeRequest('/');
            
            if (response.statusCode === 200) {
                this.results.passed.push('主页面可访问');
                console.log('   ✅ 主页面响应正常');
            } else {
                this.results.failed.push(`主页面返回状态码: ${response.statusCode}`);
                console.log(`   ❌ 主页面返回状态码: ${response.statusCode}`);
            }
            
            // 检查响应头
            const contentType = response.headers['content-type'];
            if (contentType && contentType.includes('text/html')) {
                this.results.passed.push('Content-Type 正确');
            } else {
                this.results.warnings.push(`Content-Type 可能不正确: ${contentType}`);
            }
            
            // 检查响应时间
            if (response.responseTime < 1000) {
                this.results.passed.push('响应时间良好');
                console.log(`   ⚡ 响应时间: ${response.responseTime}ms`);
            } else {
                this.results.warnings.push(`响应时间较慢: ${response.responseTime}ms`);
            }
            
        } catch (error) {
            this.results.failed.push(`连接失败: ${error.message}`);
            console.log(`   ❌ 连接失败: ${error.message}`);
        }
    }

    /**
     * 静态资源测试
     */
    async testStaticResources() {
        console.log('\n📁 静态资源测试...');
        
        const resources = [
            '/src/index.js',
            '/src/styles/main.css',
            '/docs/USER_MANUAL.md',
            '/docs/TECHNICAL_DOCUMENTATION.md',
            '/docs/API_REFERENCE.md'
        ];
        
        for (const resource of resources) {
            try {
                const response = await this.makeRequest(resource);
                
                if (response.statusCode === 200) {
                    this.results.passed.push(`资源可访问: ${resource}`);
                    console.log(`   ✅ ${resource}`);
                } else if (response.statusCode === 404) {
                    this.results.failed.push(`资源不存在: ${resource}`);
                    console.log(`   ❌ ${resource} (404)`);
                } else {
                    this.results.warnings.push(`资源状态异常: ${resource} (${response.statusCode})`);
                    console.log(`   ⚠️  ${resource} (${response.statusCode})`);
                }
            } catch (error) {
                this.results.failed.push(`资源访问失败: ${resource} - ${error.message}`);
                console.log(`   ❌ ${resource} - ${error.message}`);
            }
        }
    }

    /**
     * 功能测试
     */
    async testFunctionality() {
        console.log('\n⚙️ 功能测试...');
        
        try {
            // 获取主页面内容
            const response = await this.makeRequest('/');
            const html = response.body;
            
            // 检查必要的 DOM 元素
            const requiredElements = [
                'control-panel',
                'main-panel',
                'log-panel'
            ];
            
            for (const elementId of requiredElements) {
                if (html.includes(`id="${elementId}"`)) {
                    this.results.passed.push(`UI 元素存在: ${elementId}`);
                    console.log(`   ✅ ${elementId}`);
                } else {
                    this.results.failed.push(`UI 元素缺失: ${elementId}`);
                    console.log(`   ❌ ${elementId}`);
                }
            }
            
            // 检查 JavaScript 模块加载
            if (html.includes('type="module"')) {
                this.results.passed.push('ES6 模块支持');
                console.log('   ✅ ES6 模块支持');
            } else {
                this.results.warnings.push('可能缺少 ES6 模块支持');
            }
            
            // 检查 CSS 样式
            if (html.includes('main.css')) {
                this.results.passed.push('CSS 样式文件引用');
                console.log('   ✅ CSS 样式文件引用');
            } else {
                this.results.warnings.push('可能缺少 CSS 样式文件');
            }
            
        } catch (error) {
            this.results.failed.push(`功能测试失败: ${error.message}`);
            console.log(`   ❌ 功能测试失败: ${error.message}`);
        }
    }

    /**
     * 性能测试
     */
    async testPerformance() {
        console.log('\n⚡ 性能测试...');
        
        try {
            // 测试多次请求的平均响应时间
            const iterations = 5;
            const times = [];
            
            for (let i = 0; i < iterations; i++) {
                const response = await this.makeRequest('/');
                times.push(response.responseTime);
            }
            
            const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
            const maxTime = Math.max(...times);
            const minTime = Math.min(...times);
            
            console.log(`   📊 平均响应时间: ${avgTime.toFixed(2)}ms`);
            console.log(`   📊 最快响应时间: ${minTime}ms`);
            console.log(`   📊 最慢响应时间: ${maxTime}ms`);
            
            if (avgTime < 500) {
                this.results.passed.push(`性能良好 (平均 ${avgTime.toFixed(2)}ms)`);
            } else if (avgTime < 1000) {
                this.results.warnings.push(`性能一般 (平均 ${avgTime.toFixed(2)}ms)`);
            } else {
                this.results.failed.push(`性能较差 (平均 ${avgTime.toFixed(2)}ms)`);
            }
            
            // 测试资源大小
            const response = await this.makeRequest('/');
            const contentLength = response.headers['content-length'];
            
            if (contentLength) {
                const sizeKB = parseInt(contentLength) / 1024;
                console.log(`   📦 主页面大小: ${sizeKB.toFixed(2)} KB`);
                
                if (sizeKB < 100) {
                    this.results.passed.push(`页面大小合理 (${sizeKB.toFixed(2)} KB)`);
                } else {
                    this.results.warnings.push(`页面较大 (${sizeKB.toFixed(2)} KB)`);
                }
            }
            
        } catch (error) {
            this.results.failed.push(`性能测试失败: ${error.message}`);
            console.log(`   ❌ 性能测试失败: ${error.message}`);
        }
    }

    /**
     * 安全测试
     */
    async testSecurity() {
        console.log('\n🔒 安全测试...');
        
        try {
            const response = await this.makeRequest('/');
            const headers = response.headers;
            
            // 检查安全头
            const securityHeaders = {
                'x-content-type-options': 'nosniff',
                'x-frame-options': ['DENY', 'SAMEORIGIN'],
                'x-xss-protection': '1; mode=block'
            };
            
            for (const [header, expectedValue] of Object.entries(securityHeaders)) {
                const actualValue = headers[header];
                
                if (actualValue) {
                    if (Array.isArray(expectedValue)) {
                        if (expectedValue.includes(actualValue)) {
                            this.results.passed.push(`安全头正确: ${header}`);
                            console.log(`   ✅ ${header}: ${actualValue}`);
                        } else {
                            this.results.warnings.push(`安全头值可能不当: ${header}=${actualValue}`);
                        }
                    } else {
                        if (actualValue === expectedValue) {
                            this.results.passed.push(`安全头正确: ${header}`);
                            console.log(`   ✅ ${header}: ${actualValue}`);
                        } else {
                            this.results.warnings.push(`安全头值不匹配: ${header}=${actualValue}`);
                        }
                    }
                } else {
                    this.results.warnings.push(`缺少安全头: ${header}`);
                    console.log(`   ⚠️  缺少安全头: ${header}`);
                }
            }
            
            // 检查 HTTPS
            if (this.baseUrl.startsWith('https://')) {
                this.results.passed.push('使用 HTTPS 连接');
                console.log('   ✅ 使用 HTTPS 连接');
            } else {
                this.results.warnings.push('建议使用 HTTPS 连接');
                console.log('   ⚠️  建议使用 HTTPS 连接');
            }
            
        } catch (error) {
            this.results.failed.push(`安全测试失败: ${error.message}`);
            console.log(`   ❌ 安全测试失败: ${error.message}`);
        }
    }

    /**
     * 兼容性测试
     */
    async testCompatibility() {
        console.log('\n🌍 兼容性测试...');
        
        try {
            const response = await this.makeRequest('/');
            const html = response.body;
            
            // 检查现代浏览器特性
            const modernFeatures = [
                'crypto.subtle',
                'fetch',
                'Promise',
                'Map',
                'Set'
            ];
            
            let modernFeatureCount = 0;
            for (const feature of modernFeatures) {
                if (html.includes(feature)) {
                    modernFeatureCount++;
                }
            }
            
            if (modernFeatureCount > 0) {
                this.results.passed.push(`使用现代浏览器特性 (${modernFeatureCount}/${modernFeatures.length})`);
                console.log(`   ✅ 现代浏览器特性: ${modernFeatureCount}/${modernFeatures.length}`);
            }
            
            // 检查 ES6 模块
            if (html.includes('type="module"')) {
                this.results.passed.push('ES6 模块兼容性');
                console.log('   ✅ ES6 模块兼容性');
            } else {
                this.results.warnings.push('可能存在 ES6 模块兼容性问题');
            }
            
            // 检查响应式设计
            if (html.includes('viewport') && html.includes('device-width')) {
                this.results.passed.push('响应式设计支持');
                console.log('   ✅ 响应式设计支持');
            } else {
                this.results.warnings.push('可能缺少响应式设计支持');
            }
            
        } catch (error) {
            this.results.failed.push(`兼容性测试失败: ${error.message}`);
            console.log(`   ❌ 兼容性测试失败: ${error.message}`);
        }
    }

    /**
     * 生成报告
     */
    generateReport() {
        console.log('\n📋 生成验证报告...\n');
        
        // 控制台报告
        this.printConsoleReport();
        
        // 生成详细报告文件
        this.generateDetailedReport();
        
        // 生成 JSON 报告
        this.generateJsonReport();
    }

    /**
     * 打印控制台报告
     */
    printConsoleReport() {
        console.log('=' .repeat(60));
        console.log('📊 部署验证报告');
        console.log('=' .repeat(60));
        
        console.log(`\n🌐 验证地址: ${this.baseUrl}`);
        console.log(`⏰ 验证时间: ${new Date().toLocaleString()}`);
        
        console.log('\n📈 验证结果:');
        console.log(`   ✅ 通过: ${this.results.passed.length}`);
        console.log(`   ⚠️  警告: ${this.results.warnings.length}`);
        console.log(`   ❌ 失败: ${this.results.failed.length}`);
        
        if (this.results.failed.length > 0) {
            console.log('\n❌ 失败项目:');
            this.results.failed.forEach((item, index) => {
                console.log(`   ${index + 1}. ${item}`);
            });
        }
        
        if (this.results.warnings.length > 0) {
            console.log('\n⚠️  警告项目:');
            this.results.warnings.forEach((item, index) => {
                console.log(`   ${index + 1}. ${item}`);
            });
        }
        
        // 总体状态
        const totalTests = this.results.passed.length + this.results.warnings.length + this.results.failed.length;
        const successRate = (this.results.passed.length / totalTests * 100).toFixed(1);
        
        console.log(`\n📊 成功率: ${successRate}%`);
        
        if (this.results.failed.length === 0) {
            if (this.results.warnings.length === 0) {
                console.log('🎉 部署验证完全通过！');
            } else {
                console.log('✅ 部署验证基本通过，有少量警告');
            }
        } else {
            console.log('❌ 部署验证存在问题，需要修复');
        }
        
        console.log('\n📄 详细报告已保存到: deployment-verification-report.md');
        console.log('📊 JSON 报告已保存到: deployment-verification-report.json');
    }

    /**
     * 生成详细报告文件
     */
    generateDetailedReport() {
        const report = `# 部署验证报告

## 基本信息

- **验证地址**: ${this.baseUrl}
- **验证时间**: ${new Date().toLocaleString()}
- **验证工具**: P2P 区块链 Playground 部署验证器

## 验证结果统计

| 状态 | 数量 |
|------|------|
| ✅ 通过 | ${this.results.passed.length} |
| ⚠️ 警告 | ${this.results.warnings.length} |
| ❌ 失败 | ${this.results.failed.length} |

## ✅ 通过项目

${this.results.passed.map((item, index) => `${index + 1}. ${item}`).join('\n')}

## ⚠️ 警告项目

${this.results.warnings.map((item, index) => `${index + 1}. ${item}`).join('\n')}

## ❌ 失败项目

${this.results.failed.map((item, index) => `${index + 1}. ${item}`).join('\n')}

## 建议

### 立即修复
${this.results.failed.length > 0 ? 
    '- 修复所有失败项目\n- 确保基础功能正常工作' : 
    '- 无需立即修复的问题'}

### 优化建议
${this.results.warnings.length > 0 ? 
    '- 处理警告项目以提升用户体验\n- 考虑添加缺失的安全头\n- 优化性能表现' : 
    '- 部署状态良好，无需特别优化'}

### 监控建议
- 定期运行部署验证
- 监控网站可用性
- 关注性能指标变化
- 及时更新安全配置

## 总结

${this.results.failed.length === 0 ? 
    (this.results.warnings.length === 0 ? 
        '🎉 部署验证完全通过！网站已准备好为用户提供服务。' : 
        '✅ 部署验证基本通过，建议处理警告项目以获得更好的用户体验。') : 
    '❌ 部署验证存在问题，请优先修复失败项目后再上线。'}

---

*此报告由 P2P 区块链 Playground 部署验证器自动生成*
`;
        
        fs.writeFileSync('deployment-verification-report.md', report);
    }

    /**
     * 生成 JSON 报告
     */
    generateJsonReport() {
        const report = {
            timestamp: new Date().toISOString(),
            baseUrl: this.baseUrl,
            results: this.results,
            summary: {
                total: this.results.passed.length + this.results.warnings.length + this.results.failed.length,
                passed: this.results.passed.length,
                warnings: this.results.warnings.length,
                failed: this.results.failed.length,
                successRate: ((this.results.passed.length / (this.results.passed.length + this.results.warnings.length + this.results.failed.length)) * 100).toFixed(1)
            },
            status: this.results.failed.length === 0 ? 
                (this.results.warnings.length === 0 ? 'PERFECT' : 'GOOD') : 
                'FAILED'
        };
        
        fs.writeFileSync('deployment-verification-report.json', JSON.stringify(report, null, 2));
    }

    /**
     * 发起 HTTP 请求
     */
    async makeRequest(path) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            const client = url.protocol === 'https:' ? https : http;
            
            const startTime = Date.now();
            
            const req = client.request(url, (res) => {
                let body = '';
                
                res.on('data', (chunk) => {
                    body += chunk;
                });
                
                res.on('end', () => {
                    const responseTime = Date.now() - startTime;
                    
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body,
                        responseTime: responseTime
                    });
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('请求超时'));
            });
            
            req.end();
        });
    }
}

// 命令行参数处理
const args = process.argv.slice(2);
const baseUrl = args[0] || 'http://localhost:8080';

// 如果直接运行此脚本
if (require.main === module) {
    const verifier = new DeploymentVerifier(baseUrl);
    verifier.verify().catch(console.error);
}

module.exports = DeploymentVerifier;