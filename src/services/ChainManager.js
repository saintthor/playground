/**
 * ChainManager 类 - 区块链批量创建和管理
 * 
 * 根据需求 4.2, 4.3, 4.4 实现：
 * - 根据定义文件批量创建区块链的功能
 * - 随机分配区块链所有权的逻辑
 * - 区块链标识符的生成和管理
 */

class ChainManager {
    constructor() {
        this.blockchains = new Map(); // chainId -> BlockChain
        this.userChains = new Map(); // userId -> Set<chainId>
        this.chainDefinition = null;
        this.users = new Map(); // userId -> { publicKey, privateKey }
    }

    /**
     * 根据定义文件批量创建区块链
     * @param {string|Object} definitionInput - 区块链定义
     * @param {Array} users - 用户列表 [{ id, publicKey, privateKey }]
     * @returns {Object} 创建结果
     */
    async createBlockchainsFromDefinition(definitionInput, users) {
        if (!users || users.length === 0) {
            throw new Error('用户列表不能为空');
        }

        // 解析定义文件
        const parsedDefinition = await ChainDefParser.parseDefinition(definitionInput);
        this.chainDefinition = parsedDefinition;

        // 存储用户信息
        this.users.clear();
        for (const user of users) {
            this.users.set(user.id, {
                publicKey: user.publicKey,
                privateKey: user.privateKey
            });
        }

        // 生成所有序列号
        const serialNumbers = ChainDefParser.generateAllSerialNumbers(parsedDefinition.ranges);
        
        // 批量创建区块链
        const createdChains = [];
        const creationErrors = [];

        for (const serialInfo of serialNumbers) {
            try {
                const blockchain = await this.createSingleBlockchain(
                    parsedDefinition.originalDefinition,
                    serialInfo.serialNumber
                );
                
                createdChains.push({
                    chainId: blockchain.getId(),
                    serialNumber: serialInfo.serialNumber,
                    value: serialInfo.value,
                    blockchain: blockchain
                });
                
                this.blockchains.set(blockchain.getId(), blockchain);
            } catch (error) {
                creationErrors.push({
                    serialNumber: serialInfo.serialNumber,
                    error: error.message
                });
            }
        }

        // 随机分配所有权
        const ownershipResults = await this.assignRandomOwnership(createdChains, users);

        return {
            totalCreated: createdChains.length,
            totalErrors: creationErrors.length,
            createdChains: createdChains,
            creationErrors: creationErrors,
            ownershipResults: ownershipResults,
            definition: parsedDefinition
        };
    }

    /**
     * 创建单个区块链
     * @param {Object} definition - 区块链定义
     * @param {number} serialNumber - 序列号
     * @returns {BlockChain} 区块链实例
     */
    async createSingleBlockchain(definition, serialNumber) {
        const blockchain = new BlockChain(definition, serialNumber.toString());
        
        // 等待根区块创建完成
        await new Promise(resolve => {
            const checkRoot = () => {
                if (blockchain.getRootBlock()) {
                    resolve();
                } else {
                    setTimeout(checkRoot, 10);
                }
            };
            checkRoot();
        });

        return blockchain;
    }

    /**
     * 随机分配区块链所有权
     * @param {Array} createdChains - 已创建的区块链列表
     * @param {Array} users - 用户列表
     * @returns {Object} 分配结果
     */
    async assignRandomOwnership(createdChains, users) {
        if (!users || users.length === 0) {
            throw new Error('用户列表不能为空');
        }

        const ownershipResults = {
            successful: [],
            failed: [],
            userDistribution: new Map()
        };

        // 初始化用户分布统计
        for (const user of users) {
            ownershipResults.userDistribution.set(user.id, {
                count: 0,
                totalValue: 0,
                chains: []
            });
            this.userChains.set(user.id, new Set());
        }

        // 为每个区块链随机分配所有者
        for (const chainInfo of createdChains) {
            try {
                // 随机选择一个用户
                const randomUser = users[Math.floor(Math.random() * users.length)];
                
                // 创建所有权区块
                const ownerBlock = await chainInfo.blockchain.createOwnerBlock(
                    randomUser.publicKey,
                    randomUser.privateKey
                );

                // 更新统计信息
                const userStats = ownershipResults.userDistribution.get(randomUser.id);
                userStats.count++;
                userStats.totalValue += chainInfo.value;
                userStats.chains.push({
                    chainId: chainInfo.chainId,
                    serialNumber: chainInfo.serialNumber,
                    value: chainInfo.value
                });

                // 更新用户区块链映射
                this.userChains.get(randomUser.id).add(chainInfo.chainId);

                ownershipResults.successful.push({
                    chainId: chainInfo.chainId,
                    serialNumber: chainInfo.serialNumber,
                    ownerId: randomUser.id,
                    ownerPublicKey: randomUser.publicKey,
                    ownerBlockId: ownerBlock.getId()
                });

            } catch (error) {
                ownershipResults.failed.push({
                    chainId: chainInfo.chainId,
                    serialNumber: chainInfo.serialNumber,
                    error: error.message
                });
            }
        }

        return ownershipResults;
    }

    /**
     * 获取指定用户拥有的所有区块链
     * @param {string} userId - 用户ID
     * @returns {Array} 区块链列表
     */
    getUserBlockchains(userId) {
        const chainIds = this.userChains.get(userId);
        if (!chainIds) {
            return [];
        }

        const userBlockchains = [];
        for (const chainId of chainIds) {
            const blockchain = this.blockchains.get(chainId);
            if (blockchain) {
                userBlockchains.push({
                    chainId: chainId,
                    serialNumber: blockchain.getSerialNumber(),
                    value: blockchain.getValue(),
                    blockchain: blockchain
                });
            }
        }

        return userBlockchains;
    }

    /**
     * 获取用户资产总值
     * @param {string} userId - 用户ID
     * @returns {number} 资产总值
     */
    getUserTotalAssets(userId) {
        const userBlockchains = this.getUserBlockchains(userId);
        return userBlockchains.reduce((total, chain) => total + chain.value, 0);
    }

    /**
     * 获取所有区块链的统计信息
     * @returns {Object} 统计信息
     */
    getBlockchainStats() {
        const stats = {
            totalBlockchains: this.blockchains.size,
            totalValue: 0,
            userStats: new Map(),
            valueDistribution: new Map()
        };

        // 计算总价值和用户统计
        for (const [chainId, blockchain] of this.blockchains) {
            const value = blockchain.getValue();
            const owner = blockchain.getCurrentOwner();
            
            stats.totalValue += value;

            // 更新用户统计
            if (owner) {
                const userId = this.findUserIdByPublicKey(owner);
                if (userId) {
                    if (!stats.userStats.has(userId)) {
                        stats.userStats.set(userId, { count: 0, totalValue: 0 });
                    }
                    const userStat = stats.userStats.get(userId);
                    userStat.count++;
                    userStat.totalValue += value;
                }
            }

            // 更新价值分布
            if (!stats.valueDistribution.has(value)) {
                stats.valueDistribution.set(value, 0);
            }
            stats.valueDistribution.set(value, stats.valueDistribution.get(value) + 1);
        }

        return stats;
    }

    /**
     * 根据公钥查找用户ID
     * @param {string} publicKey - 公钥
     * @returns {string|null} 用户ID
     */
    findUserIdByPublicKey(publicKey) {
        for (const [userId, userInfo] of this.users) {
            if (userInfo.publicKey === publicKey) {
                return userId;
            }
        }
        return null;
    }

    /**
     * 获取指定区块链
     * @param {string} chainId - 区块链ID
     * @returns {BlockChain|null} 区块链实例
     */
    getBlockchain(chainId) {
        return this.blockchains.get(chainId) || null;
    }

    /**
     * 获取所有区块链
     * @returns {Map} 区块链映射
     */
    getAllBlockchains() {
        return new Map(this.blockchains);
    }

    /**
     * 转移区块链所有权
     * @param {string} chainId - 区块链ID
     * @param {string} fromUserId - 当前所有者ID
     * @param {string} toUserId - 目标所有者ID
     * @returns {Object} 转移结果
     */
    async transferBlockchain(chainId, fromUserId, toUserId) {
        const blockchain = this.blockchains.get(chainId);
        if (!blockchain) {
            throw new Error(`区块链 ${chainId} 不存在`);
        }

        const fromUser = this.users.get(fromUserId);
        const toUser = this.users.get(toUserId);
        
        if (!fromUser) {
            throw new Error(`用户 ${fromUserId} 不存在`);
        }
        
        if (!toUser) {
            throw new Error(`用户 ${toUserId} 不存在`);
        }

        // 验证当前所有权
        if (blockchain.getCurrentOwner() !== fromUser.publicKey) {
            throw new Error(`用户 ${fromUserId} 不是区块链 ${chainId} 的所有者`);
        }

        // 创建转移区块
        const transferData = {
            type: 'transfer',
            blockchainId: chainId,
            previousBlockId: blockchain.getLatestBlock().getId(),
            targetUserId: toUser.publicKey,
            timestamp: Date.now()
        };

        const { Block } = await import('../models/Block.js');
        const transferBlock = new Block(
            transferData,
            transferData.previousBlockId,
            fromUser.publicKey,
            transferData.timestamp
        );

        await transferBlock.signBlock(fromUser.privateKey);

        // 添加转移区块到区块链
        const success = blockchain.addBlock(transferBlock);
        if (!success) {
            throw new Error('转移区块添加失败');
        }

        // 更新用户区块链映射
        this.userChains.get(fromUserId).delete(chainId);
        this.userChains.get(toUserId).add(chainId);

        return {
            success: true,
            transferBlockId: transferBlock.getId(),
            fromUserId: fromUserId,
            toUserId: toUserId,
            chainId: chainId,
            timestamp: transferData.timestamp
        };
    }

    /**
     * 验证区块链管理器的完整性
     * @returns {Object} 验证结果
     */
    async validateIntegrity() {
        const results = {
            isValid: true,
            errors: [],
            warnings: [],
            stats: {
                totalBlockchains: this.blockchains.size,
                validBlockchains: 0,
                invalidBlockchains: 0
            }
        };

        // 验证每个区块链
        for (const [chainId, blockchain] of this.blockchains) {
            try {
                const isValid = await blockchain.validateChain();
                if (isValid) {
                    results.stats.validBlockchains++;
                } else {
                    results.stats.invalidBlockchains++;
                    results.errors.push(`区块链 ${chainId} 验证失败`);
                    results.isValid = false;
                }
            } catch (error) {
                results.stats.invalidBlockchains++;
                results.errors.push(`区块链 ${chainId} 验证异常: ${error.message}`);
                results.isValid = false;
            }
        }

        // 验证用户区块链映射的一致性
        for (const [userId, chainIds] of this.userChains) {
            for (const chainId of chainIds) {
                const blockchain = this.blockchains.get(chainId);
                if (!blockchain) {
                    results.errors.push(`用户 ${userId} 拥有不存在的区块链 ${chainId}`);
                    results.isValid = false;
                    continue;
                }

                const userInfo = this.users.get(userId);
                if (!userInfo) {
                    results.errors.push(`区块链 ${chainId} 的所有者 ${userId} 不存在`);
                    results.isValid = false;
                    continue;
                }

                if (blockchain.getCurrentOwner() !== userInfo.publicKey) {
                    results.warnings.push(
                        `区块链 ${chainId} 的实际所有者与映射不一致`
                    );
                }
            }
        }

        return results;
    }

    /**
     * 清空所有数据
     */
    clear() {
        this.blockchains.clear();
        this.userChains.clear();
        this.users.clear();
        this.chainDefinition = null;
    }

    /**
     * 获取区块链定义
     * @returns {Object|null} 区块链定义
     */
    getChainDefinition() {
        return this.chainDefinition;
    }

    /**
     * 序列化管理器状态
     * @returns {string} JSON字符串
     */
    serialize() {
        const serializedBlockchains = {};
        for (const [chainId, blockchain] of this.blockchains) {
            serializedBlockchains[chainId] = blockchain.serialize();
        }

        const serializedUserChains = {};
        for (const [userId, chainIds] of this.userChains) {
            serializedUserChains[userId] = Array.from(chainIds);
        }

        return JSON.stringify({
            blockchains: serializedBlockchains,
            userChains: serializedUserChains,
            users: Object.fromEntries(this.users),
            chainDefinition: this.chainDefinition
        });
    }

    /**
     * 反序列化管理器状态
     * @param {string} jsonString - JSON字符串
     * @returns {ChainManager} 管理器实例
     */
    static deserialize(jsonString) {
        const data = JSON.parse(jsonString);
        const manager = new ChainManager();

        // 反序列化区块链
        for (const [chainId, blockchainJson] of Object.entries(data.blockchains)) {
            const blockchain = BlockChain.deserialize(blockchainJson);
            manager.blockchains.set(chainId, blockchain);
        }

        // 反序列化用户区块链映射
        for (const [userId, chainIds] of Object.entries(data.userChains)) {
            manager.userChains.set(userId, new Set(chainIds));
        }

        // 反序列化用户信息
        manager.users = new Map(Object.entries(data.users));
        
        // 反序列化区块链定义
        manager.chainDefinition = data.chainDefinition;

        return manager;
    }
}