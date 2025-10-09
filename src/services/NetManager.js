/**
 * NetManager 类 - 网络管理器
 * 
 * 负责管理P2P网络的初始化、连接管理、消息广播和网络状态监控
 */

class NetManager {
    /**
     * 构造函数
     * @param {Object} config - 网络配置
     * @param {number} config.nodeCount - 节点数量
     * @param {number} config.connectionCount - 每个节点的连接数
     * @param {number} config.failureRate - 连接故障率 (0-1)
     */
    constructor(config = {}) {
        this.nodeCount = config.nodeCount || 30;
        this.connectionCount = config.connectionCount || 3;
        this.failureRate = config.failureRate !== undefined ? config.failureRate : 0.1;
        
        this.nodes = new Map(); // 所有节点的映射 nodeId -> Node
        this.connections = new Map(); // 连接关系映射 nodeId -> Set<nodeId>
        this.networkStats = {
            totalMessages: 0,
            broadcastCount: 0,
            failedConnections: 0,
            activeConnections: 0
        };
        
        // 初始化消息路由器和计时器
        this.msgRouter = new MsgRouter({
            minDelay: config.minDelay || 1,
            maxDelay: config.maxDelay || 9
        });
        
        this.timer = new Timer({
            tickInterval: config.tickInterval || 1000
        });
        
        // 注册滴答回调
        this.timer.onTick((tick) => {
            this.processTick(tick);
        });
        
        this.isInitialized = false;
    }

    /**
     * 初始化网络
     * @returns {Promise<void>}
     */
    async initNetwork() {
        console.log(`初始化网络: ${this.nodeCount} 个节点, 每个节点 ${this.connectionCount} 个连接`);
        
        // 创建节点
        await this.createNodes();
        
        // 建立连接
        await this.establishConnections();
        
        this.isInitialized = true;
        console.log('网络初始化完成');
    }

    /**
     * 创建所有节点
     * @returns {Promise<void>}
     */
    async createNodes() {
        const nodePromises = [];
        
        for (let i = 0; i < this.nodeCount; i++) {
            const nodeId = `node-${i}`;
            const node = new P2PNode(nodeId);
            this.nodes.set(nodeId, node);
            
            // 异步初始化密钥对
            nodePromises.push(node.genKeyPair());
        }
        
        // 等待所有节点初始化完成
        await Promise.all(nodePromises);
        console.log(`创建了 ${this.nodeCount} 个节点`);
    }

    /**
     * 建立网络连接
     * @returns {Promise<void>}
     */
    async establishConnections() {
        const nodeIds = Array.from(this.nodes.keys());
        let totalConnections = 0;
        let failedConnections = 0;

        for (const nodeId of nodeIds) {
            const node = this.nodes.get(nodeId);
            const targetConnections = Math.min(this.connectionCount, this.nodeCount - 1);
            
            // 为每个节点建立指定数量的连接
            const connectedNodes = this.getRandomNodes(nodeIds, nodeId, targetConnections);
            
            for (const targetNodeId of connectedNodes) {
                const targetNode = this.nodes.get(targetNodeId);
                
                // 模拟连接故障
                if (Math.random() < this.failureRate) {
                    failedConnections++;
                    continue;
                }
                
                try {
                    const success = await node.connectTo(targetNode);
                    if (success) {
                        totalConnections++;
                    }
                } catch (error) {
                    console.error(`连接失败: ${nodeId} -> ${targetNodeId}`, error);
                    failedConnections++;
                }
            }
        }

        this.networkStats.activeConnections = totalConnections;
        this.networkStats.failedConnections = failedConnections;
        
        console.log(`建立连接完成: ${totalConnections} 个成功, ${failedConnections} 个失败`);
    }

    /**
     * 获取随机节点列表（排除指定节点）
     * @param {Array<string>} allNodeIds - 所有节点ID
     * @param {string} excludeNodeId - 要排除的节点ID
     * @param {number} count - 需要的节点数量
     * @returns {Array<string>} 随机节点ID列表
     */
    getRandomNodes(allNodeIds, excludeNodeId, count) {
        const availableNodes = allNodeIds.filter(id => id !== excludeNodeId);
        const shuffled = [...availableNodes].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    /**
     * 广播消息到整个网络（使用消息路由器）
     * @param {Object} message - 要广播的消息
     * @param {string} originNodeId - 发起广播的节点ID（可选）
     * @returns {Promise<Object>} 广播结果统计
     */
    async broadcastMessage(message, originNodeId = null) {
        if (!this.isInitialized) {
            throw new Error('网络未初始化');
        }

        // 构建连接关系映射
        const connectionMap = new Map();
        for (const [nodeId, node] of this.nodes) {
            connectionMap.set(nodeId, node.connections);
        }

        // 使用消息路由器进行广播
        const broadcastResult = this.msgRouter.broadcastMessage(
            message,
            originNodeId,
            this.nodes,
            connectionMap
        );

        this.networkStats.totalMessages += broadcastResult.totalRoutes;
        this.networkStats.broadcastCount++;

        return {
            ...broadcastResult,
            totalNodes: this.nodes.size,
            coverage: broadcastResult.reachedNodes / this.nodes.size
        };
    }

    /**
     * 发送点对点消息（使用消息路由器）
     * @param {string} fromNodeId - 发送方节点ID
     * @param {string} toNodeId - 接收方节点ID
     * @param {Object} message - 消息内容
     * @returns {Object} 发送结果
     */
    sendMessage(fromNodeId, toNodeId, message) {
        if (!this.nodes.has(fromNodeId) || !this.nodes.has(toNodeId)) {
            return { success: false, error: '节点不存在' };
        }

        const fromNode = this.nodes.get(fromNodeId);

        // 检查是否有直接连接
        if (!fromNode.connections.has(toNodeId)) {
            return { success: false, error: '节点间无直接连接' };
        }

        // 使用消息路由器发送消息
        const routeResult = this.msgRouter.routeMessage(message, fromNodeId, toNodeId, this.nodes);
        this.networkStats.totalMessages++;
        
        return {
            success: true,
            ...routeResult
        };
    }

    /**
     * 处理滴答事件
     * @param {number} tick - 当前滴答数
     */
    processTick(tick) {
        // 同步消息路由器的滴答
        this.msgRouter.currentTick = tick;
        
        // 处理当前滴答的消息
        const processedMessages = this.msgRouter.processTick(this.nodes);
        
        // 清理过期消息
        if (tick % 100 === 0) {
            this.msgRouter.cleanupExpiredMessages();
        }
        
        return processedMessages;
    }

    /**
     * 启动网络计时器
     * @returns {boolean} 启动是否成功
     */
    startTimer() {
        return this.timer.start();
    }

    /**
     * 暂停网络计时器
     * @returns {boolean} 暂停是否成功
     */
    pauseTimer() {
        return this.timer.pause();
    }

    /**
     * 恢复网络计时器
     * @returns {boolean} 恢复是否成功
     */
    resumeTimer() {
        return this.timer.resume();
    }

    /**
     * 停止网络计时器
     * @returns {boolean} 停止是否成功
     */
    stopTimer() {
        return this.timer.stop();
    }

    /**
     * 设置滴答间隔
     * @param {number} interval - 滴答间隔（毫秒）
     * @returns {boolean} 设置是否成功
     */
    setTickInterval(interval) {
        return this.timer.setTickInterval(interval);
    }

    /**
     * 计算全网广播时间
     * @returns {number} 预估广播时间（滴答数）
     */
    calculateBroadcastTime() {
        const networkStatus = this.getNetworkStatus();
        return this.timer.calculateBroadcastTime({
            nodeCount: networkStatus.nodeCount,
            avgConnections: parseFloat(networkStatus.avgConnections),
            maxDelay: this.msgRouter.maxDelay
        });
    }

    /**
     * 获取网络状态
     * @returns {Object} 网络状态信息
     */
    getNetworkStatus() {
        const connectionCounts = [];
        let totalConnections = 0;

        for (const [nodeId, node] of this.nodes) {
            const connectionCount = node.connections.size;
            connectionCounts.push(connectionCount);
            totalConnections += connectionCount;
        }

        // 计算连接统计
        const avgConnections = totalConnections / this.nodes.size;
        const maxConnections = Math.max(...connectionCounts);
        const minConnections = Math.min(...connectionCounts);

        return {
            nodeCount: this.nodes.size,
            totalConnections: totalConnections / 2, // 除以2因为连接是双向的
            avgConnections: avgConnections.toFixed(2),
            maxConnections,
            minConnections,
            networkStats: { ...this.networkStats },
            isInitialized: this.isInitialized,
            failureRate: this.failureRate
        };
    }

    /**
     * 获取指定节点的详细信息
     * @param {string} nodeId - 节点ID
     * @returns {Object|null} 节点详细信息
     */
    getNodeDetails(nodeId) {
        if (!this.nodes.has(nodeId)) {
            return null;
        }

        const node = this.nodes.get(nodeId);
        return node.getConnectionStatus();
    }

    /**
     * 获取所有节点的连接状态
     * @returns {Array<Object>} 所有节点的连接状态
     */
    getAllNodesStatus() {
        const nodesStatus = [];
        
        for (const [nodeId, node] of this.nodes) {
            nodesStatus.push(node.getConnectionStatus());
        }
        
        return nodesStatus;
    }

    /**
     * 模拟连接故障
     * @param {string} nodeId1 - 节点1 ID
     * @param {string} nodeId2 - 节点2 ID
     * @returns {boolean} 断开是否成功
     */
    simulateConnectionFailure(nodeId1, nodeId2) {
        if (!this.nodes.has(nodeId1) || !this.nodes.has(nodeId2)) {
            return false;
        }

        const node1 = this.nodes.get(nodeId1);
        const node2 = this.nodes.get(nodeId2);

        node1.disconnect(nodeId2);
        node2.disconnect(nodeId1);

        this.networkStats.failedConnections++;
        this.networkStats.activeConnections--;

        return true;
    }

    /**
     * 动态调整网络参数
     * @param {Object} newConfig - 新的网络配置
     */
    updateNetworkConfig(newConfig) {
        if (newConfig.failureRate !== undefined) {
            this.failureRate = Math.max(0, Math.min(1, newConfig.failureRate));
        }
        
        if (newConfig.connectionCount !== undefined) {
            this.connectionCount = Math.max(1, newConfig.connectionCount);
        }
        
        console.log('网络配置已更新:', { 
            failureRate: this.failureRate, 
            connectionCount: this.connectionCount 
        });
    }

    /**
     * 获取消息路由器状态
     * @returns {Object} 路由器状态信息
     */
    getRouterStatus() {
        return this.msgRouter.getRouterStatus();
    }

    /**
     * 获取计时器状态
     * @returns {Object} 计时器状态信息
     */
    getTimerStatus() {
        return this.timer.getTimerStatus();
    }

    /**
     * 设置网络延迟范围
     * @param {number} minDelay - 最小延迟滴答数
     * @param {number} maxDelay - 最大延迟滴答数
     */
    setDelayRange(minDelay, maxDelay) {
        this.msgRouter.setDelayRange(minDelay, maxDelay);
    }

    /**
     * 清理网络资源
     */
    cleanup() {
        // 停止计时器
        this.timer.stop();
        
        // 清空所有节点的消息队列
        for (const [nodeId, node] of this.nodes) {
            node.clearMessageQueue();
        }
        
        // 重置消息路由器
        this.msgRouter.reset();
        
        // 重置计时器
        this.timer.reset();
        
        this.networkStats = {
            totalMessages: 0,
            broadcastCount: 0,
            failedConnections: 0,
            activeConnections: 0
        };
        
        console.log('网络资源已清理');
    }

    /**
     * 重新初始化网络（保持现有配置）
     * @returns {Promise<void>}
     */
    async reinitialize() {
        this.cleanup();
        this.nodes.clear();
        this.connections.clear();
        this.isInitialized = false;
        
        await this.initNetwork();
    }

    /**
     * 获取网络拓扑信息
     * @returns {Object} 网络拓扑数据
     */
    getNetworkTopology() {
        const topology = {
            nodes: [],
            edges: []
        };

        // 添加节点信息
        for (const [nodeId, node] of this.nodes) {
            topology.nodes.push({
                id: nodeId,
                connectionCount: node.connections.size,
                messageQueueSize: node.messageQueue.length,
                isInitialized: node.isInitialized
            });
        }

        // 添加连接信息
        const processedConnections = new Set();
        for (const [nodeId, node] of this.nodes) {
            for (const connectedNodeId of node.connections) {
                const connectionKey = [nodeId, connectedNodeId].sort().join('-');
                if (!processedConnections.has(connectionKey)) {
                    topology.edges.push({
                        from: nodeId,
                        to: connectedNodeId
                    });
                    processedConnections.add(connectionKey);
                }
            }
        }

        return topology;
    }
}