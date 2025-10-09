/**
 * AutoTransferManager 类 - 自动转账和网络活动模拟
 * 
 * 根据需求 5.1, 5.4 实现：
 * - 虚拟用户的自动转账决策逻辑
 * - 转账区块的自动创建和广播
 * - 网络活动的统计和监控
 */

import { PaymentRateController } from './PaymentRateController.js';

export class AutoTransferManager {
    /**
     * 构造函数
     * @param {Object} config - 配置参数
     * @param {Map<string, User>} config.users - 虚拟用户映射
     * @param {Map<string, BlockChain>} config.blockchains - 区块链映射
     * @param {NetManager} config.netManager - 网络管理器
     * @param {Logger} config.logger - 日志系统
     * @param {number} config.paymentRate - 支付速率
     */
    constructor(config = {}) {
        this.users = config.users || new Map();
        this.blockchains = config.blockchains || new Map();
        this.netManager = config.netManager;
        this.logger = config.logger;
        
        // 初始化支付速率控制器
        this.paymentController = new PaymentRateController({
            paymentRate: config.paymentRate || 0.1,
            users: this.users,
            blockchains: this.blockchains
        });
        
        // 网络活动统计
        this.networkStats = {
            totalTransfers: 0,
            successfulTransfers: 0,
            failedTransfers: 0,
            broadcastedBlocks: 0,
            networkErrors: 0,
            currentTick: 0
        };
        
        // 转账决策配置
        this.decisionConfig = {
            minTransferValue: 0, // 最小转账价值
            maxTransferValue: Infinity, // 最大转账价值
            transferProbability: 1.0, // 转账概率
            preferHighValueChains: false // 是否优先转移高价值区块链
        };
        
        // 活动监控
        this.activityMonitor = {
            recentTransfers: [],
            maxRecentSize: 100,
            networkLoad: 0,
            averageTransferTime: 0
        };
        
        this.isActive = false;
    }

    /**
     * 启动自动转账管理器
     */
    start() {
        this.isActive = true;
        this.paymentController.start();
        console.log('自动转账管理器已启动');
    }

    /**
     * 停止自动转账管理器
     */
    stop() {
        this.isActive = false;
        this.paymentController.stop();
        console.log('自动转账管理器已停止');
    }

    /**
     * 设置引用
     * @param {Map<string, User>} users - 用户映射
     * @param {Map<string, BlockChain>} blockchains - 区块链映射
     * @param {NetManager} netManager - 网络管理器
     * @param {Logger} logger - 日志系统
     */
    setReferences(users, blockchains, netManager, logger) {
        this.users = users;
        this.blockchains = blockchains;
        this.netManager = netManager;
        this.logger = logger;
        
        this.paymentController.setReferences(users, blockchains);
    }

    /**
     * 处理滴答事件 - 执行自动转账
     * @param {number} tick - 当前滴答数
     * @returns {Array<Object>} 转账执行结果
     */
    async processTick(tick) {
        if (!this.isActive) {
            return [];
        }

        this.networkStats.currentTick = tick;
        
        // 获取支付速率控制器的转账决策
        const transferDecisions = this.paymentController.processTick(tick);
        
        // 执行实际的转账操作
        const transferResults = [];
        for (const decision of transferDecisions) {
            if (decision.success) {
                const result = await this.executeTransfer(decision, tick);
                transferResults.push(result);
            }
        }
        
        // 更新网络活动监控
        this.updateActivityMonitor(transferResults, tick);
        
        return transferResults;
    }

    /**
     * 执行转账操作
     * @param {Object} decision - 转账决策
     * @param {number} tick - 当前滴答数
     * @returns {Object} 转账执行结果
     */
    async executeTransfer(decision, tick) {
        const result = {
            ...decision,
            executionTick: tick,
            transferBlock: null,
            broadcastResult: null,
            executionSuccess: false,
            executionError: null,
            executionTime: Date.now()
        };

        try {
            // 获取用户和区块链
            const user = this.users.get(decision.userId);
            const blockchain = this.blockchains.get(decision.blockchainId);
            
            if (!user || !blockchain) {
                throw new Error('用户或区块链不存在');
            }

            // 应用转账决策逻辑
            const shouldTransfer = this.makeTransferDecision(user, blockchain, decision);
            if (!shouldTransfer.proceed) {
                result.executionError = shouldTransfer.reason;
                this.networkStats.failedTransfers++;
                return result;
            }

            // 创建转移区块
            const transferBlock = await this.createTransferBlock(user, blockchain, decision);
            result.transferBlock = transferBlock;

            // 广播转移区块
            const broadcastResult = await this.broadcastTransferBlock(transferBlock, user);
            result.broadcastResult = broadcastResult;

            // 更新区块链所有权
            this.updateBlockchainOwnership(blockchain, decision.targetUserId, transferBlock);

            // 记录日志
            this.logTransfer(result);

            result.executionSuccess = true;
            this.networkStats.successfulTransfers++;
            this.networkStats.broadcastedBlocks++;

        } catch (error) {
            result.executionError = error.message;
            this.networkStats.failedTransfers++;
            this.networkStats.networkErrors++;
            console.error(`转账执行失败:`, error);
        }

        this.networkStats.totalTransfers++;
        return result;
    }

    /**
     * 转账决策逻辑
     * @param {User} user - 转账用户
     * @param {BlockChain} blockchain - 区块链
     * @param {Object} decision - 基础决策
     * @returns {Object} 决策结果
     */
    makeTransferDecision(user, blockchain, decision) {
        const result = {
            proceed: true,
            reason: null
        };

        // 检查区块链价值是否在允许范围内
        const chainValue = blockchain.getValue();
        if (chainValue < this.decisionConfig.minTransferValue || 
            chainValue > this.decisionConfig.maxTransferValue) {
            result.proceed = false;
            result.reason = '区块链价值超出转账范围';
            return result;
        }

        // 应用转账概率
        if (Math.random() > this.decisionConfig.transferProbability) {
            result.proceed = false;
            result.reason = '概率决策拒绝转账';
            return result;
        }

        // 检查用户是否确实拥有该区块链
        if (!user.ownsChain(blockchain.getId())) {
            result.proceed = false;
            result.reason = '用户不拥有该区块链';
            return result;
        }

        // 验证区块链当前所有者
        if (blockchain.getCurrentOwner() !== user.getPubKey()) {
            result.proceed = false;
            result.reason = '区块链所有者不匹配';
            return result;
        }

        return result;
    }

    /**
     * 创建转移区块
     * @param {User} user - 转账用户
     * @param {BlockChain} blockchain - 区块链
     * @param {Object} decision - 转账决策
     * @returns {Block} 转移区块
     */
    async createTransferBlock(user, blockchain, decision) {
        const latestBlock = blockchain.getLatestBlock();
        if (!latestBlock) {
            throw new Error('区块链没有最新区块');
        }

        const transferBlock = await user.createTransferBlock(
            blockchain.getId(),
            decision.targetUserId,
            latestBlock.getId()
        );

        return transferBlock;
    }

    /**
     * 广播转移区块
     * @param {Block} transferBlock - 转移区块
     * @param {User} user - 转账用户
     * @returns {Object} 广播结果
     */
    async broadcastTransferBlock(transferBlock, user) {
        if (!this.netManager) {
            throw new Error('网络管理器未设置');
        }

        const message = {
            type: 'BLOCK_BROADCAST',
            blockData: transferBlock.serialize(),
            sourceUserId: user.id,
            timestamp: Date.now()
        };

        // 选择一个随机节点作为广播起点
        const nodeIds = Array.from(this.netManager.nodes.keys());
        if (nodeIds.length === 0) {
            throw new Error('没有可用的网络节点');
        }

        const randomNodeId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
        
        const broadcastResult = await this.netManager.broadcastMessage(message, randomNodeId);
        
        return {
            originNodeId: randomNodeId,
            ...broadcastResult
        };
    }

    /**
     * 更新区块链所有权
     * @param {BlockChain} blockchain - 区块链
     * @param {string} newOwnerId - 新所有者ID
     * @param {Block} transferBlock - 转移区块
     */
    updateBlockchainOwnership(blockchain, newOwnerId, transferBlock) {
        // 获取旧所有者ID（在添加区块之前）
        const oldOwnerId = blockchain.getCurrentOwner();
        
        // 添加区块到区块链
        const addResult = blockchain.addBlock(transferBlock);
        if (!addResult) {
            throw new Error('无法将转移区块添加到区块链');
        }

        // 更新用户的区块链所有权
        // 从旧所有者移除
        for (const [userId, user] of this.users) {
            if (user.getPubKey() === oldOwnerId) {
                user.removeOwnedChain(blockchain.getId());
                break;
            }
        }

        // 添加到新所有者
        for (const [userId, user] of this.users) {
            if (user.getPubKey() === newOwnerId) {
                user.addOwnedChain(blockchain.getId());
                break;
            }
        }
    }

    /**
     * 记录转账日志
     * @param {Object} result - 转账结果
     */
    logTransfer(result) {
        if (!this.logger) {
            return;
        }

        const logData = {
            type: result.executionSuccess ? 'TRANSFER_SUCCESS' : 'TRANSFER_FAILED',
            userId: result.userId,
            blockchainId: result.blockchainId,
            targetUserId: result.targetUserId,
            tick: result.executionTick,
            error: result.executionError
        };

        this.logger.log(logData.type, `用户转账: ${result.userId} -> ${result.targetUserId}`, logData);
    }

    /**
     * 更新活动监控
     * @param {Array<Object>} transferResults - 转账结果数组
     * @param {number} tick - 当前滴答数
     */
    updateActivityMonitor(transferResults, tick) {
        // 添加到最近转账记录
        for (const result of transferResults) {
            this.activityMonitor.recentTransfers.push({
                ...result,
                tick
            });
        }

        // 限制最近转账记录大小
        if (this.activityMonitor.recentTransfers.length > this.activityMonitor.maxRecentSize) {
            this.activityMonitor.recentTransfers = this.activityMonitor.recentTransfers
                .slice(-this.activityMonitor.maxRecentSize);
        }

        // 计算网络负载
        this.activityMonitor.networkLoad = this.calculateNetworkLoad();
        
        // 计算平均转账时间
        this.activityMonitor.averageTransferTime = this.calculateAverageTransferTime();
    }

    /**
     * 计算网络负载
     * @returns {number} 网络负载百分比
     */
    calculateNetworkLoad() {
        const recentTransfers = this.activityMonitor.recentTransfers
            .filter(t => t.tick >= this.networkStats.currentTick - 10); // 最近10个滴答
        
        const maxPossibleTransfers = this.users.size * 0.5; // 假设最大50%的用户同时转账
        
        return Math.min(100, (recentTransfers.length / maxPossibleTransfers) * 100);
    }

    /**
     * 计算平均转账时间
     * @returns {number} 平均转账时间（毫秒）
     */
    calculateAverageTransferTime() {
        const recentSuccessful = this.activityMonitor.recentTransfers
            .filter(t => t.executionSuccess && t.executionTime)
            .slice(-20); // 最近20个成功转账
        
        if (recentSuccessful.length === 0) {
            return 0;
        }

        const totalTime = recentSuccessful.reduce((sum, t) => {
            return sum + (t.executionTime - t.timestamp);
        }, 0);

        return totalTime / recentSuccessful.length;
    }

    /**
     * 设置支付速率
     * @param {number} rate - 支付速率
     */
    setPaymentRate(rate) {
        this.paymentController.setPaymentRate(rate);
    }

    /**
     * 获取支付速率
     * @returns {number} 当前支付速率
     */
    getPaymentRate() {
        return this.paymentController.getPaymentRate();
    }

    /**
     * 设置转账决策配置
     * @param {Object} config - 决策配置
     */
    setDecisionConfig(config) {
        this.decisionConfig = { ...this.decisionConfig, ...config };
    }

    /**
     * 获取网络活动统计
     * @returns {Object} 网络活动统计
     */
    getNetworkStats() {
        const paymentStats = this.paymentController.getStats();
        
        return {
            ...this.networkStats,
            paymentController: paymentStats,
            activityMonitor: {
                recentTransfersCount: this.activityMonitor.recentTransfers.length,
                networkLoad: this.activityMonitor.networkLoad,
                averageTransferTime: this.activityMonitor.averageTransferTime
            },
            decisionConfig: this.decisionConfig,
            isActive: this.isActive
        };
    }

    /**
     * 获取最近的转账活动
     * @param {number} limit - 限制返回数量
     * @returns {Array<Object>} 最近转账活动
     */
    getRecentActivity(limit = 20) {
        return this.activityMonitor.recentTransfers
            .slice(-limit)
            .reverse();
    }

    /**
     * 获取网络活动摘要
     * @returns {Object} 活动摘要
     */
    getActivitySummary() {
        const recentTransfers = this.activityMonitor.recentTransfers.slice(-50);
        const successfulTransfers = recentTransfers.filter(t => t.executionSuccess);
        
        return {
            totalRecentTransfers: recentTransfers.length,
            successfulTransfers: successfulTransfers.length,
            failedTransfers: recentTransfers.length - successfulTransfers.length,
            successRate: recentTransfers.length > 0 ? 
                (successfulTransfers.length / recentTransfers.length * 100).toFixed(2) : 0,
            networkLoad: this.activityMonitor.networkLoad.toFixed(2),
            averageTransferTime: this.activityMonitor.averageTransferTime.toFixed(2),
            currentTick: this.networkStats.currentTick
        };
    }

    /**
     * 重置统计信息
     */
    resetStats() {
        this.networkStats = {
            totalTransfers: 0,
            successfulTransfers: 0,
            failedTransfers: 0,
            broadcastedBlocks: 0,
            networkErrors: 0,
            currentTick: 0
        };
        
        this.activityMonitor.recentTransfers = [];
        this.activityMonitor.networkLoad = 0;
        this.activityMonitor.averageTransferTime = 0;
        
        this.paymentController.resetStats();
        
        console.log('自动转账管理器统计信息已重置');
    }

    /**
     * 获取转账历史
     * @param {number} limit - 限制返回数量
     * @returns {Array<Object>} 转账历史
     */
    getTransferHistory(limit = 100) {
        return this.paymentController.getTransferHistory(limit);
    }

    /**
     * 获取用户转账历史
     * @param {string} userId - 用户ID
     * @param {number} limit - 限制返回数量
     * @returns {Array<Object>} 用户转账历史
     */
    getUserTransferHistory(userId, limit = 50) {
        return this.paymentController.getUserTransferHistory(userId, limit);
    }
}