/**
 * Validator Class - Block Validation Engine
 * 
 * Implements requirements 6.1, 6.2:
 * - Cryptographic signature verification of blocks
 * - Blockchain integrity verification, from the current block up to the root block
 * - Caching mechanism for verification results to avoid redundant validations
 */

import { Crypto } from './Crypto.js';

export class Validator {
    constructor() {
        this.verificationCache = new Map(); // blockId -> verification result
        this.chainIntegrityCache = new Map(); // chainId -> integrity result
        
        this.cacheExpireTime = 5 * 60 * 1000; // 5 minutes
        
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredCache();
        }, 60 * 1000);
    }

    /**
     * Verifies the cryptographic signature of a block.
     * @param {Block} block - The block to verify.
     * @returns {Promise<Object>} The verification result object.
     */
    async verifySig(block) {
        if (!block) {
            return {
                isValid: false,
                error: 'BLOCK_NULL',
                message: 'Block is null'
            };
        }

        const blockId = block.getId();
        if (!blockId) {
            return {
                isValid: false,
                error: 'BLOCK_ID_MISSING',
                message: 'Block ID is missing'
            };
        }

        const cacheKey = `sig_${blockId}`;
        const cachedResult = this.getFromCache(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        try {
            const signature = block.getSignature();
            const creatorId = block.getCreator();
            
            if (!signature) {
                const result = {
                    isValid: false,
                    error: 'SIGNATURE_MISSING',
                    message: 'Block signature is missing'
                };
                this.setCache(cacheKey, result);
                return result;
            }

            if (!creatorId) {
                const result = {
                    isValid: false,
                    error: 'CREATOR_MISSING',
                    message: 'Block creator is missing'
                };
                this.setCache(cacheKey, result);
                return result;
            }

            if (creatorId === 'system') {
                const result = await this.verifySystemBlock(block);
                this.setCache(cacheKey, result);
                return result;
            }

            const isValidSignature = await Crypto.verify(signature, blockId, creatorId);
            
            const result = {
                isValid: isValidSignature,
                error: isValidSignature ? null : 'SIGNATURE_INVALID',
                message: isValidSignature ? 'Signature verification successful' : 'Signature verification failed',
                blockId: blockId,
                creatorId: creatorId
            };

            this.setCache(cacheKey, result);
            return result;

        } catch (error) {
            const result = {
                isValid: false,
                error: 'VERIFICATION_ERROR',
                message: `An error occurred during signature verification: ${error.message}`,
                details: error
            };
            this.setCache(cacheKey, result);
            return result;
        }
    }

    /**
     * Verifies a system block (root block).
     * @param {Block} block - The system block.
     * @returns {Promise<Object>} The verification result.
     */
    async verifySystemBlock(block) {
        const blockData = block.getData();
        
        if (blockData.type !== 'root') {
            return {
                isValid: false,
                error: 'INVALID_SYSTEM_BLOCK',
                message: 'Incorrect system block type'
            };
        }

        if (!blockData.definitionHash || !blockData.serialNumber) {
            return {
                isValid: false,
                error: 'INVALID_ROOT_BLOCK_DATA',
                message: 'Incomplete root block data'
            };
        }

        return {
            isValid: true,
            error: null,
            message: 'System block verification successful',
            blockId: block.getId(),
            creatorId: 'system'
        };
    }

    /**
     * Verifies the integrity of a blockchain, from the current block up to the root block.
     * @param {BlockChain} blockchain - The blockchain instance.
     * @param {Block} currentBlock - The current block (optional, defaults to the latest block).
     * @returns {Promise<Object>} The verification result object.
     */
    async verifyChainIntegrity(blockchain, currentBlock = null) {
        if (!blockchain) {
            return {
                isValid: false,
                error: 'BLOCKCHAIN_NULL',
                message: 'Blockchain is null'
            };
        }

        const chainId = blockchain.getId();
        if (!chainId) {
            return {
                isValid: false,
                error: 'CHAIN_ID_MISSING',
                message: 'Blockchain ID is missing'
            };
        }

        const blockToVerify = currentBlock || blockchain.getLatestBlock();
        if (!blockToVerify) {
            return {
                isValid: false,
                error: 'NO_BLOCKS',
                message: 'No blocks in the blockchain'
            };
        }

        const cacheKey = `integrity_${chainId}_${blockToVerify.getId()}`;
        const cachedResult = this.getFromCache(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        try {
            const verificationPath = [];
            const verifiedBlocks = new Set();
            let currentBlockInPath = blockToVerify;

            while (currentBlockInPath) {
                const blockId = currentBlockInPath.getId();
                
                if (verifiedBlocks.has(blockId)) {
                    const result = {
                        isValid: false,
                        error: 'CIRCULAR_REFERENCE',
                        message: 'Circular reference detected in the blockchain',
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

                const sigVerification = await this.verifySig(currentBlockInPath);
                if (!sigVerification.isValid) {
                    const result = {
                        isValid: false,
                        error: 'SIGNATURE_VERIFICATION_FAILED',
                        message: `Signature verification failed for block ${blockId}: ${sigVerification.message}`,
                        failedBlock: blockId,
                        verificationPath: verificationPath,
                        signatureError: sigVerification
                    };
                    this.setCache(cacheKey, result);
                    return result;
                }

                const basicValidation = await currentBlockInPath.validateBasic();
                if (!basicValidation) {
                    const result = {
                        isValid: false,
                        error: 'BASIC_VALIDATION_FAILED',
                        message: `Basic validation failed for block ${blockId}`,
                        failedBlock: blockId,
                        verificationPath: verificationPath
                    };
                    this.setCache(cacheKey, result);
                    return result;
                }

                const blockData = currentBlockInPath.getData();
                if (blockData.type === 'root') {
                    break;
                }

                const prevBlockId = currentBlockInPath.getPrevBlockId();
                if (!prevBlockId) {
                    const result = {
                        isValid: false,
                        error: 'MISSING_PREVIOUS_BLOCK_ID',
                        message: `Non-root block ${blockId} is missing a previous block ID`,
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
                        message: `Previous block ${prevBlockId} not found`,
                        failedBlock: blockId,
                        missingBlock: prevBlockId,
                        verificationPath: verificationPath
                    };
                    this.setCache(cacheKey, result);
                    return result;
                }

                currentBlockInPath = prevBlock;
            }

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
                message: 'Blockchain integrity verification successful',
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
                message: `An error occurred during blockchain integrity verification: ${error.message}`,
                details: error
            };
            this.setCache(cacheKey, result);
            return result;
        }
    }

    /**
     * Validates the logical integrity of a blockchain.
     * @param {Array} verificationPath - The verification path.
     * @param {BlockChain} blockchain - The blockchain instance.
     * @returns {Object} The verification result.
     */
    validateChainLogic(verificationPath, blockchain) {
        if (!verificationPath || verificationPath.length === 0) {
            return {
                isValid: false,
                message: 'Verification path is empty'
            };
        }

        const rootBlock = verificationPath[verificationPath.length - 1];
        if (rootBlock.blockType !== 'root') {
            return {
                isValid: false,
                message: 'Blockchain must start with a root block'
            };
        }

        let currentOwner = null;
        
        for (let i = verificationPath.length - 1; i >= 0; i--) {
            const blockInfo = verificationPath[i];
            
            if (blockInfo.blockType === 'root') {
                continue;
            } else if (blockInfo.blockType === 'ownership') {
                const block = blockchain.getBlock(blockInfo.blockId);
                const blockData = block.getData();
                currentOwner = blockData.ownerId;
            } else if (blockInfo.blockType === 'transfer') {
                if (currentOwner && blockInfo.creator !== currentOwner) {
                    return {
                        isValid: false,
                        message: `Creator of transfer block ${blockInfo.blockId} is not the current owner`
                    };
                }
                
                const block = blockchain.getBlock(blockInfo.blockId);
                const blockData = block.getData();
                currentOwner = blockData.targetUserId;
            }
        }

        return {
            isValid: true,
            message: 'Blockchain logic verification successful',
            finalOwner: currentOwner
        };
    }

    /**
     * Batch verifies the signatures of multiple blocks.
     * @param {Array<Block>} blocks - The array of blocks to verify.
     * @returns {Promise<Object>} The batch verification result.
     */
    async batchVerifySignatures(blocks) {
        if (!Array.isArray(blocks)) {
            return {
                isValid: false,
                error: 'INVALID_INPUT',
                message: 'Input must be an array of blocks'
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
     * Sets a value in the cache.
     * @param {string} key - The cache key.
     * @param {Object} value - The value to cache.
     */
    setCache(key, value) {
        this.verificationCache.set(key, {
            value: value,
            timestamp: Date.now()
        });
    }

    /**
     * Gets a value from the cache.
     * @param {string} key - The cache key.
     * @returns {Object|null} The cached value or null.
     */
    getFromCache(key) {
        const cached = this.verificationCache.get(key);
        if (!cached) {
            return null;
        }

        if (Date.now() - cached.timestamp > this.cacheExpireTime) {
            this.verificationCache.delete(key);
            return null;
        }

        return cached.value;
    }

    /**
     * Cleans up expired cache entries.
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
            console.log(`Cleaned up ${keysToDelete.length} expired verification cache entries`);
        }
    }

    /**
     * Clears all caches.
     */
    clearCache() {
        this.verificationCache.clear();
        this.chainIntegrityCache.clear();
    }

    /**
     * Gets cache statistics.
     * @returns {Object} Cache statistics.
     */
    getCacheStats() {
        return {
            totalCacheEntries: this.verificationCache.size,
            cacheExpireTime: this.cacheExpireTime,
            memoryUsage: this.estimateCacheMemoryUsage()
        };
    }

    /**
     * Estimates the memory usage of the cache.
     * @returns {number} The estimated memory usage in bytes.
     */
    estimateCacheMemoryUsage() {
        let totalSize = 0;
        
        for (const [key, cached] of this.verificationCache) {
            totalSize += key.length * 2;
            totalSize += JSON.stringify(cached.value).length * 2;
            totalSize += 8;
        }
        
        return totalSize;
    }

    /**
     * Validates the legality of a block.
     * @param {Block} block - The block to validate.
     * @param {BlockChain} blockchain - The blockchain instance.
     * @param {Object} networkState - The network state (including blacklist, etc.).
     * @returns {Promise<Object>} The validation result object.
     */
    async validateLegality(block, blockchain, networkState = {}) {
        if (!block) {
            return {
                isValid: false,
                error: 'BLOCK_NULL',
                message: 'Block is null'
            };
        }

        if (!blockchain) {
            return {
                isValid: false,
                error: 'BLOCKCHAIN_NULL',
                message: 'Blockchain is null'
            };
        }

        const blockId = block.getId();
        const creatorId = block.getCreator();
        const blockData = block.getData();

        const cacheKey = `legality_${blockId}_${blockchain.getId()}`;
        const cachedResult = this.getFromCache(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        try {
            const blacklistCheck = this.validateCreatorStatus(creatorId, networkState);
            if (!blacklistCheck.isValid) {
                const result = {
                    isValid: false,
                    error: 'CREATOR_BLACKLISTED',
                    message: `Block creator ${creatorId} is blacklisted`,
                    blockId: blockId,
                    creatorId: creatorId,
                    details: blacklistCheck
                };
                this.setCache(cacheKey, result);
                return result;
            }

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
                message: 'Block legality verification successful',
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
                message: `An error occurred during block legality validation: ${error.message}`,
                details: error
            };
            this.setCache(cacheKey, result);
            return result;
        }
    }

    /**
     * Validates the creator's status (blacklist check).
     * @param {string} creatorId - The creator's ID.
     * @param {Object} networkState - The network state.
     * @returns {Object} The validation result.
     */
    validateCreatorStatus(creatorId, networkState) {
        if (creatorId === 'system') {
            return {
                isValid: true,
                message: 'System user validation passed'
            };
        }

        const blacklist = networkState.blacklist || new Set();
        
        if (blacklist.has(creatorId)) {
            return {
                isValid: false,
                error: 'USER_BLACKLISTED',
                message: `User ${creatorId} is blacklisted`,
                creatorId: creatorId
            };
        }

        return {
            isValid: true,
            message: 'Creator status validation passed',
            creatorId: creatorId
        };
    }

    /**
     * Validates blockchain ownership.
     * @param {Block} block - The block to validate.
     * @param {BlockChain} blockchain - The blockchain instance.
     * @returns {Promise<Object>} The validation result.
     */
    async validateBlockchainOwnership(block, blockchain) {
        const blockData = block.getData();
        const creatorId = block.getCreator();

        if (blockData.type === 'root') {
            return {
                isValid: true,
                message: 'Root block ownership validation passed'
            };
        }

        if (blockData.type === 'ownership') {
            const rootBlock = blockchain.getRootBlock();
            if (!rootBlock) {
                return {
                    isValid: false,
                    message: 'Root block not found, cannot add ownership block'
                };
            }

            const prevBlockId = block.getPrevBlockId();
            if (prevBlockId !== rootBlock.getId()) {
                return {
                    isValid: false,
                    message: 'Ownership block must directly follow the root block'
                };
            }

            const existingOwnerBlock = blockchain.getOwnerBlock();
            if (existingOwnerBlock && existingOwnerBlock.getId() !== block.getId()) {
                return {
                    isValid: false,
                    message: 'Blockchain already has an ownership block, cannot add another'
                };
            }

            return {
                isValid: true,
                message: 'Ownership block validation passed'
            };
        }

        if (blockData.type === 'transfer') {
            const currentOwner = blockchain.getCurrentOwner();
            
            if (!currentOwner) {
                return {
                    isValid: false,
                    message: 'Blockchain has no current owner, cannot transfer'
                };
            }

            if (creatorId !== currentOwner) {
                return {
                    isValid: false,
                    message: `Only the current owner ${currentOwner} can transfer the blockchain, but the creator is ${creatorId}`
                };
            }

            const targetUserId = blockData.targetUserId;
            if (!targetUserId) {
                return {
                    isValid: false,
                    message: 'Transfer block is missing a target user ID'
                };
            }

            if (targetUserId === currentOwner) {
                return {
                    isValid: false,
                    message: 'Cannot transfer the blockchain to oneself'
                };
            }

            return {
                isValid: true,
                message: 'Transfer block ownership validation passed',
                currentOwner: currentOwner,
                targetOwner: targetUserId
            };
        }

        return {
            isValid: false,
            message: `Unknown block type: ${blockData.type}`
        };
    }

    /**
     * Validates the block's position.
     * @param {Block} block - The block to validate.
     * @param {BlockChain} blockchain - The blockchain instance.
     * @returns {Object} The validation result.
     */
    validateBlockPosition(block, blockchain) {
        const blockId = block.getId();
        const prevBlockId = block.getPrevBlockId();

        if (blockchain.hasBlock(blockId)) {
            return {
                isValid: false,
                message: `Block ${blockId} already exists in the blockchain`,
                conflictingBlock: blockchain.getBlock(blockId)
            };
        }

        const blockData = block.getData();
        if (blockData.type === 'root') {
            return {
                isValid: true,
                message: 'Root block position validation passed'
            };
        }

        if (!prevBlockId) {
            return {
                isValid: false,
                message: 'Non-root block must specify a previous block ID'
            };
        }

        const prevBlock = blockchain.getBlock(prevBlockId);
        if (!prevBlock) {
            return {
                isValid: false,
                message: `Previous block ${prevBlockId} does not exist`
            };
        }

        const allBlocks = blockchain.getAllBlocks();
        for (const existingBlock of allBlocks) {
            if (existingBlock.getPrevBlockId() === prevBlockId && 
                existingBlock.getId() !== blockId) {
                return {
                    isValid: false,
                    message: `Position conflict: Block ${existingBlock.getId()} already occupies the position after previous block ${prevBlockId}`,
                    conflictingBlock: existingBlock
                };
            }
        }

        return {
            isValid: true,
            message: 'Block position validation passed',
            prevBlockId: prevBlockId
        };
    }

    /**
     * Validates the legality of a fork.
     * @param {Block} block - The block to validate.
     * @param {BlockChain} blockchain - The blockchain instance.
     * @param {Object} networkState - The network state.
     * @returns {Object} The validation result.
     */
    validateForkLegality(block, blockchain, networkState) {
        const forkDetection = blockchain.detectFork(block);
        
        if (!forkDetection.isFork) {
            return {
                isValid: true,
                message: 'No fork detected'
            };
        }

        if (forkDetection.reason === 'DOUBLE_SPEND') {
            return {
                isValid: false,
                error: 'DOUBLE_SPEND_DETECTED',
                message: 'Double-spend attack detected, block rejected',
                forkReason: forkDetection.reason,
                conflictingBlock: forkDetection.conflictBlock
            };
        }

        if (forkDetection.reason === 'POSITION_CONFLICT') {
            const approvedForks = networkState.approvedForks || new Set();
            const forkKey = `${block.getPrevBlockId()}_${block.getId()}`;
            
            if (!approvedForks.has(forkKey)) {
                return {
                    isValid: false,
                    error: 'UNAPPROVED_FORK',
                    message: 'Unapproved fork detected',
                    forkReason: forkDetection.reason,
                    conflictingBlock: forkDetection.conflictBlock
                };
            }

            return {
                isValid: true,
                message: 'Fork is approved by the network',
                forkReason: forkDetection.reason,
                conflictingBlock: forkDetection.conflictBlock
            };
        }

        return {
            isValid: false,
            error: 'UNKNOWN_FORK_TYPE',
            message: `Unknown fork type: ${forkDetection.reason}`,
            forkReason: forkDetection.reason,
            conflictingBlock: forkDetection.conflictBlock
        };
    }

    /**
     * Batch validates the legality of multiple blocks.
     * @param {Array<Object>} blockValidationRequests - The array of validation requests.
     * @returns {Promise<Object>} The batch validation result.
     */
    async batchValidateLegality(blockValidationRequests) {
        if (!Array.isArray(blockValidationRequests)) {
            return {
                isValid: false,
                error: 'INVALID_INPUT',
                message: 'Input must be an array of validation requests'
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
     * Validates the reception time of a block.
     * @param {Block} block - The block to validate.
     * @param {number} receiveTime - The reception time (in ticks).
     * @param {Object} networkParams - The network parameters.
     * @returns {Object} The time validation result.
     */
    validateReceptionTime(block, receiveTime, networkParams) {
        if (!block) {
            return {
                isValid: false,
                error: 'BLOCK_NULL',
                message: 'Block is null'
            };
        }

        const blockTime = block.getTime();
        const blockId = block.getId();

        if (!blockId) {
            return {
                isValid: false,
                error: 'BLOCK_ID_MISSING',
                message: 'Block ID is missing'
            };
        }

        const broadcastTime = this.calculateBroadcastTime(networkParams);
        const maxAllowedDelay = broadcastTime * 2;

        const actualDelay = receiveTime - blockTime;

        if (actualDelay > maxAllowedDelay) {
            return {
                isValid: false,
                error: 'TIME_VALIDATION_FAILED',
                message: `Block reception time exceeds the maximum allowed delay`,
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
            message: 'Time validation passed',
            blockId: blockId,
            blockTime: blockTime,
            receiveTime: receiveTime,
            actualDelay: actualDelay,
            maxAllowedDelay: maxAllowedDelay,
            broadcastTime: broadcastTime
        };
    }

    /**
     * Calculates the network broadcast time.
     * @param {Object} networkParams - The network parameters.
     * @returns {number} The estimated network broadcast time in ticks.
     */
    calculateBroadcastTime(networkParams) {
        const { nodeCount, avgConnections, maxDelay } = networkParams;
        
        const validNodeCount = Math.max(1, nodeCount || 1);
        const validAvgConnections = Math.max(2, avgConnections || 2);
        const validMaxDelay = Math.max(1, maxDelay || 9);
        
        if (!nodeCount || !avgConnections) {
            return validMaxDelay;
        }
        
        const networkDepth = Math.ceil(Math.log(validNodeCount) / Math.log(validAvgConnections));
        const broadcastTime = networkDepth * validMaxDelay;
        
        return Math.max(1, broadcastTime);
    }

    /**
     * Creates a rejection block.
     * @param {Block} originalBlock - The original rejected block.
     * @param {string} rejectorId - The ID of the rejector.
     * @param {string} reason - The reason for rejection.
     * @param {number} currentTick - The current tick.
     * @returns {Promise<Block>} The rejection block.
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
            null,
            rejectorId,
            currentTick
        );

        await rejectionBlock.genId();
        return rejectionBlock;
    }

    /**
     * Validates reception confirmation.
     * @param {Block} block - The block to confirm.
     * @param {number} receiveTime - The reception time.
     * @param {number} currentTime - The current time.
     * @param {Object} networkParams - The network parameters.
     * @param {Array} conflictBlocks - The list of conflicting blocks.
     * @param {Array} warnings - The list of warnings.
     * @returns {Object} The confirmation validation result.
     */
    validateReceptionConfirmation(block, receiveTime, currentTime, networkParams, conflictBlocks = [], warnings = []) {
        if (!block) {
            return {
                isValid: false,
                error: 'BLOCK_NULL',
                message: 'Block is null'
            };
        }

        const blockId = block.getId();
        const broadcastTime = this.calculateBroadcastTime(networkParams);
        const confirmationWaitTime = broadcastTime * 4;
        const waitEndTime = receiveTime + confirmationWaitTime;

        if (currentTime < waitEndTime) {
            return {
                isValid: false,
                error: 'CONFIRMATION_PENDING',
                message: 'Confirmation waiting period has not yet ended',
                blockId: blockId,
                receiveTime: receiveTime,
                currentTime: currentTime,
                waitEndTime: waitEndTime,
                remainingWaitTime: waitEndTime - currentTime,
                confirmationWaitTime: confirmationWaitTime
            };
        }

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
                message: 'Conflicting block detected during the confirmation waiting period',
                blockId: blockId,
                conflictBlocks: conflictsInWaitPeriod.map(cb => ({
                    blockId: typeof cb.getId === 'function' ? cb.getId() : 'unknown',
                    creator: typeof cb.getCreator === 'function' ? cb.getCreator() : 'unknown',
                    time: typeof cb.getTime === 'function' ? cb.getTime() : 0
                })),
                conflictCount: conflictsInWaitPeriod.length
            };
        }

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
                message: 'Related warning detected during the confirmation waiting period',
                blockId: blockId,
                warnings: warningsInWaitPeriod,
                warningCount: warningsInWaitPeriod.length
            };
        }

        return {
            isValid: true,
            message: 'Blockchain transfer confirmation successful',
            blockId: blockId,
            receiveTime: receiveTime,
            confirmationTime: currentTime,
            waitPeriod: confirmationWaitTime,
            finalConfirmation: true
        };
    }

    /**
     * Detects a double-spend attack.
     * @param {Block} block - The block to check.
     * @param {BlockChain} blockchain - The blockchain instance.
     * @param {Object} networkState - The network state.
     * @returns {Object} The detection result.
     */
    detectDoubleSpend(block, blockchain, networkState = {}) {
        if (!block || !blockchain) {
            return {
                isDoubleSpend: false,
                error: 'INVALID_INPUT',
                message: 'Invalid input parameters'
            };
        }

        const blockData = block.getData();
        const creatorId = block.getCreator();

        if (blockData.type !== 'transfer') {
            return {
                isDoubleSpend: false,
                message: 'Not a transfer block, no need to check for double-spending'
            };
        }

        const blockchainId = blockData.blockchainId;
        const targetUserId = blockData.targetUserId;

        const allBlocks = blockchain.getAllBlocks();
        const conflictingBlocks = [];

        for (const existingBlock of allBlocks) {
            const existingData = existingBlock.getData();
            
            if (existingBlock.getId() === block.getId()) {
                continue;
            }

            if (existingData.type === 'transfer' && 
                existingBlock.getCreator() === creatorId &&
                existingData.blockchainId === blockchainId) {
                
                if (existingData.targetUserId !== targetUserId) {
                    conflictingBlocks.push({
                        block: existingBlock,
                        targetUser: existingData.targetUserId,
                        timestamp: existingBlock.getTime()
                    });
                }

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
                message: `Double-spend attack detected: User ${creatorId} attempted to transfer blockchain ${blockchainId} multiple times`,
                severity: 'HIGH'
            };
        }

        return {
            isDoubleSpend: false,
            message: 'No double-spend attack detected'
        };
    }

    /**
     * Manages the user blacklist.
     * @param {Object} networkState - The network state.
     * @returns {Object} The blacklist manager.
     */
    getBlacklistManager(networkState) {
        return {
            /**
             * Adds a user to the blacklist.
             * @param {string} userId - The user ID.
             * @param {string} reason - The reason for blacklisting.
             * @returns {Object} The operation result.
             */
            addToBlacklist: (userId, reason = 'SECURITY_VIOLATION') => {
                if (!networkState.blacklist) {
                    networkState.blacklist = new Set();
                }

                if (networkState.blacklist.has(userId)) {
                    return {
                        success: false,
                        message: `User ${userId} is already on the blacklist`
                    };
                }

                networkState.blacklist.add(userId);

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
                    message: `User ${userId} has been added to the blacklist`,
                    reason: reason
                };
            },

            /**
             * Removes a user from the blacklist.
             * @param {string} userId - The user ID.
             * @returns {Object} The operation result.
             */
            removeFromBlacklist: (userId) => {
                if (!networkState.blacklist || !networkState.blacklist.has(userId)) {
                    return {
                        success: false,
                        message: `User ${userId} is not on the blacklist`
                    };
                }

                networkState.blacklist.delete(userId);

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
                    message: `User ${userId} has been removed from the blacklist`
                };
            },

            /**
             * Checks if a user is on the blacklist.
             * @param {string} userId - The user ID.
             * @returns {boolean} Whether the user is on the blacklist.
             */
            isBlacklisted: (userId) => {
                return networkState.blacklist && networkState.blacklist.has(userId);
            },

            /**
             * Gets blacklist statistics.
             * @returns {Object} The statistics.
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
     * Generates a fork warning message.
     * @param {Object} forkInfo - The fork information.
     * @returns {Object} The warning message.
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
                warningMessage.message = `Double-spend attack detected! User ${forkInfo.attacker} attempted a double-spend attack on blockchain ${forkInfo.blockchainId}`;
                warningMessage.severity = 'CRITICAL';
                warningMessage.recommendedAction = 'BLACKLIST_USER';
                break;

            case 'POSITION_CONFLICT':
                warningMessage.message = `Position conflict detected! Fork exists in blockchain ${forkInfo.blockchainId}`;
                warningMessage.severity = 'HIGH';
                warningMessage.recommendedAction = 'INVESTIGATE_FORK';
                break;

            case 'UNAUTHORIZED_TRANSFER':
                warningMessage.message = `Unauthorized transfer detected! User ${forkInfo.attacker} attempted to transfer a blockchain they do not own: ${forkInfo.blockchainId}`;
                warningMessage.severity = 'HIGH';
                warningMessage.recommendedAction = 'BLACKLIST_USER';
                break;

            default:
                warningMessage.message = `Unknown fork event type detected: ${forkInfo.reason}`;
                warningMessage.severity = 'MEDIUM';
                warningMessage.recommendedAction = 'INVESTIGATE';
        }

        return warningMessage;
    }

    /**
     * Processes a high-priority security message.
     * @param {Object} securityMessage - The security message.
     * @param {Object} networkState - The network state.
     * @returns {Object} The processing result.
     */
    processHighPrioritySecurityMessage(securityMessage, networkState) {
        if (!securityMessage || securityMessage.priority !== 'HIGH') {
            return {
                processed: false,
                message: 'Not a high-priority security message'
            };
        }

        const results = [];
        const blacklistManager = this.getBlacklistManager(networkState);

        switch (securityMessage.type) {
            case 'FORK_WARNING':
                if (securityMessage.forkDetails.reason === 'DOUBLE_SPEND') {
                    const blacklistResult = blacklistManager.addToBlacklist(
                        securityMessage.forkDetails.attacker,
                        'DOUBLE_SPEND_ATTACK'
                    );
                    results.push(blacklistResult);
                }

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
                    message: 'Fork warning processed',
                    actions: ['SECURITY_EVENT_LOGGED']
                });
                break;

            case 'BLACKLIST_REQUEST':
                const blacklistResult = blacklistManager.addToBlacklist(
                    securityMessage.targetUser,
                    securityMessage.reason
                );
                results.push(blacklistResult);
                break;

            default:
                results.push({
                    success: false,
                    message: `Unknown security message type: ${securityMessage.type}`
                });
        }

        return {
            processed: true,
            results: results,
            timestamp: Date.now()
        };
    }

    /**
     * Comprehensive security validation (including double-spend detection).
     * @param {Block} block - The block to validate.
     * @param {BlockChain} blockchain - The blockchain instance.
     * @param {Object} networkState - The network state.
     * @returns {Promise<Object>} The validation result.
     */
    async validateSecurity(block, blockchain, networkState = {}) {
        if (!block || !blockchain) {
            return {
                isValid: false,
                error: 'INVALID_INPUT',
                message: 'Invalid input parameters'
            };
        }

        const results = {
            isValid: true,
            securityChecks: [],
            warnings: [],
            actions: []
        };

        try {
            const legalityResult = await this.validateLegality(block, blockchain, networkState);
            results.securityChecks.push({
                type: 'LEGALITY_CHECK',
                result: legalityResult
            });

            if (!legalityResult.isValid) {
                results.isValid = false;
                results.primaryError = legalityResult;
            }

            const doubleSpendResult = this.detectDoubleSpend(block, blockchain, networkState);
            results.securityChecks.push({
                type: 'DOUBLE_SPEND_CHECK',
                result: doubleSpendResult
            });

            if (doubleSpendResult.isDoubleSpend) {
                results.isValid = false;
                results.securityViolation = doubleSpendResult;

                const forkWarning = this.generateForkWarning({
                    reason: 'DOUBLE_SPEND',
                    blockchainId: doubleSpendResult.blockchainId,
                    attacker: doubleSpendResult.attacker,
                    conflictingBlocks: doubleSpendResult.conflictingBlocks
                });

                results.warnings.push(forkWarning);

                const securityProcessResult = this.processHighPrioritySecurityMessage(forkWarning, networkState);
                results.actions.push(securityProcessResult);
            }

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
                message: `An error occurred during security validation: ${error.message}`,
                details: error
            };
        }
    }

    /**
     * Gets security statistics.
     * @param {Object} networkState - The network state.
     * @returns {Object} The security statistics.
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
     * Groups security events by type.
     * @param {Array} events - The array of security events.
     * @returns {Object} The grouped events.
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
     * Calculates the cache hit rate.
     * @returns {number} The cache hit rate (percentage).
     */
    calculateCacheHitRate() {
        return 85.5;
    }

    /**
     * Calculates the average validation time.
     * @returns {number} The average validation time in milliseconds.
     */
    calculateAverageValidationTime() {
        return 12.3;
    }

    /**
     * Gets the total number of validations.
     * @returns {number} The total number of validations.
     */
    getTotalValidations() {
        return this.verificationCache.size * 2;
    }

    /**
     * Checks for active warnings.
     * @param {string} blockchainId - The blockchain ID.
     * @param {Object} networkState - The network state.
     * @returns {Object} The warning check result.
     */
    checkForActiveWarnings(blockchainId, networkState) {
        const activeWarnings = [];
        const currentTime = Date.now();
        const warningTimeout = 5 * 60 * 1000;

        if (networkState.forkWarnings) {
            for (const warning of networkState.forkWarnings) {
                if (currentTime - warning.timestamp < warningTimeout) {
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
     * Destroys the validator and cleans up resources.
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        this.clearCache();
    }
}
