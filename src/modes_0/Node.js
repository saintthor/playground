/**
 * Node 类 - P2P 网络节点
 * 
 * 这是 P2P 网络中单个节点的实现，负责处理节点间的通信、身份验证和消息路由。
 * 每个节点都有唯一的身份标识，可以与其他节点建立安全连接并参与网络通信。
 * 
 * 主要功能：
 * - 节点身份管理（密钥对生成和管理）
 * - 安全连接建立（基于数字签名的握手）
 * - 消息接收、处理和转发
 * - 网络拓扑维护
 * - 连接状态监控
 * 
 * 安全特性：
 * - ECDSA P-256 密钥对身份验证
 * - 连接建立时的双向签名验证
 * - 消息来源验证
 * - 防止未授权连接
 * 
 * 网络特性：
 * - 支持多连接管理
 * - 消息队列缓冲
 * - 广播和转发机制
 * - 连接故障处理
 * 
 * 使用示例：
 * ```javascript
 * // 创建节点
 * const node = new Node('node1');
 * await node.genKeyPair();
 * 
 * // 连接到其他节点
 * const success = await node.connectTo(otherNode);
 * 
 * // 广播消息
 * node.broadcast(message, allNodes);
 * ```
 * 
 * @class Node
 * @version 1.0.0
 * @author P2P Blockchain Playground Team
 */

class P2PNode {
    /**
     * 构造函数
     * @param {string} id - 节点ID
     */
    constructor(id) {
        this.id = id;
        this.publicKey = null;
        this.privateKey = null;
        this.connections = new Set(); // 连接的其他节点ID
        this.messageQueue = []; // 消息队列
        this.isInitialized = false;
    }

    /**
     * 生成密钥对
     * @returns {Promise<void>}
     */
    async genKeyPair() {
        try {
            const keyPair = await Crypto.genKeyPair();
            this.publicKey = keyPair.publicKey;
            this.privateKey = keyPair.privateKey;
            this.isInitialized = true;
        } catch (error) {
            console.error(`节点 ${this.id} 密钥生成失败:`, error);
            throw error;
        }
    }

    /**
     * 获取公钥
     * @returns {string} Base64编码的公钥
     */
    getPubKey() {
        if (!this.publicKey) {
            throw new Error(`节点 ${this.id} 尚未初始化密钥对`);
        }
        return this.publicKey;
    }

    /**
     * 验证节点签名
     * @param {string} signature - 签名
     * @param {string} data - 原始数据
     * @param {string} publicKey - 公钥
     * @returns {Promise<boolean>} 验证结果
     */
    async verifyNodeSig(signature, data, publicKey) {
        try {
            return await Crypto.verify(signature, data, publicKey);
        } catch (error) {
            console.error(`节点 ${this.id} 签名验证失败:`, error);
            return false;
        }
    }

    /**
     * 连接到其他节点
     * @param {Node} otherNode - 目标节点
     * @returns {Promise<boolean>} 连接是否成功
     */
    async connectTo(otherNode) {
        if (!this.isInitialized || !otherNode.isInitialized) {
            throw new Error('节点未初始化，无法建立连接');
        }

        if (this.id === otherNode.id) {
            return false; // 不能连接自己
        }

        if (this.connections.has(otherNode.id)) {
            return true; // 已经连接
        }

        try {
            // 创建连接验证数据
            const connectionData = `${this.id}->${otherNode.id}-${Date.now()}`;
            const signature = await Crypto.sign(connectionData, this.privateKey);

            // 验证对方节点的身份（模拟握手过程）
            const otherConnectionData = `${otherNode.id}->${this.id}-${Date.now()}`;
            const otherSignature = await Crypto.sign(otherConnectionData, otherNode.privateKey);

            // 验证签名
            const isValidSig = await this.verifyNodeSig(otherSignature, otherConnectionData, otherNode.publicKey);
            const isOtherValidSig = await otherNode.verifyNodeSig(signature, connectionData, this.publicKey);

            if (isValidSig && isOtherValidSig) {
                // 建立双向连接
                this.connections.add(otherNode.id);
                otherNode.connections.add(this.id);
                return true;
            }

            return false;
        } catch (error) {
            console.error(`节点 ${this.id} 连接到 ${otherNode.id} 失败:`, error);
            return false;
        }
    }

    /**
     * 断开与指定节点的连接
     * @param {string} nodeId - 节点ID
     */
    disconnect(nodeId) {
        this.connections.delete(nodeId);
    }

    /**
     * 接收消息
     * @param {Object} message - 消息对象
     * @param {string} fromNodeId - 发送方节点ID
     */
    receiveMsg(message, fromNodeId) {
        if (!this.connections.has(fromNodeId)) {
            console.warn(`节点 ${this.id} 收到来自未连接节点 ${fromNodeId} 的消息`);
            return;
        }

        // 将消息添加到队列
        this.messageQueue.push({
            ...message,
            fromNodeId,
            receivedAt: Date.now()
        });

        // 处理消息（这里是基本实现，后续会扩展）
        this.processMessage(message, fromNodeId);
    }

    /**
     * 转发消息
     * @param {Object} message - 消息对象
     * @param {string} excludeNodeId - 排除的节点ID（避免回传）
     * @param {Map<string, Node>} allNodes - 所有节点的映射
     */
    forwardMsg(message, excludeNodeId, allNodes) {
        // 向所有连接的节点转发消息（除了发送方）
        for (const nodeId of this.connections) {
            if (nodeId !== excludeNodeId && allNodes.has(nodeId)) {
                const targetNode = allNodes.get(nodeId);
                targetNode.receiveMsg(message, this.id);
            }
        }
    }

    /**
     * 处理消息（基本实现）
     * @param {Object} message - 消息对象
     * @param {string} fromNodeId - 发送方节点ID
     */
    processMessage(message, fromNodeId) {
        // 基本的消息处理逻辑
        switch (message.type) {
            case 'BLOCK_BROADCAST':
                console.log(`节点 ${this.id} 收到区块广播:`, message.data);
                break;
            case 'FORK_WARNING':
                console.log(`节点 ${this.id} 收到分叉警告:`, message.data);
                break;
            case 'BLACKLIST_UPDATE':
                console.log(`节点 ${this.id} 收到黑名单更新:`, message.data);
                break;
            default:
                console.log(`节点 ${this.id} 收到未知类型消息:`, message.type);
        }
    }

    /**
     * 广播消息到所有连接的节点
     * @param {Object} message - 消息对象
     * @param {Map<string, Node>} allNodes - 所有节点的映射
     */
    broadcast(message, allNodes) {
        this.forwardMsg(message, null, allNodes);
    }

    /**
     * 获取连接状态
     * @returns {Object} 连接状态信息
     */
    getConnectionStatus() {
        return {
            nodeId: this.id,
            publicKey: this.publicKey,
            connectionCount: this.connections.size,
            connectedNodes: Array.from(this.connections),
            messageQueueSize: this.messageQueue.length,
            isInitialized: this.isInitialized
        };
    }

    /**
     * 清空消息队列
     */
    clearMessageQueue() {
        this.messageQueue = [];
    }

    /**
     * 获取消息队列
     * @returns {Array} 消息队列
     */
    getMessageQueue() {
        return [...this.messageQueue];
    }

    /**
     * 签名数据
     * @param {string} data - 要签名的数据
     * @returns {Promise<string>} 签名结果
     */
    async signData(data) {
        if (!this.privateKey) {
            throw new Error(`节点 ${this.id} 尚未初始化密钥对`);
        }
        return await Crypto.sign(data, this.privateKey);
    }
}