/**
 * Logger 类 - 日志系统
 * 
 * 负责记录系统中的各种操作日志，包括区块添加、接受、拒绝、警告、拉黑等
 * 支持日志分类管理、时间戳记录和相关数据存储
 */

export class Logger {
    /**
     * 日志类型常量
     */
    static LOG_TYPES = {
        BLOCK_ADDED: 'BLOCK_ADDED',           // 区块添加
        BLOCK_ACCEPTED: 'BLOCK_ACCEPTED',     // 区块接受
        BLOCK_REJECTED: 'BLOCK_REJECTED',     // 区块拒绝
        FORK_WARNING: 'FORK_WARNING',         // 分叉警告
        USER_BLACKLISTED: 'USER_BLACKLISTED', // 用户拉黑
        NETWORK_EVENT: 'NETWORK_EVENT',       // 网络事件
        VALIDATION_ERROR: 'VALIDATION_ERROR', // 验证错误
        SYSTEM_INFO: 'SYSTEM_INFO'            // 系统信息
    };

    /**
     * 日志级别常量
     */
    static LOG_LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        CRITICAL: 4
    };

    /**
     * 构造函数
     * @param {Object} config - 日志配置
     * @param {number} config.maxLogs - 最大日志条数，默认1000
     * @param {number} config.logLevel - 日志级别，默认INFO
     * @param {boolean} config.enableConsole - 是否启用控制台输出，默认true
     */
    constructor(config = {}) {
        this.maxLogs = config.maxLogs || 1000;
        this.logLevel = config.logLevel || Logger.LOG_LEVELS.INFO;
        this.enableConsole = config.enableConsole !== false;
        
        // 日志存储
        this.logs = [];
        this.logIndex = 0; // 用于生成唯一ID
        
        // 日志统计
        this.stats = {
            totalLogs: 0,
            logsByType: new Map(),
            logsByLevel: new Map()
        };
        
        // 事件监听器
        this.listeners = new Map();
        
        console.log('Logger 初始化完成');
    }

    /**
     * 记录日志
     * @param {string} type - 日志类型
     * @param {string} message - 日志消息
     * @param {Object} relatedData - 相关数据
     * @param {number} level - 日志级别
     * @returns {Object} 日志条目
     */
    log(type, message, relatedData = {}, level = Logger.LOG_LEVELS.INFO) {
        // 检查日志级别
        if (level < this.logLevel) {
            return null;
        }

        // 创建日志条目
        const logEntry = {
            id: `log_${++this.logIndex}`,
            type,
            message,
            level,
            timestamp: Date.now(),
            tick: relatedData.tick || 0,
            relatedData: { ...relatedData }
        };

        // 添加到日志数组
        this.logs.push(logEntry);
        
        // 维护最大日志数量
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // 更新统计信息
        this.updateStats(type, level);

        // 控制台输出
        if (this.enableConsole) {
            this.consoleOutput(logEntry);
        }

        // 触发事件监听器
        this.notifyListeners('log', logEntry);

        return logEntry;
    }

    /**
     * 记录区块添加日志
     * @param {string} blockId - 区块ID
     * @param {string} chainId - 区块链ID
     * @param {string} creatorId - 创建者ID
     * @param {Object} additionalData - 额外数据
     * @returns {Object} 日志条目
     */
    logBlockAdded(blockId, chainId, creatorId, additionalData = {}) {
        return this.log(
            Logger.LOG_TYPES.BLOCK_ADDED,
            `区块 ${blockId} 已添加到区块链 ${chainId}`,
            {
                blockId,
                chainId,
                creatorId,
                ...additionalData
            },
            Logger.LOG_LEVELS.INFO
        );
    }

    /**
     * 记录区块接受日志
     * @param {string} blockId - 区块ID
     * @param {string} chainId - 区块链ID
     * @param {string} receiverId - 接收者ID
     * @param {Object} additionalData - 额外数据
     * @returns {Object} 日志条目
     */
    logBlockAccepted(blockId, chainId, receiverId, additionalData = {}) {
        return this.log(
            Logger.LOG_TYPES.BLOCK_ACCEPTED,
            `区块 ${blockId} 已被接受，区块链 ${chainId} 转移给 ${receiverId}`,
            {
                blockId,
                chainId,
                receiverId,
                ...additionalData
            },
            Logger.LOG_LEVELS.INFO
        );
    }

    /**
     * 记录区块拒绝日志
     * @param {string} blockId - 区块ID
     * @param {string} chainId - 区块链ID
     * @param {string} reason - 拒绝原因
     * @param {Object} additionalData - 额外数据
     * @returns {Object} 日志条目
     */
    logBlockRejected(blockId, chainId, reason, additionalData = {}) {
        return this.log(
            Logger.LOG_TYPES.BLOCK_REJECTED,
            `区块 ${blockId} 被拒绝: ${reason}`,
            {
                blockId,
                chainId,
                reason,
                ...additionalData
            },
            Logger.LOG_LEVELS.WARN
        );
    }

    /**
     * 记录分叉警告日志
     * @param {string} chainId - 区块链ID
     * @param {Array} conflictBlocks - 冲突区块列表
     * @param {Object} additionalData - 额外数据
     * @returns {Object} 日志条目
     */
    logForkWarning(chainId, conflictBlocks, additionalData = {}) {
        return this.log(
            Logger.LOG_TYPES.FORK_WARNING,
            `检测到区块链 ${chainId} 分叉，冲突区块: ${conflictBlocks.join(', ')}`,
            {
                chainId,
                conflictBlocks,
                ...additionalData
            },
            Logger.LOG_LEVELS.ERROR
        );
    }

    /**
     * 记录用户拉黑日志
     * @param {string} userId - 用户ID
     * @param {string} reason - 拉黑原因
     * @param {Object} additionalData - 额外数据
     * @returns {Object} 日志条目
     */
    logUserBlacklisted(userId, reason, additionalData = {}) {
        return this.log(
            Logger.LOG_TYPES.USER_BLACKLISTED,
            `用户 ${userId} 被拉黑: ${reason}`,
            {
                userId,
                reason,
                ...additionalData
            },
            Logger.LOG_LEVELS.CRITICAL
        );
    }

    /**
     * 记录网络事件日志
     * @param {string} eventType - 事件类型
     * @param {string} description - 事件描述
     * @param {Object} additionalData - 额外数据
     * @returns {Object} 日志条目
     */
    logNetworkEvent(eventType, description, additionalData = {}) {
        return this.log(
            Logger.LOG_TYPES.NETWORK_EVENT,
            `网络事件 [${eventType}]: ${description}`,
            {
                eventType,
                ...additionalData
            },
            Logger.LOG_LEVELS.INFO
        );
    }

    /**
     * 记录验证错误日志
     * @param {string} validationType - 验证类型
     * @param {string} error - 错误信息
     * @param {Object} additionalData - 额外数据
     * @returns {Object} 日志条目
     */
    logValidationError(validationType, error, additionalData = {}) {
        return this.log(
            Logger.LOG_TYPES.VALIDATION_ERROR,
            `验证错误 [${validationType}]: ${error}`,
            {
                validationType,
                error,
                ...additionalData
            },
            Logger.LOG_LEVELS.ERROR
        );
    }

    /**
     * 记录系统信息日志
     * @param {string} info - 信息内容
     * @param {Object} additionalData - 额外数据
     * @returns {Object} 日志条目
     */
    logSystemInfo(info, additionalData = {}) {
        return this.log(
            Logger.LOG_TYPES.SYSTEM_INFO,
            `系统信息: ${info}`,
            additionalData,
            Logger.LOG_LEVELS.INFO
        );
    }

    /**
     * 获取日志列表
     * @param {Object} filter - 过滤条件
     * @param {number} page - 页码（从1开始）
     * @param {number} pageSize - 每页大小
     * @returns {Object} 分页日志数据
     */
    getLogs(filter = {}, page = 1, pageSize = 100) {
        let filteredLogs = [...this.logs];

        // 应用过滤条件
        if (filter.type) {
            filteredLogs = filteredLogs.filter(log => log.type === filter.type);
        }
        
        if (filter.level !== undefined) {
            filteredLogs = filteredLogs.filter(log => log.level >= filter.level);
        }
        
        if (filter.userId) {
            filteredLogs = filteredLogs.filter(log => 
                log.relatedData.creatorId === filter.userId ||
                log.relatedData.receiverId === filter.userId ||
                log.relatedData.userId === filter.userId
            );
        }
        
        if (filter.chainId) {
            filteredLogs = filteredLogs.filter(log => 
                log.relatedData.chainId === filter.chainId
            );
        }
        
        if (filter.blockId) {
            filteredLogs = filteredLogs.filter(log => 
                log.relatedData.blockId === filter.blockId
            );
        }
        
        if (filter.startTime) {
            filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startTime);
        }
        
        if (filter.endTime) {
            filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endTime);
        }

        // 按时间倒序排列（最新的在前）
        filteredLogs.sort((a, b) => b.timestamp - a.timestamp);

        // 分页处理
        const totalCount = filteredLogs.length;
        const totalPages = Math.ceil(totalCount / pageSize);
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const logs = filteredLogs.slice(startIndex, endIndex);

        return {
            logs,
            pagination: {
                currentPage: page,
                pageSize,
                totalCount,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }

    /**
     * 根据用户ID获取相关日志
     * @param {string} userId - 用户ID
     * @param {number} limit - 限制数量
     * @returns {Array} 日志列表
     */
    getLogsByUser(userId, limit = 100) {
        return this.getLogs({ userId }, 1, limit).logs;
    }

    /**
     * 根据区块链ID获取相关日志
     * @param {string} chainId - 区块链ID
     * @param {number} limit - 限制数量
     * @returns {Array} 日志列表
     */
    getLogsByChain(chainId, limit = 100) {
        return this.getLogs({ chainId }, 1, limit).logs;
    }

    /**
     * 根据区块ID获取相关日志
     * @param {string} blockId - 区块ID
     * @param {number} limit - 限制数量
     * @returns {Array} 日志列表
     */
    getLogsByBlock(blockId, limit = 100) {
        return this.getLogs({ blockId }, 1, limit).logs;
    }

    /**
     * 获取最近的日志
     * @param {number} count - 数量
     * @returns {Array} 日志列表
     */
    getRecentLogs(count = 100) {
        return this.logs.slice(-count).reverse();
    }

    /**
     * 清空日志
     */
    clearLogs() {
        this.logs = [];
        this.logIndex = 0;
        this.stats = {
            totalLogs: 0,
            logsByType: new Map(),
            logsByLevel: new Map()
        };
        
        this.notifyListeners('clear');
        console.log('日志已清空');
    }

    /**
     * 获取日志统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            currentLogCount: this.logs.length,
            maxLogs: this.maxLogs,
            logLevel: this.logLevel
        };
    }

    /**
     * 设置日志级别
     * @param {number} level - 新的日志级别
     */
    setLogLevel(level) {
        this.logLevel = level;
        console.log(`日志级别设置为: ${level}`);
    }

    /**
     * 添加事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    addEventListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    /**
     * 移除事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    removeEventListener(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    /**
     * 通知事件监听器
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     */
    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            for (const callback of this.listeners.get(event)) {
                try {
                    callback(data);
                } catch (error) {
                    console.error('日志事件监听器执行错误:', error);
                }
            }
        }
    }

    /**
     * 更新统计信息
     * @param {string} type - 日志类型
     * @param {number} level - 日志级别
     */
    updateStats(type, level) {
        this.stats.totalLogs++;
        
        // 按类型统计
        const typeCount = this.stats.logsByType.get(type) || 0;
        this.stats.logsByType.set(type, typeCount + 1);
        
        // 按级别统计
        const levelCount = this.stats.logsByLevel.get(level) || 0;
        this.stats.logsByLevel.set(level, levelCount + 1);
    }

    /**
     * 控制台输出
     * @param {Object} logEntry - 日志条目
     */
    consoleOutput(logEntry) {
        const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
        const levelName = Object.keys(Logger.LOG_LEVELS)[logEntry.level] || 'UNKNOWN';
        const prefix = `[${timestamp}] [${levelName}] [${logEntry.type}]`;
        
        switch (logEntry.level) {
            case Logger.LOG_LEVELS.DEBUG:
                console.debug(prefix, logEntry.message, logEntry.relatedData);
                break;
            case Logger.LOG_LEVELS.INFO:
                console.info(prefix, logEntry.message);
                break;
            case Logger.LOG_LEVELS.WARN:
                console.warn(prefix, logEntry.message);
                break;
            case Logger.LOG_LEVELS.ERROR:
                console.error(prefix, logEntry.message);
                break;
            case Logger.LOG_LEVELS.CRITICAL:
                console.error('🚨', prefix, logEntry.message);
                break;
            default:
                console.log(prefix, logEntry.message);
        }
    }

    /**
     * 导出日志为JSON
     * @param {Object} filter - 过滤条件
     * @returns {string} JSON字符串
     */
    exportLogs(filter = {}) {
        const { logs } = this.getLogs(filter, 1, this.logs.length);
        return JSON.stringify({
            exportTime: Date.now(),
            totalCount: logs.length,
            logs
        }, null, 2);
    }

    /**
     * 从JSON导入日志
     * @param {string} jsonData - JSON数据
     * @param {boolean} append - 是否追加到现有日志
     */
    importLogs(jsonData, append = false) {
        try {
            const data = JSON.parse(jsonData);
            
            if (!append) {
                this.clearLogs();
            }
            
            if (data.logs && Array.isArray(data.logs)) {
                for (const logEntry of data.logs) {
                    // 重新分配ID以避免冲突
                    logEntry.id = `log_${++this.logIndex}`;
                    this.logs.push(logEntry);
                    this.updateStats(logEntry.type, logEntry.level);
                }
                
                // 维护最大日志数量
                if (this.logs.length > this.maxLogs) {
                    const excess = this.logs.length - this.maxLogs;
                    this.logs.splice(0, excess);
                }
                
                console.log(`导入了 ${data.logs.length} 条日志`);
            }
        } catch (error) {
            console.error('导入日志失败:', error);
            throw error;
        }
    }
}