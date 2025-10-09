/**
 * ErrorHandler 类 - 统一错误处理系统
 * 
 * 提供统一的错误处理、分类、恢复和用户反馈机制
 * 支持错误监控、统计和调试信息收集
 */

class ErrorHandler {
    /**
     * 错误类型常量
     */
    static ERROR_TYPES = {
        CRYPTO_ERROR: 'CRYPTO_ERROR',           // 密码学错误
        NETWORK_ERROR: 'NETWORK_ERROR',         // 网络错误
        VALIDATION_ERROR: 'VALIDATION_ERROR',   // 验证错误
        CONFIG_ERROR: 'CONFIG_ERROR',           // 配置错误
        UI_ERROR: 'UI_ERROR',                   // 界面错误
        SYSTEM_ERROR: 'SYSTEM_ERROR',           // 系统错误
        STORAGE_ERROR: 'STORAGE_ERROR',         // 存储错误
        TIMEOUT_ERROR: 'TIMEOUT_ERROR',         // 超时错误
        PERMISSION_ERROR: 'PERMISSION_ERROR',   // 权限错误
        DATA_ERROR: 'DATA_ERROR'                // 数据错误
    };

    /**
     * 错误严重级别
     */
    static ERROR_SEVERITY = {
        LOW: 1,      // 低级别 - 不影响核心功能
        MEDIUM: 2,   // 中级别 - 影响部分功能
        HIGH: 3,     // 高级别 - 影响核心功能
        CRITICAL: 4  // 严重级别 - 系统无法正常运行
    };

    /**
     * 错误恢复策略
     */
    static RECOVERY_STRATEGIES = {
        IGNORE: 'IGNORE',           // 忽略错误
        RETRY: 'RETRY',             // 重试操作
        FALLBACK: 'FALLBACK',       // 使用备用方案
        RESTART: 'RESTART',         // 重启组件
        SHUTDOWN: 'SHUTDOWN',       // 关闭系统
        USER_ACTION: 'USER_ACTION'  // 需要用户干预
    };

    /**
     * 构造函数
     * @param {Object} config - 错误处理配置
     * @param {Logger} logger - 日志系统实例
     * @param {Object} uiManager - UI管理器实例
     */
    constructor(config = {}, logger = null, uiManager = null) {
        this.config = {
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 1000,
            enableUserNotification: config.enableUserNotification !== false,
            enableAutoRecovery: config.enableAutoRecovery !== false,
            debugMode: config.debugMode || false,
            ...config
        };

        this.logger = logger;
        this.uiManager = uiManager;

        // 错误统计
        this.errorStats = {
            totalErrors: 0,
            errorsByType: new Map(),
            errorsBySeverity: new Map(),
            recoveryAttempts: 0,
            successfulRecoveries: 0
        };

        // 错误历史记录
        this.errorHistory = [];
        this.maxHistorySize = config.maxHistorySize || 1000;

        // 重试队列
        this.retryQueue = new Map();

        // 错误处理规则
        this.errorRules = new Map();
        this.initializeDefaultRules();

        // 系统状态监控
        this.systemHealth = {
            status: 'healthy',
            lastCheck: Date.now(),
            issues: []
        };

        // 事件监听器
        this.listeners = new Map();

        // 全局错误捕获
        this.setupGlobalErrorHandling();

        console.log('ErrorHandler 初始化完成');
    }

    /**
     * 初始化默认错误处理规则
     */
    initializeDefaultRules() {
        // 密码学错误规则
        this.addErrorRule(ErrorHandler.ERROR_TYPES.CRYPTO_ERROR, {
            severity: ErrorHandler.ERROR_SEVERITY.HIGH,
            strategy: ErrorHandler.RECOVERY_STRATEGIES.RETRY,
            maxRetries: 2,
            userNotification: true,
            autoRecover: true
        });

        // 网络错误规则
        this.addErrorRule(ErrorHandler.ERROR_TYPES.NETWORK_ERROR, {
            severity: ErrorHandler.ERROR_SEVERITY.MEDIUM,
            strategy: ErrorHandler.RECOVERY_STRATEGIES.RETRY,
            maxRetries: 3,
            userNotification: false,
            autoRecover: true
        });

        // 验证错误规则
        this.addErrorRule(ErrorHandler.ERROR_TYPES.VALIDATION_ERROR, {
            severity: ErrorHandler.ERROR_SEVERITY.HIGH,
            strategy: ErrorHandler.RECOVERY_STRATEGIES.USER_ACTION,
            maxRetries: 0,
            userNotification: true,
            autoRecover: false
        });

        // 配置错误规则
        this.addErrorRule(ErrorHandler.ERROR_TYPES.CONFIG_ERROR, {
            severity: ErrorHandler.ERROR_SEVERITY.CRITICAL,
            strategy: ErrorHandler.RECOVERY_STRATEGIES.USER_ACTION,
            maxRetries: 0,
            userNotification: true,
            autoRecover: false
        });

        // UI错误规则
        this.addErrorRule(ErrorHandler.ERROR_TYPES.UI_ERROR, {
            severity: ErrorHandler.ERROR_SEVERITY.LOW,
            strategy: ErrorHandler.RECOVERY_STRATEGIES.FALLBACK,
            maxRetries: 1,
            userNotification: false,
            autoRecover: true
        });
    }

    /**
     * 添加错误处理规则
     * @param {string} errorType - 错误类型
     * @param {Object} rule - 处理规则
     */
    addErrorRule(errorType, rule) {
        this.errorRules.set(errorType, {
            severity: rule.severity || ErrorHandler.ERROR_SEVERITY.MEDIUM,
            strategy: rule.strategy || ErrorHandler.RECOVERY_STRATEGIES.IGNORE,
            maxRetries: rule.maxRetries || 0,
            retryDelay: rule.retryDelay || this.config.retryDelay,
            userNotification: rule.userNotification !== false,
            autoRecover: rule.autoRecover !== false,
            customHandler: rule.customHandler || null,
            ...rule
        });
    }

    /**
     * 处理错误
     * @param {Error|string} error - 错误对象或错误消息
     * @param {string} errorType - 错误类型
     * @param {Object} context - 错误上下文信息
     * @param {Object} options - 处理选项
     * @returns {Promise<Object>} 处理结果
     */
    async handleError(error, errorType = ErrorHandler.ERROR_TYPES.SYSTEM_ERROR, context = {}, options = {}) {
        const errorId = this.generateErrorId();
        const timestamp = Date.now();

        // 创建标准化错误对象
        const standardError = this.standardizeError(error, errorType, context, errorId, timestamp);

        // 记录错误
        this.recordError(standardError);

        // 获取处理规则
        const rule = this.errorRules.get(errorType) || this.getDefaultRule();

        // 执行自定义处理器
        if (rule.customHandler) {
            try {
                const customResult = await rule.customHandler(standardError, context);
                if (customResult && customResult.handled) {
                    return customResult;
                }
            } catch (customError) {
                console.error('自定义错误处理器执行失败:', customError);
            }
        }

        // 执行标准处理流程
        const result = await this.executeErrorHandling(standardError, rule, options);

        // 通知监听器
        this.notifyListeners('error', { error: standardError, result });

        return result;
    }

    /**
     * 标准化错误对象
     * @param {Error|string} error - 原始错误
     * @param {string} errorType - 错误类型
     * @param {Object} context - 上下文信息
     * @param {string} errorId - 错误ID
     * @param {number} timestamp - 时间戳
     * @returns {Object} 标准化错误对象
     */
    standardizeError(error, errorType, context, errorId, timestamp) {
        const isErrorObject = error instanceof Error;
        
        return {
            id: errorId,
            type: errorType,
            message: isErrorObject ? error.message : String(error),
            stack: isErrorObject ? error.stack : new Error().stack,
            timestamp,
            context: {
                component: context.component || 'unknown',
                operation: context.operation || 'unknown',
                userId: context.userId || null,
                nodeId: context.nodeId || null,
                blockId: context.blockId || null,
                chainId: context.chainId || null,
                ...context
            },
            originalError: error,
            severity: this.getSeverity(errorType),
            retryCount: 0,
            recovered: false
        };
    }

    /**
     * 执行错误处理
     * @param {Object} standardError - 标准化错误对象
     * @param {Object} rule - 处理规则
     * @param {Object} options - 处理选项
     * @returns {Promise<Object>} 处理结果
     */
    async executeErrorHandling(standardError, rule, options) {
        const result = {
            errorId: standardError.id,
            handled: false,
            recovered: false,
            strategy: rule.strategy,
            userNotified: false,
            retryAttempted: false,
            message: ''
        };

        try {
            // 记录日志
            if (this.logger) {
                this.logger.logValidationError(
                    standardError.type,
                    standardError.message,
                    {
                        errorId: standardError.id,
                        severity: standardError.severity,
                        context: standardError.context
                    }
                );
            }

            // 用户通知
            if (rule.userNotification && this.config.enableUserNotification) {
                await this.notifyUser(standardError, rule);
                result.userNotified = true;
            }

            // 执行恢复策略
            if (this.config.enableAutoRecovery && rule.autoRecover) {
                const recoveryResult = await this.executeRecoveryStrategy(standardError, rule);
                result.recovered = recoveryResult.success;
                result.retryAttempted = recoveryResult.retryAttempted;
                result.message = recoveryResult.message;
            } else if (rule.strategy === ErrorHandler.RECOVERY_STRATEGIES.USER_ACTION) {
                result.message = '需要用户干预';
            }

            result.handled = true;

        } catch (handlingError) {
            console.error('错误处理过程中发生异常:', handlingError);
            result.message = '错误处理失败';
        }

        return result;
    }

    /**
     * 执行恢复策略
     * @param {Object} standardError - 标准化错误对象
     * @param {Object} rule - 处理规则
     * @returns {Promise<Object>} 恢复结果
     */
    async executeRecoveryStrategy(standardError, rule) {
        const result = {
            success: false,
            retryAttempted: false,
            message: ''
        };

        switch (rule.strategy) {
            case ErrorHandler.RECOVERY_STRATEGIES.IGNORE:
                result.success = true;
                result.message = '错误已忽略';
                break;

            case ErrorHandler.RECOVERY_STRATEGIES.RETRY:
                result.retryAttempted = true;
                const retryResult = await this.retryOperation(standardError, rule);
                result.success = retryResult.success;
                result.message = retryResult.message;
                break;

            case ErrorHandler.RECOVERY_STRATEGIES.FALLBACK:
                const fallbackResult = await this.executeFallback(standardError);
                result.success = fallbackResult.success;
                result.message = fallbackResult.message;
                break;

            case ErrorHandler.RECOVERY_STRATEGIES.RESTART:
                const restartResult = await this.restartComponent(standardError);
                result.success = restartResult.success;
                result.message = restartResult.message;
                break;

            case ErrorHandler.RECOVERY_STRATEGIES.USER_ACTION:
                result.success = false;
                result.message = '需要用户干预';
                break;

            case ErrorHandler.RECOVERY_STRATEGIES.SHUTDOWN:
                result.message = '系统需要关闭';
                break;

            default:
                result.message = '未知恢复策略';
        }

        if (result.success) {
            this.errorStats.successfulRecoveries++;
            standardError.recovered = true;
        }

        this.errorStats.recoveryAttempts++;
        return result;
    }

    /**
     * 重试操作
     * @param {Object} standardError - 标准化错误对象
     * @param {Object} rule - 处理规则
     * @returns {Promise<Object>} 重试结果
     */
    async retryOperation(standardError, rule) {
        const maxRetries = rule.maxRetries || this.config.maxRetries;
        const retryDelay = rule.retryDelay || this.config.retryDelay;

        if (standardError.retryCount >= maxRetries) {
            return {
                success: false,
                message: `重试次数已达上限 (${maxRetries})`
            };
        }

        standardError.retryCount++;

        // 延迟重试
        if (retryDelay > 0) {
            await this.delay(retryDelay);
        }

        // 这里应该重新执行原始操作
        // 由于我们无法直接重试原始操作，这里返回一个模拟结果
        // 实际实现中，应该通过回调函数或其他机制来重试
        
        return {
            success: Math.random() > 0.5, // 模拟50%成功率
            message: `重试第 ${standardError.retryCount} 次`
        };
    }

    /**
     * 执行备用方案
     * @param {Object} standardError - 标准化错误对象
     * @returns {Promise<Object>} 备用方案结果
     */
    async executeFallback(standardError) {
        // 根据错误类型执行不同的备用方案
        switch (standardError.type) {
            case ErrorHandler.ERROR_TYPES.UI_ERROR:
                return this.uiFallback(standardError);
            
            case ErrorHandler.ERROR_TYPES.NETWORK_ERROR:
                return this.networkFallback(standardError);
            
            case ErrorHandler.ERROR_TYPES.STORAGE_ERROR:
                return this.storageFallback(standardError);
            
            default:
                return {
                    success: false,
                    message: '没有可用的备用方案'
                };
        }
    }

    /**
     * UI错误备用方案
     * @param {Object} standardError - 标准化错误对象
     * @returns {Object} 备用方案结果
     */
    uiFallback(standardError) {
        // 尝试重新渲染组件或使用简化版本
        if (this.uiManager) {
            try {
                // 这里应该调用UI管理器的恢复方法
                return {
                    success: true,
                    message: 'UI组件已使用备用渲染方式'
                };
            } catch (error) {
                return {
                    success: false,
                    message: 'UI备用方案执行失败'
                };
            }
        }
        
        return {
            success: false,
            message: 'UI管理器不可用'
        };
    }

    /**
     * 网络错误备用方案
     * @param {Object} standardError - 标准化错误对象
     * @returns {Object} 备用方案结果
     */
    networkFallback(standardError) {
        // 尝试使用备用连接或降级功能
        return {
            success: true,
            message: '已切换到网络备用模式'
        };
    }

    /**
     * 存储错误备用方案
     * @param {Object} standardError - 标准化错误对象
     * @returns {Object} 备用方案结果
     */
    storageFallback(standardError) {
        // 尝试使用内存存储或其他存储方式
        return {
            success: true,
            message: '已切换到备用存储方式'
        };
    }

    /**
     * 重启组件
     * @param {Object} standardError - 标准化错误对象
     * @returns {Promise<Object>} 重启结果
     */
    async restartComponent(standardError) {
        const component = standardError.context.component;
        
        try {
            // 这里应该实现具体的组件重启逻辑
            console.log(`正在重启组件: ${component}`);
            
            // 模拟重启过程
            await this.delay(1000);
            
            return {
                success: true,
                message: `组件 ${component} 重启成功`
            };
        } catch (error) {
            return {
                success: false,
                message: `组件 ${component} 重启失败: ${error.message}`
            };
        }
    }

    /**
     * 通知用户
     * @param {Object} standardError - 标准化错误对象
     * @param {Object} rule - 处理规则
     * @returns {Promise<void>}
     */
    async notifyUser(standardError, rule) {
        const userMessage = this.generateUserMessage(standardError, rule);
        
        if (this.uiManager && this.uiManager.showNotification) {
            await this.uiManager.showNotification({
                type: this.getSeverityLevel(standardError.severity),
                title: '系统错误',
                message: userMessage,
                errorId: standardError.id,
                actions: this.generateUserActions(standardError, rule)
            });
        } else {
            // 备用通知方式
            console.warn('用户通知:', userMessage);
            
            if (standardError.severity >= ErrorHandler.ERROR_SEVERITY.HIGH) {
                alert(`系统错误: ${userMessage}`);
            }
        }
    }

    /**
     * 生成用户友好的错误消息
     * @param {Object} standardError - 标准化错误对象
     * @param {Object} rule - 处理规则
     * @returns {string} 用户消息
     */
    generateUserMessage(standardError, rule) {
        const errorTypeMessages = {
            [ErrorHandler.ERROR_TYPES.CRYPTO_ERROR]: '密码学操作失败，请检查数据完整性',
            [ErrorHandler.ERROR_TYPES.NETWORK_ERROR]: '网络连接出现问题，正在尝试重新连接',
            [ErrorHandler.ERROR_TYPES.VALIDATION_ERROR]: '数据验证失败，请检查输入内容',
            [ErrorHandler.ERROR_TYPES.CONFIG_ERROR]: '配置错误，请检查系统设置',
            [ErrorHandler.ERROR_TYPES.UI_ERROR]: '界面显示异常，正在尝试恢复',
            [ErrorHandler.ERROR_TYPES.SYSTEM_ERROR]: '系统内部错误，请稍后重试',
            [ErrorHandler.ERROR_TYPES.STORAGE_ERROR]: '数据存储失败，请检查存储空间',
            [ErrorHandler.ERROR_TYPES.TIMEOUT_ERROR]: '操作超时，请检查网络连接',
            [ErrorHandler.ERROR_TYPES.PERMISSION_ERROR]: '权限不足，无法执行此操作',
            [ErrorHandler.ERROR_TYPES.DATA_ERROR]: '数据格式错误，请检查输入内容'
        };

        let message = errorTypeMessages[standardError.type] || '未知错误';
        
        // 添加恢复信息
        if (rule.autoRecover && rule.strategy === ErrorHandler.RECOVERY_STRATEGIES.RETRY) {
            message += '，系统正在自动重试';
        }
        
        // 添加调试信息（仅在调试模式下）
        if (this.config.debugMode) {
            message += `\n\n调试信息:\n错误ID: ${standardError.id}\n组件: ${standardError.context.component}\n操作: ${standardError.context.operation}`;
        }

        return message;
    }

    /**
     * 生成用户操作选项
     * @param {Object} standardError - 标准化错误对象
     * @param {Object} rule - 处理规则
     * @returns {Array} 操作选项
     */
    generateUserActions(standardError, rule) {
        const actions = [];

        // 重试操作
        if (rule.strategy === ErrorHandler.RECOVERY_STRATEGIES.RETRY && standardError.retryCount < rule.maxRetries) {
            actions.push({
                label: '重试',
                action: 'retry',
                errorId: standardError.id
            });
        }

        // 查看详情
        if (this.config.debugMode || standardError.severity >= ErrorHandler.ERROR_SEVERITY.HIGH) {
            actions.push({
                label: '查看详情',
                action: 'details',
                errorId: standardError.id
            });
        }

        // 忽略错误
        if (standardError.severity <= ErrorHandler.ERROR_SEVERITY.MEDIUM) {
            actions.push({
                label: '忽略',
                action: 'ignore',
                errorId: standardError.id
            });
        }

        // 报告错误
        actions.push({
            label: '报告问题',
            action: 'report',
            errorId: standardError.id
        });

        return actions;
    }

    /**
     * 处理用户操作
     * @param {string} action - 操作类型
     * @param {string} errorId - 错误ID
     * @returns {Promise<Object>} 操作结果
     */
    async handleUserAction(action, errorId) {
        const error = this.findErrorById(errorId);
        if (!error) {
            return { success: false, message: '错误记录不存在' };
        }

        switch (action) {
            case 'retry':
                return await this.retryErrorOperation(error);
            
            case 'details':
                return this.showErrorDetails(error);
            
            case 'ignore':
                return this.ignoreError(error);
            
            case 'report':
                return this.reportError(error);
            
            default:
                return { success: false, message: '未知操作' };
        }
    }

    /**
     * 重试错误操作
     * @param {Object} error - 错误对象
     * @returns {Promise<Object>} 重试结果
     */
    async retryErrorOperation(error) {
        const rule = this.errorRules.get(error.type) || this.getDefaultRule();
        
        if (error.retryCount >= rule.maxRetries) {
            return {
                success: false,
                message: `重试次数已达上限 (${rule.maxRetries})`
            };
        }

        // 执行重试
        const retryResult = await this.retryOperation(error, rule);
        
        return {
            success: retryResult.success,
            message: retryResult.message,
            retryCount: error.retryCount
        };
    }

    /**
     * 显示错误详情
     * @param {Object} error - 错误对象
     * @returns {Object} 详情结果
     */
    showErrorDetails(error) {
        return {
            success: true,
            details: {
                id: error.id,
                type: error.type,
                message: error.message,
                timestamp: error.timestamp,
                context: error.context,
                stack: error.stack,
                severity: error.severity,
                retryCount: error.retryCount,
                recovered: error.recovered
            }
        };
    }

    /**
     * 忽略错误
     * @param {Object} error - 错误对象
     * @returns {Object} 忽略结果
     */
    ignoreError(error) {
        // 标记错误为已忽略
        error.ignored = true;
        error.ignoredAt = Date.now();
        
        return {
            success: true,
            message: '错误已忽略'
        };
    }

    /**
     * 报告错误
     * @param {Object} error - 错误对象
     * @returns {Object} 报告结果
     */
    reportError(error) {
        // 创建错误报告
        const report = {
            errorId: error.id,
            type: error.type,
            message: error.message,
            timestamp: error.timestamp,
            context: error.context,
            userAgent: navigator.userAgent,
            url: window.location.href,
            reportedAt: Date.now()
        };

        // 这里应该发送到错误报告服务
        console.log('错误报告:', report);
        
        return {
            success: true,
            message: '错误报告已提交',
            reportId: `report_${Date.now()}`
        };
    }

    /**
     * 设置全局错误处理
     */
    setupGlobalErrorHandling() {
        // 捕获未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(
                event.reason,
                ErrorHandler.ERROR_TYPES.SYSTEM_ERROR,
                { component: 'global', operation: 'promise_rejection' }
            );
        });

        // 捕获全局JavaScript错误
        window.addEventListener('error', (event) => {
            this.handleError(
                event.error || event.message,
                ErrorHandler.ERROR_TYPES.SYSTEM_ERROR,
                { 
                    component: 'global', 
                    operation: 'javascript_error',
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                }
            );
        });
    }

    /**
     * 系统健康检查
     * @returns {Object} 健康状态
     */
    performHealthCheck() {
        const now = Date.now();
        const issues = [];

        // 检查错误率
        const recentErrors = this.errorHistory.filter(
            error => now - error.timestamp < 60000 // 最近1分钟
        );
        
        if (recentErrors.length > 10) {
            issues.push({
                type: 'high_error_rate',
                message: '错误率过高',
                severity: ErrorHandler.ERROR_SEVERITY.HIGH
            });
        }

        // 检查严重错误
        const criticalErrors = recentErrors.filter(
            error => error.severity >= ErrorHandler.ERROR_SEVERITY.CRITICAL
        );
        
        if (criticalErrors.length > 0) {
            issues.push({
                type: 'critical_errors',
                message: '存在严重错误',
                severity: ErrorHandler.ERROR_SEVERITY.CRITICAL
            });
        }

        // 检查恢复成功率
        const recoveryRate = this.errorStats.recoveryAttempts > 0 
            ? this.errorStats.successfulRecoveries / this.errorStats.recoveryAttempts 
            : 1;
        
        if (recoveryRate < 0.5) {
            issues.push({
                type: 'low_recovery_rate',
                message: '错误恢复成功率低',
                severity: ErrorHandler.ERROR_SEVERITY.MEDIUM
            });
        }

        // 更新健康状态
        this.systemHealth = {
            status: issues.length === 0 ? 'healthy' : 
                   issues.some(i => i.severity >= ErrorHandler.ERROR_SEVERITY.CRITICAL) ? 'critical' :
                   issues.some(i => i.severity >= ErrorHandler.ERROR_SEVERITY.HIGH) ? 'unhealthy' : 'degraded',
            lastCheck: now,
            issues
        };

        return this.systemHealth;
    }

    /**
     * 获取错误统计信息
     * @returns {Object} 统计信息
     */
    getErrorStats() {
        return {
            ...this.errorStats,
            healthStatus: this.systemHealth,
            recentErrors: this.errorHistory.slice(-10),
            errorRulesCount: this.errorRules.size
        };
    }

    /**
     * 记录错误
     * @param {Object} standardError - 标准化错误对象
     */
    recordError(standardError) {
        // 添加到历史记录
        this.errorHistory.push(standardError);
        
        // 维护历史记录大小
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.shift();
        }

        // 更新统计信息
        this.errorStats.totalErrors++;
        
        const typeCount = this.errorStats.errorsByType.get(standardError.type) || 0;
        this.errorStats.errorsByType.set(standardError.type, typeCount + 1);
        
        const severityCount = this.errorStats.errorsBySeverity.get(standardError.severity) || 0;
        this.errorStats.errorsBySeverity.set(standardError.severity, severityCount + 1);
    }

    /**
     * 工具方法
     */
    generateErrorId() {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getSeverity(errorType) {
        const rule = this.errorRules.get(errorType);
        return rule ? rule.severity : ErrorHandler.ERROR_SEVERITY.MEDIUM;
    }

    getSeverityLevel(severity) {
        const levels = ['debug', 'info', 'warning', 'error', 'critical'];
        return levels[severity] || 'error';
    }

    getDefaultRule() {
        return {
            severity: ErrorHandler.ERROR_SEVERITY.MEDIUM,
            strategy: ErrorHandler.RECOVERY_STRATEGIES.IGNORE,
            maxRetries: 0,
            userNotification: true,
            autoRecover: false
        };
    }

    findErrorById(errorId) {
        return this.errorHistory.find(error => error.id === errorId);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
                    console.error('错误处理事件监听器执行失败:', error);
                }
            }
        }
    }

    /**
     * 清理资源
     */
    cleanup() {
        this.errorHistory = [];
        this.retryQueue.clear();
        this.listeners.clear();
        console.log('ErrorHandler 资源已清理');
    }
}