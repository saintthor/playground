/**
 * Validator 类的单元测试
 * 
 * 测试密码学验证功能：
 * - 区块签名验证
 * - 区块链完整性验证
 * - 验证结果缓存机制
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Validator } from '../../src/services/Validator.js';
import { Block } from '../../src/models/Block.js';
import { BlockChain } from '../../src/models/BlockChain.js';
import { Crypto } from '../../src/services/Crypto.js';

describe('Validator', () => {
    let validator;
    let testKeyPair;
    let testKeyPair2;

    beforeEach(async () => {
        validator = new Validator();
        
        // 生成测试用的密钥对
        testKeyPair = await Crypto.genKeyPair();
        testKeyPair2 = await Crypto.genKeyPair();
    });

    afterEach(() => {
        if (validator) {
            validator.destroy();
        }
    });

    describe('构造函数和初始化', () => {
        it('应该正确初始化验证器', () => {
            expect(validator).toBeDefined();
            expect(validator.verificationCache).toBeDefined();
            expect(validator.chainIntegrityCache).toBeDefined();
            expect(validator.cacheExpireTime).toBe(5 * 60 * 1000);
        });

        it('应该启动缓存清理定时器', () => {
            expect(validator.cleanupInterval).toBeDefined();
        });
    });

    describe('verifySig - 区块签名验证', () => {
        it('应该验证有效的区块签名', async () => {
            // 创建并签名一个测试区块
            const block = new Block(
                { type: 'test', content: 'test data' },
                null,
                testKeyPair.publicKey,
                Date.now()
            );
            
            await block.genId();
            await block.signBlock(testKeyPair.privateKey);

            const result = await validator.verifySig(block);

            expect(result.isValid).toBe(true);
            expect(result.error).toBeNull();
            expect(result.message).toBe('签名验证成功');
            expect(result.blockId).toBe(block.getId());
            expect(result.creatorId).toBe(testKeyPair.publicKey);
        });

        it('应该拒绝无效的区块签名', async () => {
            // 创建区块但用错误的私钥签名
            const block = new Block(
                { type: 'test', content: 'test data' },
                null,
                testKeyPair.publicKey,
                Date.now()
            );
            
            await block.genId();
            await block.signBlock(testKeyPair2.privateKey); // 使用错误的私钥

            const result = await validator.verifySig(block);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('SIGNATURE_INVALID');
            expect(result.message).toBe('签名验证失败');
        });

        it('应该处理空区块', async () => {
            const result = await validator.verifySig(null);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('BLOCK_NULL');
            expect(result.message).toBe('区块为空');
        });

        it('应该处理缺少签名的区块', async () => {
            const block = new Block(
                { type: 'test', content: 'test data' },
                null,
                testKeyPair.publicKey,
                Date.now()
            );
            
            await block.genId();
            // 不签名区块

            const result = await validator.verifySig(block);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('SIGNATURE_MISSING');
            expect(result.message).toBe('区块签名缺失');
        });

        it('应该处理缺少创建者的区块', async () => {
            const block = new Block(
                { type: 'test', content: 'test data' },
                null,
                null, // 没有创建者
                Date.now()
            );
            
            await block.genId();
            block.signature = 'some-signature'; // 添加签名，这样会检查创建者

            const result = await validator.verifySig(block);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('CREATOR_MISSING');
            expect(result.message).toBe('区块创建者缺失');
        });

        it('应该验证系统区块', async () => {
            const systemBlock = new Block(
                { 
                    type: 'root',
                    definitionHash: 'test-hash',
                    serialNumber: '12345'
                },
                null,
                'system',
                Date.now()
            );
            
            await systemBlock.genId();
            // 系统区块使用特殊签名，不需要真实的密钥对
            systemBlock.signature = 'system-signature';

            const result = await validator.verifySig(systemBlock);

            expect(result.isValid).toBe(true);
            expect(result.error).toBeNull();
            expect(result.message).toBe('系统区块验证成功');
        });
    });

    describe('verifyChainIntegrity - 区块链完整性验证', () => {
        let blockchain;
        let definition;

        beforeEach(async () => {
            definition = {
                desc: 'Test blockchain',
                ranges: [{ start: 1, end: 100, value: 10 }]
            };
            
            blockchain = new BlockChain(definition, '12345');
            await blockchain.createRootBlock();
        });

        it('应该验证只有根区块的区块链', async () => {
            const result = await validator.verifyChainIntegrity(blockchain);

            expect(result.isValid).toBe(true);
            expect(result.error).toBeNull();
            expect(result.message).toBe('区块链完整性验证成功');
            expect(result.verificationPath).toHaveLength(1);
            expect(result.verificationPath[0].blockType).toBe('root');
        });

        it('应该验证包含所有权区块的区块链', async () => {
            // 添加所有权区块
            await blockchain.createOwnerBlock(testKeyPair.publicKey, testKeyPair.privateKey);

            const result = await validator.verifyChainIntegrity(blockchain);

            expect(result.isValid).toBe(true);
            expect(result.error).toBeNull();
            expect(result.verificationPath).toHaveLength(2);
            expect(result.verificationPath[0].blockType).toBe('ownership');
            expect(result.verificationPath[1].blockType).toBe('root');
        });

        it('应该验证包含转移区块的完整区块链', async () => {
            // 添加所有权区块
            await blockchain.createOwnerBlock(testKeyPair.publicKey, testKeyPair.privateKey);

            // 创建转移区块
            const transferData = {
                type: 'transfer',
                blockchainId: blockchain.getId(),
                targetUserId: testKeyPair2.publicKey
            };

            const latestBlock = blockchain.getLatestBlock();
            const transferBlock = new Block(
                transferData,
                latestBlock.getId(),
                testKeyPair.publicKey,
                Date.now()
            );

            await transferBlock.genId();
            await transferBlock.signBlock(testKeyPair.privateKey);
            blockchain.addBlock(transferBlock);

            const result = await validator.verifyChainIntegrity(blockchain);

            expect(result.isValid).toBe(true);
            expect(result.error).toBeNull();
            expect(result.verificationPath).toHaveLength(3);
            expect(result.verificationPath[0].blockType).toBe('transfer');
            expect(result.verificationPath[1].blockType).toBe('ownership');
            expect(result.verificationPath[2].blockType).toBe('root');
        });

        it('应该处理空区块链', async () => {
            const result = await validator.verifyChainIntegrity(null);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('BLOCKCHAIN_NULL');
            expect(result.message).toBe('区块链为空');
        });

        it('应该检测到无效的转移区块创建者', async () => {
            // 添加所有权区块
            await blockchain.createOwnerBlock(testKeyPair.publicKey, testKeyPair.privateKey);

            // 创建由错误用户签名的转移区块
            const transferData = {
                type: 'transfer',
                blockchainId: blockchain.getId(),
                targetUserId: testKeyPair2.publicKey
            };

            const latestBlock = blockchain.getLatestBlock();
            const transferBlock = new Block(
                transferData,
                latestBlock.getId(),
                testKeyPair2.publicKey, // 错误的创建者
                Date.now()
            );

            await transferBlock.genId();
            await transferBlock.signBlock(testKeyPair2.privateKey);
            blockchain.addBlock(transferBlock);

            const result = await validator.verifyChainIntegrity(blockchain);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('LOGICAL_VALIDATION_FAILED');
            expect(result.message).toContain('转移区块');
            expect(result.message).toContain('创建者不是当前所有者');
        });
    });

    describe('缓存机制', () => {
        it('应该缓存验证结果', async () => {
            const block = new Block(
                { type: 'test', content: 'test data' },
                null,
                testKeyPair.publicKey,
                Date.now()
            );
            
            await block.genId();
            await block.signBlock(testKeyPair.privateKey);

            // 第一次验证
            const result1 = await validator.verifySig(block);
            expect(result1.isValid).toBe(true);

            // 模拟 Crypto.verify 被调用
            const verifySpy = vi.spyOn(Crypto, 'verify');

            // 第二次验证应该使用缓存
            const result2 = await validator.verifySig(block);
            expect(result2.isValid).toBe(true);
            expect(result2).toEqual(result1);

            // 验证没有再次调用 Crypto.verify（使用了缓存）
            expect(verifySpy).not.toHaveBeenCalled();

            verifySpy.mockRestore();
        });

        it('应该正确设置和获取缓存', () => {
            const testKey = 'test_key';
            const testValue = { test: 'value' };

            validator.setCache(testKey, testValue);
            const retrieved = validator.getFromCache(testKey);

            expect(retrieved).toEqual(testValue);
        });

        it('应该处理过期的缓存', async () => {
            const testKey = 'test_key';
            const testValue = { test: 'value' };

            // 设置一个很短的过期时间
            validator.cacheExpireTime = 10; // 10毫秒

            validator.setCache(testKey, testValue);
            
            // 等待缓存过期
            await new Promise(resolve => setTimeout(resolve, 20));

            const retrieved = validator.getFromCache(testKey);
            expect(retrieved).toBeNull();
        });

        it('应该清理过期的缓存', async () => {
            validator.cacheExpireTime = 10; // 10毫秒

            validator.setCache('key1', { test: 'value1' });
            validator.setCache('key2', { test: 'value2' });

            expect(validator.verificationCache.size).toBe(2);

            // 等待缓存过期
            await new Promise(resolve => setTimeout(resolve, 20));

            validator.cleanupExpiredCache();

            expect(validator.verificationCache.size).toBe(0);
        });

        it('应该清空所有缓存', () => {
            validator.setCache('key1', { test: 'value1' });
            validator.setCache('key2', { test: 'value2' });

            expect(validator.verificationCache.size).toBe(2);

            validator.clearCache();

            expect(validator.verificationCache.size).toBe(0);
        });
    });

    describe('batchVerifySignatures - 批量签名验证', () => {
        it('应该批量验证多个有效区块', async () => {
            const blocks = [];
            
            // 创建多个有效区块
            for (let i = 0; i < 3; i++) {
                const block = new Block(
                    { type: 'test', content: `test data ${i}` },
                    null,
                    testKeyPair.publicKey,
                    Date.now() + i
                );
                
                await block.genId();
                await block.signBlock(testKeyPair.privateKey);
                blocks.push(block);
            }

            const result = await validator.batchVerifySignatures(blocks);

            expect(result.isValid).toBe(true);
            expect(result.totalBlocks).toBe(3);
            expect(result.validBlocks).toBe(3);
            expect(result.invalidBlocks).toBe(0);
            expect(result.results).toHaveLength(3);
        });

        it('应该检测批量验证中的无效区块', async () => {
            const blocks = [];
            
            // 创建一个有效区块
            const validBlock = new Block(
                { type: 'test', content: 'valid data' },
                null,
                testKeyPair.publicKey,
                Date.now()
            );
            await validBlock.genId();
            await validBlock.signBlock(testKeyPair.privateKey);
            blocks.push(validBlock);

            // 创建一个无效区块（错误签名）
            const invalidBlock = new Block(
                { type: 'test', content: 'invalid data' },
                null,
                testKeyPair.publicKey,
                Date.now()
            );
            await invalidBlock.genId();
            await invalidBlock.signBlock(testKeyPair2.privateKey); // 错误的私钥
            blocks.push(invalidBlock);

            const result = await validator.batchVerifySignatures(blocks);

            expect(result.isValid).toBe(false);
            expect(result.totalBlocks).toBe(2);
            expect(result.validBlocks).toBe(1);
            expect(result.invalidBlocks).toBe(1);
        });

        it('应该处理无效输入', async () => {
            const result = await validator.batchVerifySignatures('not an array');

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('INVALID_INPUT');
            expect(result.message).toBe('输入必须是区块数组');
        });
    });

    describe('工具方法', () => {
        it('应该提供缓存统计信息', () => {
            validator.setCache('key1', { test: 'value1' });
            validator.setCache('key2', { test: 'value2' });

            const stats = validator.getCacheStats();

            expect(stats.totalCacheEntries).toBe(2);
            expect(stats.cacheExpireTime).toBe(validator.cacheExpireTime);
            expect(stats.memoryUsage).toBeGreaterThan(0);
        });

        it('应该正确销毁验证器', () => {
            const intervalId = validator.cleanupInterval;
            
            validator.destroy();

            expect(validator.cleanupInterval).toBeNull();
            expect(validator.verificationCache.size).toBe(0);
        });
    });

    describe('validateLegality - 区块合法性验证', () => {
        let blockchain;
        let definition;
        let networkState;

        beforeEach(async () => {
            definition = {
                desc: 'Test blockchain',
                ranges: [{ start: 1, end: 100, value: 10 }]
            };
            
            blockchain = new BlockChain(definition, '12345');
            await blockchain.createRootBlock();
            
            networkState = {
                blacklist: new Set(),
                approvedForks: new Set()
            };
        });

        it('应该验证合法的转移区块', async () => {
            // 添加所有权区块
            await blockchain.createOwnerBlock(testKeyPair.publicKey, testKeyPair.privateKey);

            // 创建转移区块
            const transferData = {
                type: 'transfer',
                blockchainId: blockchain.getId(),
                targetUserId: testKeyPair2.publicKey
            };

            const latestBlock = blockchain.getLatestBlock();
            const transferBlock = new Block(
                transferData,
                latestBlock.getId(),
                testKeyPair.publicKey,
                Date.now()
            );

            await transferBlock.genId();
            await transferBlock.signBlock(testKeyPair.privateKey);

            const result = await validator.validateLegality(transferBlock, blockchain, networkState);

            expect(result.isValid).toBe(true);
            expect(result.error).toBeNull();
            expect(result.message).toBe('区块合法性验证成功');
        });

        it('应该拒绝黑名单用户创建的区块', async () => {
            // 将用户加入黑名单
            networkState.blacklist.add(testKeyPair.publicKey);

            const block = new Block(
                { type: 'test', content: 'test data' },
                null,
                testKeyPair.publicKey,
                Date.now()
            );
            
            await block.genId();
            await block.signBlock(testKeyPair.privateKey);

            const result = await validator.validateLegality(block, blockchain, networkState);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('CREATOR_BLACKLISTED');
            expect(result.message).toContain('已被列入黑名单');
        });

        it('应该拒绝非所有者创建的转移区块', async () => {
            // 添加所有权区块
            await blockchain.createOwnerBlock(testKeyPair.publicKey, testKeyPair.privateKey);

            // 尝试用另一个用户创建转移区块
            const transferData = {
                type: 'transfer',
                blockchainId: blockchain.getId(),
                targetUserId: testKeyPair.publicKey
            };

            const latestBlock = blockchain.getLatestBlock();
            const transferBlock = new Block(
                transferData,
                latestBlock.getId(),
                testKeyPair2.publicKey, // 错误的创建者
                Date.now()
            );

            await transferBlock.genId();
            await transferBlock.signBlock(testKeyPair2.privateKey);

            const result = await validator.validateLegality(transferBlock, blockchain, networkState);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('OWNERSHIP_VIOLATION');
            expect(result.message).toContain('只有当前所有者');
        });

        it('应该拒绝位置冲突的区块', async () => {
            // 创建一个简单的区块来测试重复区块检测
            const testData = {
                type: 'test',
                content: 'test data'
            };

            const testBlock = new Block(
                testData,
                null,
                testKeyPair.publicKey,
                Date.now()
            );

            await testBlock.genId();
            await testBlock.signBlock(testKeyPair.privateKey);

            // 手动添加区块到区块链中（绕过正常的添加流程）
            blockchain.blocks.set(testBlock.getId(), testBlock);

            // 现在创建一个具有相同ID的区块来测试重复区块检测
            const duplicateBlock = new Block(
                testData,
                null,
                testKeyPair.publicKey,
                Date.now()
            );

            // 手动设置相同的ID来模拟重复区块
            duplicateBlock.id = testBlock.getId();
            duplicateBlock.signature = testBlock.getSignature();

            const result = await validator.validateLegality(duplicateBlock, blockchain, networkState);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('POSITION_CONFLICT');
            expect(result.message).toContain('已经存在于区块链中');
        });

        it('应该处理空区块输入', async () => {
            const result = await validator.validateLegality(null, blockchain, networkState);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('BLOCK_NULL');
            expect(result.message).toBe('区块为空');
        });

        it('应该处理空区块链输入', async () => {
            const block = new Block(
                { type: 'test', content: 'test data' },
                null,
                testKeyPair.publicKey,
                Date.now()
            );

            const result = await validator.validateLegality(block, null, networkState);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('BLOCKCHAIN_NULL');
            expect(result.message).toBe('区块链为空');
        });
    });

    describe('validateCreatorStatus - 创建者状态验证', () => {
        it('应该允许系统用户', () => {
            const result = validator.validateCreatorStatus('system', {});

            expect(result.isValid).toBe(true);
            expect(result.message).toBe('系统用户验证通过');
        });

        it('应该允许不在黑名单中的用户', () => {
            const networkState = {
                blacklist: new Set(['other-user'])
            };

            const result = validator.validateCreatorStatus(testKeyPair.publicKey, networkState);

            expect(result.isValid).toBe(true);
            expect(result.message).toBe('创建者状态验证通过');
        });

        it('应该拒绝黑名单中的用户', () => {
            const networkState = {
                blacklist: new Set([testKeyPair.publicKey])
            };

            const result = validator.validateCreatorStatus(testKeyPair.publicKey, networkState);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('USER_BLACKLISTED');
            expect(result.message).toContain('已被列入黑名单');
        });
    });

    describe('validateBlockchainOwnership - 区块链所有权验证', () => {
        let blockchain;

        beforeEach(async () => {
            const definition = {
                desc: 'Test blockchain',
                ranges: [{ start: 1, end: 100, value: 10 }]
            };
            
            blockchain = new BlockChain(definition, '12345');
            await blockchain.createRootBlock();
        });

        it('应该验证根区块的所有权', async () => {
            const rootBlock = blockchain.getRootBlock();
            const result = await validator.validateBlockchainOwnership(rootBlock, blockchain);

            expect(result.isValid).toBe(true);
            expect(result.message).toBe('根区块所有权验证通过');
        });

        it('应该验证有效的所有权区块', async () => {
            const ownershipData = {
                type: 'ownership',
                ownerId: testKeyPair.publicKey
            };

            const rootBlock = blockchain.getRootBlock();
            const ownershipBlock = new Block(
                ownershipData,
                rootBlock.getId(),
                testKeyPair.publicKey,
                Date.now()
            );

            await ownershipBlock.genId();
            await ownershipBlock.signBlock(testKeyPair.privateKey);

            const result = await validator.validateBlockchainOwnership(ownershipBlock, blockchain);

            expect(result.isValid).toBe(true);
            expect(result.message).toBe('所有权区块验证通过');
        });

        it('应该拒绝不直接跟在根区块后的所有权区块', async () => {
            // 先添加一个所有权区块
            await blockchain.createOwnerBlock(testKeyPair.publicKey, testKeyPair.privateKey);

            // 尝试添加另一个所有权区块
            const ownershipData = {
                type: 'ownership',
                ownerId: testKeyPair2.publicKey
            };

            const latestBlock = blockchain.getLatestBlock();
            const ownershipBlock = new Block(
                ownershipData,
                latestBlock.getId(), // 不是根区块
                testKeyPair2.publicKey,
                Date.now()
            );

            await ownershipBlock.genId();
            await ownershipBlock.signBlock(testKeyPair2.privateKey);

            const result = await validator.validateBlockchainOwnership(ownershipBlock, blockchain);

            expect(result.isValid).toBe(false);
            expect(result.message).toBe('所有权区块必须直接跟在根区块之后');
        });

        it('应该验证有效的转移区块', async () => {
            // 添加所有权区块
            await blockchain.createOwnerBlock(testKeyPair.publicKey, testKeyPair.privateKey);

            const transferData = {
                type: 'transfer',
                blockchainId: blockchain.getId(),
                targetUserId: testKeyPair2.publicKey
            };

            const latestBlock = blockchain.getLatestBlock();
            const transferBlock = new Block(
                transferData,
                latestBlock.getId(),
                testKeyPair.publicKey,
                Date.now()
            );

            await transferBlock.genId();
            await transferBlock.signBlock(testKeyPair.privateKey);

            const result = await validator.validateBlockchainOwnership(transferBlock, blockchain);

            expect(result.isValid).toBe(true);
            expect(result.message).toBe('转移区块所有权验证通过');
        });

        it('应该拒绝转移给自己的区块', async () => {
            // 添加所有权区块
            await blockchain.createOwnerBlock(testKeyPair.publicKey, testKeyPair.privateKey);

            const transferData = {
                type: 'transfer',
                blockchainId: blockchain.getId(),
                targetUserId: testKeyPair.publicKey // 转移给自己
            };

            const latestBlock = blockchain.getLatestBlock();
            const transferBlock = new Block(
                transferData,
                latestBlock.getId(),
                testKeyPair.publicKey,
                Date.now()
            );

            await transferBlock.genId();
            await transferBlock.signBlock(testKeyPair.privateKey);

            const result = await validator.validateBlockchainOwnership(transferBlock, blockchain);

            expect(result.isValid).toBe(false);
            expect(result.message).toBe('不能将区块链转移给自己');
        });
    });

    describe('batchValidateLegality - 批量合法性验证', () => {
        let blockchain;
        let networkState;

        beforeEach(async () => {
            const definition = {
                desc: 'Test blockchain',
                ranges: [{ start: 1, end: 100, value: 10 }]
            };
            
            blockchain = new BlockChain(definition, '12345');
            await blockchain.createRootBlock();
            
            networkState = {
                blacklist: new Set(),
                approvedForks: new Set()
            };
        });

        it('应该批量验证多个合法区块', async () => {
            // 添加所有权区块
            await blockchain.createOwnerBlock(testKeyPair.publicKey, testKeyPair.privateKey);

            const requests = [];
            
            // 创建多个转移区块请求
            for (let i = 0; i < 3; i++) {
                const transferData = {
                    type: 'transfer',
                    blockchainId: blockchain.getId(),
                    targetUserId: testKeyPair2.publicKey
                };

                const latestBlock = blockchain.getLatestBlock();
                const transferBlock = new Block(
                    transferData,
                    latestBlock.getId(),
                    testKeyPair.publicKey,
                    Date.now() + i
                );

                await transferBlock.genId();
                await transferBlock.signBlock(testKeyPair.privateKey);

                requests.push({
                    block: transferBlock,
                    blockchain: blockchain,
                    networkState: networkState
                });
            }

            const result = await validator.batchValidateLegality(requests);

            expect(result.isValid).toBe(true);
            expect(result.totalBlocks).toBe(3);
            expect(result.validBlocks).toBe(3);
            expect(result.invalidBlocks).toBe(0);
        });

        it('应该检测批量验证中的无效区块', async () => {
            // 添加所有权区块
            await blockchain.createOwnerBlock(testKeyPair.publicKey, testKeyPair.privateKey);

            const requests = [];
            
            // 创建一个有效的转移区块
            const validTransferData = {
                type: 'transfer',
                blockchainId: blockchain.getId(),
                targetUserId: testKeyPair2.publicKey
            };

            const latestBlock = blockchain.getLatestBlock();
            const validTransferBlock = new Block(
                validTransferData,
                latestBlock.getId(),
                testKeyPair.publicKey,
                Date.now()
            );

            await validTransferBlock.genId();
            await validTransferBlock.signBlock(testKeyPair.privateKey);

            requests.push({
                block: validTransferBlock,
                blockchain: blockchain,
                networkState: networkState
            });

            // 创建一个无效的转移区块（错误的创建者）
            const invalidTransferData = {
                type: 'transfer',
                blockchainId: blockchain.getId(),
                targetUserId: testKeyPair.publicKey
            };

            const invalidTransferBlock = new Block(
                invalidTransferData,
                latestBlock.getId(),
                testKeyPair2.publicKey, // 错误的创建者
                Date.now() + 1000
            );

            await invalidTransferBlock.genId();
            await invalidTransferBlock.signBlock(testKeyPair2.privateKey);

            requests.push({
                block: invalidTransferBlock,
                blockchain: blockchain,
                networkState: networkState
            });

            const result = await validator.batchValidateLegality(requests);

            expect(result.isValid).toBe(false);
            expect(result.totalBlocks).toBe(2);
            expect(result.validBlocks).toBe(1);
            expect(result.invalidBlocks).toBe(1);
        });

        it('应该处理无效输入', async () => {
            const result = await validator.batchValidateLegality('not an array');

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('INVALID_INPUT');
            expect(result.message).toBe('输入必须是验证请求数组');
        });
    });

    describe('错误处理', () => {
        it('应该处理签名验证过程中的错误', async () => {
            // 模拟 Crypto.verify 抛出错误
            const originalVerify = Crypto.verify;
            Crypto.verify = vi.fn().mockRejectedValue(new Error('Crypto verification failed'));

            const block = new Block(
                { type: 'test', content: 'test data' },
                null,
                testKeyPair.publicKey,
                Date.now()
            );
            
            await block.genId();
            await block.signBlock(testKeyPair.privateKey);

            const result = await validator.verifySig(block);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('VERIFICATION_ERROR');
            expect(result.message).toContain('签名验证过程中发生错误');

            // 恢复原始方法
            Crypto.verify = originalVerify;
        });

        it('应该处理区块链完整性验证过程中的错误', async () => {
            // 创建一个有问题的区块链
            const blockchain = {
                getId: () => 'test-chain-id',
                getLatestBlock: () => null // 返回null会导致错误
            };

            const result = await validator.verifyChainIntegrity(blockchain);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('NO_BLOCKS');
            expect(result.message).toBe('区块链中没有区块');
        });

        it('应该处理合法性验证过程中的错误', async () => {
            // 模拟 validateBlockPosition 方法抛出错误
            const originalValidateBlockPosition = validator.validateBlockPosition;
            validator.validateBlockPosition = vi.fn().mockImplementation(() => {
                throw new Error('Test error in position validation');
            });

            const definition = {
                desc: 'Test blockchain',
                ranges: [{ start: 1, end: 100, value: 10 }]
            };
            
            const blockchain = new BlockChain(definition, '12345');
            await blockchain.createRootBlock();

            const block = new Block(
                { type: 'test', content: 'test data' },
                null,
                testKeyPair.publicKey,
                Date.now()
            );
            
            await block.genId();
            await block.signBlock(testKeyPair.privateKey);

            const result = await validator.validateLegality(block, blockchain, {});

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('LEGALITY_VALIDATION_ERROR');
            expect(result.message).toContain('区块合法性验证过程中发生错误');

            // 恢复原始方法
            validator.validateBlockPosition = originalValidateBlockPosition;
        });
    });

    describe('detectDoubleSpend - 双花攻击检测', () => {
        let blockchain;
        let networkState;

        beforeEach(async () => {
            const definition = {
                desc: 'Test blockchain',
                ranges: [{ start: 1, end: 100, value: 10 }]
            };
            
            blockchain = new BlockChain(definition, '12345');
            await blockchain.createRootBlock();
            await blockchain.createOwnerBlock(testKeyPair.publicKey, testKeyPair.privateKey);
            
            networkState = {
                blacklist: new Set(),
                approvedForks: new Set()
            };
        });

        it('应该检测到双花攻击', async () => {
            // 创建第一个转移区块
            const transferData1 = {
                type: 'transfer',
                blockchainId: blockchain.getId(),
                targetUserId: testKeyPair2.publicKey
            };

            const latestBlock = blockchain.getLatestBlock();
            const transferBlock1 = new Block(
                transferData1,
                latestBlock.getId(),
                testKeyPair.publicKey,
                Date.now()
            );

            await transferBlock1.genId();
            await transferBlock1.signBlock(testKeyPair.privateKey);
            blockchain.addBlock(transferBlock1);

            // 创建第二个转移区块，转移给不同的用户（双花攻击）
            const transferData2 = {
                type: 'transfer',
                blockchainId: blockchain.getId(),
                targetUserId: 'different-user' // 不同的目标用户
            };

            const transferBlock2 = new Block(
                transferData2,
                latestBlock.getId(),
                testKeyPair.publicKey,
                Date.now() + 1000
            );

            await transferBlock2.genId();
            await transferBlock2.signBlock(testKeyPair.privateKey);

            const result = validator.detectDoubleSpend(transferBlock2, blockchain, networkState);

            expect(result.isDoubleSpend).toBe(true);
            expect(result.attackType).toBe('DOUBLE_SPEND');
            expect(result.attacker).toBe(testKeyPair.publicKey);
            expect(result.blockchainId).toBe(blockchain.getId());
            expect(result.conflictingBlocks).toHaveLength(1);
            expect(result.severity).toBe('HIGH');
        });

        it('应该允许合法的转移区块', async () => {
            const transferData = {
                type: 'transfer',
                blockchainId: blockchain.getId(),
                targetUserId: testKeyPair2.publicKey
            };

            const latestBlock = blockchain.getLatestBlock();
            const transferBlock = new Block(
                transferData,
                latestBlock.getId(),
                testKeyPair.publicKey,
                Date.now()
            );

            await transferBlock.genId();
            await transferBlock.signBlock(testKeyPair.privateKey);

            const result = validator.detectDoubleSpend(transferBlock, blockchain, networkState);

            expect(result.isDoubleSpend).toBe(false);
            expect(result.message).toBe('未检测到双花攻击');
        });

        it('应该忽略非转移区块', async () => {
            const testBlock = new Block(
                { type: 'test', content: 'test data' },
                null,
                testKeyPair.publicKey,
                Date.now()
            );

            await testBlock.genId();
            await testBlock.signBlock(testKeyPair.privateKey);

            const result = validator.detectDoubleSpend(testBlock, blockchain, networkState);

            expect(result.isDoubleSpend).toBe(false);
            expect(result.message).toBe('非转移区块，无需检测双花攻击');
        });

        it('应该处理无效输入', () => {
            const result = validator.detectDoubleSpend(null, blockchain, networkState);

            expect(result.isDoubleSpend).toBe(false);
            expect(result.error).toBe('INVALID_INPUT');
            expect(result.message).toBe('输入参数无效');
        });
    });

    describe('getBlacklistManager - 黑名单管理', () => {
        let networkState;
        let blacklistManager;

        beforeEach(() => {
            networkState = {
                blacklist: new Set(),
                blacklistEvents: []
            };
            blacklistManager = validator.getBlacklistManager(networkState);
        });

        it('应该将用户加入黑名单', () => {
            const result = blacklistManager.addToBlacklist(testKeyPair.publicKey, 'DOUBLE_SPEND_ATTACK');

            expect(result.success).toBe(true);
            expect(result.message).toContain('已被加入黑名单');
            expect(result.reason).toBe('DOUBLE_SPEND_ATTACK');
            expect(networkState.blacklist.has(testKeyPair.publicKey)).toBe(true);
            expect(networkState.blacklistEvents).toHaveLength(1);
        });

        it('应该拒绝重复加入黑名单', () => {
            blacklistManager.addToBlacklist(testKeyPair.publicKey, 'DOUBLE_SPEND_ATTACK');
            const result = blacklistManager.addToBlacklist(testKeyPair.publicKey, 'ANOTHER_REASON');

            expect(result.success).toBe(false);
            expect(result.message).toContain('已在黑名单中');
        });

        it('应该从黑名单中移除用户', () => {
            blacklistManager.addToBlacklist(testKeyPair.publicKey, 'DOUBLE_SPEND_ATTACK');
            const result = blacklistManager.removeFromBlacklist(testKeyPair.publicKey);

            expect(result.success).toBe(true);
            expect(result.message).toContain('已从黑名单中移除');
            expect(networkState.blacklist.has(testKeyPair.publicKey)).toBe(false);
            expect(networkState.blacklistEvents).toHaveLength(2); // 添加和移除事件
        });

        it('应该检查用户是否在黑名单中', () => {
            expect(blacklistManager.isBlacklisted(testKeyPair.publicKey)).toBe(false);
            
            blacklistManager.addToBlacklist(testKeyPair.publicKey, 'DOUBLE_SPEND_ATTACK');
            expect(blacklistManager.isBlacklisted(testKeyPair.publicKey)).toBe(true);
        });

        it('应该提供黑名单统计信息', () => {
            blacklistManager.addToBlacklist(testKeyPair.publicKey, 'DOUBLE_SPEND_ATTACK');
            blacklistManager.addToBlacklist(testKeyPair2.publicKey, 'SECURITY_VIOLATION');

            const stats = blacklistManager.getStats();

            expect(stats.totalBlacklisted).toBe(2);
            expect(stats.blacklistedUsers).toHaveLength(2);
            expect(stats.totalEvents).toBe(2);
            expect(stats.recentEvents).toHaveLength(2);
        });
    });

    describe('generateForkWarning - 分叉警告生成', () => {
        it('应该生成双花攻击警告', () => {
            const forkInfo = {
                reason: 'DOUBLE_SPEND',
                blockchainId: 'test-blockchain-id',
                attacker: testKeyPair.publicKey,
                conflictingBlocks: []
            };

            const warning = validator.generateForkWarning(forkInfo);

            expect(warning.type).toBe('FORK_WARNING');
            expect(warning.priority).toBe('HIGH');
            expect(warning.severity).toBe('CRITICAL');
            expect(warning.recommendedAction).toBe('BLACKLIST_USER');
            expect(warning.message).toContain('双花攻击');
            expect(warning.actionRequired).toBe(true);
        });

        it('应该生成位置冲突警告', () => {
            const forkInfo = {
                reason: 'POSITION_CONFLICT',
                blockchainId: 'test-blockchain-id',
                conflictingBlocks: []
            };

            const warning = validator.generateForkWarning(forkInfo);

            expect(warning.type).toBe('FORK_WARNING');
            expect(warning.severity).toBe('HIGH');
            expect(warning.recommendedAction).toBe('INVESTIGATE_FORK');
            expect(warning.message).toContain('位置冲突');
        });

        it('应该生成未授权转移警告', () => {
            const forkInfo = {
                reason: 'UNAUTHORIZED_TRANSFER',
                blockchainId: 'test-blockchain-id',
                attacker: testKeyPair.publicKey,
                conflictingBlocks: []
            };

            const warning = validator.generateForkWarning(forkInfo);

            expect(warning.severity).toBe('HIGH');
            expect(warning.recommendedAction).toBe('BLACKLIST_USER');
            expect(warning.message).toContain('未授权转移');
        });
    });

    describe('processHighPrioritySecurityMessage - 高优先级安全消息处理', () => {
        let networkState;

        beforeEach(() => {
            networkState = {
                blacklist: new Set(),
                blacklistEvents: [],
                securityEvents: []
            };
        });

        it('应该处理分叉警告消息', () => {
            const securityMessage = {
                type: 'FORK_WARNING',
                priority: 'HIGH',
                forkDetails: {
                    reason: 'DOUBLE_SPEND',
                    attacker: testKeyPair.publicKey,
                    blockchainId: 'test-blockchain-id'
                },
                timestamp: Date.now()
            };

            const result = validator.processHighPrioritySecurityMessage(securityMessage, networkState);

            expect(result.processed).toBe(true);
            expect(result.results).toHaveLength(2); // 黑名单操作 + 安全事件记录
            expect(networkState.blacklist.has(testKeyPair.publicKey)).toBe(true);
            expect(networkState.securityEvents).toHaveLength(1);
        });

        it('应该处理黑名单请求消息', () => {
            const securityMessage = {
                type: 'BLACKLIST_REQUEST',
                priority: 'HIGH',
                targetUser: testKeyPair.publicKey,
                reason: 'SECURITY_VIOLATION'
            };

            const result = validator.processHighPrioritySecurityMessage(securityMessage, networkState);

            expect(result.processed).toBe(true);
            expect(result.results).toHaveLength(1);
            expect(networkState.blacklist.has(testKeyPair.publicKey)).toBe(true);
        });

        it('应该忽略非高优先级消息', () => {
            const securityMessage = {
                type: 'FORK_WARNING',
                priority: 'LOW'
            };

            const result = validator.processHighPrioritySecurityMessage(securityMessage, networkState);

            expect(result.processed).toBe(false);
            expect(result.message).toBe('非高优先级安全消息');
        });
    });

    describe('validateSecurity - 综合安全验证', () => {
        let blockchain;
        let networkState;

        beforeEach(async () => {
            const definition = {
                desc: 'Test blockchain',
                ranges: [{ start: 1, end: 100, value: 10 }]
            };
            
            blockchain = new BlockChain(definition, '12345');
            await blockchain.createRootBlock();
            await blockchain.createOwnerBlock(testKeyPair.publicKey, testKeyPair.privateKey);
            
            networkState = {
                blacklist: new Set(),
                approvedForks: new Set(),
                securityEvents: []
            };
        });

        it('应该通过合法区块的安全验证', async () => {
            const transferData = {
                type: 'transfer',
                blockchainId: blockchain.getId(),
                targetUserId: testKeyPair2.publicKey
            };

            const latestBlock = blockchain.getLatestBlock();
            const transferBlock = new Block(
                transferData,
                latestBlock.getId(),
                testKeyPair.publicKey,
                Date.now()
            );

            await transferBlock.genId();
            await transferBlock.signBlock(testKeyPair.privateKey);

            const result = await validator.validateSecurity(transferBlock, blockchain, networkState);

            expect(result.isValid).toBe(true);
            expect(result.securityChecks).toHaveLength(3); // 合法性、双花、完整性
            expect(result.warnings).toHaveLength(0);
            expect(result.actions).toHaveLength(0);
        });

        it('应该检测并处理双花攻击', async () => {
            // 先添加一个转移区块
            const transferData1 = {
                type: 'transfer',
                blockchainId: blockchain.getId(),
                targetUserId: testKeyPair2.publicKey
            };

            const latestBlock = blockchain.getLatestBlock();
            const transferBlock1 = new Block(
                transferData1,
                latestBlock.getId(),
                testKeyPair.publicKey,
                Date.now()
            );

            await transferBlock1.genId();
            await transferBlock1.signBlock(testKeyPair.privateKey);
            blockchain.addBlock(transferBlock1);

            // 创建双花攻击区块
            const transferData2 = {
                type: 'transfer',
                blockchainId: blockchain.getId(),
                targetUserId: 'different-user'
            };

            const transferBlock2 = new Block(
                transferData2,
                latestBlock.getId(),
                testKeyPair.publicKey,
                Date.now() + 1000
            );

            await transferBlock2.genId();
            await transferBlock2.signBlock(testKeyPair.privateKey);

            const result = await validator.validateSecurity(transferBlock2, blockchain, networkState);

            expect(result.isValid).toBe(false);
            expect(result.securityViolation).toBeDefined();
            expect(result.securityViolation.isDoubleSpend).toBe(true);
            expect(result.warnings).toHaveLength(1);
            expect(result.actions).toHaveLength(1);
            expect(networkState.blacklist.has(testKeyPair.publicKey)).toBe(true);
        });

        it('应该处理无效输入', async () => {
            const result = await validator.validateSecurity(null, blockchain, networkState);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('INVALID_INPUT');
            expect(result.message).toBe('输入参数无效');
        });
    });

    describe('getSecurityStats - 安全统计信息', () => {
        let networkState;

        beforeEach(() => {
            networkState = {
                blacklist: new Set([testKeyPair.publicKey]),
                blacklistEvents: [
                    { userId: testKeyPair.publicKey, action: 'BLACKLISTED', timestamp: Date.now() }
                ],
                securityEvents: [
                    { type: 'FORK_WARNING', timestamp: Date.now() },
                    { type: 'BLACKLIST_REQUEST', timestamp: Date.now() }
                ]
            };
        });

        it('应该提供完整的安全统计信息', () => {
            const stats = validator.getSecurityStats(networkState);

            expect(stats.blacklist.totalBlacklisted).toBe(1);
            expect(stats.blacklist.blacklistedUsers).toHaveLength(1);
            expect(stats.securityEvents.total).toBe(2);
            expect(stats.securityEvents.byType).toHaveProperty('FORK_WARNING');
            expect(stats.securityEvents.byType).toHaveProperty('BLACKLIST_REQUEST');
            expect(stats.cacheStats).toBeDefined();
            expect(stats.systemHealth).toBeDefined();
        });
    });
});