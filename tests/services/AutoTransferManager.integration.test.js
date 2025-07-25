/**
 * AutoTransferManager 集成测试
 * 
 * 测试自动转账和网络活动模拟的完整功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AutoTransferManager } from '../../src/services/AutoTransferManager.js';
import { User } from '../../src/models/User.js';
import { BlockChain } from '../../src/models/BlockChain.js';
import { NetManager } from '../../src/services/NetManager.js';
import { Logger } from '../../src/services/Logger.js';

describe('AutoTransferManager Integration', () => {
    let transferManager;
    let users;
    let blockchains;
    let netManager;
    let logger;
    let mockUser1, mockUser2, mockUser3;
    let mockBlockchain1, mockBlockchain2;

    beforeEach(async () => {
        // 创建模拟用户
        mockUser1 = new User('user1');
        mockUser2 = new User('user2');
        mockUser3 = new User('user3');

        // 初始化用户密钥对
        await mockUser1.genKeyPair();
        await mockUser2.genKeyPair();
        await mockUser3.genKeyPair();

        // 创建用户映射
        users = new Map([
            ['user1', mockUser1],
            ['user2', mockUser2],
            ['user3', mockUser3]
        ]);

        // 创建模拟区块链
        const chainDef1 = { ranges: [{ start: 1, end: 10, value: 100 }] };
        const chainDef2 = { ranges: [{ start: 11, end: 20, value: 200 }] };
        
        mockBlockchain1 = new BlockChain(chainDef1, '1');
        mockBlockchain2 = new BlockChain(chainDef2, '11');

        // 等待区块链初始化完成
        await new Promise(resolve => setTimeout(resolve, 50));

        // 确保根区块已创建
        while (!mockBlockchain1.rootBlock || !mockBlockchain2.rootBlock) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        // 创建所有权区块
        await mockBlockchain1.createOwnerBlock(mockUser1.getPubKey(), mockUser1.privateKey);
        await mockBlockchain2.createOwnerBlock(mockUser2.getPubKey(), mockUser2.privateKey);

        // 更新用户拥有的区块链
        mockUser1.addOwnedChain(mockBlockchain1.getId());
        mockUser2.addOwnedChain(mockBlockchain2.getId());

        // 创建区块链映射
        blockchains = new Map([
            [mockBlockchain1.getId(), mockBlockchain1],
            [mockBlockchain2.getId(), mockBlockchain2]
        ]);

        // 创建网络管理器
        netManager = new NetManager({
            nodeCount: 3,
            connectionCount: 2,
            failureRate: 0.1
        });
        await netManager.initNetwork();

        // 创建日志系统
        logger = new Logger();

        // 创建自动转账管理器
        transferManager = new AutoTransferManager({
            users,
            blockchains,
            netManager,
            logger,
            paymentRate: 0.8 // 高转账率便于测试
        });
    });

    describe('初始化和配置', () => {
        it('应该正确初始化自动转账管理器', () => {
            expect(transferManager.users.size).toBe(3);
            expect(transferManager.blockchains.size).toBe(2);
            expect(transferManager.netManager).toBe(netManager);
            expect(transferManager.logger).toBe(logger);
            expect(transferManager.isActive).toBe(false);
        });

        it('应该正确设置引用', () => {
            const newUsers = new Map();
            const newBlockchains = new Map();
            const newNetManager = {};
            const newLogger = {};

            transferManager.setReferences(newUsers, newBlockchains, newNetManager, newLogger);

            expect(transferManager.users).toBe(newUsers);
            expect(transferManager.blockchains).toBe(newBlockchains);
            expect(transferManager.netManager).toBe(newNetManager);
            expect(transferManager.logger).toBe(newLogger);
        });
    });

    describe('启动和停止', () => {
        it('应该正确启动和停止', () => {
            expect(transferManager.isActive).toBe(false);

            transferManager.start();
            expect(transferManager.isActive).toBe(true);
            expect(transferManager.paymentController.isActive).toBe(true);

            transferManager.stop();
            expect(transferManager.isActive).toBe(false);
            expect(transferManager.paymentController.isActive).toBe(false);
        });
    });

    describe('转账决策逻辑', () => {
        beforeEach(() => {
            transferManager.start();
        });

        it('应该正确执行转账决策', () => {
            const decision = {
                userId: 'user1',
                blockchainId: mockBlockchain1.getId(),
                targetUserId: mockUser2.getPubKey()
            };

            const result = transferManager.makeTransferDecision(
                mockUser1, 
                mockBlockchain1, 
                decision
            );

            expect(result.proceed).toBe(true);
            expect(result.reason).toBeNull();
        });

        it('应该拒绝用户不拥有的区块链转账', () => {
            const decision = {
                userId: 'user1',
                blockchainId: mockBlockchain2.getId(), // user1不拥有blockchain2
                targetUserId: mockUser2.getPubKey()
            };

            const result = transferManager.makeTransferDecision(
                mockUser1, 
                mockBlockchain2, 
                decision
            );

            expect(result.proceed).toBe(false);
            expect(result.reason).toBe('用户不拥有该区块链');
        });

        it('应该根据价值范围过滤转账', () => {
            transferManager.setDecisionConfig({
                minTransferValue: 150,
                maxTransferValue: 300
            });

            const decision1 = {
                userId: 'user1',
                blockchainId: mockBlockchain1.getId(), // 价值100，低于最小值
                targetUserId: mockUser2.getPubKey()
            };

            const result1 = transferManager.makeTransferDecision(
                mockUser1, 
                mockBlockchain1, 
                decision1
            );

            expect(result1.proceed).toBe(false);
            expect(result1.reason).toBe('区块链价值超出转账范围');
        });

        it('应该根据概率决策转账', () => {
            transferManager.setDecisionConfig({
                transferProbability: 0.0 // 0%概率
            });

            const decision = {
                userId: 'user1',
                blockchainId: mockBlockchain1.getId(),
                targetUserId: mockUser2.getPubKey()
            };

            const result = transferManager.makeTransferDecision(
                mockUser1, 
                mockBlockchain1, 
                decision
            );

            expect(result.proceed).toBe(false);
            expect(result.reason).toBe('概率决策拒绝转账');
        });
    });

    describe('转移区块创建', () => {
        beforeEach(() => {
            transferManager.start();
        });

        it('应该成功创建转移区块', async () => {
            const decision = {
                userId: 'user1',
                blockchainId: mockBlockchain1.getId(),
                targetUserId: mockUser2.getPubKey()
            };

            const transferBlock = await transferManager.createTransferBlock(
                mockUser1, 
                mockBlockchain1, 
                decision
            );

            expect(transferBlock).toBeDefined();
            expect(transferBlock.getData().type).toBe('transfer');
            expect(transferBlock.getData().blockchainId).toBe(mockBlockchain1.getId());
            expect(transferBlock.getData().targetUserId).toBe(mockUser2.getPubKey());
            expect(transferBlock.getCreator()).toBe(mockUser1.getPubKey());
            expect(transferBlock.getSignature()).toBeDefined();
        });

        it('应该在区块链没有最新区块时抛出错误', async () => {
            // 创建一个空的区块链
            const emptyBlockchain = new BlockChain({ ranges: [] }, '999');
            emptyBlockchain.blockOrder = []; // 清空区块
            emptyBlockchain.blocks.clear();

            const decision = {
                userId: 'user1',
                blockchainId: emptyBlockchain.getId(),
                targetUserId: mockUser2.getPubKey()
            };

            await expect(transferManager.createTransferBlock(
                mockUser1, 
                emptyBlockchain, 
                decision
            )).rejects.toThrow('区块链没有最新区块');
        });
    });

    describe('区块广播', () => {
        let transferBlock;

        beforeEach(async () => {
            transferManager.start();
            
            const decision = {
                userId: 'user1',
                blockchainId: mockBlockchain1.getId(),
                targetUserId: mockUser2.getPubKey()
            };

            transferBlock = await transferManager.createTransferBlock(
                mockUser1, 
                mockBlockchain1, 
                decision
            );
        });

        it('应该成功广播转移区块', async () => {
            const broadcastResult = await transferManager.broadcastTransferBlock(
                transferBlock, 
                mockUser1
            );

            expect(broadcastResult).toBeDefined();
            expect(broadcastResult.originNodeId).toBeDefined();
            expect(broadcastResult.totalNodes).toBe(3);
            expect(broadcastResult.reachedNodes).toBeGreaterThan(0);
        });

        it('应该在没有网络管理器时抛出错误', async () => {
            transferManager.netManager = null;

            await expect(transferManager.broadcastTransferBlock(
                transferBlock, 
                mockUser1
            )).rejects.toThrow('网络管理器未设置');
        });

        it('应该在没有可用节点时抛出错误', async () => {
            // 清空网络节点
            transferManager.netManager.nodes.clear();

            await expect(transferManager.broadcastTransferBlock(
                transferBlock, 
                mockUser1
            )).rejects.toThrow('没有可用的网络节点');
        });
    });

    describe('所有权更新', () => {
        let transferBlock;

        beforeEach(async () => {
            transferManager.start();
            
            const decision = {
                userId: 'user1',
                blockchainId: mockBlockchain1.getId(),
                targetUserId: mockUser2.getPubKey()
            };

            transferBlock = await transferManager.createTransferBlock(
                mockUser1, 
                mockBlockchain1, 
                decision
            );
        });

        it('应该正确更新区块链所有权', () => {
            const originalOwner = mockBlockchain1.getCurrentOwner();
            const newOwner = mockUser2.getPubKey();

            expect(mockUser1.ownsChain(mockBlockchain1.getId())).toBe(true);
            expect(mockUser2.ownsChain(mockBlockchain1.getId())).toBe(false);

            transferManager.updateBlockchainOwnership(
                mockBlockchain1, 
                newOwner, 
                transferBlock
            );

            expect(mockBlockchain1.getCurrentOwner()).toBe(newOwner);
            expect(mockUser1.ownsChain(mockBlockchain1.getId())).toBe(false);
            expect(mockUser2.ownsChain(mockBlockchain1.getId())).toBe(true);
        });
    });

    describe('完整转账执行', () => {
        beforeEach(() => {
            transferManager.start();
        });

        it('应该成功执行完整的转账流程', async () => {
            const decision = {
                userId: 'user1',
                userPublicKey: mockUser1.getPubKey(),
                blockchainId: mockBlockchain1.getId(),
                targetUserId: mockUser2.getPubKey(),
                success: true,
                tick: 1
            };

            const result = await transferManager.executeTransfer(decision, 1);

            expect(result.executionSuccess).toBe(true);
            expect(result.transferBlock).toBeDefined();
            expect(result.broadcastResult).toBeDefined();
            expect(result.executionError).toBeNull();

            // 验证所有权已更新
            expect(mockBlockchain1.getCurrentOwner()).toBe(mockUser2.getPubKey());
            expect(mockUser1.ownsChain(mockBlockchain1.getId())).toBe(false);
            expect(mockUser2.ownsChain(mockBlockchain1.getId())).toBe(true);
        });

        it('应该处理转账执行中的错误', async () => {
            const decision = {
                userId: 'user1',
                userPublicKey: mockUser1.getPubKey(),
                blockchainId: 'non-existent-chain',
                targetUserId: mockUser2.getPubKey(),
                success: true,
                tick: 1
            };

            const result = await transferManager.executeTransfer(decision, 1);

            expect(result.executionSuccess).toBe(false);
            expect(result.executionError).toBe('用户或区块链不存在');
        });
    });

    describe('滴答处理', () => {
        beforeEach(() => {
            transferManager.start();
        });

        it('应该在未激活时返回空结果', async () => {
            transferManager.stop();
            const results = await transferManager.processTick(1);
            expect(results).toEqual([]);
        });

        it('应该处理滴答并执行转账', async () => {
            const results = await transferManager.processTick(1);
            
            // 由于高转账率(0.8)，应该有转账发生
            expect(Array.isArray(results)).toBe(true);
            
            // 检查统计信息是否更新
            const stats = transferManager.getNetworkStats();
            expect(stats.currentTick).toBe(1);
        });
    });

    describe('统计和监控', () => {
        beforeEach(() => {
            transferManager.start();
        });

        it('应该正确更新网络统计', async () => {
            const initialStats = transferManager.getNetworkStats();
            
            await transferManager.processTick(1);
            
            const updatedStats = transferManager.getNetworkStats();
            expect(updatedStats.currentTick).toBe(1);
        });

        it('应该提供活动摘要', async () => {
            await transferManager.processTick(1);
            
            const summary = transferManager.getActivitySummary();
            expect(summary).toHaveProperty('totalRecentTransfers');
            expect(summary).toHaveProperty('successfulTransfers');
            expect(summary).toHaveProperty('failedTransfers');
            expect(summary).toHaveProperty('successRate');
            expect(summary).toHaveProperty('networkLoad');
            expect(summary).toHaveProperty('currentTick');
        });

        it('应该跟踪最近的活动', async () => {
            await transferManager.processTick(1);
            
            const recentActivity = transferManager.getRecentActivity(10);
            expect(Array.isArray(recentActivity)).toBe(true);
        });

        it('应该重置统计信息', async () => {
            await transferManager.processTick(1);
            
            transferManager.resetStats();
            
            const stats = transferManager.getNetworkStats();
            expect(stats.totalTransfers).toBe(0);
            expect(stats.successfulTransfers).toBe(0);
            expect(stats.failedTransfers).toBe(0);
        });
    });

    describe('支付速率管理', () => {
        it('应该正确设置和获取支付速率', () => {
            transferManager.setPaymentRate(0.3);
            expect(transferManager.getPaymentRate()).toBe(0.3);
        });
    });

    describe('决策配置', () => {
        it('应该正确设置决策配置', () => {
            const newConfig = {
                minTransferValue: 50,
                maxTransferValue: 500,
                transferProbability: 0.8
            };

            transferManager.setDecisionConfig(newConfig);

            const stats = transferManager.getNetworkStats();
            expect(stats.decisionConfig.minTransferValue).toBe(50);
            expect(stats.decisionConfig.maxTransferValue).toBe(500);
            expect(stats.decisionConfig.transferProbability).toBe(0.8);
        });
    });

    describe('历史记录', () => {
        beforeEach(() => {
            transferManager.start();
        });

        it('应该获取转账历史', async () => {
            await transferManager.processTick(1);
            
            const history = transferManager.getTransferHistory(10);
            expect(Array.isArray(history)).toBe(true);
        });

        it('应该获取用户特定的转账历史', async () => {
            await transferManager.processTick(1);
            
            const userHistory = transferManager.getUserTransferHistory('user1', 10);
            expect(Array.isArray(userHistory)).toBe(true);
        });
    });
});