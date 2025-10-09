/**
 * Logger Class - Logging System
 * 
 * Responsible for recording various operation logs in the system, including block additions, acceptances, rejections, warnings, blacklisting, etc.
 * Supports log classification management, timestamp recording, and related data storage.
 */

class Logger {
    /**
     * Log type constants
     */
    static LOG_TYPES = {
        BLOCK_ADDED: 'BLOCK_ADDED',
        BLOCK_ACCEPTED: 'BLOCK_ACCEPTED',
        BLOCK_REJECTED: 'BLOCK_REJECTED',
        FORK_WARNING: 'FORK_WARNING',
        USER_BLACKLISTED: 'USER_BLACKLISTED',
        NETWORK_EVENT: 'NETWORK_EVENT',
        VALIDATION_ERROR: 'VALIDATION_ERROR',
        SYSTEM_INFO: 'SYSTEM_INFO'
    };

    /**
     * Log level constants
     */
    static LOG_LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        CRITICAL: 4
    };

    /**
     * Constructor
     * @param {Object} config - Log configuration
     * @param {number} config.maxLogs - Maximum number of logs, default 1000
     * @param {number} config.logLevel - Log level, default INFO
     * @param {boolean} config.enableConsole - Whether to enable console output, default true
     */
    constructor(config = {}) {
        this.maxLogs = config.maxLogs || 1000;
        this.logLevel = config.logLevel || Logger.LOG_LEVELS.INFO;
        this.enableConsole = config.enableConsole !== false;
        
        this.logs = [];
        this.logIndex = 0; 
        
        this.stats = {
            totalLogs: 0,
            logsByType: new Map(),
            logsByLevel: new Map()
        };
        
        this.listeners = new Map();
        
        console.log('Logger initialized');
    }

    /**
     * Log a message
     * @param {string} type - Log type
     * @param {string} message - Log message
     * @param {Object} relatedData - Related data
     * @param {number} level - Log level
     * @returns {Object} Log entry
     */
    log(type, message, relatedData = {}, level = Logger.LOG_LEVELS.INFO) {
        if (level < this.logLevel) {
            return null;
        }

        const logEntry = {
            id: `log_${++this.logIndex}`,
            type,
            message,
            level,
            timestamp: Date.now(),
            tick: relatedData.tick || 0,
            relatedData: { ...relatedData }
        };

        this.logs.push(logEntry);
        
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        this.updateStats(type, level);

        if (this.enableConsole) {
            this.consoleOutput(logEntry);
        }

        this.notifyListeners('log', logEntry);

        return logEntry;
    }

    /**
     * Log block added
     * @param {string} blockId - Block ID
     * @param {string} chainId - Chain ID
     * @param {string} creatorId - Creator ID
     * @param {Object} additionalData - Additional data
     * @returns {Object} Log entry
     */
    logBlockAdded(blockId, chainId, creatorId, additionalData = {}) {
        return this.log(
            Logger.LOG_TYPES.BLOCK_ADDED,
            `Block ${blockId} has been added to blockchain ${chainId}`,
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
     * Log block accepted
     * @param {string} blockId - Block ID
     * @param {string} chainId - Chain ID
     * @param {string} receiverId - Receiver ID
     * @param {Object} additionalData - Additional data
     * @returns {Object} Log entry
     */
    logBlockAccepted(blockId, chainId, receiverId, additionalData = {}) {
        return this.log(
            Logger.LOG_TYPES.BLOCK_ACCEPTED,
            `Block ${blockId} has been accepted, blockchain ${chainId} transferred to ${receiverId}`,
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
     * Log block rejected
     * @param {string} blockId - Block ID
     * @param {string} chainId - Chain ID
     * @param {string} reason - Reason for rejection
     * @param {Object} additionalData - Additional data
     * @returns {Object} Log entry
     */
    logBlockRejected(blockId, chainId, reason, additionalData = {}) {
        return this.log(
            Logger.LOG_TYPES.BLOCK_REJECTED,
            `Block ${blockId} was rejected: ${reason}`,
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
     * Log fork warning
     * @param {string} chainId - Chain ID
     * @param {Array} conflictBlocks - List of conflicting blocks
     * @param {Object} additionalData - Additional data
     * @returns {Object} Log entry
     */
    logForkWarning(chainId, conflictBlocks, additionalData = {}) {
        return this.log(
            Logger.LOG_TYPES.FORK_WARNING,
            `Fork detected in blockchain ${chainId}, conflicting blocks: ${conflictBlocks.join(', ')}`,
            {
                chainId,
                conflictBlocks,
                ...additionalData
            },
            Logger.LOG_LEVELS.ERROR
        );
    }

    /**
     * Log user blacklisted
     * @param {string} userId - User ID
     * @param {string} reason - Reason for blacklisting
     * @param {Object} additionalData - Additional data
     * @returns {Object} Log entry
     */
    logUserBlacklisted(userId, reason, additionalData = {}) {
        return this.log(
            Logger.LOG_TYPES.USER_BLACKLISTED,
            `User ${userId} was blacklisted: ${reason}`,
            {
                userId,
                reason,
                ...additionalData
            },
            Logger.LOG_LEVELS.CRITICAL
        );
    }

    /**
     * Log network event
     * @param {string} eventType - Event type
     * @param {string} description - Event description
     * @param {Object} additionalData - Additional data
     * @returns {Object} Log entry
     */
    logNetworkEvent(eventType, description, additionalData = {}) {
        return this.log(
            Logger.LOG_TYPES.NETWORK_EVENT,
            `Network event [${eventType}]: ${description}`,
            {
                eventType,
                ...additionalData
            },
            Logger.LOG_LEVELS.INFO
        );
    }

    /**
     * Log validation error
     * @param {string} validationType - Validation type
     * @param {string} error - Error message
     * @param {Object} additionalData - Additional data
     * @returns {Object} Log entry
     */
    logValidationError(validationType, error, additionalData = {}) {
        return this.log(
            Logger.LOG_TYPES.VALIDATION_ERROR,
            `Validation error [${validationType}]: ${error}`,
            {
                validationType,
                error,
                ...additionalData
            },
            Logger.LOG_LEVELS.ERROR
        );
    }

    /**
     * Log system info
     * @param {string} info - Information content
     * @param {Object} additionalData - Additional data
     * @returns {Object} Log entry
     */
    logSystemInfo(info, additionalData = {}) {
        return this.log(
            Logger.LOG_TYPES.SYSTEM_INFO,
            `System info: ${info}`,
            additionalData,
            Logger.LOG_LEVELS.INFO
        );
    }

    /**
     * Get log list
     * @param {Object} filter - Filter conditions
     * @param {number} page - Page number (starting from 1)
     * @param {number} pageSize - Page size
     * @returns {Object} Paginated log data
     */
    getLogs(filter = {}, page = 1, pageSize = 100) {
        let filteredLogs = [...this.logs];

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

        filteredLogs.sort((a, b) => b.timestamp - a.timestamp);

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
     * Get logs by user ID
     * @param {string} userId - User ID
     * @param {number} limit - Limit
     * @returns {Array} Log list
     */
    getLogsByUser(userId, limit = 100) {
        return this.getLogs({ userId }, 1, limit).logs;
    }

    /**
     * Get logs by chain ID
     * @param {string} chainId - Chain ID
     * @param {number} limit - Limit
     * @returns {Array} Log list
     */
    getLogsByChain(chainId, limit = 100) {
        return this.getLogs({ chainId }, 1, limit).logs;
    }

    /**
     * Get logs by block ID
     * @param {string} blockId - Block ID
     * @param {number} limit - Limit
     * @returns {Array} Log list
     */
    getLogsByBlock(blockId, limit = 100) {
        return this.getLogs({ blockId }, 1, limit).logs;
    }

    /**
     * Get recent logs
     * @param {number} count - Count
     * @returns {Array} Log list
     */
    getRecentLogs(count = 100) {
        return this.logs.slice(-count).reverse();
    }

    /**
     * Clear logs
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
        console.log('Logs cleared');
    }

    /**
     * Get log statistics
     * @returns {Object} Statistics
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
     * Set log level
     * @param {number} level - New log level
     */
    setLogLevel(level) {
        this.logLevel = level;
        console.log(`Log level set to: ${level}`);
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    addEventListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    removeEventListener(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    /**
     * Notify event listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            for (const callback of this.listeners.get(event)) {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in log event listener:', error);
                }
            }
        }
    }

    /**
     * Update statistics
     * @param {string} type - Log type
     * @param {number} level - Log level
     */
    updateStats(type, level) {
        this.stats.totalLogs++;
        
        const typeCount = this.stats.logsByType.get(type) || 0;
        this.stats.logsByType.set(type, typeCount + 1);
        
        const levelCount = this.stats.logsByLevel.get(level) || 0;
        this.stats.logsByLevel.set(level, levelCount + 1);
    }

    /**
     * Console output
     * @param {Object} logEntry - Log entry
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
     * Export logs as JSON
     * @param {Object} filter - Filter conditions
     * @returns {string} JSON string
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
     * Import logs from JSON
     * @param {string} jsonData - JSON data
     * @param {boolean} append - Whether to append to existing logs
     */
    importLogs(jsonData, append = false) {
        try {
            const data = JSON.parse(jsonData);
            
            if (!append) {
                this.clearLogs();
            }
            
            if (data.logs && Array.isArray(data.logs)) {
                for (const logEntry of data.logs) {
                    logEntry.id = `log_${++this.logIndex}`;
                    this.logs.push(logEntry);
                    this.updateStats(logEntry.type, logEntry.level);
                }
                
                if (this.logs.length > this.maxLogs) {
                    const excess = this.logs.length - this.maxLogs;
                    this.logs.splice(0, excess);
                }
                
                console.log(`Imported ${data.logs.length} logs`);
            }
        } catch (error) {
            console.error('Failed to import logs:', error);
            throw error;
        }
    }
}
