/**
 * PaymentRateController 类 - 支付速率控制系统
 * 
 * 根据需求 1.3 实现：
 * - 根据支付速率参数控制虚拟用户转账频率的功能
 * - 每个滴答中随机选择用户进行转账的逻辑
 * - 转账目标用户的随机选择算法
 */

export class PaymentRateController {
    /**
     * 构造函数
     * @param {Object} config - 配置参数
     * @param {number} config.paymentRate - 支付速率 (0-1)，表示每个滴答中进行转账的用户比例
     * @param {Map<string, User>} config.users - 虚拟用户映射
     * @param {Map<string, BlockChain>} config.blockchains - 区块链映射
     */
    constructor(config = {}) {
        this.paymentRate = config.paymentRate !== undefined ? config.paymentRate : 0.1; // 默认10%
        this.users = config.users || new Map();
        this.blockchains = config.blockchains || new Map();
        
        // 统计信息
        this.stats = {
            totalTransferAttempts: 0,
            successfulTransfers: 0,
            failedTransfers: 0,
            currentTick: 0,
            transfersThisTick: 0
        };
        
        // 转账历史记录
        this.transferHistory = [];
        this.maxHistorySize = 1000;
        
        this.isActive = false;
    }

    /**
     * 设置支付速率
     * @param {number} rate - 支付速率 (0-1)
     */
    setPaymentRate(rate) {
        this.paymentRate = Math.max(0, Math.min(1, rate));
        console.log(`支付速率设置为: ${(this.paymentRate * 100).toFixed(1)}%`);
    }

    /**
     * 获取支付速率
     * @returns {number} 当前支付速率
     */
    getPaymentRate() {
        return this.paymentRate;
    }

    /**
     * 设置用户和区块链映射
     * @param {Map<string, User>} users - 用户映射
     * @param {Map<string, BlockChain>} blockchains - 区块链映射
     */
    setReferences(users, blockchains) {
        this.users = users;
        this.blockchains = blockchains;
    }

    /**
     * 启动支付速率控制
     */
    start() {
        this.isActive = true;
        console.log('支付速率控制系统已启动');
    }

    /**
     * 停止支付速率控制
     */
    stop() {
        this.isActive = false;
        console.log('支付速率控制系统已停止');
    }

    /**
     * 处理滴答事件 - 根据支付速率选择用户进行转账
     * @param {number} tick - 当前滴答数
     * @returns {Array<Object>} 转账结果数组
     */
    processTick(tick) {
        if (!this.isActive) {
            return [];
        }

        this.stats.currentTick = tick;
        this.stats.transfersThisTick = 0;

        const transferResults = [];
        const eligibleUsers = this.getEligibleUsers();
        
        if (eligibleUsers.length === 0) {
            return transferResults;
        }

        // 计算本滴答中应该进行转账的用户数量
        const transferCount = this.calculateTransferCount(eligibleUsers.length);
        
        if (transferCount === 0) {
            return transferResults;
        }

        // 随机选择用户进行转账
        const selectedUsers = this.selectRandomUsers(eligibleUsers, transferCount);
        
        for (const user of selectedUsers) {
            const result = this.attemptTransfer(user, tick);
            transferResults.push(result);
            this.stats.transfersThisTick++;
        }

        return transferResults;
    }

    /**
     * 获取有资格进行转账的用户
     * @returns {Array<User>} 有资格的用户数组
     */
    getEligibleUsers() {
        const eligibleUsers = [];
        
        for (const [userId, user] of this.users) {
            // 用户必须已初始化且拥有至少一个区块链
            if (user.isInitialized && user.getOwnedChains().length > 0) {
                eligibleUsers.push(user);
            }
        }
        
        return eligibleUsers;
    }

    /**
     * 计算本滴答中应该进行转账的用户数量
     * @param {number} eligibleCount - 有资格用户的数量
     * @returns {number} 转账用户数量
     */
    calculateTransferCount(eligibleCount) {
        if (eligibleCount === 0) {
            return 0;
        }

        // 基于支付速率计算基础转账数量
        const baseCount = Math.floor(eligibleCount * this.paymentRate);
        
        // 处理小数部分 - 使用概率决定是否额外增加一个转账
        const remainder = (eligibleCount * this.paymentRate) - baseCount;
        const extraTransfer = Math.random() < remainder ? 1 : 0;
        
        return baseCount + extraTransfer;
    }

    /**
     * 随机选择用户进行转账
     * @param {Array<User>} eligibleUsers - 有资格的用户数组
     * @param {number} count - 需要选择的用户数量
     * @returns {Array<User>} 选中的用户数组
     */
    selectRandomUsers(eligibleUsers, count) {
        if (count >= eligibleUsers.length) {
            return [...eligibleUsers];
        }

        // 使用 Fisher-Yates 洗牌算法随机选择
        const shuffled = [...eligibleUsers];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        return shuffled.slice(0, count);
    }

    /**
     * 尝试为指定用户执行转账
     * @param {User} user - 转账用户
     * @param {number} tick - 当前滴答数
     * @returns {Object} 转账结果
     */
    attemptTransfer(user, tick) {
        this.stats.totalTransferAttempts++;

        const result = {
            userId: user.id,
            userPublicKey: user.getPubKey(),
            tick: tick,
            success: false,
            error: null,
            blockchainId: null,
            targetUserId: null,
            transferBlock: null
        };

        try {
            // 选择要转移的区块链
            const blockchainId = this.selectRandomBlockchain(user);
            if (!blockchainId) {
                result.error = '用户没有可转移的区块链';
                this.stats.failedTransfers++;
                return result;
            }

            // 选择目标用户
            const targetUser = this.selectRandomTargetUser(user);
            if (!targetUser) {
                result.error = '没有可用的目标用户';
                this.stats.failedTransfers++;
                return result;
            }

            // 获取区块链信息
            const blockchain = this.blockchains.get(blockchainId);
            if (!blockchain) {
                result.error = '区块链不存在';
                this.stats.failedTransfers++;
                return result;
            }

            // 验证用户确实拥有该区块链
            if (blockchain.getCurrentOwner() !== user.getPubKey()) {
                result.error = '用户不是区块链的当前所有者';
                this.stats.failedTransfers++;
                return result;
            }

            result.blockchainId = blockchainId;
            result.targetUserId = targetUser.getPubKey();
            result.success = true;
            this.stats.successfulTransfers++;

            // 记录转账历史
            this.recordTransfer(result);

        } catch (error) {
            result.error = error.message;
            this.stats.failedTransfers++;
            console.error(`用户 ${user.id} 转账失败:`, error);
        }

        return result;
    }

    /**
     * 为用户随机选择一个区块链进行转移
     * @param {User} user - 用户
     * @returns {string|null} 区块链ID或null
     */
    selectRandomBlockchain(user) {
        const ownedChains = user.getOwnedChains();
        if (ownedChains.length === 0) {
            return null;
        }

        // 随机选择一个区块链
        const randomIndex = Math.floor(Math.random() * ownedChains.length);
        return ownedChains[randomIndex];
    }

    /**
     * 随机选择目标用户
     * @param {User} sourceUser - 源用户（排除此用户）
     * @returns {User|null} 目标用户或null
     */
    selectRandomTargetUser(sourceUser) {
        const availableUsers = [];
        
        for (const [userId, user] of this.users) {
            // 排除源用户自己，且目标用户必须已初始化
            if (user.id !== sourceUser.id && user.isInitialized) {
                availableUsers.push(user);
            }
        }

        if (availableUsers.length === 0) {
            return null;
        }

        // 随机选择目标用户
        const randomIndex = Math.floor(Math.random() * availableUsers.length);
        return availableUsers[randomIndex];
    }

    /**
     * 记录转账历史
     * @param {Object} transferResult - 转账结果
     */
    recordTransfer(transferResult) {
        const record = {
            ...transferResult,
            timestamp: Date.now()
        };

        this.transferHistory.push(record);

        // 限制历史记录大小
        if (this.transferHistory.length > this.maxHistorySize) {
            this.transferHistory.shift();
        }
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        const successRate = this.stats.totalTransferAttempts > 0 ? 
            (this.stats.successfulTransfers / this.stats.totalTransferAttempts * 100).toFixed(2) : 0;

        return {
            ...this.stats,
            successRate: parseFloat(successRate),
            paymentRate: this.paymentRate,
            isActive: this.isActive,
            eligibleUsersCount: this.getEligibleUsers().length,
            totalUsers: this.users.size
        };
    }

    /**
     * 获取转账历史
     * @param {number} limit - 限制返回的记录数量
     * @returns {Array<Object>} 转账历史记录
     */
    getTransferHistory(limit = 50) {
        const history = [...this.transferHistory];
        return history.slice(-limit).reverse(); // 返回最近的记录，按时间倒序
    }

    /**
     * 获取指定用户的转账历史
     * @param {string} userId - 用户ID
     * @param {number} limit - 限制返回的记录数量
     * @returns {Array<Object>} 用户转账历史
     */
    getUserTransferHistory(userId, limit = 20) {
        return this.transferHistory
            .filter(record => record.userId === userId)
            .slice(-limit)
            .reverse();
    }

    /**
     * 重置统计信息
     */
    resetStats() {
        this.stats = {
            totalTransferAttempts: 0,
            successfulTransfers: 0,
            failedTransfers: 0,
            currentTick: 0,
            transfersThisTick: 0
        };
        this.transferHistory = [];
        console.log('支付速率控制统计信息已重置');
    }

    /**
     * 获取当前活跃的转账信息
     * @returns {Object} 活跃转账信息
     */
    getActiveTransferInfo() {
        const eligibleUsers = this.getEligibleUsers();
        const expectedTransfersPerTick = eligibleUsers.length * this.paymentRate;
        
        return {
            eligibleUsersCount: eligibleUsers.length,
            paymentRate: this.paymentRate,
            expectedTransfersPerTick: expectedTransfersPerTick.toFixed(2),
            transfersLastTick: this.stats.transfersThisTick,
            isActive: this.isActive
        };
    }

    /**
     * 验证配置参数
     * @param {Object} config - 配置参数
     * @returns {boolean} 配置是否有效
     */
    static validateConfig(config) {
        if (!config) {
            return false;
        }

        // 验证支付速率
        if (config.paymentRate !== undefined) {
            if (typeof config.paymentRate !== 'number' || 
                config.paymentRate < 0 || 
                config.paymentRate > 1) {
                return false;
            }
        }

        return true;
    }
}