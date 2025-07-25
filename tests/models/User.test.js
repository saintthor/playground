/**
 * User 模型单元测试
 * 
 * 测试虚拟用户的身份管理、区块链操作和资产管理功能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { User } from '../../src/models/User.js';
import { BlockChain } from '../../src/models/BlockChain.js';

describe('User', () => {
    let user;
    let mockBlockchain1, mockBlockchain2;

    beforeEach(async () => {
        user = new User('test-user');
        
        // 创建模拟区块链
        const chainDef1 = { ranges: [{ start: 1, end: 10, value: 100 }] };
        const chainDef2 = { ranges: [{ start: 11, end: 20, value: 200 }] };
        
        mockBlockchain1 = new BlockChain(chainDef1, '1');
        mockBlockchain2 = new BlockChain(chainDef2, '11');

        // 等待区块链初始化完成
        await new Promise(resolve => setTimeout(resolve, 10));
    });

    describe('构造函数和初始化', () => {
        it('应该正确创建用户实例', () => {
            expect(user.id).toBe('test-user');
            expect(user.publicKey).toBeNull();
            expect(user.privateKey).toBeNull();
            expect(user.isInitialized).toBe(false);
            expect(user.ownedChains.size).toBe(0);
        });

        it('应该正确生成密钥对', async () => {
            await user.genKeyPair();
            
            expect(user.publicKey).toBeDefined();
            expect(user.privateKey).toBeDefined();
            expect(user.isInitialized).toBe(true);
        });

        it('应该在未初始化时抛出错误', () => {
            expect(() => user.getPubKey()).toThrow('用户 test-user 尚未初始化密钥对');
        });
    });

    describe('密钥管理', () => {
        beforeEach(async () => {
            await user.genKeyPair();
        });

        it('应该返回正确的公钥', () => {
            const publicKey = user.getPubKey();
            expect(publicKey).toBe(user.publicKey);
            expect(typeof publicKey).toBe('string');
        });

        it('应该能够签名数据', async () => {
            const testData = 'test-data';
            const signature = await user.signData(testData);
            
            expect(signature).toBeDefined();
            expect(typeof signature).toBe('string');
        });

        it('应该在未初始化时无法签名', async () => {
            const uninitializedUser = new User('uninitialized');
            
            await expect(uninitializedUser.signData('test')).rejects.toThrow(
                '用户 uninitialized 尚未初始化密钥对'
            );
        });
    });

    describe('区块链管理', () => {
        beforeEach(async () => {
            await user.genKeyPair();
        });

        it('应该能够添加拥有的区块链', () => {
            const chainId = mockBlockchain1.getId();
            user.addOwnedChain(chainId);
            
            expect(user.ownedChains.has(chainId)).toBe(true);
            expect(user.getOwnedChains()).toContain(chainId);
        });

        it('应该能够移除拥有的区块链', () => {
            const chainId = mockBlockchain1.getId();
            user.addOwnedChain(chainId);
            user.removeOwnedChain(chainId);
            
            expect(user.ownedChains.has(chainId)).toBe(false);
            expect(user.getOwnedChains()).not.toContain(chainId);
        });

        it('应该正确检查区块链所有权', () => {
            const chainId = mockBlockchain1.getId();
            
            expect(user.ownsChain(chainId)).toBe(false);
            
            user.addOwnedChain(chainId);
            expect(user.ownsChain(chainId)).toBe(true);
        });

        it('应该返回拥有的区块链列表', () => {
            const chainId1 = mockBlockchain1.getId();
            const chainId2 = mockBlockchain2.getId();
            
            user.addOwnedChain(chainId1);
            user.addOwnedChain(chainId2);
            
            const ownedChains = user.getOwnedChains();
            expect(ownedChains).toHaveLength(2);
            expect(ownedChains).toContain(chainId1);
            expect(ownedChains).toContain(chainId2);
        });
    });

    describe('资产计算', () => {
        beforeEach(async () => {
            await user.genKeyPair();
        });

        it('应该正确计算总资产价值', () => {
            const chainId1 = mockBlockchain1.getId();
            const chainId2 = mockBlockchain2.getId();
            
            user.addOwnedChain(chainId1);
            user.addOwnedChain(chainId2);
            
            const blockchains = new Map([
                [chainId1, mockBlockchain1],
                [chainId2, mockBlockchain2]
            ]);
            
            const totalAsset = user.getTotalAsset(blockchains);
            expect(totalAsset).toBe(300); // 100 + 200
        });

        it('应该处理不存在的区块链', () => {
            user.addOwnedChain('non-existent-chain');
            
            const blockchains = new Map();
            const totalAsset = user.getTotalAsset(blockchains);
            
            expect(totalAsset).toBe(0);
        });

        it('应该在没有区块链时返回0', () => {
            const blockchains = new Map();
            const totalAsset = user.getTotalAsset(blockchains);
            
            expect(totalAsset).toBe(0);
        });
    });

    describe('转移区块创建', () => {
        let targetUser;

        beforeEach(async () => {
            await user.genKeyPair();
            
            targetUser = new User('target-user');
            await targetUser.genKeyPair();
        });

        it('应该能够创建转移区块', async () => {
            const blockchainId = mockBlockchain1.getId();
            const prevBlockId = 'prev-block-id';
            
            const transferBlock = await user.createTransferBlock(
                blockchainId,
                targetUser.getPubKey(),
                prevBlockId
            );
            
            expect(transferBlock).toBeDefined();
            expect(transferBlock.getData().type).toBe('transfer');
            expect(transferBlock.getData().blockchainId).toBe(blockchainId);
            expect(transferBlock.getData().targetUserId).toBe(targetUser.getPubKey());
            expect(transferBlock.getPrevBlockId()).toBe(prevBlockId);
            expect(transferBlock.getCreator()).toBe(user.getPubKey());
            expect(transferBlock.getSignature()).toBeDefined();
        });

        it('应该在未初始化时无法创建转移区块', async () => {
            const uninitializedUser = new User('uninitialized');
            
            await expect(uninitializedUser.createTransferBlock(
                'chain-id',
                'target-user',
                'prev-block'
            )).rejects.toThrow('用户 uninitialized 尚未初始化');
        });
    });

    describe('状态信息', () => {
        beforeEach(async () => {
            await user.genKeyPair();
        });

        it('应该返回正确的状态信息', () => {
            const chainId = mockBlockchain1.getId();
            user.addOwnedChain(chainId);
            
            const status = user.getStatus();
            
            expect(status.id).toBe('test-user');
            expect(status.publicKey).toBe(user.publicKey);
            expect(status.ownedChainsCount).toBe(1);
            expect(status.ownedChains).toContain(chainId);
            expect(status.isInitialized).toBe(true);
        });
    });

    describe('序列化和反序列化', () => {
        beforeEach(async () => {
            await user.genKeyPair();
        });

        it('应该能够序列化用户数据', () => {
            const chainId = mockBlockchain1.getId();
            user.addOwnedChain(chainId);
            
            const serialized = user.serialize();
            expect(typeof serialized).toBe('string');
            
            const parsed = JSON.parse(serialized);
            expect(parsed.id).toBe('test-user');
            expect(parsed.publicKey).toBe(user.publicKey);
            expect(parsed.privateKey).toBe(user.privateKey);
            expect(parsed.ownedChains).toContain(chainId);
            expect(parsed.isInitialized).toBe(true);
        });

        it('应该能够反序列化用户数据', () => {
            const chainId = mockBlockchain1.getId();
            user.addOwnedChain(chainId);
            
            const serialized = user.serialize();
            const deserialized = User.deserialize(serialized);
            
            expect(deserialized.id).toBe(user.id);
            expect(deserialized.publicKey).toBe(user.publicKey);
            expect(deserialized.privateKey).toBe(user.privateKey);
            expect(deserialized.isInitialized).toBe(user.isInitialized);
            expect(deserialized.ownedChains.has(chainId)).toBe(true);
        });
    });
});