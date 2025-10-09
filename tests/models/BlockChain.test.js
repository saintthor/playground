/**
 * BlockChain 类的单元测试
 * 验证区块链管理和验证功能
 */

import { describe, it, expect, beforeAll } from 'vitest';

describe('BlockChain 类测试', () => {
    let keyPair1, keyPair2;
    let testDefinition;

    beforeAll(async () => {
        // 生成测试用的密钥对
        keyPair1 = await Crypto.genKeyPair();
        keyPair2 = await Crypto.genKeyPair();
        
        testDefinition = {
            desc: '测试区块链',
            ranges: [
                { start: 1, end: 100, value: 10 },
                { start: 101, end: 200, value: 20 }
            ]
        };
    });

    describe('构造函数和初始化', () => {
        it('应该正确创建区块链实例', async () => {
            const blockchain = new BlockChain(testDefinition, '50');
            
            // 等待异步初始化完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            expect(blockchain.definition).toEqual(testDefinition);
            expect(blockchain.serialNumber).toBe('50');
            expect(blockchain.getValue()).toBe(10); // 50 在第一个范围内
            expect(blockchain.getId()).toBeTypeOf('string');
            expect(blockchain.getRootBlock()).toBeTruthy();
        });

        it('应该正确计算区块链价值', () => {
            const blockchain1 = new BlockChain(testDefinition, '50');
            const blockchain2 = new BlockChain(testDefinition, '150');
            const blockchain3 = new BlockChain(testDefinition, '300');
            
            expect(blockchain1.getValue()).toBe(10);
            expect(blockchain2.getValue()).toBe(20);
            expect(blockchain3.getValue()).toBe(0); // 超出范围
        });

        it('应该创建有效的根区块', async () => {
            const blockchain = new BlockChain(testDefinition, '50');
            
            // 等待异步初始化完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const rootBlock = blockchain.getRootBlock();
            expect(rootBlock).toBeTruthy();
            expect(rootBlock.getData().type).toBe('root');
            expect(rootBlock.getData().serialNumber).toBe('50');
            expect(rootBlock.getPrevBlockId()).toBeNull();
        });
    });

    describe('所有权区块管理', () => {
        it('应该能够创建所有权区块', async () => {
            const blockchain = new BlockChain(testDefinition, '50');
            
            // 等待根区块创建完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const ownerBlock = await blockchain.createOwnerBlock(keyPair1.publicKey, keyPair1.privateKey);
            
            expect(ownerBlock).toBeTruthy();
            expect(ownerBlock.getData().type).toBe('ownership');
            expect(ownerBlock.getData().ownerId).toBe(keyPair1.publicKey);
            expect(blockchain.getCurrentOwner()).toBe(keyPair1.publicKey);
            expect(blockchain.getOwnerBlock()).toBe(ownerBlock);
        });

        it('所有权区块应该正确链接到根区块', async () => {
            const blockchain = new BlockChain(testDefinition, '50');
            
            // 等待根区块创建完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const rootBlock = blockchain.getRootBlock();
            const ownerBlock = await blockchain.createOwnerBlock(keyPair1.publicKey, keyPair1.privateKey);
            
            expect(ownerBlock.getPrevBlockId()).toBe(rootBlock.getId());
        });
    });

    describe('区块添加和查询', () => {
        it('应该能够添加有效区块', async () => {
            const blockchain = new BlockChain(testDefinition, '50');
            
            // 等待根区块创建完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            await blockchain.createOwnerBlock(keyPair1.publicKey, keyPair1.privateKey);
            
            // 创建转移区块
            const transferData = {
                type: 'transfer',
                blockchainId: blockchain.getId(),
                targetUserId: keyPair2.publicKey
            };
            
            const latestBlock = blockchain.getLatestBlock();
            const transferBlock = new Block(transferData, latestBlock.getId(), keyPair1.publicKey);
            await transferBlock.genId();
            await transferBlock.signBlock(keyPair1.privateKey);
            
            const success = blockchain.addBlock(transferBlock);
            expect(success).toBe(true);
            expect(blockchain.getCurrentOwner()).toBe(keyPair2.publicKey);
        });

        it('应该拒绝无效区块', async () => {
            const blockchain = new BlockChain(testDefinition, '50');
            
            // 等待根区块创建完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 创建无效区块（没有正确的前一个区块ID）
            const invalidBlock = new Block({ type: 'invalid' }, 'wrong-prev-id', keyPair1.publicKey);
            await invalidBlock.genId();
            await invalidBlock.signBlock(keyPair1.privateKey);
            
            const success = blockchain.addBlock(invalidBlock);
            expect(success).toBe(false);
        });

        it('应该能够查询区块', async () => {
            const blockchain = new BlockChain(testDefinition, '50');
            
            // 等待根区块创建完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const rootBlock = blockchain.getRootBlock();
            const ownerBlock = await blockchain.createOwnerBlock(keyPair1.publicKey, keyPair1.privateKey);
            
            expect(blockchain.getBlock(rootBlock.getId())).toBe(rootBlock);
            expect(blockchain.getBlock(ownerBlock.getId())).toBe(ownerBlock);
            expect(blockchain.getBlock('non-existent')).toBeNull();
        });

        it('应该正确返回最新区块', async () => {
            const blockchain = new BlockChain(testDefinition, '50');
            
            // 等待根区块创建完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const rootBlock = blockchain.getRootBlock();
            expect(blockchain.getLatestBlock()).toBe(rootBlock);
            
            const ownerBlock = await blockchain.createOwnerBlock(keyPair1.publicKey, keyPair1.privateKey);
            expect(blockchain.getLatestBlock()).toBe(ownerBlock);
        });
    });

    describe('区块链验证', () => {
        it('应该验证有效的区块链', async () => {
            const blockchain = new BlockChain(testDefinition, '50');
            
            // 等待根区块创建完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            await blockchain.createOwnerBlock(keyPair1.publicKey, keyPair1.privateKey);
            
            const isValid = await blockchain.validateChain();
            expect(isValid).toBe(true);
        });

        it('应该拒绝损坏的区块链', async () => {
            const blockchain = new BlockChain(testDefinition, '50');
            
            // 等待根区块创建完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            await blockchain.createOwnerBlock(keyPair1.publicKey, keyPair1.privateKey);
            
            // 破坏区块链
            const blocks = blockchain.getAllBlocks();
            if (blocks.length > 0) {
                blocks[0].id = 'corrupted-id';
            }
            
            const isValid = await blockchain.validateChain();
            expect(isValid).toBe(false);
        });
    });

    describe('分叉检测', () => {
        it('应该检测位置冲突分叉', async () => {
            const blockchain = new BlockChain(testDefinition, '50');
            
            // 等待根区块创建完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const ownerBlock = await blockchain.createOwnerBlock(keyPair1.publicKey, keyPair1.privateKey);
            
            // 创建两个不同的转移区块，但有相同的前一个区块ID
            const transferData1 = {
                type: 'transfer',
                blockchainId: blockchain.getId(),
                targetUserId: keyPair2.publicKey
            };
            
            const transferData2 = {
                type: 'transfer',
                blockchainId: blockchain.getId(),
                targetUserId: keyPair1.publicKey // 不同的目标
            };
            
            const block1 = new Block(transferData1, ownerBlock.getId(), keyPair1.publicKey);
            await block1.genId();
            await block1.signBlock(keyPair1.privateKey);
            
            const block2 = new Block(transferData2, ownerBlock.getId(), keyPair1.publicKey);
            await block2.genId();
            await block2.signBlock(keyPair1.privateKey);
            
            // 添加第一个区块
            blockchain.addBlock(block1);
            
            // 检测第二个区块的分叉
            const forkResult = blockchain.detectFork(block2);
            expect(forkResult.isFork).toBe(true);
            expect(forkResult.reason).toBe('POSITION_CONFLICT');
        });

        it('应该检测双花攻击', async () => {
            const blockchain = new BlockChain(testDefinition, '50');
            
            // 等待根区块创建完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            await blockchain.createOwnerBlock(keyPair1.publicKey, keyPair1.privateKey);
            
            // 创建两个转移区块，同一用户转移给不同目标（双花）
            const transferData1 = {
                type: 'transfer',
                blockchainId: blockchain.getId(),
                targetUserId: keyPair2.publicKey
            };
            
            const transferData2 = {
                type: 'transfer',
                blockchainId: blockchain.getId(),
                targetUserId: keyPair1.publicKey // 不同的目标，构成双花
            };
            
            const latestBlock = blockchain.getLatestBlock();
            
            const block1 = new Block(transferData1, latestBlock.getId(), keyPair1.publicKey);
            await block1.genId();
            await block1.signBlock(keyPair1.privateKey);
            
            const block2 = new Block(transferData2, 'different-prev-id', keyPair1.publicKey);
            await block2.genId();
            await block2.signBlock(keyPair1.privateKey);
            
            // 添加第一个区块
            blockchain.addBlock(block1);
            
            // 检测第二个区块的双花攻击
            const forkResult = blockchain.detectFork(block2);
            expect(forkResult.isFork).toBe(true);
            expect(forkResult.reason).toBe('DOUBLE_SPEND');
        });

        it('应该允许正常的区块添加', async () => {
            const blockchain = new BlockChain(testDefinition, '50');
            
            // 等待根区块创建完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            await blockchain.createOwnerBlock(keyPair1.publicKey, keyPair1.privateKey);
            
            const transferData = {
                type: 'transfer',
                blockchainId: blockchain.getId(),
                targetUserId: keyPair2.publicKey
            };
            
            const latestBlock = blockchain.getLatestBlock();
            const transferBlock = new Block(transferData, latestBlock.getId(), keyPair1.publicKey);
            await transferBlock.genId();
            await transferBlock.signBlock(keyPair1.privateKey);
            
            const forkResult = blockchain.detectFork(transferBlock);
            expect(forkResult.isFork).toBe(false);
        });
    });

    describe('序列化和反序列化', () => {
        it('应该能够序列化区块链', async () => {
            const blockchain = new BlockChain(testDefinition, '50');
            
            // 等待根区块创建完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            await blockchain.createOwnerBlock(keyPair1.publicKey, keyPair1.privateKey);
            
            const serialized = blockchain.serialize();
            expect(serialized).toBeTypeOf('string');
            
            const parsed = JSON.parse(serialized);
            expect(parsed.id).toBe(blockchain.getId());
            expect(parsed.definition).toEqual(testDefinition);
            expect(parsed.serialNumber).toBe('50');
            expect(parsed.currentOwner).toBe(keyPair1.publicKey);
        });

        it('应该能够反序列化区块链', async () => {
            const originalBlockchain = new BlockChain(testDefinition, '50');
            
            // 等待根区块创建完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            await originalBlockchain.createOwnerBlock(keyPair1.publicKey, keyPair1.privateKey);
            
            const serialized = originalBlockchain.serialize();
            const deserializedBlockchain = BlockChain.deserialize(serialized);
            
            expect(deserializedBlockchain.getId()).toBe(originalBlockchain.getId());
            expect(deserializedBlockchain.getDefinition()).toEqual(originalBlockchain.getDefinition());
            expect(deserializedBlockchain.getSerialNumber()).toBe(originalBlockchain.getSerialNumber());
            expect(deserializedBlockchain.getCurrentOwner()).toBe(originalBlockchain.getCurrentOwner());
            expect(deserializedBlockchain.getValue()).toBe(originalBlockchain.getValue());
            expect(deserializedBlockchain.getBlockCount()).toBe(originalBlockchain.getBlockCount());
        });
    });

    describe('辅助方法', () => {
        it('应该正确返回区块数量', async () => {
            const blockchain = new BlockChain(testDefinition, '50');
            
            // 等待根区块创建完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            expect(blockchain.getBlockCount()).toBe(1); // 只有根区块
            
            await blockchain.createOwnerBlock(keyPair1.publicKey, keyPair1.privateKey);
            expect(blockchain.getBlockCount()).toBe(2); // 根区块 + 所有权区块
        });

        it('应该正确检查区块存在性', async () => {
            const blockchain = new BlockChain(testDefinition, '50');
            
            // 等待根区块创建完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const rootBlock = blockchain.getRootBlock();
            expect(blockchain.hasBlock(rootBlock.getId())).toBe(true);
            expect(blockchain.hasBlock('non-existent')).toBe(false);
        });

        it('应该返回正确的历史记录', async () => {
            const blockchain = new BlockChain(testDefinition, '50');
            
            // 等待根区块创建完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            await blockchain.createOwnerBlock(keyPair1.publicKey, keyPair1.privateKey);
            
            const history = blockchain.getHistory();
            expect(history).toHaveLength(2);
            expect(history[0].type).toBe('root');
            expect(history[1].type).toBe('ownership');
        });

        it('应该返回所有区块', async () => {
            const blockchain = new BlockChain(testDefinition, '50');
            
            // 等待根区块创建完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            await blockchain.createOwnerBlock(keyPair1.publicKey, keyPair1.privateKey);
            
            const allBlocks = blockchain.getAllBlocks();
            expect(allBlocks).toHaveLength(2);
            expect(allBlocks[0].getData().type).toBe('root');
            expect(allBlocks[1].getData().type).toBe('ownership');
        });
    });
});