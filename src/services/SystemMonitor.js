/**
 * SystemMonitor 类 - 系统状态监控
 * 
 * 提供实时系统状态监控、性能指标收集和异常检测功能
 * 支持自动恢复和预警机制
 */

class SystemMonitor {
    /**
     * 监控指标类型
     */
    static METRICS = {
        MEMORY_USAGE: 'MEMORY_USAGE',           // 内存使用率
        CPU_USAGE: 'CPU_USAGE',                 // CPU使用率
        ERROR_RATE: 'ERROR_RATE',               // 错误率
        RESPONSE_TIME: 'RESPONSE_TIME',         // 响应时间
        NETWORK_LATENCY: 'NETWORK_LATENCY',     // 网络延迟
        ACTIVE_CONNECTIONS: 'ACTIVE_CONNECTIONS', // 活跃连接数
        BLOCK_PROCESSING_RATE: 'BLOCK_PROCESSING_RATE', // 区块处理速率
        VALIDATION_SUCCESS_RATE: 'VALIDATION_SUCCESS_RATE', // 验证成功率
        UI_RENDER_TIME: 'UI_RENDER_TIME',       // UI渲染时间
        STORAGE_USAGE: 'STORAGE_USAGE'          // 存储使用量
    };

    /**
     * 系统状态
     */
    static SYSTEM_STATUS = {
        HEALTHY: 'HEALTHY',         // 健康
        DEGRADED: 'DEGRADED',       // 性能下降
        UNHEALTHY: 'UNHEALTHY',     // 不健康
        CRITICAL: 'CRITICAL',       // 严重
        OFFLINE: 'OFFLINE'          // 离线
    };

    /**
     * 警告级别
     */
    static ALERT_LEVELS = {
        INFO: 'INFO',
        WARNING: 'WARNING',
        ERROR: 'ERROR',
        CRITICAL: 'CRITICAL'
    };

    /**
     * 构造函数
     * @param {Object} config - 监控配置
     * @param {ErrorHandler} errorHandler - 错误处理器
     * @param {Logger} logger - 日志系统
     */
    constructor(config = {}, errorHandler = null, logger = null) {
        this.config = {
            monitorInterval: config.monitorInterval || 5000,    // 监控间隔（毫秒）
            metricsRetention: config.metricsRetention || 3600,  // 指标保留时间（秒）
            alertThresholds: config.alertThresholds || {},      // 警告阈值
            enableAutoRecovery: config.enableAutoRecovery !== false,
            enablePredictiveAnalysis: config.enablePredictiveAnalysis || false,
            ...config
        };

        this.errorHandler = errorHandler;
        this.logger = logger;

        // 监控状态
        this.isMonitoring = false;
        this.monitoringInterval = null;

        // 系统状态
        this.systemStatus = SystemMonitor.SYSTEM_STATUS.HEALTHY;
        this.lastStatusChange = Date.now();

        // 指标存储
        this.metrics = new Map();
        this.metricsHistory = new Map();

        // 警告系统
        this.activeAlerts = new Map();
        this.alertHistory = [];

        // 性能基线
        this.performanceBaseline = new Map();

        // 组件状态
        this.componentStatus = new Map();

        // 事件监听器
        this.listeners = new Map();

        // 初始化默认阈值
        this.initializeDefaultThresholds();

        console.log('SystemMonitor 初始化完成');
    }

    /**
     * 初始化默认警告阈值
     */
    initializeDefaultThresholds() {
        const defaultThresholds = {
            [SystemMonitor.METRICS.MEMORY_USAGE]: {
                warning: 70,    // 70%
                error: 85,      // 85%
                critical: 95    // 95%
            },
            [SystemMonitor.METRICS.ERROR_RATE]: {
                warning: 5,     // 5%
                error: 10,      // 10%
                critical: 20    // 20%
            },
            [SystemMonitor.METRICS.RESPONSE_TIME]: {
                warning: 1000,  // 1秒
                error: 3000,    // 3秒
                critical: 5000  // 5秒
            },
            [SystemMonitor.METRICS.NETWORK_LATENCY]: {
                warning: 100,   // 100ms
                error: 500,     // 500ms
                critical: 1000  // 1000ms
            },
            [SystemMonitor.METRICS.VALIDATION_SUCCESS_RATE]: {
                warning: 95,    // 95%
                error: 90,      // 90%
                critical: 80    // 80%
            },
            [SystemMonitor.METRICS.UI_RENDER_TIME]: {
                warning: 16,    // 16ms (60fps)
                error: 33,      // 33ms (30fps)
                critical: 100   // 100ms
            }
        };

        // 合并用户配置的阈值
        this.alertThresholds = { ...defaultThresholds, ...this.config.alertThresholds };
    }

    /**
     * 开始监控
     */
    startMonitoring() {
        if (this.isMonitoring) {
            console.warn('系统监控已在运行');
            return;
        }

        this.isMonitoring = true;
        this.systemStatus = SystemMonitor.SYSTEM_STATUS.HEALTHY;
        
        // 启动定期监控
        this.monitoringInterval = setInterval(() => {
            this.performMonitoringCycle();
        }, this.config.monitorInterval);

        // 立即执行一次监控
        this.performMonitoringCycle();

        this.notifyListeners('monitoring_started');
        console.log('系统监控已启动');
    }

    /**
     * 停止监控
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        this.notifyListeners('monitoring_stopped');
        console.log('系统监控已停止');
    }

    /**
     * 执行监控周期
     */
    async performMonitoringCycle() {
        try {
            const timestamp = Date.now();

            // 收集系统指标
            await this.collectSystemMetrics(timestamp);

            // 检查警告条件
            this.checkAlertConditions(timestamp);

            // 更新系统状态
            this.updateSystemStatus(timestamp);

            // 执行自动恢复
            if (this.config.enableAutoRecovery) {
                await this.performAutoRecovery(timestamp);
            }

            // 清理过期数据
            this.cleanupExpiredData(timestamp);

            // 通知监听器
            this.notifyListeners('monitoring_cycle_completed', {
                timestamp,
                systemStatus: this.systemStatus,
                activeAlerts: this.activeAlerts.size
            });

        } catch (error) {
            console.error('监控周期执行失败:', error);
            
            if (this.errorHandler) {
                this.errorHandler.handleError(
                    error,
                    'SYSTEM_ERROR',
                    { component: 'SystemMonitor', operation: 'monitoring_cycle' }
                );
            }
        }
    }

    /**
     * 收集系统指标
     * @param {number} timestamp - 时间戳
     */
    async collectSystemMetrics(timestamp) {
        const metrics = {};

        // 内存使用率
        if (performance.memory) {
            const memoryInfo = performance.memory;
            metrics[SystemMonitor.METRICS.MEMORY_USAGE] = {
                value: (memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100,
                unit: '%',
                details: {
                    used: memoryInfo.usedJSHeapSize,
                    total: memoryInfo.totalJSHeapSize,
                    limit: memoryInfo.jsHeapSizeLimit
                }
            };
        }

        // 响应时间（通过性能API测量）
        const navigationTiming = performance.getEntriesByType('navigation')[0];
        if (navigationTiming) {
            metrics[SystemMonitor.METRICS.RESPONSE_TIME] = {
                value: navigationTiming.loadEventEnd - navigationTiming.fetchStart,
                unit: 'ms',
                details: {
                    domContentLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.fetchStart,
                    loadComplete: navigationTiming.loadEventEnd - navigationTiming.fetchStart
                }
            };
        }

        // UI渲染时间
        const paintEntries = performance.getEntriesByType('paint');
        if (paintEntries.length > 0) {
            const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
            const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
            
            if (firstContentfulPaint) {
                metrics[SystemMonitor.METRICS.UI_RENDER_TIME] = {
                    value: firstContentfulPaint.startTime,
                    unit: 'ms',
                    details: {
                        firstPaint: firstPaint ? firstPaint.startTime : null,
                        firstContentfulPaint: firstContentfulPaint.startTime
                    }
                };
            }
        }

        // 存储使用量（估算）
        const storageUsage = this.estimateStorageUsage();
        metrics[SystemMonitor.METRICS.STORAGE_USAGE] = {
            value: storageUsage.percentage,
            unit: '%',
            details: storageUsage
        };

        // 错误率（基于错误处理器统计）
        if (this.errorHandler) {
            const errorStats = this.errorHandler.getErrorStats();
            const recentErrors = errorStats.recentErrors || [];
            const totalOperations = this.getTotalOperations();
            
            metrics[SystemMonitor.METRICS.ERROR_RATE] = {
                value: totalOperations > 0 ? (recentErrors.length / totalOperations) * 100 : 0,
                unit: '%',
                details: {
                    recentErrors: recentErrors.length,
                    totalOperations
                }
            };
        }

        // 存储指标
        for (const [metricType, metricData] of Object.entries(metrics)) {
            this.recordMetric(metricType, metricData, timestamp);
        }
    }

    /**
     * 记录指标
     * @param {string} metricType - 指标类型
     * @param {Object} metricData - 指标数据
     * @param {number} timestamp - 时间戳
     */
    recordMetric(metricType, metricData, timestamp) {
        // 更新当前指标
        this.metrics.set(metricType, {
            ...metricData,
            timestamp,
            trend: this.calculateTrend(metricType, metricData.value)
        });

        // 添加到历史记录
        if (!this.metricsHistory.has(metricType)) {
            this.metricsHistory.set(metricType, []);
        }

        const history = this.metricsHistory.get(metricType);
        history.push({
            value: metricData.value,
            timestamp,
            details: metricData.details
        });

        // 限制历史记录大小
        const maxHistorySize = Math.ceil(this.config.metricsRetention / (this.config.monitorInterval / 1000));
        if (history.length > maxHistorySize) {
            history.splice(0, history.length - maxHistorySize);
        }
    }

    /**
     * 计算指标趋势
     * @param {string} metricType - 指标类型
     * @param {number} currentValue - 当前值
     * @returns {string} 趋势方向
     */
    calculateTrend(metricType, currentValue) {
        const history = this.metricsHistory.get(metricType);
        if (!history || history.length < 2) {
            return 'stable';
        }

        const recentValues = history.slice(-5).map(h => h.value);
        const average = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
        
        const threshold = average * 0.05; // 5%变化阈值
        
        if (currentValue > average + threshold) {
            return 'increasing';
        } else if (currentValue < average - threshold) {
            return 'decreasing';
        } else {
            return 'stable';
        }
    }

    /**
     * 检查警告条件
     * @param {number} timestamp - 时间戳
     */
    checkAlertConditions(timestamp) {
        for (const [metricType, metric] of this.metrics) {
            const thresholds = this.alertThresholds[metricType];
            if (!thresholds) continue;

            const value = metric.value;
            let alertLevel = null;

            // 确定警告级别
            if (value >= thresholds.critical) {
                alertLevel = SystemMonitor.ALERT_LEVELS.CRITICAL;
            } else if (value >= thresholds.error) {
                alertLevel = SystemMonitor.ALERT_LEVELS.ERROR;
            } else if (value >= thresholds.warning) {
                alertLevel = SystemMonitor.ALERT_LEVELS.WARNING;
            }

            const alertKey = `${metricType}_${alertLevel}`;

            if (alertLevel) {
                // 创建或更新警告
                if (!this.activeAlerts.has(alertKey)) {
                    const alert = {
                        id: this.generateAlertId(),
                        metricType,
                        level: alertLevel,
                        value,
                        threshold: thresholds[alertLevel.toLowerCase()],
                        message: this.generateAlertMessage(metricType, alertLevel, value, thresholds[alertLevel.toLowerCase()]),
                        firstOccurrence: timestamp,
                        lastOccurrence: timestamp,
                        occurrenceCount: 1
                    };

                    this.activeAlerts.set(alertKey, alert);
                    this.alertHistory.push({ ...alert, resolved: false });
                    
                    this.notifyListeners('alert_triggered', alert);
                    this.handleAlert(alert);
                } else {
                    // 更新现有警告
                    const alert = this.activeAlerts.get(alertKey);
                    alert.lastOccurrence = timestamp;
                    alert.occurrenceCount++;
                    alert.value = value;
                }
            } else {
                // 解决警告
                const resolvedAlerts = [];
                for (const [key, alert] of this.activeAlerts) {
                    if (alert.metricType === metricType) {
                        resolvedAlerts.push(alert);
                        this.activeAlerts.delete(key);
                    }
                }

                for (const alert of resolvedAlerts) {
                    alert.resolved = true;
                    alert.resolvedAt = timestamp;
                    this.notifyListeners('alert_resolved', alert);
                }
            }
        }
    }

    /**
     * 生成警告消息
     * @param {string} metricType - 指标类型
     * @param {string} alertLevel - 警告级别
     * @param {number} value - 当前值
     * @param {number} threshold - 阈值
     * @returns {string} 警告消息
     */
    generateAlertMessage(metricType, alertLevel, value, threshold) {
        const metricNames = {
            [SystemMonitor.METRICS.MEMORY_USAGE]: '内存使用率',
            [SystemMonitor.METRICS.ERROR_RATE]: '错误率',
            [SystemMonitor.METRICS.RESPONSE_TIME]: '响应时间',
            [SystemMonitor.METRICS.NETWORK_LATENCY]: '网络延迟',
            [SystemMonitor.METRICS.VALIDATION_SUCCESS_RATE]: '验证成功率',
            [SystemMonitor.METRICS.UI_RENDER_TIME]: 'UI渲染时间'
        };

        const metricName = metricNames[metricType] || metricType;
        const unit = this.metrics.get(metricType)?.unit || '';
        
        return `${metricName}${alertLevel === SystemMonitor.ALERT_LEVELS.CRITICAL ? '严重' : ''}超出阈值: ${value}${unit} > ${threshold}${unit}`;
    }

    /**
     * 处理警告
     * @param {Object} alert - 警告对象
     */
    async handleAlert(alert) {
        // 记录日志
        if (this.logger) {
            this.logger.logSystemInfo(
                `系统警告: ${alert.message}`,
                {
                    alertId: alert.id,
                    metricType: alert.metricType,
                    level: alert.level,
                    value: alert.value,
                    threshold: alert.threshold
                }
            );
        }

        // 根据警告级别执行不同的处理策略
        switch (alert.level) {
            case SystemMonitor.ALERT_LEVELS.WARNING:
                await this.handleWarningAlert(alert);
                break;
            
            case SystemMonitor.ALERT_LEVELS.ERROR:
                await this.handleErrorAlert(alert);
                break;
            
            case SystemMonitor.ALERT_LEVELS.CRITICAL:
                await this.handleCriticalAlert(alert);
                break;
        }
    }

    /**
     * 处理警告级别的警告
     * @param {Object} alert - 警告对象
     */
    async handleWarningAlert(alert) {
        // 记录警告，但不采取激进措施
        console.warn(`系统警告: ${alert.message}`);
    }

    /**
     * 处理错误级别的警告
     * @param {Object} alert - 警告对象
     */
    async handleErrorAlert(alert) {
        console.error(`系统错误: ${alert.message}`);
        
        // 尝试自动恢复措施
        if (this.config.enableAutoRecovery) {
            await this.attemptRecovery(alert);
        }
    }

    /**
     * 处理严重级别的警告
     * @param {Object} alert - 警告对象
     */
    async handleCriticalAlert(alert) {
        console.error(`🚨 系统严重警告: ${alert.message}`);
        
        // 立即尝试恢复措施
        if (this.config.enableAutoRecovery) {
            await this.attemptRecovery(alert);
        }
        
        // 通知错误处理器
        if (this.errorHandler) {
            this.errorHandler.handleError(
                new Error(alert.message),
                'SYSTEM_ERROR',
                {
                    component: 'SystemMonitor',
                    operation: 'critical_alert',
                    alertId: alert.id,
                    metricType: alert.metricType
                }
            );
        }
    }

    /**
     * 尝试恢复措施
     * @param {Object} alert - 警告对象
     */
    async attemptRecovery(alert) {
        switch (alert.metricType) {
            case SystemMonitor.METRICS.MEMORY_USAGE:
                await this.performMemoryCleanup();
                break;
            
            case SystemMonitor.METRICS.ERROR_RATE:
                await this.performErrorRateRecovery();
                break;
            
            case SystemMonitor.METRICS.RESPONSE_TIME:
                await this.performResponseTimeOptimization();
                break;
            
            default:
                console.log(`没有针对 ${alert.metricType} 的特定恢复措施`);
        }
    }

    /**
     * 执行内存清理
     */
    async performMemoryCleanup() {
        console.log('执行内存清理...');
        
        // 触发垃圾回收（如果可用）
        if (window.gc) {
            window.gc();
        }
        
        // 清理缓存数据
        this.cleanupCaches();
        
        // 通知其他组件进行清理
        this.notifyListeners('memory_cleanup_requested');
    }

    /**
     * 执行错误率恢复
     */
    async performErrorRateRecovery() {
        console.log('执行错误率恢复...');
        
        // 重置错误统计
        if (this.errorHandler) {
            // 这里可以实现错误统计重置逻辑
        }
        
        // 通知组件进行错误恢复
        this.notifyListeners('error_recovery_requested');
    }

    /**
     * 执行响应时间优化
     */
    async performResponseTimeOptimization() {
        console.log('执行响应时间优化...');
        
        // 优化UI渲染
        this.notifyListeners('performance_optimization_requested');
    }

    /**
     * 更新系统状态
     * @param {number} timestamp - 时间戳
     */
    updateSystemStatus(timestamp) {
        const previousStatus = this.systemStatus;
        let newStatus = SystemMonitor.SYSTEM_STATUS.HEALTHY;

        // 根据活跃警告确定系统状态
        const criticalAlerts = Array.from(this.activeAlerts.values())
            .filter(alert => alert.level === SystemMonitor.ALERT_LEVELS.CRITICAL);
        
        const errorAlerts = Array.from(this.activeAlerts.values())
            .filter(alert => alert.level === SystemMonitor.ALERT_LEVELS.ERROR);
        
        const warningAlerts = Array.from(this.activeAlerts.values())
            .filter(alert => alert.level === SystemMonitor.ALERT_LEVELS.WARNING);

        if (criticalAlerts.length > 0) {
            newStatus = SystemMonitor.SYSTEM_STATUS.CRITICAL;
        } else if (errorAlerts.length > 0) {
            newStatus = SystemMonitor.SYSTEM_STATUS.UNHEALTHY;
        } else if (warningAlerts.length > 0) {
            newStatus = SystemMonitor.SYSTEM_STATUS.DEGRADED;
        }

        // 更新状态
        if (newStatus !== previousStatus) {
            this.systemStatus = newStatus;
            this.lastStatusChange = timestamp;
            
            this.notifyListeners('system_status_changed', {
                previousStatus,
                newStatus,
                timestamp
            });
            
            console.log(`系统状态变更: ${previousStatus} -> ${newStatus}`);
        }
    }

    /**
     * 执行自动恢复
     * @param {number} timestamp - 时间戳
     */
    async performAutoRecovery(timestamp) {
        // 这里可以实现更复杂的自动恢复逻辑
        if (this.systemStatus === SystemMonitor.SYSTEM_STATUS.CRITICAL) {
            console.log('系统处于严重状态，执行自动恢复...');
            
            // 执行全面的系统恢复措施
            await this.performComprehensiveRecovery();
        }
    }

    /**
     * 执行全面的系统恢复
     */
    async performComprehensiveRecovery() {
        console.log('执行全面系统恢复...');
        
        // 内存清理
        await this.performMemoryCleanup();
        
        // 重置组件状态
        this.notifyListeners('system_recovery_requested');
        
        // 等待一段时间让系统稳定
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    /**
     * 清理过期数据
     * @param {number} timestamp - 时间戳
     */
    cleanupExpiredData(timestamp) {
        const retentionTime = this.config.metricsRetention * 1000;
        
        // 清理过期的指标历史
        for (const [metricType, history] of this.metricsHistory) {
            const validHistory = history.filter(
                entry => timestamp - entry.timestamp < retentionTime
            );
            this.metricsHistory.set(metricType, validHistory);
        }

        // 清理过期的警告历史
        this.alertHistory = this.alertHistory.filter(
            alert => timestamp - alert.firstOccurrence < retentionTime
        );
    }

    /**
     * 清理缓存
     */
    cleanupCaches() {
        // 清理指标缓存
        const now = Date.now();
        const cacheTimeout = 60000; // 1分钟

        for (const [metricType, metric] of this.metrics) {
            if (now - metric.timestamp > cacheTimeout) {
                this.metrics.delete(metricType);
            }
        }
    }

    /**
     * 估算存储使用量
     * @returns {Object} 存储使用情况
     */
    estimateStorageUsage() {
        let totalSize = 0;
        let usedSize = 0;

        try {
            // 估算localStorage使用量
            if (typeof Storage !== 'undefined') {
                for (let key in localStorage) {
                    if (localStorage.hasOwnProperty(key)) {
                        usedSize += localStorage[key].length;
                    }
                }
            }

            // 估算内存中数据结构的大小
            usedSize += JSON.stringify(this.metricsHistory).length;
            usedSize += JSON.stringify(this.alertHistory).length;

            // 假设总可用存储空间（这是一个估算值）
            totalSize = 10 * 1024 * 1024; // 10MB

            return {
                used: usedSize,
                total: totalSize,
                percentage: totalSize > 0 ? (usedSize / totalSize) * 100 : 0
            };
        } catch (error) {
            return {
                used: 0,
                total: 0,
                percentage: 0,
                error: error.message
            };
        }
    }

    /**
     * 获取总操作数（用于计算错误率）
     * @returns {number} 总操作数
     */
    getTotalOperations() {
        // 这里应该从实际的业务逻辑中获取操作计数
        // 暂时返回一个估算值
        return 1000;
    }

    /**
     * 获取系统状态报告
     * @returns {Object} 状态报告
     */
    getSystemStatusReport() {
        return {
            systemStatus: this.systemStatus,
            lastStatusChange: this.lastStatusChange,
            isMonitoring: this.isMonitoring,
            currentMetrics: Object.fromEntries(this.metrics),
            activeAlerts: Array.from(this.activeAlerts.values()),
            alertHistory: this.alertHistory.slice(-10), // 最近10个警告
            componentStatus: Object.fromEntries(this.componentStatus),
            uptime: Date.now() - this.lastStatusChange
        };
    }

    /**
     * 获取性能报告
     * @returns {Object} 性能报告
     */
    getPerformanceReport() {
        const report = {
            timestamp: Date.now(),
            metrics: {},
            trends: {},
            recommendations: []
        };

        // 收集当前指标
        for (const [metricType, metric] of this.metrics) {
            report.metrics[metricType] = {
                current: metric.value,
                unit: metric.unit,
                trend: metric.trend,
                threshold: this.alertThresholds[metricType]
            };
        }

        // 分析趋势
        for (const [metricType, history] of this.metricsHistory) {
            if (history.length >= 5) {
                const recentValues = history.slice(-5).map(h => h.value);
                const average = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
                const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / recentValues.length;
                
                report.trends[metricType] = {
                    average,
                    variance,
                    stability: variance < average * 0.1 ? 'stable' : 'unstable'
                };
            }
        }

        // 生成建议
        report.recommendations = this.generatePerformanceRecommendations(report);

        return report;
    }

    /**
     * 生成性能建议
     * @param {Object} report - 性能报告
     * @returns {Array} 建议列表
     */
    generatePerformanceRecommendations(report) {
        const recommendations = [];

        // 内存使用建议
        const memoryMetric = report.metrics[SystemMonitor.METRICS.MEMORY_USAGE];
        if (memoryMetric && memoryMetric.current > 70) {
            recommendations.push({
                type: 'memory',
                priority: memoryMetric.current > 90 ? 'high' : 'medium',
                message: '内存使用率较高，建议清理缓存或优化数据结构'
            });
        }

        // 错误率建议
        const errorMetric = report.metrics[SystemMonitor.METRICS.ERROR_RATE];
        if (errorMetric && errorMetric.current > 5) {
            recommendations.push({
                type: 'error',
                priority: errorMetric.current > 15 ? 'high' : 'medium',
                message: '错误率较高，建议检查系统稳定性'
            });
        }

        // 响应时间建议
        const responseMetric = report.metrics[SystemMonitor.METRICS.RESPONSE_TIME];
        if (responseMetric && responseMetric.current > 1000) {
            recommendations.push({
                type: 'performance',
                priority: responseMetric.current > 3000 ? 'high' : 'medium',
                message: '响应时间较长，建议优化算法或减少计算复杂度'
            });
        }

        return recommendations;
    }

    /**
     * 工具方法
     */
    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 事件监听器管理
     */
    addEventListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    removeEventListener(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            for (const callback of this.listeners.get(event)) {
                try {
                    callback(data);
                } catch (error) {
                    console.error('系统监控事件监听器执行失败:', error);
                }
            }
        }
    }

    /**
     * 清理资源
     */
    cleanup() {
        this.stopMonitoring();
        this.metrics.clear();
        this.metricsHistory.clear();
        this.activeAlerts.clear();
        this.alertHistory = [];
        this.componentStatus.clear();
        this.listeners.clear();
        console.log('SystemMonitor 资源已清理');
    }
}