#!/usr/bin/env node

/**
 * 代码审查和质量检查脚本
 * P2P 区块链 Playground 代码质量保证工具
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CodeReviewer {
    constructor() {
        this.sourceDir = 'src';
        this.testsDir = 'tests';
        this.docsDir = 'docs';
        
        this.issues = {
            critical: [],
            major: [],
            minor: [],
            suggestions: []
        };
        
        this.metrics = {
            totalFiles: 0,
            totalLines: 0,
            totalFunctions: 0,
            totalClasses: 0,
            testCoverage: 0,
            documentationCoverage: 0
        };
    }

    /**
     * 执行完整的代码审查
     */
    async review() {
        console.log('🔍 开始代码审查...\n');
        
        try {
            // 1. 基础指标收集
            await this.collectMetrics();
            
            // 2. 代码质量检查
            await this.checkCodeQuality();
            
            // 3. 安全性检查
            await this.checkSecurity();
            
            // 4. 性能检查
            await this.checkPerformance();
            
            // 5. 文档检查
            await this.checkDocumentation();
            
            // 6. 测试覆盖率检查
            await this.checkTestCoverage();
            
            // 7. 依赖检查
            await this.checkDependencies();
            
            // 8. 生成报告
            this.generateReport();
            
        } catch (error) {
            console.error('❌ 代码审查失败:', error.message);
            process.exit(1);
        }
    }

    /**
     * 收集基础指标
     */
    async collectMetrics() {
        console.log('📊 收集代码指标...');
        
        const jsFiles = this.getJavaScriptFiles();
        
        for (const file of jsFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');
            
            this.metrics.totalFiles++;
            this.metrics.totalLines += lines.length;
            
            // 统计函数数量
            const functionMatches = content.match(/function\s+\w+|=>\s*{|async\s+function/g);
            if (functionMatches) {
                this.metrics.totalFunctions += functionMatches.length;
            }
            
            // 统计类数量
            const classMatches = content.match(/class\s+\w+/g);
            if (classMatches) {
                this.metrics.totalClasses += classMatches.length;
            }
        }
        
        console.log(`   📁 文件数量: ${this.metrics.totalFiles}`);
        console.log(`   📄 代码行数: ${this.metrics.totalLines}`);
        console.log(`   🔧 函数数量: ${this.metrics.totalFunctions}`);
        console.log(`   🏗️  类数量: ${this.metrics.totalClasses}`);
    }

    /**
     * 代码质量检查
     */
    async checkCodeQuality() {
        console.log('\n🔍 代码质量检查...');
        
        const jsFiles = this.getJavaScriptFiles();
        
        for (const file of jsFiles) {
            await this.checkFileQuality(file);
        }
        
        console.log(`   ✅ 检查了 ${jsFiles.length} 个文件`);
    }

    /**
     * 检查单个文件的质量
     */
    async checkFileQuality(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const relativePath = path.relative(process.cwd(), filePath);
        
        // 检查文件头注释
        if (!content.startsWith('/**') && !content.startsWith('/*')) {
            this.issues.minor.push({
                file: relativePath,
                line: 1,
                type: 'missing-file-header',
                message: '缺少文件头注释'
            });
        }
        
        // 检查函数注释
        const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(\w+)\s*[:=]\s*(?:async\s+)?(?:\([^)]*\)\s*=>|\([^)]*\)\s*{)/g;
        let match;
        
        while ((match = functionRegex.exec(content)) !== null) {
            const functionName = match[1] || match[2];
            const lineNumber = content.substring(0, match.index).split('\n').length;
            
            // 检查函数前是否有注释
            const prevLines = lines.slice(Math.max(0, lineNumber - 5), lineNumber - 1);
            const hasComment = prevLines.some(line => 
                line.trim().startsWith('/**') || 
                line.trim().startsWith('*') || 
                line.trim().startsWith('//')
            );
            
            if (!hasComment && !functionName.startsWith('_')) {
                this.issues.minor.push({
                    file: relativePath,
                    line: lineNumber,
                    type: 'missing-function-comment',
                    message: `函数 ${functionName} 缺少注释`
                });
            }
        }
        
        // 检查长函数
        const functionBodies = this.extractFunctionBodies(content);
        for (const func of functionBodies) {
            if (func.lines > 50) {
                this.issues.major.push({
                    file: relativePath,
                    line: func.startLine,
                    type: 'long-function',
                    message: `函数 ${func.name} 过长 (${func.lines} 行)，建议拆分`
                });
            }
        }
        
        // 检查复杂的条件语句
        const complexConditions = content.match(/if\s*\([^)]*&&[^)]*&&[^)]*\)/g);
        if (complexConditions && complexConditions.length > 0) {
            this.issues.minor.push({
                file: relativePath,
                type: 'complex-condition',
                message: `发现 ${complexConditions.length} 个复杂条件语句，建议简化`
            });
        }
        
        // 检查 console.log
        const consoleMatches = content.match(/console\.(log|warn|error)/g);
        if (consoleMatches && consoleMatches.length > 5) {
            this.issues.minor.push({
                file: relativePath,
                type: 'too-many-console',
                message: `过多的 console 语句 (${consoleMatches.length})，考虑使用日志系统`
            });
        }
        
        // 检查 TODO 和 FIXME
        const todoMatches = content.match(/\/\/\s*(TODO|FIXME|HACK):/gi);
        if (todoMatches) {
            this.issues.suggestions.push({
                file: relativePath,
                type: 'todo-comment',
                message: `发现 ${todoMatches.length} 个待办事项注释`
            });
        }
    }

    /**
     * 安全性检查
     */
    async checkSecurity() {
        console.log('\n🔒 安全性检查...');
        
        const jsFiles = this.getJavaScriptFiles();
        
        for (const file of jsFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const relativePath = path.relative(process.cwd(), file);
            
            // 检查 eval 使用
            if (content.includes('eval(')) {
                this.issues.critical.push({
                    file: relativePath,
                    type: 'eval-usage',
                    message: '使用了 eval()，存在安全风险'
                });
            }
            
            // 检查 innerHTML 使用
            if (content.includes('.innerHTML')) {
                this.issues.major.push({
                    file: relativePath,
                    type: 'innerHTML-usage',
                    message: '使用了 innerHTML，可能存在 XSS 风险'
                });
            }
            
            // 检查硬编码密钥
            const keyPatterns = [
                /password\s*[:=]\s*['"][^'"]+['"]/i,
                /secret\s*[:=]\s*['"][^'"]+['"]/i,
                /key\s*[:=]\s*['"][^'"]+['"]/i
            ];
            
            for (const pattern of keyPatterns) {
                if (pattern.test(content)) {
                    this.issues.critical.push({
                        file: relativePath,
                        type: 'hardcoded-secret',
                        message: '可能包含硬编码的敏感信息'
                    });
                }
            }
        }
        
        console.log('   ✅ 安全检查完成');
    }

    /**
     * 性能检查
     */
    async checkPerformance() {
        console.log('\n⚡ 性能检查...');
        
        const jsFiles = this.getJavaScriptFiles();
        
        for (const file of jsFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const relativePath = path.relative(process.cwd(), file);
            
            // 检查同步操作
            const syncPatterns = [
                /fs\.readFileSync/g,
                /fs\.writeFileSync/g,
                /JSON\.parse.*fs\.readFileSync/g
            ];
            
            for (const pattern of syncPatterns) {
                const matches = content.match(pattern);
                if (matches) {
                    this.issues.major.push({
                        file: relativePath,
                        type: 'sync-operation',
                        message: `发现 ${matches.length} 个同步操作，可能影响性能`
                    });
                }
            }
            
            // 检查循环中的异步操作
            const asyncInLoopPattern = /for\s*\([^)]*\)\s*{[^}]*await[^}]*}/g;
            if (asyncInLoopPattern.test(content)) {
                this.issues.major.push({
                    file: relativePath,
                    type: 'async-in-loop',
                    message: '循环中使用 await，考虑使用 Promise.all()'
                });
            }
            
            // 检查大型对象创建
            const largeObjectPattern = /{\s*[^}]{200,}}/g;
            const largeObjects = content.match(largeObjectPattern);
            if (largeObjects && largeObjects.length > 0) {
                this.issues.minor.push({
                    file: relativePath,
                    type: 'large-object',
                    message: `发现 ${largeObjects.length} 个大型对象字面量`
                });
            }
        }
        
        console.log('   ✅ 性能检查完成');
    }

    /**
     * 文档检查
     */
    async checkDocumentation() {
        console.log('\n📚 文档检查...');
        
        const requiredDocs = [
            'README.md',
            'DEPLOYMENT.md',
            'docs/USER_MANUAL.md',
            'docs/TECHNICAL_DOCUMENTATION.md',
            'docs/API_REFERENCE.md'
        ];
        
        let existingDocs = 0;
        
        for (const doc of requiredDocs) {
            if (fs.existsSync(doc)) {
                existingDocs++;
                
                // 检查文档内容
                const content = fs.readFileSync(doc, 'utf8');
                if (content.length < 100) {
                    this.issues.minor.push({
                        file: doc,
                        type: 'incomplete-doc',
                        message: '文档内容过少，可能不完整'
                    });
                }
            } else {
                this.issues.major.push({
                    file: doc,
                    type: 'missing-doc',
                    message: '缺少必要文档'
                });
            }
        }
        
        this.metrics.documentationCoverage = (existingDocs / requiredDocs.length) * 100;
        
        console.log(`   📖 文档覆盖率: ${this.metrics.documentationCoverage.toFixed(1)}%`);
    }

    /**
     * 测试覆盖率检查
     */
    async checkTestCoverage() {
        console.log('\n🧪 测试覆盖率检查...');
        
        try {
            // 运行测试覆盖率
            const result = execSync('npm run test:coverage', { 
                encoding: 'utf8',
                stdio: 'pipe'
            });
            
            // 解析覆盖率结果
            const coverageMatch = result.match(/All files\s+\|\s+([\d.]+)/);
            if (coverageMatch) {
                this.metrics.testCoverage = parseFloat(coverageMatch[1]);
            }
            
            console.log(`   🎯 测试覆盖率: ${this.metrics.testCoverage.toFixed(1)}%`);
            
            if (this.metrics.testCoverage < 80) {
                this.issues.major.push({
                    type: 'low-test-coverage',
                    message: `测试覆盖率过低 (${this.metrics.testCoverage.toFixed(1)}%)，建议提高到 80% 以上`
                });
            }
            
        } catch (error) {
            this.issues.major.push({
                type: 'test-coverage-failed',
                message: '无法获取测试覆盖率信息'
            });
        }
    }

    /**
     * 依赖检查
     */
    async checkDependencies() {
        console.log('\n📦 依赖检查...');
        
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            
            // 检查依赖数量
            const devDeps = Object.keys(packageJson.devDependencies || {});
            const deps = Object.keys(packageJson.dependencies || {});
            
            console.log(`   📚 开发依赖: ${devDeps.length}`);
            console.log(`   📦 生产依赖: ${deps.length}`);
            
            // 检查未使用的依赖
            const allDeps = [...devDeps, ...deps];
            const jsFiles = this.getJavaScriptFiles();
            const usedDeps = new Set();
            
            for (const file of jsFiles) {
                const content = fs.readFileSync(file, 'utf8');
                
                for (const dep of allDeps) {
                    if (content.includes(`'${dep}'`) || content.includes(`"${dep}"`)) {
                        usedDeps.add(dep);
                    }
                }
            }
            
            const unusedDeps = allDeps.filter(dep => !usedDeps.has(dep));
            if (unusedDeps.length > 0) {
                this.issues.minor.push({
                    type: 'unused-dependencies',
                    message: `可能存在未使用的依赖: ${unusedDeps.join(', ')}`
                });
            }
            
        } catch (error) {
            this.issues.minor.push({
                type: 'dependency-check-failed',
                message: '依赖检查失败'
            });
        }
        
        console.log('   ✅ 依赖检查完成');
    }

    /**
     * 生成报告
     */
    generateReport() {
        console.log('\n📋 生成代码审查报告...\n');
        
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
        console.log('📊 代码审查报告');
        console.log('=' .repeat(60));
        
        // 基础指标
        console.log('\n📈 基础指标:');
        console.log(`   文件数量: ${this.metrics.totalFiles}`);
        console.log(`   代码行数: ${this.metrics.totalLines}`);
        console.log(`   函数数量: ${this.metrics.totalFunctions}`);
        console.log(`   类数量: ${this.metrics.totalClasses}`);
        console.log(`   测试覆盖率: ${this.metrics.testCoverage.toFixed(1)}%`);
        console.log(`   文档覆盖率: ${this.metrics.documentationCoverage.toFixed(1)}%`);
        
        // 问题统计
        console.log('\n🚨 问题统计:');
        console.log(`   严重问题: ${this.issues.critical.length}`);
        console.log(`   重要问题: ${this.issues.major.length}`);
        console.log(`   一般问题: ${this.issues.minor.length}`);
        console.log(`   建议改进: ${this.issues.suggestions.length}`);
        
        // 详细问题
        if (this.issues.critical.length > 0) {
            console.log('\n🔴 严重问题:');
            this.issues.critical.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue.message}`);
                if (issue.file) console.log(`      文件: ${issue.file}`);
                if (issue.line) console.log(`      行号: ${issue.line}`);
            });
        }
        
        if (this.issues.major.length > 0) {
            console.log('\n🟡 重要问题:');
            this.issues.major.slice(0, 5).forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue.message}`);
                if (issue.file) console.log(`      文件: ${issue.file}`);
            });
            if (this.issues.major.length > 5) {
                console.log(`   ... 还有 ${this.issues.major.length - 5} 个问题`);
            }
        }
        
        // 总体评分
        const score = this.calculateScore();
        console.log(`\n⭐ 总体评分: ${score}/100`);
        
        if (score >= 90) {
            console.log('🎉 代码质量优秀！');
        } else if (score >= 80) {
            console.log('👍 代码质量良好，有少量改进空间');
        } else if (score >= 70) {
            console.log('⚠️  代码质量一般，建议进行改进');
        } else {
            console.log('❌ 代码质量需要大幅改进');
        }
        
        console.log('\n📄 详细报告已保存到: code-review-report.md');
        console.log('📊 JSON 报告已保存到: code-review-report.json');
    }

    /**
     * 生成详细报告文件
     */
    generateDetailedReport() {
        const report = `# 代码审查报告

生成时间: ${new Date().toLocaleString()}

## 📊 基础指标

| 指标 | 数值 |
|------|------|
| 文件数量 | ${this.metrics.totalFiles} |
| 代码行数 | ${this.metrics.totalLines} |
| 函数数量 | ${this.metrics.totalFunctions} |
| 类数量 | ${this.metrics.totalClasses} |
| 测试覆盖率 | ${this.metrics.testCoverage.toFixed(1)}% |
| 文档覆盖率 | ${this.metrics.documentationCoverage.toFixed(1)}% |

## 🚨 问题统计

| 级别 | 数量 |
|------|------|
| 严重问题 | ${this.issues.critical.length} |
| 重要问题 | ${this.issues.major.length} |
| 一般问题 | ${this.issues.minor.length} |
| 建议改进 | ${this.issues.suggestions.length} |

## 🔴 严重问题

${this.issues.critical.map((issue, index) => 
    `### ${index + 1}. ${issue.message}
- **文件**: ${issue.file || 'N/A'}
- **行号**: ${issue.line || 'N/A'}
- **类型**: ${issue.type}
`).join('\n')}

## 🟡 重要问题

${this.issues.major.map((issue, index) => 
    `### ${index + 1}. ${issue.message}
- **文件**: ${issue.file || 'N/A'}
- **行号**: ${issue.line || 'N/A'}
- **类型**: ${issue.type}
`).join('\n')}

## 🔵 一般问题

${this.issues.minor.slice(0, 10).map((issue, index) => 
    `### ${index + 1}. ${issue.message}
- **文件**: ${issue.file || 'N/A'}
- **类型**: ${issue.type}
`).join('\n')}

${this.issues.minor.length > 10 ? `\n... 还有 ${this.issues.minor.length - 10} 个一般问题` : ''}

## 💡 建议改进

${this.issues.suggestions.map((issue, index) => 
    `### ${index + 1}. ${issue.message}
- **文件**: ${issue.file || 'N/A'}
- **类型**: ${issue.type}
`).join('\n')}

## ⭐ 总体评分

**评分**: ${this.calculateScore()}/100

### 评分说明
- 90-100: 优秀
- 80-89: 良好
- 70-79: 一般
- 60-69: 需要改进
- <60: 需要大幅改进

## 📝 改进建议

1. **优先处理严重问题**: 立即修复所有严重问题
2. **逐步解决重要问题**: 制定计划逐步解决重要问题
3. **提高测试覆盖率**: 目标覆盖率应达到 80% 以上
4. **完善文档**: 确保所有必要文档都存在且内容完整
5. **代码规范**: 统一代码风格和命名规范
6. **性能优化**: 关注性能问题，特别是异步操作的使用

## 🔧 工具建议

- 使用 ESLint 进行代码质量检查
- 使用 Prettier 进行代码格式化
- 使用 JSDoc 生成 API 文档
- 使用 Husky 设置 Git hooks
- 使用 SonarQube 进行持续代码质量监控
`;
        
        fs.writeFileSync('code-review-report.md', report);
    }

    /**
     * 生成 JSON 报告
     */
    generateJsonReport() {
        const report = {
            timestamp: new Date().toISOString(),
            metrics: this.metrics,
            issues: this.issues,
            score: this.calculateScore(),
            summary: {
                totalIssues: this.issues.critical.length + this.issues.major.length + this.issues.minor.length,
                criticalIssues: this.issues.critical.length,
                majorIssues: this.issues.major.length,
                minorIssues: this.issues.minor.length,
                suggestions: this.issues.suggestions.length
            }
        };
        
        fs.writeFileSync('code-review-report.json', JSON.stringify(report, null, 2));
    }

    /**
     * 计算总体评分
     */
    calculateScore() {
        let score = 100;
        
        // 扣分规则
        score -= this.issues.critical.length * 20; // 严重问题每个扣20分
        score -= this.issues.major.length * 10;    // 重要问题每个扣10分
        score -= this.issues.minor.length * 2;     // 一般问题每个扣2分
        
        // 测试覆盖率影响
        if (this.metrics.testCoverage < 80) {
            score -= (80 - this.metrics.testCoverage) * 0.5;
        }
        
        // 文档覆盖率影响
        if (this.metrics.documentationCoverage < 80) {
            score -= (80 - this.metrics.documentationCoverage) * 0.3;
        }
        
        return Math.max(0, Math.round(score));
    }

    /**
     * 工具方法
     */
    
    getJavaScriptFiles() {
        const files = [];
        
        function traverse(dir) {
            if (!fs.existsSync(dir)) return;
            
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    traverse(fullPath);
                } else if (entry.isFile() && entry.name.endsWith('.js')) {
                    files.push(fullPath);
                }
            }
        }
        
        traverse(this.sourceDir);
        traverse(this.testsDir);
        
        return files;
    }
    
    extractFunctionBodies(content) {
        const functions = [];
        const lines = content.split('\n');
        
        // 简化的函数提取逻辑
        const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(\w+)\s*[:=]\s*(?:async\s+)?(?:\([^)]*\)\s*=>|\([^)]*\)\s*{)/g;
        let match;
        
        while ((match = functionRegex.exec(content)) !== null) {
            const functionName = match[1] || match[2];
            const startLine = content.substring(0, match.index).split('\n').length;
            
            // 简单估算函数长度（实际实现会更复杂）
            let braceCount = 0;
            let endLine = startLine;
            let started = false;
            
            for (let i = startLine - 1; i < lines.length; i++) {
                const line = lines[i];
                
                if (line.includes('{')) {
                    braceCount += (line.match(/{/g) || []).length;
                    started = true;
                }
                
                if (line.includes('}')) {
                    braceCount -= (line.match(/}/g) || []).length;
                }
                
                if (started && braceCount === 0) {
                    endLine = i + 1;
                    break;
                }
            }
            
            functions.push({
                name: functionName,
                startLine: startLine,
                endLine: endLine,
                lines: endLine - startLine + 1
            });
        }
        
        return functions;
    }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
    const reviewer = new CodeReviewer();
    reviewer.review().catch(console.error);
}

export default CodeReviewer;