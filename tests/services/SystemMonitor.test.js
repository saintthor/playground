/**
 * SystemMonitor 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SystemMonitor } from '../../src/services/SystemMonitor.js';
import { ErrorHandler } from '../../src/services/ErrorHandler.js';
import { Logger } from '../../src/services/Logger.js';

// 模拟 performance API
global.performance = {
    memory: {
        usedJSHeapSize: 1024 * 1024 * 10, // 10MB
        totalJSHeapSize: 1024 * 1024 * 50, // 50MB
        jsHeapSizeLimit: 1024 * 1024 * 100 // 100MB
    },
    getEntriesByType: vi.fn().mockImplementation((type) => {
        if (type === 'navigation') {
            return [{
                fetchStart: 100,
                domContentLoadedEventEnd: 500,
                loadEventEnd: 800
            }];
        }
        if (type === 'paint') {
            return [
                { name: 'first-paint', startTime: 200 },
                { name: 'first-contentful-paint', startTime: 300 }
            ];
        }
        return [];
    })
};

describe('SystemMonitor', () => {
    let systemMonitor;
    let mockErrorHandler;
    let mockLogger;

    beforeEach(() => {
        // 创建模拟对象
        mockErrorHandler = {
            handleError: vi.fn().mockResolvedValue({ handled: true }),
            getErrorStats: vi.fn().mockReturnValue({
                recentErrors: [],
                totalErrors: 0
            })
        };

        mockLogger = {
            logSystemInfo: vi.fn()
        };

        // 创建系统监控器实例
        systemMonitor = new SystemMonitor(
            {
                monitorInterval: 100, // 快速测试间隔
                metricsRetention: 60,
                enableAutoRecovery: true,
                enablePredictiveAnalysis: false
            },
            mockErrorHandler,
            mockLogger
        );
    });

    afterEach(() => {
        systemMonitor.cleanup();
        vi.clearAllMocks();
    });

    describe('构造函数和初始化', () => {
        it('应该正确初始化系统监控器', () => {
            expect(systemMonitor.config.monitorInterval).toBe(100);
            expect(systemMonitor.config.metricsRetention).toBe(60);
            expect(systemMonitor.config.enableAutoRecovery).toBe(true);
            expect(systemMonitor.systemStatus).toBe(SystemMonitor.SYSTEM_STATUS.HEALTHY);
        });

        it('应该初始化默认警告阈值', () => {
            expect(systemMonitor.alertThresholds).toBeDefined();
            expect(systemMonitor.alertThresholds[SystemMonitor.METRICS.MEMORY_USAGE]).toBeDefined();
            expect(systemMonitor.alertThresholds[SystemMonitor.METRICS.ERROR_RATE]).toBeDefined();
        });

        it('应该初始化数据结构', () => {
            expect(systemMonitor.metrics).toBeInstanceOf(Map);
            expect(systemMonitor.metricsHistory).toBeInstanceOf(Map);
            expect(systemMonitor.activeAlerts).toBeInstanceOf(Map);
            expect(systemMonitor.alertHistory).toBeInstanceOf(Array);
        });
    });

    describe('监控控制', () => {
        it('应该能够启动监控', () => {
            systemMonitor.startMonitoring();
            
            expect(systemMonitor.isMonitoring).toBe(true);
            expect(systemMonitor.monitoringInterval).toBeDefined();
        });

        it('应该能够停止监控', () => {
            systemMonitor.startMonitoring();
            systemMonitor.stopMonitoring();
            
            expect(systemMonitor.isMonitoring).toBe(false);
            expect(systemMonitor.monitoringInterval).toBeNull();
        });

        it('应该防止重复启动监控', () => {
            systemMonitor.startMonitoring();
            const firstInterval = systemMonitor.monitoringInterval;
            
            systemMonitor.startMonitoring();
            
            expect(systemMonitor.monitoringInterval).toBe(firstInterval);
        });
    });

    describe('指标收集', () => {
        it('应该收集内存使用指标', async () => {
            await systemMonitor.collectSystemMetrics(Date.now());
            
            const memoryMetric = systemMonitor.metrics.get(SystemMonitor.METRICS.MEMORY_USAGE);
            expect(memoryMetric).toBeDefined();
            expect(memoryMetric.value).toBeGreaterThan(0);
            expect(memoryMetric.unit).toBe('%');
            expect(memoryMetric.details).toBeDefined();
        });

        it('应该收集响应时间指标', async () => {
            await systemMonitor.collectSystemMetrics(Date.now());
            
            const responseMetric = systemMonitor.metrics.get(SystemMonitor.METRICS.RESPONSE_TIME);
            expect(responseMetric).toBeDefined();
            expect(responseMetric.value).toBeGreaterThan(0);
            expect(responseMetric.unit).toBe('ms');
        });

        it('应该收集UI渲染时间指标', async () => {
            await systemMonitor.collectSystemMetrics(Date.now());
            
            const renderMetric = systemMonitor.metrics.get(SystemMonitor.METRICS.UI_RENDER_TIME);
            expect(renderMetric).toBeDefined();
            expect(renderMetric.value).toBeGreaterThan(0);
            expect(renderMetric.unit).toBe('ms');
        });

        it('应该收集存储使用指标', async () => {
            await systemMonitor.collectSystemMetrics(Date.now());
            
            const storageMetric = systemMonitor.metrics.get(SystemMonitor.METRICS.STORAGE_USAGE);
            expect(storageMetric).toBeDefined();
            expect(storageMetric.value).toBeGreaterThanOrEqual(0);
            expect(storageMetric.unit).toBe('%');
        });
    });

    describe('指标记录和历史', () => {
        it('应该记录指标到历史', () => {
            const timestamp = Date.now();
            const metricData = {
                value: 50,
                unit: '%',
                details: { test: 'data' }
            };

            systemMonitor.recordMetric(SystemMonitor.METRICS.MEMORY_USAGE, metricData, timestamp);
            
            const currentMetric = systemMonitor.metrics.get(SystemMonitor.METRICS.MEMORY_USAGE);
            expect(currentMetric.value).toBe(50);
            expect(currentMetric.timestamp).toBe(timestamp);
            
            const history = systemMonitor.metricsHistory.get(SystemMonitor.METRICS.MEMORY_USAGE);
            expect(history).toBeDefined();
            expect(history.length).toBe(1);
            expect(history[0].value).toBe(50);
        });

        it('应该计算指标趋势', () => {
            const metricType = SystemMonitor.METRICS.MEMORY_USAGE;
            const timestamp = Date.now();
            
            // 添加一些历史数据
            for (let i = 0; i < 5; i++) {
                systemMonitor.recordMetric(metricType, { value: 50 + i, unit: '%' }, timestamp + i * 1000);
            }
            
            // 添加一个明显增长的值
            systemMonitor.recordMetric(metricType, { value: 70, unit: '%' }, timestamp + 5000);
            
            const currentMetric = systemMonitor.metrics.get(metricType);
            expect(currentMetric.trend).toBe('increasing');
        });

        it('应该限制历史记录大小', () => {
            const metricType = SystemMonitor.METRICS.MEMORY_USAGE;
            const maxSize = Math.ceil(systemMonitor.config.metricsRetention / (systemMonitor.config.monitorInterval / 1000));
            
            // 添加超过限制的数据
            for (let i = 0; i < maxSize + 10; i++) {
                systemMonitor.recordMetric(metricType, { value: i, unit: '%' }, Date.now() + i * 1000);
            }
            
            const history = systemMonitor.metricsHistory.get(metricType);
            expect(history.length).toBeLessThanOrEqual(maxSize);
        });
    });

    describe('警告系统', () => {
        it('应该检测内存使用警告', () => {
            const timestamp = Date.now();
            
            // 设置高内存使用率
            systemMonitor.recordMetric(SystemMonitor.METRICS.MEMORY_USAGE, {
                value: 80, // 超过警告阈值70%
                unit: '%'
            }, timestamp);
            
            systemMonitor.checkAlertConditions(timestamp);
            
            expect(systemMonitor.activeAlerts.size).toBeGreaterThan(0);
            const alertKey = `${SystemMonitor.METRICS.MEMORY_USAGE}_${SystemMonitor.ALERT_LEVELS.WARNING}`;
            expect(systemMonitor.activeAlerts.has(alertKey)).toBe(true);
        });

        it('应该检测错误率警告', () => {
            const timestamp = Date.now();
            
            // 设置高错误率
            systemMonitor.recordMetric(SystemMonitor.METRICS.ERROR_RATE, {
                value: 15, // 超过错误阈值10%
                unit: '%'
            }, timestamp);
            
            systemMonitor.checkAlertConditions(timestamp);
            
            const alertKey = `${SystemMonitor.METRICS.ERROR_RATE}_${SystemMonitor.ALERT_LEVELS.ERROR}`;
            expect(systemMonitor.activeAlerts.has(alertKey)).toBe(true);
        });

        it('应该解决警告', () => {
            const timestamp = Date.now();
            
            // 先触发警告
            systemMonitor.recordMetric(SystemMonitor.METRICS.MEMORY_USAGE, {
                value: 80,
                unit: '%'
            }, timestamp);
            systemMonitor.checkAlertConditions(timestamp);
            
            expect(systemMonitor.activeAlerts.size).toBeGreaterThan(0);
            
            // 然后降低到正常水平
            systemMonitor.recordMetric(SystemMonitor.METRICS.MEMORY_USAGE, {
                value: 50,
                unit: '%'
            }, timestamp + 1000);
            systemMonitor.checkAlertConditions(timestamp + 1000);
            
            expect(systemMonitor.activeAlerts.size).toBe(0);
        });

        it('应该生成正确的警告消息', () => {
            const message = systemMonitor.generateAlertMessage(
                SystemMonitor.METRICS.MEMORY_USAGE,
                SystemMonitor.ALERT_LEVELS.WARNING,
                75,
                70
            );
            
            expect(message).toContain('内存使用率');
            expect(message).toContain('75');
            expect(message).toContain('70');
        });
    });

    describe('系统状态管理', () => {
        it('应该根据警告更新系统状态', () => {
            const timestamp = Date.now();
            
            // 触发严重警告
            systemMonitor.recordMetric(SystemMonitor.METRICS.MEMORY_USAGE, {
                value: 96, // 超过严重阈值95%
                unit: '%'
            }, timestamp);
            systemMonitor.checkAlertConditions(timestamp);
            systemMonitor.updateSystemStatus(timestamp);
            
            expect(systemMonitor.systemStatus).toBe(SystemMonitor.SYSTEM_STATUS.CRITICAL);
        });

        it('应该在状态变化时通知监听器', () => {
            const callback = vi.fn();
            systemMonitor.addEventListener('system_status_changed', callback);
            
            const timestamp = Date.now();
            systemMonitor.recordMetric(SystemMonitor.METRICS.ERROR_RATE, {
                value: 15,
                unit: '%'
            }, timestamp);
            systemMonitor.checkAlertConditions(timestamp);
            systemMonitor.updateSystemStatus(timestamp);
            
            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    previousStatus: SystemMonitor.SYSTEM_STATUS.HEALTHY,
                    newStatus: SystemMonitor.SYSTEM_STATUS.UNHEALTHY
                })
            );
        });
    });

    describe('自动恢复', () => {
        it('应该执行内存清理', async () => {
            const callback = vi.fn();
            systemMonitor.addEventListener('memory_cleanup_requested', callback);
            
            await systemMonitor.performMemoryCleanup();
            
            expect(callback).toHaveBeenCalled();
        });

        it('应该执行错误率恢复', async () => {
            const callback = vi.fn();
            systemMonitor.addEventListener('error_recovery_requested', callback);
            
            await systemMonitor.performErrorRateRecovery();
            
            expect(callback).toHaveBeenCalled();
        });

        it('应该执行响应时间优化', async () => {
            const callback = vi.fn();
            systemMonitor.addEventListener('performance_optimization_requested', callback);
            
            await systemMonitor.performResponseTimeOptimization();
            
            expect(callback).toHaveBeenCalled();
        });
    });

    describe('监控周期', () => {
        it('应该执行完整的监控周期', async () => {
            const spy = vi.spyOn(systemMonitor, 'collectSystemMetrics');
            
            await systemMonitor.performMonitoringCycle();
            
            expect(spy).toHaveBeenCalled();
            expect(systemMonitor.metrics.size).toBeGreaterThan(0);
        });

        it('应该处理监控周期中的错误', async () => {
            // 模拟收集指标时的错误
            vi.spyOn(systemMonitor, 'collectSystemMetrics').mockRejectedValue(new Error('测试错误'));
            
            await systemMonitor.performMonitoringCycle();
            
            expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
                expect.any(Error),
                'SYSTEM_ERROR',
                expect.objectContaining({
                    component: 'SystemMonitor',
                    operation: 'monitoring_cycle'
                })
            );
        });
    });

    describe('数据清理', () => {
        it('应该清理过期的指标历史', () => {
            const metricType = SystemMonitor.METRICS.MEMORY_USAGE;
            const now = Date.now();
            const retentionTime = systemMonitor.config.metricsRetention * 1000;
            
            // 添加过期和有效的数据
            systemMonitor.recordMetric(metricType, { value: 50, unit: '%' }, now - retentionTime - 1000); // 过期
            systemMonitor.recordMetric(metricType, { value: 60, unit: '%' }, now - 1000); // 有效
            
            systemMonitor.cleanupExpiredData(now);
            
            const history = systemMonitor.metricsHistory.get(metricType);
            expect(history.length).toBe(1);
            expect(history[0].value).toBe(60);
        });

        it('应该清理过期的警告历史', () => {
            const now = Date.now();
            const retentionTime = systemMonitor.config.metricsRetention * 1000;
            
            // 添加过期和有效的警告
            systemMonitor.alertHistory.push({
                id: 'old-alert',
                firstOccurrence: now - retentionTime - 1000
            });
            systemMonitor.alertHistory.push({
                id: 'new-alert',
                firstOccurrence: now - 1000
            });
            
            systemMonitor.cleanupExpiredData(now);
            
            expect(systemMonitor.alertHistory.length).toBe(1);
            expect(systemMonitor.alertHistory[0].id).toBe('new-alert');
        });
    });

    describe('报告生成', () => {
        it('应该生成系统状态报告', () => {
            const report = systemMonitor.getSystemStatusReport();
            
            expect(report.systemStatus).toBeDefined();
            expect(report.isMonitoring).toBeDefined();
            expect(report.currentMetrics).toBeDefined();
            expect(report.activeAlerts).toBeInstanceOf(Array);
            expect(report.uptime).toBeGreaterThanOrEqual(0);
        });

        it('应该生成性能报告', async () => {
            // 先收集一些指标
            await systemMonitor.collectSystemMetrics(Date.now());
            
            const report = systemMonitor.getPerformanceReport();
            
            expect(report.timestamp).toBeDefined();
            expect(report.metrics).toBeDefined();
            expect(report.trends).toBeDefined();
            expect(report.recommendations).toBeInstanceOf(Array);
        });

        it('应该生成性能建议', async () => {
            // 设置高内存使用率以触发建议
            systemMonitor.recordMetric(SystemMonitor.METRICS.MEMORY_USAGE, {
                value: 80,
                unit: '%'
            }, Date.now());
            
            const report = systemMonitor.getPerformanceReport();
            
            expect(report.recommendations.length).toBeGreaterThan(0);
            expect(report.recommendations[0].type).toBe('memory');
        });
    });

    describe('事件监听器', () => {
        it('应该支持添加和移除事件监听器', () => {
            const callback = vi.fn();
            
            systemMonitor.addEventListener('test_event', callback);
            systemMonitor.notifyListeners('test_event', { test: 'data' });
            
            expect(callback).toHaveBeenCalledWith({ test: 'data' });
            
            systemMonitor.removeEventListener('test_event', callback);
            systemMonitor.notifyListeners('test_event', { test: 'data2' });
            
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('应该处理监听器中的错误', () => {
            const faultyCallback = vi.fn().mockImplementation(() => {
                throw new Error('监听器错误');
            });
            
            systemMonitor.addEventListener('test_event', faultyCallback);
            
            // 应该不会抛出错误
            expect(() => {
                systemMonitor.notifyListeners('test_event', {});
            }).not.toThrow();
        });
    });

    describe('清理和资源管理', () => {
        it('应该正确清理资源', () => {
            systemMonitor.startMonitoring();
            systemMonitor.cleanup();
            
            expect(systemMonitor.isMonitoring).toBe(false);
            expect(systemMonitor.metrics.size).toBe(0);
            expect(systemMonitor.metricsHistory.size).toBe(0);
            expect(systemMonitor.activeAlerts.size).toBe(0);
            expect(systemMonitor.listeners.size).toBe(0);
        });
    });
});