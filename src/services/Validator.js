/**
 * Validator 类 - 区块验证引擎
 * 
 * 根据需求 6.1, 6.2 实现：
 * - 区块的密码学签名验证
 * - 区块链完整性验证，从当前区块向上验证到根区块
 * - 验证结果的缓存机制，避免重复验证
 */

import { Crypto } from './Crypto.js';

export class Validator {
    constructor() {
        // 验证结果缓存
        this.verificationCache = new Map(); // blockId -> verification result
        this.chainIntegrityCache = new Map(); // chainId -> integrity result
        
        // 缓存过期时间（毫秒）
        this.cacheExpireTime = 5 * 60 * 1000; // 5分钟
        
        // 清理过期缓存的定时器
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredCache();
        }, 60 * 1000); // 每分钟清理一次
    }

    /**
     * 验证区块的密码学签名
     * @param {Block} block - 要验证的区块
     * @returns {Promise<Object>} 验证结果对象
     */
    async verifySig(block) {
        if (!block) {
            return {
                isValid: false,
                error: 'BLOCK_NULL',
                message: '区块为空'
            };
        }

        const blockId = block.getId();
        if (!blockId) {
            return {
                isValid: false,
                error: 'BLOCK_ID_MISSING',
                message: '区块ID缺失'
            };
        }

        // 检查缓存
        const cacheKey = `sig_${blockId}`;
        const cachedResult = this.getFromCache(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        try {
            // 验证区块签名
            const signature = block.getSignature();
            const creatorId = block.getCreator();
            
            if (!signature) {
                const result = {
                    isValid: false,
                    error: 'SIGNATURE_MISSING',
                    message: '区块签名缺失'
                };
                this.setCache(cacheKey, result);
                return result;
            }

            if (!creatorId) {
                const result = {
                    isValid: false,
                    error: 'CREATOR_MISSING',
                    message: '区块创建者缺失'
                };
                this.setCache(cacheKey, result);
                return result;
            }

            // 对于系统区块（根区块），使用特殊验证逻辑
            if (creatorId === 'system') {
                const result = await this.verifySystemBlock(block);
                this.setCache(cacheKey, result);
                return result;
            }

            // 验证普通区块的签名
            const isValidSignature = await Crypto.verify(signature, blockId, creatorId);
            
            const result = {
                isValid: isValidSignature,
                error: isValidSignature ? null : 'SIGNATURE_INVALID',
                message: isValidSignature ? '签名验证成功' : '签名验证失败',
                blockId: blockId,
                creatorId: creatorId
            };

            this.setCache(cacheKey, result);
            return result;

        } catch (error) {
            const result = {
                isValid: false,
                error: 'VERIFICATION_ERROR',
                message: `签名验证过程中发生错误: ${error.message}`,
                details: error
            };
            this.setCache(cacheKey, result);
            return result;
        }
    }

    /**
     * 验证系统区块（根区块）
     * @param {Block} block - 系统区块
     * @returns {Promise<Object>} 验证结果
     */
    async verifySystemBlock(block) {
        const blockData = block.getData();
        
        // 验证根区块的基本结构
        if (blockData.type !== 'root') {
            return {
                isValid: false,
                error: 'INVALID_SYSTEM_BLOCK',
                message: '系统区块类型不正确'
            };
        }

        // 验证根区块必须包含定义哈希和序列号
        if (!blockData.definitionHash || !blockData.serialNumber) {
            return {
                isValid: false,
                error: 'INVALID_ROOT_BLOCK_DATA',
                message: '根区块数据不完整'
            };
        }

        // 系统区块默认认为是有效的（在实际应用中可能需要更复杂的验证）
        return {
            isValid: true,
            error: null,
            message: '系统区块验证成功',
            blockId: block.getId(),
            creatorId: 'system'
        };
    }

    /**
     * 验证区块链完整性，从当前区块向上验证到根区块
     * @param {BlockChain} blockchain - 区块链实例
     * @param {Block} currentBlock - 当前区块（可选，默认为最新区块）
     * @returns {Promise<Object>} 验证结果对象
     */
    async verifyChainIntegrity(blockchain, currentBlock = null) {
        if (!blockchain) {
            return {
                isValid: false,
                error: 'BLOCKCHAIN_NULL',
                message: '区块链为空'
            };
        }

        const chainId = blockchain.getId();
        if (!chainId) {
            return {
                isValid: false,
                error: 'CHAIN_ID_MISSING',
                message: '区块链ID缺失'
            };
        }

        // 确定要验证的区块
        const blockToVerify = currentBlock || blockchain.getLatestBlock();
        if (!blockToVerify) {
            return {
                isValid: false,
                error: 'NO_BLOCKS',
                message: '区块链中没有区块'
            };
        }

        // 检查缓存
        const cacheKey = `integrity_${chainId}_${blockToVerify.getId()}`;
        const cachedResult = this.getFromCache(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        try {
            const verificationPath = [];
            const verifiedBlocks = new Set();
            let currentBlockInPath = blockToVerify;

            // 从当前区块向上追溯到根区块
            while (currentBlockInPath) {
                const blockId = currentBlockInPath.getId();
                
                // 避免循环引用
                if (verifiedBlocks.has(blockId)) {
                    const result = {
                        isValid: false,
                        error: 'CIRCULAR_REFERENCE',
                        message: '检测到区块链中的循环引用',
                        verificationPath: verificationPath
                    };
                    this.setCache(cacheKey, result);
                    return result;
                }

                verifiedBlocks.add(blockId);
                verificationPath.push({
                    blockId: blockId,
                    blockType: currentBlockInPath.getData().type,
                    creator: currentBlockInPath.getCreator(),
                    timestamp: currentBlockInPath.getTime()
                });

                // 验证当前区块的签名
                const sigVerification = await this.verifySig(currentBlockInPath);
                if (!sigVerification.isValid) {
                    const result = {
                        isValid: false,
                        error: 'SIGNATURE_VERIFICATION_FAILED',
                        message: `区块 ${blockId} 签名验证失败: ${sigVerification.message}`,
                        failedBlock: blockId,
                        verificationPath: verificationPath,
                        signatureError: sigVerification
                    };
                    this.setCache(cacheKey, result);
                    return result;
                }

                // 验证区块的基本完整性
                const basicValidation = await currentBlockInPath.validateBasic();
                if (!basicValidation) {
                    const result = {
                        isValid: false,
                        error: 'BASIC_VALIDATION_FAILED',
                        message: `区块 ${blockId} 基本验证失败`,
                        failedBlock: blockId,
                        verificationPath: verificationPath
                    };
                    this.setCache(cacheKey, result);
                    return result;
                }

                // 如果是根区块，验证完成
                const blockData = currentBlockInPath.getData();
                if (blockData.type === 'root') {
                    break;
                }

                // 获取前一个区块
                const prevBlockId = currentBlockInPath.getPrevBlockId();
                if (!prevBlockId) {
                    const result = {
                        isValid: false,
                        error: 'MISSING_PREVIOUS_BLOCK_ID',
                        message: `非根区块 ${blockId} 缺少前一个区块ID`,
                        failedBlock: blockId,
                        verificationPath: verificationPath
                    };
                    this.setCache(cacheKey, result);
                    return result;
                }

                const prevBlock = blockchain.getBlock(prevBlockId);
                if (!prevBlock) {
                    const result = {
                        isValid: false,
                        error: 'PREVIOUS_BLOCK_NOT_FOUND',
                        message: `找不到前一个区块 ${prevBlockId}`,
                        failedBlock: blockId,
                        missingBlock: prevBlockId,
                        verificationPath: verificationPath
                    };
                    this.setCache(cacheKey, result);
                    return result;
                }

                currentBlockInPath = prevBlock;
            }

            // 验证区块链的逻辑完整性
            const logicalValidation = this.validateChainLogic(verificationPath, blockchain);
            if (!logicalValidation.isValid) {
                const result = {
                    isValid: false,
                    error: 'LOGICAL_VALIDATION_FAILED',
                    message: logicalValidation.message,
                    verificationPath: verificationPath,
                    logicalError: logicalValidation
                };
                this.setCache(cacheKey, result);
                return result;
            }

            const result = {
                isValid: true,
                error: null,
                message: '区块链完整性验证成功',
                chainId: chainId,
                verificationPath: verificationPath,
                verifiedBlockCount: verificationPath.length
            };

            this.setCache(cacheKey, result);
            return result;

        } catch (error) {
            const result = {
                isValid: false,
                error: 'INTEGRITY_VERIFICATION_ERROR',
                message: `区块链完整性验证过程中发生错误: ${error.message}`,
                details: error
            };
            this.setCache(cacheKey, result);
            return result;
        }
    }

    /**
     * 验证区块链的逻辑完整性
     * @param {Array} verificationPath - 验证路径
     * @param {BlockChain} blockchain - 区块链实例
     * @returns {Object} 验证结果
     */
    validateChainLogic(verificationPath, blockchain) {
        if (!verificationPath || verificationPath.length === 0) {
            return {
                isValid: false,
                message: '验证路径为空'
            };
        }

        // 验证必须以根区块开始（路径是从最新到最旧）
        const rootBlock = verificationPath[verificationPath.length - 1];
        if (rootBlock.blockType !== 'root') {
            return {
                isValid: false,
                message: '区块链必须以根区块开始'
            };
        }

        // 验证区块链的所有权转移逻辑
        let currentOwner = null;
        
        // 从根区块开始验证（反向遍历路径）
        for (let i = verificationPath.length - 1; i >= 0; i--) {
            const blockInfo = verificationPath[i];
            
            if (blockInfo.blockType === 'root') {
                // 根区块不改变所有权
                continue;
            } else if (blockInfo.blockType === 'ownership') {
                // 所有权区块设置初始所有者
                const block = blockchain.getBlock(blockInfo.blockId);
                const blockData = block.getData();
                currentOwner = blockData.ownerId;
            } else if (blockInfo.blockType === 'transfer') {
                // 转移区块必须由当前所有者创建
                if (currentOwner && blockInfo.creator !== currentOwner) {
                    return {
                        isValid: false,
                        message: `转移区块 ${blockInfo.blockId} 的创建者不是当前所有者`
                    };
                }
                
                // 更新所有者
                const block = blockchain.getBlock(blockInfo.blockId);
                const blockData = block.getData();
                currentOwner = blockData.targetUserId;
            }
        }

        return {
            isValid: true,
            message: '区块链逻辑验证成功',
            finalOwner: currentOwner
        };
    }

    /**
     * 批量验证多个区块的签名
     * @param {Array<Block>} blocks - 要验证的区块数组
     * @returns {Promise<Object>} 批量验证结果
     */
    async batchVerifySignatures(blocks) {
        if (!Array.isArray(blocks)) {
            return {
                isValid: false,
                error: 'INVALID_INPUT',
                message: '输入必须是区块数组'
            };
        }

        const results = [];
        let allValid = true;

        for (const block of blocks) {
            const result = await this.verifySig(block);
            results.push({
                blockId: block.getId(),
                result: result
            });
            
            if (!result.isValid) {
                allValid = false;
            }
        }

        return {
            isValid: allValid,
            results: results,
            totalBlocks: blocks.length,
            validBlocks: results.filter(r => r.result.isValid).length,
            invalidBlocks: results.filter(r => !r.result.isValid).length
        };
    }

    /**
     * 设置缓存
     * @param {string} key - 缓存键
     * @param {Object} value - 缓存值
     */
    setCache(key, value) {
        this.verificationCache.set(key, {
            value: value,
            timestamp: Date.now()
        });
    }

    /**
     * 从缓存获取值
     * @param {string} key - 缓存键
     * @returns {Object|null} 缓存值或null
     */
    getFromCache(key) {
        const cached = this.verificationCache.get(key);
        if (!cached) {
            return null;
        }

        // 检查是否过期
        if (Date.now() - cached.timestamp > this.cacheExpireTime) {
            this.verificationCache.delete(key);
            return null;
        }

        return cached.value;
    }

    /**
     * 清理过期的缓存
     */
    cleanupExpiredCache() {
        const now = Date.now();
        const keysToDelete = [];

        for (const [key, cached] of this.verificationCache) {
            if (now - cached.timestamp > this.cacheExpireTime) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => {
            this.verificationCache.delete(key);
        });

        if (keysToDelete.length > 0) {
            console.log(`清理了 ${keysToDelete.length} 个过期的验证缓存`);
        }
    }

    /**
     * 清空所有缓存
     */
    clearCache() {
        this.verificationCache.clear();
        this.chainIntegrityCache.clear();
    }

    /**
     * 获取缓存统计信息
     * @returns {Object} 缓存统计
     */
    getCacheStats() {
        return {
            totalCacheEntries: this.verificationCache.size,
            cacheExpireTime: this.cacheExpireTime,
            memoryUsage: this.estimateCacheMemoryUsage()
        };
    }

    /**
     * 估算缓存内存使用量
     * @returns {number} 估算的内存使用量（字节）
     */
    estimateCacheMemoryUsage() {
        let totalSize = 0;
        
        for (const [key, cached] of this.verificationCache) {
            totalSize += key.length * 2; // 字符串大小（UTF-16）
            totalSize += JSON.stringify(cached.value).length * 2;
            totalSize += 8; // timestamp
        }
        
        return totalSize;
    }

    /**
     * 验证区块的合法性
     * @param {Block} block - 要验证的区块
     * @param {BlockChain} blockchain - 区块链实例
     * @param {Object} networkState - 网络状态（包含黑名单等信息）
     * @returns {Promise<Object>} 验证结果对象
     */
    async validateLegality(block, blockchain, networkState = {}) {
        if (!block) {
            return {
                isValid: false,
                error: 'BLOCK_NULL',
                message: '区块为空'
            };
        }

        if (!blockchain) {
            return {
                isValid: false,
                error: 'BLOCKCHAIN_NULL',
                message: '区块链为空'
            };
        }

        const blockId = block.getId();
        const creatorId = block.getCreator();
        const blockData = block.getData();

        // 检查缓存
        const cacheKey = `legality_${blockId}_${blockchain.getId()}`;
        const cachedResult = this.getFromCache(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        try {
            // 1. 验证添加者状态（黑名单检查）
            const blacklistCheck = this.validateCreatorStatus(creatorId, networkState);
            if (!blacklistCheck.isValid) {
                const result = {
                    isValid: false,
                    error: 'CREATOR_BLACKLISTED',
                    message: `区块创建者 ${creatorId} 已被列入黑名单`,
                    blockId: blockId,
                    creatorId: creatorId,
                    details: blacklistCheck
                };
                this.setCache(cacheKey, result);
                return result;
            }

            // 2. 验证区块链所有权
            const ownershipCheck = await this.validateBlockchainOwnership(block, blockchain);
            if (!ownershipCheck.isValid) {
                const result = {
                    isValid: false,
                    error: 'OWNERSHIP_VIOLATION',
                    message: ownershipCheck.message,
                    blockId: blockId,
                    creatorId: creatorId,
                    details: ownershipCheck
                };
                this.setCache(cacheKey, result);
                return result;
            }

            // 3. 验证区块位置冲突
            const positionCheck = this.validateBlockPosition(block, blockchain);
            if (!positionCheck.isValid) {
                const result = {
                    isValid: false,
                    error: 'POSITION_CONFLICT',
                    message: positionCheck.message,
                    blockId: blockId,
                    conflictingBlock: positionCheck.conflictingBlock,
                    details: positionCheck
                };
                this.setCache(cacheKey, result);
                return result;
            }

            // 4. 验证分叉合法性（如果存在分叉）
            const forkCheck = this.validateForkLegality(block, blockchain, networkState);
            if (!forkCheck.isValid) {
                const result = {
                    isValid: false,
                    error: 'FORK_VIOLATION',
                    message: forkCheck.message,
                    blockId: blockId,
                    details: forkCheck
                };
                this.setCache(cacheKey, result);
                return result;
            }

            const result = {
                isValid: true,
                error: null,
                message: '区块合法性验证成功',
                blockId: blockId,
                creatorId: creatorId,
                validationDetails: {
                    blacklistCheck: blacklistCheck,
                    ownershipCheck: ownershipCheck,
                    positionCheck: positionCheck,
                    forkCheck: forkCheck
                }
            };

            this.setCache(cacheKey, result);
            return result;

        } catch (error) {
            const result = {
                isValid: false,
                error: 'LEGALITY_VALIDATION_ERROR',
                message: `区块合法性验证过程中发生错误: ${error.message}`,
                details: error
            };
            this.setCache(cacheKey, result);
            return result;
        }
    }

    /**
     * 验证创建者状态（黑名单检查）
     * @param {string} creatorId - 创建者ID
     * @param {Object} networkState - 网络状态
     * @returns {Object} 验证结果
     */
    validateCreatorStatus(creatorId, networkState) {
        // 系统用户总是被允许的
        if (creatorId === 'system') {
            return {
                isValid: true,
                message: '系统用户验证通过'
            };
        }

        const blacklist = networkState.blacklist || new Set();
        
        if (blacklist.has(creatorId)) {
            return {
                isValid: false,
                error: 'USER_BLACKLISTED',
                message: `用户 ${creatorId} 已被列入黑名单`,
                creatorId: creatorId
            };
        }

        return {
            isValid: true,
            message: '创建者状态验证通过',
            creatorId: creatorId
        };
    }

    /**
     * 验证区块链所有权
     * @param {Block} block - 要验证的区块
     * @param {BlockChain} blockchain - 区块链实例
     * @returns {Promise<Object>} 验证结果
     */
    async validateBlockchainOwnership(block, blockchain) {
        const blockData = block.getData();
        const creatorId = block.getCreator();

        // 根区块和所有权区块有特殊的所有权规则
        if (blockData.type === 'root') {
            return {
                isValid: true,
                message: '根区块所有权验证通过'
            };
        }

        if (blockData.type === 'ownership') {
            // 所有权区块只能在根区块之后添加，且只能有一个
            const rootBlock = blockchain.getRootBlock();
            if (!rootBlock) {
                return {
                    isValid: false,
                    message: '找不到根区块，无法添加所有权区块'
                };
            }

            const prevBlockId = block.getPrevBlockId();
            if (prevBlockId !== rootBlock.getId()) {
                return {
                    isValid: false,
                    message: '所有权区块必须直接跟在根区块之后'
                };
            }

            // 检查是否已经存在所有权区块
            const existingOwnerBlock = blockchain.getOwnerBlock();
            if (existingOwnerBlock && existingOwnerBlock.getId() !== block.getId()) {
                return {
                    isValid: false,
                    message: '区块链已经有所有权区块，不能重复添加'
                };
            }

            return {
                isValid: true,
                message: '所有权区块验证通过'
            };
        }

        if (blockData.type === 'transfer') {
            // 转移区块必须由当前所有者创建
            const currentOwner = blockchain.getCurrentOwner();
            
            if (!currentOwner) {
                return {
                    isValid: false,
                    message: '区块链没有当前所有者，无法进行转移'
                };
            }

            if (creatorId !== currentOwner) {
                return {
                    isValid: false,
                    message: `只有当前所有者 ${currentOwner} 可以转移区块链，但创建者是 ${creatorId}`
                };
            }

            // 验证目标用户存在且有效
            const targetUserId = blockData.targetUserId;
            if (!targetUserId) {
                return {
                    isValid: false,
                    message: '转移区块缺少目标用户ID'
                };
            }

            if (targetUserId === currentOwner) {
                return {
                    isValid: false,
                    message: '不能将区块链转移给自己'
                };
            }

            return {
                isValid: true,
                message: '转移区块所有权验证通过',
                currentOwner: currentOwner,
                targetOwner: targetUserId
            };
        }

        return {
            isValid: false,
            message: `未知的区块类型: ${blockData.type}`
        };
    }

    /**
     * 验证区块位置冲突
     * @param {Block} block - 要验证的区块
     * @param {BlockChain} blockchain - 区块链实例
     * @returns {Object} 验证结果
     */
    validateBlockPosition(block, blockchain) {
        const blockId = block.getId();
        const prevBlockId = block.getPrevBlockId();

        // 检查区块是否已经存在
        if (blockchain.hasBlock(blockId)) {
            return {
                isValid: false,
                message: `区块 ${blockId} 已经存在于区块链中`,
                conflictingBlock: blockchain.getBlock(blockId)
            };
        }

        // 对于根区块，不需要检查位置
        const blockData = block.getData();
        if (blockData.type === 'root') {
            return {
                isValid: true,
                message: '根区块位置验证通过'
            };
        }

        // 检查前一个区块是否存在
        if (!prevBlockId) {
            return {
                isValid: false,
                message: '非根区块必须指定前一个区块ID'
            };
        }

        const prevBlock = blockchain.getBlock(prevBlockId);
        if (!prevBlock) {
            return {
                isValid: false,
                message: `前一个区块 ${prevBlockId} 不存在`
            };
        }

        // 检查是否有其他区块已经占用了这个位置
        const allBlocks = blockchain.getAllBlocks();
        for (const existingBlock of allBlocks) {
            if (existingBlock.getPrevBlockId() === prevBlockId && 
                existingBlock.getId() !== blockId) {
                return {
                    isValid: false,
                    message: `位置冲突：区块 ${existingBlock.getId()} 已经占用了前一个区块 ${prevBlockId} 之后的位置`,
                    conflictingBlock: existingBlock
                };
            }
        }

        return {
            isValid: true,
            message: '区块位置验证通过',
            prevBlockId: prevBlockId
        };
    }

    /**
     * 验证分叉合法性
     * @param {Block} block - 要验证的区块
     * @param {BlockChain} blockchain - 区块链实例
     * @param {Object} networkState - 网络状态
     * @returns {Object} 验证结果
     */
    validateForkLegality(block, blockchain, networkState) {
        const forkDetection = blockchain.detectFork(block);
        
        if (!forkDetection.isFork) {
            return {
                isValid: true,
                message: '没有检测到分叉'
            };
        }

        // 检查分叉类型
        if (forkDetection.reason === 'DOUBLE_SPEND') {
            return {
                isValid: false,
                error: 'DOUBLE_SPEND_DETECTED',
                message: '检测到双花攻击，区块被拒绝',
                forkReason: forkDetection.reason,
                conflictingBlock: forkDetection.conflictBlock
            };
        }

        if (forkDetection.reason === 'POSITION_CONFLICT') {
            // 检查是否是被认可的分叉
            const approvedForks = networkState.approvedForks || new Set();
            const forkKey = `${block.getPrevBlockId()}_${block.getId()}`;
            
            if (!approvedForks.has(forkKey)) {
                return {
                    isValid: false,
                    error: 'UNAPPROVED_FORK',
                    message: '检测到未经认可的分叉',
                    forkReason: forkDetection.reason,
                    conflictingBlock: forkDetection.conflictBlock
                };
            }

            return {
                isValid: true,
                message: '分叉已被网络认可',
                forkReason: forkDetection.reason,
                conflictingBlock: forkDetection.conflictBlock
            };
        }

        return {
            isValid: false,
            error: 'UNKNOWN_FORK_TYPE',
            message: `未知的分叉类型: ${forkDetection.reason}`,
            forkReason: forkDetection.reason,
            conflictingBlock: forkDetection.conflictBlock
        };
    }

    /**
     * 批量验证多个区块的合法性
     * @param {Array<Object>} blockValidationRequests - 验证请求数组，每个包含 {block, blockchain, networkState}
     * @returns {Promise<Object>} 批量验证结果
     */
    async batchValidateLegality(blockValidationRequests) {
        if (!Array.isArray(blockValidationRequests)) {
            return {
                isValid: false,
                error: 'INVALID_INPUT',
                message: '输入必须是验证请求数组'
            };
        }

        const results = [];
        let allValid = true;

        for (const request of blockValidationRequests) {
            const { block, blockchain, networkState } = request;
            const result = await this.validateLegality(block, blockchain, networkState);
            
            results.push({
                blockId: block.getId(),
                result: result
            });
            
            if (!result.isValid) {
                allValid = false;
            }
        }

        return {
            isValid: allValid,
            results: results,
            totalBlocks: blockValidationRequests.length,
            validBlocks: results.filter(r => r.result.isValid).length,
            invalidBlocks: results.filter(r => !r.result.isValid).length
        };
    }

    /**
     * 验证区块接收时间（需求 8.1, 8.2, 8.3）
     * @param {Block} block - 要验证的区块
     * @param {number} receiveTime - 接收时间（滴答数）
     * @param {Object} networkParams - 网络参数
     * @returns {Object} 时间验证结果
     */
    validateReceptionTime(block, receiveTime, networkParams) {
        if (!block) {
            return {
                isValid: false,
                error: 'BLOCK_NULL',
                message: '区块为空'
            };
        }

        const blockTime = block.getTime();
        const blockId = block.getId();

        // 检查区块ID是否有效
        if (!blockId) {
            return {
                isValid: false,
                error: 'BLOCK_ID_MISSING',
                message: '区块ID缺失'
            };
        }

        // 计算全网广播时间
        const broadcastTime = this.calculateBroadcastTime(networkParams);
        const maxAllowedDelay = broadcastTime * 2; // 全网广播时间的两倍

        // 计算实际延迟
        const actualDelay = receiveTime - blockTime;

        if (actualDelay > maxAllowedDelay) {
            return {
                isValid: false,
                error: 'TIME_VALIDATION_FAILED',
                message: `区块接收时间超过允许的最大延迟`,
                blockId: blockId,
                blockTime: blockTime,
                receiveTime: receiveTime,
                actualDelay: actualDelay,
                maxAllowedDelay: maxAllowedDelay,
                broadcastTime: broadcastTime,
                shouldReject: true
            };
        }

        return {
            isValid: true,
            message: '时间验证通过',
            blockId: blockId,
            blockTime: blockTime,
            receiveTime: receiveTime,
            actualDelay: actualDelay,
            maxAllowedDelay: maxAllowedDelay,
            broadcastTime: broadcastTime
        };
    }

    /**
     * 计算全网广播时间
     * @param {Object} networkParams - 网络参数
     * @param {number} networkParams.nodeCount - 节点数量
     * @param {number} networkParams.avgConnections - 平均连接数
     * @param {number} networkParams.maxDelay - 最大延迟
     * @returns {number} 预估全网广播时间（滴答数）
     */
    calculateBroadcastTime(networkParams) {
        const { nodeCount, avgConnections, maxDelay } = networkParams;
        
        // 验证和清理输入参数
        const validNodeCount = Math.max(1, nodeCount || 1);
        const validAvgConnections = Math.max(2, avgConnections || 2);
        const validMaxDelay = Math.max(1, maxDelay || 9);
        
        if (!nodeCount || !avgConnections) {
            return validMaxDelay;
        }
        
        // 基于网络拓扑计算广播时间
        // 使用对数模型：log(n) / log(avgConnections) * maxDelay
        const networkDepth = Math.ceil(Math.log(validNodeCount) / Math.log(validAvgConnections));
        const broadcastTime = networkDepth * validMaxDelay;
        
        return Math.max(1, broadcastTime);
    }

    /**
     * 创建拒绝区块
     * @param {Block} originalBlock - 被拒绝的原始区块
     * @param {string} rejectorId - 拒绝者ID
     * @param {string} reason - 拒绝原因
     * @param {number} currentTick - 当前滴答数
     * @returns {Promise<Block>} 拒绝区块
     */
    async createRejectionBlock(originalBlock, rejectorId, reason, currentTick) {
        const { Block } = await import('../models/Block.js');
        
        const rejectionData = {
            type: 'rejection',
            originalBlockId: originalBlock.getId(),
            originalBlockCreator: originalBlock.getCreator(),
            originalBlockTime: originalBlock.getTime(),
            rejectionReason: reason,
            rejectionTime: currentTick,
            rejectorId: rejectorId
        };

        const rejectionBlock = new Block(
            rejectionData,
            null, // 拒绝区块不需要前一个区块ID
            rejectorId,
            currentTick
        );

        await rejectionBlock.genId();
        return rejectionBlock;
    }

    /**
     * 验证接收确认（需求 8.4, 8.5）
     * @param {Block} block - 要确认的区块
     * @param {number} receiveTime - 接收时间
     * @param {number} currentTime - 当前时间
     * @param {Object} networkParams - 网络参数
     * @param {Array} conflictBlocks - 冲突区块列表
     * @param {Array} warnings - 警告消息列表
     * @returns {Object} 确认验证结果
     */
    validateReceptionConfirmation(block, receiveTime, currentTime, networkParams, conflictBlocks = [], warnings = []) {
        if (!block) {
            return {
                isValid: false,
                error: 'BLOCK_NULL',
                message: '区块为空'
            };
        }

        const blockId = block.getId();
        const broadcastTime = this.calculateBroadcastTime(networkParams);
        const confirmationWaitTime = broadcastTime * 4; // 全网广播时间的四倍
        const waitEndTime = receiveTime + confirmationWaitTime;

        // 检查确认等待期是否已结束
        if (currentTime < waitEndTime) {
            return {
                isValid: false,
                error: 'CONFIRMATION_PENDING',
                message: '确认等待期尚未结束',
                blockId: blockId,
                receiveTime: receiveTime,
                currentTime: currentTime,
                waitEndTime: waitEndTime,
                remainingWaitTime: waitEndTime - currentTime,
                confirmationWaitTime: confirmationWaitTime
            };
        }

        // 检查等待期内是否收到冲突区块
        const conflictsInWaitPeriod = conflictBlocks.filter(conflictBlock => {
            if (!conflictBlock || typeof conflictBlock.getTime !== 'function') {
                return false;
            }
            const conflictTime = conflictBlock.getTime();
            return conflictTime >= receiveTime && conflictTime <= waitEndTime;
        });

        if (conflictsInWaitPeriod.length > 0) {
            return {
                isValid: false,
                error: 'CONFLICT_DETECTED',
                message: '确认等待期内检测到冲突区块',
                blockId: blockId,
                conflictBlocks: conflictsInWaitPeriod.map(cb => ({
                    blockId: typeof cb.getId === 'function' ? cb.getId() : 'unknown',
                    creator: typeof cb.getCreator === 'function' ? cb.getCreator() : 'unknown',
                    time: typeof cb.getTime === 'function' ? cb.getTime() : 0
                })),
                conflictCount: conflictsInWaitPeriod.length
            };
        }

        // 检查等待期内是否收到相关警告
        const warningsInWaitPeriod = warnings.filter(warning => {
            if (!warning || typeof warning.time !== 'number') {
                return false;
            }
            return warning.time >= receiveTime && 
                   warning.time <= waitEndTime &&
                   (warning.relatedBlockId === blockId || 
                    warning.relatedBlockchainId === block.getData().blockchainId);
        });

        if (warningsInWaitPeriod.length > 0) {
            return {
                isValid: false,
                error: 'WARNING_DETECTED',
                message: '确认等待期内收到相关警告',
                blockId: blockId,
                warnings: warningsInWaitPeriod,
                warningCount: warningsInWaitPeriod.length
            };
        }

        // 确认成功
        return {
            isValid: true,
            message: '区块链转移确认成功',
            blockId: blockId,
            receiveTime: receiveTime,
            confirmationTime: currentTime,
            waitPeriod: confirmationWaitTime,
            finalConfirmation: true
        };
    }

    /**
     * 检测双花攻击
     * @param {Block} block - 要检测的区块
     * @param {BlockChain} blockchain - 区块链实例
     * @param {Object} networkState - 网络状态
     * @returns {Object} 检测结果
     */
    detectDoubleSpend(block, blockchain, networkState = {}) {
        if (!block || !blockchain) {
            return {
                isDoubleSpend: false,
                error: 'INVALID_INPUT',
                message: '输入参数无效'
            };
        }

        const blockData = block.getData();
        const creatorId = block.getCreator();

        // 只检测转移区块的双花攻击
        if (blockData.type !== 'transfer') {
            return {
                isDoubleSpend: false,
                message: '非转移区块，无需检测双花攻击'
            };
        }

        const blockchainId = blockData.blockchainId;
        const targetUserId = blockData.targetUserId;

        // 检查是否存在同一用户对同一区块链的多个转移尝试
        const allBlocks = blockchain.getAllBlocks();
        const conflictingBlocks = [];

        for (const existingBlock of allBlocks) {
            const existingData = existingBlock.getData();
            
            // 跳过当前区块本身
            if (existingBlock.getId() === block.getId()) {
                continue;
            }

            // 检查是否是同一创建者的转移区块
            if (existingData.type === 'transfer' && 
                existingBlock.getCreator() === creatorId &&
                existingData.blockchainId === blockchainId) {
                
                // 检查是否转移给不同的目标用户（双花攻击）
                if (existingData.targetUserId !== targetUserId) {
                    conflictingBlocks.push({
                        block: existingBlock,
                        targetUser: existingData.targetUserId,
                        timestamp: existingBlock.getTime()
                    });
                }

                // 检查是否是重复转移（同一目标用户的多次转移）
                if (existingData.targetUserId === targetUserId) {
                    conflictingBlocks.push({
                        block: existingBlock,
                        targetUser: existingData.targetUserId,
                        timestamp: existingBlock.getTime(),
                        type: 'DUPLICATE_TRANSFER'
                    });
                }
            }
        }

        if (conflictingBlocks.length > 0) {
            return {
                isDoubleSpend: true,
                attackType: 'DOUBLE_SPEND',
                attacker: creatorId,
                blockchainId: blockchainId,
                conflictingBlocks: conflictingBlocks,
                message: `检测到双花攻击：用户 ${creatorId} 尝试多次转移区块链 ${blockchainId}`,
                severity: 'HIGH'
            };
        }

        return {
            isDoubleSpend: false,
            message: '未检测到双花攻击'
        };
    }

    /**
     * 管理用户黑名单
     * @param {Object} networkState - 网络状态
     * @returns {Object} 黑名单管理器
     */
    getBlacklistManager(networkState) {
        return {
            /**
             * 将用户加入黑名单
             * @param {string} userId - 用户ID
             * @param {string} reason - 加入黑名单的原因
             * @returns {Object} 操作结果
             */
            addToBlacklist: (userId, reason = 'SECURITY_VIOLATION') => {
                if (!networkState.blacklist) {
                    networkState.blacklist = new Set();
                }

                if (networkState.blacklist.has(userId)) {
                    return {
                        success: false,
                        message: `用户 ${userId} 已在黑名单中`
                    };
                }

                networkState.blacklist.add(userId);

                // 记录黑名单事件
                if (!networkState.blacklistEvents) {
                    networkState.blacklistEvents = [];
                }

                networkState.blacklistEvents.push({
                    userId: userId,
                    reason: reason,
                    timestamp: Date.now(),
                    action: 'BLACKLISTED'
                });

                return {
                    success: true,
                    message: `用户 ${userId} 已被加入黑名单`,
                    reason: reason
                };
            },

            /**
             * 从黑名单中移除用户
             * @param {string} userId - 用户ID
             * @returns {Object} 操作结果
             */
            removeFromBlacklist: (userId) => {
                if (!networkState.blacklist || !networkState.blacklist.has(userId)) {
                    return {
                        success: false,
                        message: `用户 ${userId} 不在黑名单中`
                    };
                }

                networkState.blacklist.delete(userId);

                // 记录移除事件
                if (!networkState.blacklistEvents) {
                    networkState.blacklistEvents = [];
                }

                networkState.blacklistEvents.push({
                    userId: userId,
                    timestamp: Date.now(),
                    action: 'REMOVED_FROM_BLACKLIST'
                });

                return {
                    success: true,
                    message: `用户 ${userId} 已从黑名单中移除`
                };
            },

            /**
             * 检查用户是否在黑名单中
             * @param {string} userId - 用户ID
             * @returns {boolean} 是否在黑名单中
             */
            isBlacklisted: (userId) => {
                return networkState.blacklist && networkState.blacklist.has(userId);
            },

            /**
             * 获取黑名单统计信息
             * @returns {Object} 统计信息
             */
            getStats: () => {
                return {
                    totalBlacklisted: networkState.blacklist ? networkState.blacklist.size : 0,
                    blacklistedUsers: networkState.blacklist ? Array.from(networkState.blacklist) : [],
                    totalEvents: networkState.blacklistEvents ? networkState.blacklistEvents.length : 0,
                    recentEvents: networkState.blacklistEvents ? 
                        networkState.blacklistEvents.slice(-10) : []
                };
            }
        };
    }

    /**
     * 生成分叉警告消息
     * @param {Object} forkInfo - 分叉信息
     * @returns {Object} 警告消息
     */
    generateForkWarning(forkInfo) {
        const warningMessage = {
            type: 'FORK_WARNING',
            priority: 'HIGH',
            timestamp: Date.now(),
            forkDetails: {
                reason: forkInfo.reason,
                blockchainId: forkInfo.blockchainId,
                conflictingBlocks: forkInfo.conflictingBlocks,
                attacker: forkInfo.attacker
            },
            message: '',
            actionRequired: true
        };

        switch (forkInfo.reason) {
            case 'DOUBLE_SPEND':
                warningMessage.message = `检测到双花攻击！用户 ${forkInfo.attacker} 尝试对区块链 ${forkInfo.blockchainId} 进行双花攻击`;
                warningMessage.severity = 'CRITICAL';
                warningMessage.recommendedAction = 'BLACKLIST_USER';
                break;

            case 'POSITION_CONFLICT':
                warningMessage.message = `检测到位置冲突！区块链 ${forkInfo.blockchainId} 存在分叉`;
                warningMessage.severity = 'HIGH';
                warningMessage.recommendedAction = 'INVESTIGATE_FORK';
                break;

            case 'UNAUTHORIZED_TRANSFER':
                warningMessage.message = `检测到未授权转移！用户 ${forkInfo.attacker} 尝试转移不属于其的区块链 ${forkInfo.blockchainId}`;
                warningMessage.severity = 'HIGH';
                warningMessage.recommendedAction = 'BLACKLIST_USER';
                break;

            default:
                warningMessage.message = `检测到未知类型的分叉事件：${forkInfo.reason}`;
                warningMessage.severity = 'MEDIUM';
                warningMessage.recommendedAction = 'INVESTIGATE';
        }

        return warningMessage;
    }

    /**
     * 处理高优先级安全消息
     * @param {Object} securityMessage - 安全消息
     * @param {Object} networkState - 网络状态
     * @returns {Object} 处理结果
     */
    processHighPrioritySecurityMessage(securityMessage, networkState) {
        if (!securityMessage || securityMessage.priority !== 'HIGH') {
            return {
                processed: false,
                message: '非高优先级安全消息'
            };
        }

        const results = [];
        const blacklistManager = this.getBlacklistManager(networkState);

        switch (securityMessage.type) {
            case 'FORK_WARNING':
                // 处理分叉警告
                if (securityMessage.forkDetails.reason === 'DOUBLE_SPEND') {
                    // 自动将双花攻击者加入黑名单
                    const blacklistResult = blacklistManager.addToBlacklist(
                        securityMessage.forkDetails.attacker,
                        'DOUBLE_SPEND_ATTACK'
                    );
                    results.push(blacklistResult);
                }

                // 记录安全事件
                if (!networkState.securityEvents) {
                    networkState.securityEvents = [];
                }

                networkState.securityEvents.push({
                    type: securityMessage.type,
                    details: securityMessage.forkDetails,
                    timestamp: securityMessage.timestamp,
                    processed: true
                });

                results.push({
                    success: true,
                    message: '分叉警告已处理',
                    actions: ['SECURITY_EVENT_LOGGED']
                });
                break;

            case 'BLACKLIST_REQUEST':
                // 处理黑名单请求
                const blacklistResult = blacklistManager.addToBlacklist(
                    securityMessage.targetUser,
                    securityMessage.reason
                );
                results.push(blacklistResult);
                break;

            default:
                results.push({
                    success: false,
                    message: `未知的安全消息类型: ${securityMessage.type}`
                });
        }

        return {
            processed: true,
            results: results,
            timestamp: Date.now()
        };
    }

    /**
     * 综合安全验证（包含双花攻击检测）
     * @param {Block} block - 要验证的区块
     * @param {BlockChain} blockchain - 区块链实例
     * @param {Object} networkState - 网络状态
     * @returns {Promise<Object>} 验证结果
     */
    async validateSecurity(block, blockchain, networkState = {}) {
        if (!block || !blockchain) {
            return {
                isValid: false,
                error: 'INVALID_INPUT',
                message: '输入参数无效'
            };
        }

        const results = {
            isValid: true,
            securityChecks: [],
            warnings: [],
            actions: []
        };

        try {
            // 1. 基本合法性验证
            const legalityResult = await this.validateLegality(block, blockchain, networkState);
            results.securityChecks.push({
                type: 'LEGALITY_CHECK',
                result: legalityResult
            });

            if (!legalityResult.isValid) {
                results.isValid = false;
                results.primaryError = legalityResult;
            }

            // 2. 双花攻击检测
            const doubleSpendResult = this.detectDoubleSpend(block, blockchain, networkState);
            results.securityChecks.push({
                type: 'DOUBLE_SPEND_CHECK',
                result: doubleSpendResult
            });

            if (doubleSpendResult.isDoubleSpend) {
                results.isValid = false;
                results.securityViolation = doubleSpendResult;

                // 生成分叉警告
                const forkWarning = this.generateForkWarning({
                    reason: 'DOUBLE_SPEND',
                    blockchainId: doubleSpendResult.blockchainId,
                    attacker: doubleSpendResult.attacker,
                    conflictingBlocks: doubleSpendResult.conflictingBlocks
                });

                results.warnings.push(forkWarning);

                // 处理高优先级安全消息
                const securityProcessResult = this.processHighPrioritySecurityMessage(forkWarning, networkState);
                results.actions.push(securityProcessResult);
            }

            // 3. 区块链完整性验证
            const integrityResult = await this.verifyChainIntegrity(blockchain, block);
            results.securityChecks.push({
                type: 'INTEGRITY_CHECK',
                result: integrityResult
            });

            if (!integrityResult.isValid) {
                results.isValid = false;
                if (!results.primaryError) {
                    results.primaryError = integrityResult;
                }
            }

            return results;

        } catch (error) {
            return {
                isValid: false,
                error: 'SECURITY_VALIDATION_ERROR',
                message: `安全验证过程中发生错误: ${error.message}`,
                details: error
            };
        }
    }

    /**
     * 获取安全统计信息
     * @param {Object} networkState - 网络状态
     * @returns {Object} 安全统计信息
     */
    getSecurityStats(networkState) {
        const blacklistManager = this.getBlacklistManager(networkState);
        const blacklistStats = blacklistManager.getStats();

        return {
            blacklist: blacklistStats,
            securityEvents: {
                total: networkState.securityEvents ? networkState.securityEvents.length : 0,
                recent: networkState.securityEvents ? networkState.securityEvents.slice(-5) : [],
                byType: this.groupSecurityEventsByType(networkState.securityEvents || [])
            },
            cacheStats: this.getCacheStats(),
            systemHealth: {
                validationCacheHitRate: this.calculateCacheHitRate(),
                averageValidationTime: this.calculateAverageValidationTime(),
                totalValidations: this.getTotalValidations()
            }
        };
    }

    /**
     * 按类型分组安全事件
     * @param {Array} events - 安全事件数组
     * @returns {Object} 按类型分组的事件
     */
    groupSecurityEventsByType(events) {
        const grouped = {};
        
        for (const event of events) {
            const type = event.type || 'UNKNOWN';
            if (!grouped[type]) {
                grouped[type] = [];
            }
            grouped[type].push(event);
        }

        return grouped;
    }

    /**
     * 计算缓存命中率
     * @returns {number} 缓存命中率（百分比）
     */
    calculateCacheHitRate() {
        // 这里可以实现实际的缓存命中率计算
        // 目前返回模拟值
        return 85.5;
    }

    /**
     * 计算平均验证时间
     * @returns {number} 平均验证时间（毫秒）
     */
    calculateAverageValidationTime() {
        // 这里可以实现实际的平均验证时间计算
        // 目前返回模拟值
        return 12.3;
    }

    /**
     * 获取总验证次数
     * @returns {number} 总验证次数
     */
    getTotalValidations() {
        // 这里可以实现实际的验证次数统计
        // 目前返回模拟值
        return this.verificationCache.size * 2;
    }

    /**
     * 检查是否有活跃的警告
     * @param {string} blockchainId - 区块链ID
     * @param {Object} networkState - 网络状态
     * @returns {Object} 警告检查结果
     */
    checkForActiveWarnings(blockchainId, networkState) {
        const activeWarnings = [];
        const currentTime = Date.now();
        const warningTimeout = 5 * 60 * 1000; // 5分钟警告有效期

        if (networkState.forkWarnings) {
            for (const warning of networkState.forkWarnings) {
                // 检查警告是否仍然有效
                if (currentTime - warning.timestamp < warningTimeout) {
                    // 检查警告是否与指定区块链相关
                    if (warning.data && 
                        (warning.data.blockchainId === blockchainId || 
                         warning.data.relatedBlockchainId === blockchainId)) {
                        activeWarnings.push(warning);
                    }
                }
            }
        }

        return {
            hasActiveWarnings: activeWarnings.length > 0,
            warnings: activeWarnings,
            warningCount: activeWarnings.length
        };
    }

    /**
     * 销毁验证器，清理资源
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        this.clearCache();
    }
}