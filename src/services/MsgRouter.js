/**
 * MsgRouter 类 - 消息路由器
 * 
 * 负责消息的路由、优先级处理和网络延迟模拟
 */

class MsgRouter {
    /**
     * 构造函数
     * @param {Object} config - 路由器配置
     * @param {number} config.minDelay - 最小延迟滴答数
     * @param {number} config.maxDelay - 最大延迟滴答数
     */
    constructor(config = {}) {
        this.minDelay = config.minDelay || 1;
        this.maxDelay = config.maxDelay || 9;
        this.currentTick = 0;
        
        // 消息队列，按优先级和延迟时间组织
        this.messageQueue = new Map(); // tick -> Array<Message>
        this.priorityQueue = []; // 高优先级消息队列
        
        // 消息类型优先级定义
        this.messagePriorities = {
            'FORK_WARNING': 1,        // 最高优先级 - 分叉警告
            'BLACKLIST_UPDATE': 2,    // 高优先级 - 黑名单更新
            'BLOCK_REJECT': 3,        // 中高优先级 - 区块拒绝
            'BLOCK_BROADCAST': 4,     // 普通优先级 - 区块广播
            'CONNECTION_REQUEST': 5,  // 低优先级 - 连接请求
            'HEARTBEAT': 6           // 最低优先级 - 心跳消息
        };
        
        // 统计信息
        this.stats = {
            totalMessages: 0,
            delayedMessages: 0,
            priorityMessages: 0,
            averageDelay: 0,
            messagesByType: new Map()
        };
    }

    /**
     * 路由消息
     * @param {Object} message - 消息对象
     * @param {string} fromNodeId - 发送方节点ID
     * @param {string} toNodeId - 接收方节点ID
     * @param {Map<string, Node>} allNodes - 所有节点映射
     * @returns {Object} 路由结果
     */
    routeMessage(message, fromNodeId, toNodeId, allNodes) {
        const routedMessage = this.prepareMessage(message, fromNodeId, toNodeId);
        const delay = this.calculateDelay(message);
        const deliveryTick = this.currentTick + delay;
        
        // 根据优先级决定处理方式
        if (this.isHighPriority(message)) {
            // 高优先级消息立即处理
            this.priorityQueue.push({
                message: routedMessage,
                fromNodeId,
                toNodeId,
                deliveryTick: this.currentTick, // 立即投递
                priority: this.getMessagePriority(message)
            });
            this.stats.priorityMessages++;
        } else {
            // 普通消息按延迟排队
            if (!this.messageQueue.has(deliveryTick)) {
                this.messageQueue.set(deliveryTick, []);
            }
            
            this.messageQueue.get(deliveryTick).push({
                message: routedMessage,
                fromNodeId,
                toNodeId,
                deliveryTick,
                priority: this.getMessagePriority(message)
            });
            this.stats.delayedMessages++;
        }
        
        this.updateStats(message, delay);
        
        return {
            messageId: routedMessage.messageId,
            delay,
            deliveryTick,
            priority: this.getMessagePriority(message),
            isHighPriority: this.isHighPriority(message)
        };
    }

    /**
     * 广播消息到网络
     * @param {Object} message - 消息对象
     * @param {string} originNodeId - 发起节点ID
     * @param {Map<string, Node>} allNodes - 所有节点映射
     * @param {Map<string, Set<string>>} connections - 连接关系映射
     * @returns {Object} 广播结果
     */
    broadcastMessage(message, originNodeId, allNodes, connections) {
        const broadcastId = `broadcast-${this.currentTick}-${Math.random().toString(36).substr(2, 9)}`;
        const broadcastMessage = {
            ...message,
            broadcastId,
            originNodeId,
            broadcastTime: this.currentTick
        };
        
        const routingResults = [];
        const visitedNodes = new Set();
        const broadcastQueue = [originNodeId];
        
        // 使用BFS进行广播路由
        while (broadcastQueue.length > 0) {
            const currentNodeId = broadcastQueue.shift();
            
            if (visitedNodes.has(currentNodeId)) {
                continue;
            }
            
            visitedNodes.add(currentNodeId);
            const nodeConnections = connections.get(currentNodeId) || new Set();
            
            // 向所有连接的节点发送消息
            for (const connectedNodeId of nodeConnections) {
                if (!visitedNodes.has(connectedNodeId)) {
                    const routeResult = this.routeMessage(
                        broadcastMessage,
                        currentNodeId,
                        connectedNodeId,
                        allNodes
                    );
                    
                    routingResults.push({
                        ...routeResult,
                        fromNodeId: currentNodeId,
                        toNodeId: connectedNodeId
                    });
                    
                    broadcastQueue.push(connectedNodeId);
                }
            }
        }
        
        return {
            broadcastId,
            originNodeId,
            totalRoutes: routingResults.length,
            reachedNodes: visitedNodes.size,
            routingResults,
            estimatedBroadcastTime: this.calculateBroadcastTime(routingResults)
        };
    }

    /**
     * 处理当前滴答的消息
     * @param {Map<string, Node>} allNodes - 所有节点映射
     * @returns {Array} 处理的消息列表
     */
    processTick(allNodes) {
        const processedMessages = [];
        
        // 首先处理高优先级消息
        while (this.priorityQueue.length > 0) {
            const queuedMessage = this.priorityQueue.shift();
            const delivered = this.deliverMessage(queuedMessage, allNodes);
            if (delivered) {
                processedMessages.push(queuedMessage);
            }
        }
        
        // 处理当前滴答的延迟消息
        if (this.messageQueue.has(this.currentTick)) {
            const tickMessages = this.messageQueue.get(this.currentTick);
            
            // 按优先级排序
            tickMessages.sort((a, b) => a.priority - b.priority);
            
            for (const queuedMessage of tickMessages) {
                const delivered = this.deliverMessage(queuedMessage, allNodes);
                if (delivered) {
                    processedMessages.push(queuedMessage);
                }
            }
            
            // 清理已处理的消息
            this.messageQueue.delete(this.currentTick);
        }
        
        this.currentTick++;
        return processedMessages;
    }

    /**
     * 投递消息到目标节点
     * @param {Object} queuedMessage - 队列中的消息
     * @param {Map<string, Node>} allNodes - 所有节点映射
     * @returns {boolean} 投递是否成功
     */
    deliverMessage(queuedMessage, allNodes) {
        const { message, fromNodeId, toNodeId } = queuedMessage;
        
        if (!allNodes.has(toNodeId)) {
            console.warn(`目标节点 ${toNodeId} 不存在，消息投递失败`);
            return false;
        }
        
        const targetNode = allNodes.get(toNodeId);
        
        try {
            targetNode.receiveMsg(message, fromNodeId);
            return true;
        } catch (error) {
            console.error(`消息投递失败: ${fromNodeId} -> ${toNodeId}`, error);
            return false;
        }
    }

    /**
     * 准备消息（添加路由信息）
     * @param {Object} message - 原始消息
     * @param {string} fromNodeId - 发送方节点ID
     * @param {string} toNodeId - 接收方节点ID
     * @returns {Object} 准备好的消息
     */
    prepareMessage(message, fromNodeId, toNodeId) {
        return {
            ...message,
            messageId: `msg-${this.currentTick}-${Math.random().toString(36).substr(2, 9)}`,
            routingInfo: {
                fromNodeId,
                toNodeId,
                sentTick: this.currentTick,
                hops: (message.routingInfo?.hops || 0) + 1
            }
        };
    }

    /**
     * 计算消息传输延迟
     * @param {Object} message - 消息对象
     * @returns {number} 延迟滴答数
     */
    calculateDelay(message) {
        // 高优先级消息延迟较小
        if (this.isHighPriority(message)) {
            return Math.floor(Math.random() * 3) + 1; // 1-3 滴答
        }
        
        // 普通消息延迟范围更大
        return Math.floor(Math.random() * (this.maxDelay - this.minDelay + 1)) + this.minDelay;
    }

    /**
     * 计算全网广播时间
     * @param {Array} routingResults - 路由结果数组
     * @returns {number} 预估广播时间（滴答数）
     */
    calculateBroadcastTime(routingResults) {
        if (routingResults.length === 0) {
            return 0;
        }
        
        // 找到最大延迟时间
        const maxDelay = Math.max(...routingResults.map(result => result.delay));
        
        // 考虑网络拓扑的影响，广播时间通常是最大延迟的1.5倍
        return Math.ceil(maxDelay * 1.5);
    }

    /**
     * 获取消息优先级
     * @param {Object} message - 消息对象
     * @returns {number} 优先级数值（越小优先级越高）
     */
    getMessagePriority(message) {
        return this.messagePriorities[message.type] || 10; // 默认最低优先级
    }

    /**
     * 判断是否为高优先级消息
     * @param {Object} message - 消息对象
     * @returns {boolean} 是否为高优先级
     */
    isHighPriority(message) {
        const priority = this.getMessagePriority(message);
        return priority <= 3; // 优先级1-3为高优先级
    }

    /**
     * 更新统计信息
     * @param {Object} message - 消息对象
     * @param {number} delay - 延迟时间
     */
    updateStats(message, delay) {
        this.stats.totalMessages++;
        
        // 更新平均延迟
        const totalDelay = this.stats.averageDelay * (this.stats.totalMessages - 1) + delay;
        this.stats.averageDelay = totalDelay / this.stats.totalMessages;
        
        // 更新消息类型统计
        const messageType = message.type || 'UNKNOWN';
        const currentCount = this.stats.messagesByType.get(messageType) || 0;
        this.stats.messagesByType.set(messageType, currentCount + 1);
    }

    /**
     * 获取路由器状态
     * @returns {Object} 路由器状态信息
     */
    getRouterStatus() {
        const queuedMessages = Array.from(this.messageQueue.values())
            .reduce((total, messages) => total + messages.length, 0);
        
        return {
            currentTick: this.currentTick,
            queuedMessages,
            priorityQueueSize: this.priorityQueue.length,
            delayRange: [this.minDelay, this.maxDelay],
            stats: {
                ...this.stats,
                messagesByType: Object.fromEntries(this.stats.messagesByType)
            }
        };
    }

    /**
     * 清理过期消息
     * @param {number} maxAge - 最大消息年龄（滴答数）
     */
    cleanupExpiredMessages(maxAge = 100) {
        const cutoffTick = this.currentTick - maxAge;
        
        for (const [tick, messages] of this.messageQueue.entries()) {
            if (tick < cutoffTick) {
                console.warn(`清理过期消息: ${messages.length} 条消息在滴答 ${tick}`);
                this.messageQueue.delete(tick);
            }
        }
    }

    /**
     * 重置路由器状态
     */
    reset() {
        this.currentTick = 0;
        this.messageQueue.clear();
        this.priorityQueue = [];
        this.stats = {
            totalMessages: 0,
            delayedMessages: 0,
            priorityMessages: 0,
            averageDelay: 0,
            messagesByType: new Map()
        };
    }

    /**
     * 设置延迟范围
     * @param {number} minDelay - 最小延迟
     * @param {number} maxDelay - 最大延迟
     */
    setDelayRange(minDelay, maxDelay) {
        this.minDelay = Math.max(1, minDelay);
        this.maxDelay = Math.min(9, Math.max(this.minDelay, maxDelay));
    }
}