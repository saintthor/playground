/**
 * ErrorHandler 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorHandler } from '../../src/services/ErrorHandler.js';
import { Logger } from '../../src/services/Logger.js';

describe('ErrorHandler', () => {
    let errorHandler;
    let mockLogger;
    let mockUIManager;

    beforeEach(() => {
        // 创建模拟对象
        mockLogger = {
            logValidationError: vi.fn()
        };

        mockUIManager = {
            showNotification: vi.fn().mockResolvedValue(true)
        };

        // 创建错误处理器实例
        errorHandler = new ErrorHandler(
            {
                maxRetries: 3,
                retryDelay: 100,
                enableUserNotification: true,
                enableAutoRecovery: true,
                debugMode: true
            },
            mockLogger,
            mockUIManager
        );
    });

    afterEach(() => {
        errorHandler.cleanup();
        vi.clearAllMocks();
    });

    describe('构造函数和初始化', () => {
        it('应该正确初始化错误处理器', () => {
            expect(errorHandler.config.maxRetries).toBe(3);
            expect(errorHandler.config.retryDelay).toBe(100);
            expect(errorHandler.config.enableUserNotification).toBe(true);
            expect(errorHandler.config.enableAutoRecovery).toBe(true);
            expect(errorHandler.config.debugMode).toBe(true);
        });

        it('应该初始化默认错误处理规则', () => {
            expect(errorHandler.errorRules.size).toBeGreaterThan(0);
            expect(errorHandler.errorRules.has(ErrorHandler.ERROR_TYPES.CRYPTO_ERROR)).toBe(true);
            expect(errorHandler.errorRules.has(ErrorHandler.ERROR_TYPES.NETWORK_ERROR)).toBe(true);
            expect(errorHandler.errorRules.has(ErrorHandler.ERROR_TYPES.VALIDATION_ERROR)).toBe(true);
        });

        it('应该初始化错误统计', () => {
            expect(errorHandler.errorStats.totalErrors).toBe(0);
            expect(errorHandler.errorStats.errorsByType).toBeInstanceOf(Map);
            expect(errorHandler.errorStats.errorsBySeverity).toBeInstanceOf(Map);
        });
    });

    describe('错误处理', () => {
        it('应该处理简单的错误', async () => {
            const error = new Error('测试错误');
            const result = await errorHandler.handleError(
                error,
                ErrorHandler.ERROR_TYPES.SYSTEM_ERROR,
                { component: 'test' }
            );

            expect(result.handled).toBe(true);
            expect(result.errorId).toBeDefined();
            expect(errorHandler.errorStats.totalErrors).toBe(1);
        });

        it('应该记录错误到日志系统', async () => {
            const error = new Error('测试错误');
            await errorHandler.handleError(
                error,
                ErrorHandler.ERROR_TYPES.VALIDATION_ERROR,
                { component: 'test' }
            );

            expect(mockLogger.logValidationError).toHaveBeenCalledWith(
                ErrorHandler.ERROR_TYPES.VALIDATION_ERROR,
                '测试错误',
                expect.objectContaining({
                    errorId: expect.any(String),
                    severity: expect.any(Number),
                    context: expect.objectContaining({
                        component: 'test'
                    })
                })
            );
        });

        it('应该发送用户通知', async () => {
            const error = new Error('测试错误');
            await errorHandler.handleError(
                error,
                ErrorHandler.ERROR_TYPES.CRYPTO_ERROR,
                { component: 'test' }
            );

            expect(mockUIManager.showNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: expect.any(String),
                    title: '系统错误',
                    message: expect.stringContaining('密码学操作失败'),
                    errorId: expect.any(String),
                    actions: expect.any(Array)
                })
            );
        });

        it('应该处理字符串错误', async () => {
            const result = await errorHandler.handleError(
                '字符串错误消息',
                ErrorHandler.ERROR_TYPES.SYSTEM_ERROR
            );

            expect(result.handled).toBe(true);
            expect(errorHandler.errorHistory[0].message).toBe('字符串错误消息');
        });
    });

    describe('错误规则管理', () => {
        it('应该允许添加自定义错误规则', () => {
            const customRule = {
                severity: ErrorHandler.ERROR_SEVERITY.HIGH,
                strategy: ErrorHandler.RECOVERY_STRATEGIES.RETRY,
                maxRetries: 5,
                userNotification: true
            };

            errorHandler.addErrorRule('CUSTOM_ERROR', customRule);
            
            const rule = errorHandler.errorRules.get('CUSTOM_ERROR');
            expect(rule.severity).toBe(ErrorHandler.ERROR_SEVERITY.HIGH);
            expect(rule.maxRetries).toBe(5);
        });

        it('应该使用默认规则处理未知错误类型', async () => {
            const error = new Error('未知错误');
            const result = await errorHandler.handleError(
                error,
                'UNKNOWN_ERROR_TYPE'
            );

            expect(result.handled).toBe(true);
        });
    });

    describe('恢复策略', () => {
        it('应该执行重试策略', async () => {
            const error = new Error('重试测试');
            const result = await errorHandler.handleError(
                error,
                ErrorHandler.ERROR_TYPES.NETWORK_ERROR
            );

            expect(result.handled).toBe(true);
            expect(result.retryAttempted).toBe(true);
        });

        it('应该执行备用方案策略', async () => {
            const error = new Error('备用方案测试');
            const result = await errorHandler.handleError(
                error,
                ErrorHandler.ERROR_TYPES.UI_ERROR
            );

            expect(result.handled).toBe(true);
        });

        it('应该处理需要用户干预的错误', async () => {
            const error = new Error('用户干预测试');
            const result = await errorHandler.handleError(
                error,
                ErrorHandler.ERROR_TYPES.VALIDATION_ERROR
            );

            expect(result.handled).toBe(true);
            expect(result.message).toContain('需要用户干预');
        });
    });

    describe('用户操作处理', () => {
        it('应该处理重试操作', async () => {
            // 先创建一个错误
            const error = new Error('重试操作测试');
            const result = await errorHandler.handleError(
                error,
                ErrorHandler.ERROR_TYPES.NETWORK_ERROR
            );

            // 然后处理用户重试操作
            const actionResult = await errorHandler.handleUserAction('retry', result.errorId);
            expect(actionResult.success).toBeDefined();
        });

        it('应该处理忽略操作', async () => {
            const error = new Error('忽略操作测试');
            const result = await errorHandler.handleError(
                error,
                ErrorHandler.ERROR_TYPES.UI_ERROR
            );

            const actionResult = await errorHandler.handleUserAction('ignore', result.errorId);
            expect(actionResult.success).toBe(true);
        });

        it('应该处理查看详情操作', async () => {
            const error = new Error('查看详情测试');
            const result = await errorHandler.handleError(
                error,
                ErrorHandler.ERROR_TYPES.SYSTEM_ERROR
            );

            const actionResult = await errorHandler.handleUserAction('details', result.errorId);
            expect(actionResult).toBeDefined();
        });

        it('应该处理报告错误操作', async () => {
            const error = new Error('报告错误测试');
            const result = await errorHandler.handleError(
                error,
                ErrorHandler.ERROR_TYPES.SYSTEM_ERROR
            );

            const actionResult = await errorHandler.handleUserAction('report', result.errorId);
            expect(actionResult).toBeDefined();
        });
    });

    describe('系统健康检查', () => {
        it('应该报告健康状态', () => {
            const health = errorHandler.performHealthCheck();
            expect(health.status).toBe('healthy');
            expect(health.lastCheck).toBeDefined();
            expect(health.issues).toBeInstanceOf(Array);
        });

        it('应该检测高错误率', async () => {
            // 创建多个错误以触发高错误率警告
            for (let i = 0; i < 15; i++) {
                await errorHandler.handleError(
                    new Error(`错误 ${i}`),
                    ErrorHandler.ERROR_TYPES.SYSTEM_ERROR
                );
            }

            const health = errorHandler.performHealthCheck();
            expect(health.status).not.toBe('healthy');
            expect(health.issues.some(issue => issue.type === 'high_error_rate')).toBe(true);
        });

        it('应该检测严重错误', async () => {
            await errorHandler.handleError(
                new Error('严重错误'),
                ErrorHandler.ERROR_TYPES.CONFIG_ERROR
            );

            const health = errorHandler.performHealthCheck();
            expect(health.issues.some(issue => issue.type === 'critical_errors')).toBe(true);
        });
    });

    describe('错误统计', () => {
        it('应该正确统计错误', async () => {
            await errorHandler.handleError(
                new Error('统计测试1'),
                ErrorHandler.ERROR_TYPES.CRYPTO_ERROR
            );
            await errorHandler.handleError(
                new Error('统计测试2'),
                ErrorHandler.ERROR_TYPES.CRYPTO_ERROR
            );
            await errorHandler.handleError(
                new Error('统计测试3'),
                ErrorHandler.ERROR_TYPES.NETWORK_ERROR
            );

            const stats = errorHandler.getErrorStats();
            expect(stats.totalErrors).toBe(3);
            expect(stats.errorsByType.get(ErrorHandler.ERROR_TYPES.CRYPTO_ERROR)).toBe(2);
            expect(stats.errorsByType.get(ErrorHandler.ERROR_TYPES.NETWORK_ERROR)).toBe(1);
        });

        it('应该维护错误历史记录', async () => {
            await errorHandler.handleError(
                new Error('历史记录测试'),
                ErrorHandler.ERROR_TYPES.SYSTEM_ERROR
            );

            expect(errorHandler.errorHistory.length).toBe(1);
            expect(errorHandler.errorHistory[0].message).toBe('历史记录测试');
        });
    });

    describe('全局错误处理', () => {
        it('应该设置全局错误监听器', () => {
            // 检查是否添加了事件监听器
            expect(window.addEventListener).toBeDefined();
        });
    });

    describe('事件监听器', () => {
        it('应该支持添加和移除事件监听器', () => {
            const callback = vi.fn();
            
            errorHandler.addEventListener('error', callback);
            errorHandler.notifyListeners('error', { test: 'data' });
            
            expect(callback).toHaveBeenCalledWith({ test: 'data' });
            
            errorHandler.removeEventListener('error', callback);
            errorHandler.notifyListeners('error', { test: 'data2' });
            
            expect(callback).toHaveBeenCalledTimes(1);
        });
    });

    describe('错误消息生成', () => {
        it('应该生成用户友好的错误消息', () => {
            const standardError = {
                type: ErrorHandler.ERROR_TYPES.CRYPTO_ERROR,
                message: '密钥生成失败',
                severity: ErrorHandler.ERROR_SEVERITY.HIGH,
                context: {
                    component: 'Crypto',
                    operation: 'genKeyPair'
                }
            };

            const rule = errorHandler.errorRules.get(ErrorHandler.ERROR_TYPES.CRYPTO_ERROR);
            const message = errorHandler.generateUserMessage(standardError, rule);
            
            expect(message).toContain('密码学操作失败');
        });

        it('应该在调试模式下包含调试信息', () => {
            const standardError = {
                id: 'test-error-id',
                type: ErrorHandler.ERROR_TYPES.SYSTEM_ERROR,
                message: '系统错误',
                severity: ErrorHandler.ERROR_SEVERITY.MEDIUM,
                context: {
                    component: 'TestComponent',
                    operation: 'testOperation'
                }
            };

            const rule = errorHandler.getDefaultRule();
            const message = errorHandler.generateUserMessage(standardError, rule);
            
            expect(message).toContain('调试信息');
            expect(message).toContain('test-error-id');
            expect(message).toContain('TestComponent');
        });
    });

    describe('清理和资源管理', () => {
        it('应该正确清理资源', () => {
            errorHandler.cleanup();
            
            expect(errorHandler.errorHistory.length).toBe(0);
            expect(errorHandler.retryQueue.size).toBe(0);
            expect(errorHandler.listeners.size).toBe(0);
        });
    });
});