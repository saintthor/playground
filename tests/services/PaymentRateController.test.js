/**
 * PaymentRateController 单元测试
 * 
 * 测试支付速率控制系统的各项功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('PaymentRateController', () => {
    let controller;
    let users;
    let blockchains;
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
        await mockBlockchain1.waitForInit();
        await mockBlockchain2.waitForInit();

        // 设置区块链所有者
        mockBlockchain1.currentOwner = mockUser1.getPubKey();
        mockBlockchain2.currentOwner = mockUser2.getPubKey();

        // 更新用户拥有的区块链
        mockUser1.addOwnedChain(mockBlockchain1.getId());
        mockUser2.addOwnedChain(mockBlockchain2.getId());

        // 创建区块链映射
        blockchains = new Map([
            [mockBlockchain1.getId(), mockBlockchain1],
            [mockBlockchain2.getId(), mockBlockchain2]
        ]);

        // 创建控制器
        controller = new PaymentRateController({
            paymentRate: 0.5,
            users,
            blockchains
        });
    });

    describe('构造函数和基本配置', () => {
        it('应该正确初始化默认配置', () => {
            const defaultController = new PaymentRateController();
            
            expect(defaultController.getPaymentRate()).toBe(0.1);
            expect(defaultController.isActive).toBe(false);
            expect(defaultController.stats.totalTransferAttempts).toBe(0);
        });

        it('应该正确设置自定义配置', () => {
            expect(controller.getPaymentRate()).toBe(0.5);
            expect(controller.users.size).toBe(3);
            expect(controller.blockchains.size).toBe(2);
        });

        it('应该验证配置参数', () => {
            expect(PaymentRateController.validateConfig({ paymentRate: 0.5 })).toBe(true);
            expect(PaymentRateController.validateConfig({ paymentRate: -0.1 })).toBe(false);
            expect(PaymentRateController.validateConfig({ paymentRate: 1.5 })).toBe(false);
            expect(PaymentRateController.validateConfig(null)).toBe(false);
        });
    });

    describe('支付速率管理', () => {
        it('应该正确设置支付速率', () => {
            controller.setPaymentRate(0.3);
            expect(controller.getPaymentRate()).toBe(0.3);
        });

        it('应该限制支付速率在有效范围内', () => {
            controller.setPaymentRate(-0.1);
            expect(controller.getPaymentRate()).toBe(0);

            controller.setPaymentRate(1.5);
            expect(controller.getPaymentRate()).toBe(1);
        });
    });

    describe('用户资格检查', () => {
        it('应该正确识别有资格的用户', () => {
            const eligibleUsers = controller.getEligibleUsers();
            
            expect(eligibleUsers).toHaveLength(2); // user1 和 user2 有区块链
            expect(eligibleUsers.map(u => u.id)).toContain('user1');
            expect(eligibleUsers.map(u => u.id)).toContain('user2');
            expect(eligibleUsers.map(u => u.id)).not.toContain('user3'); // user3 没有区块链
        });

        it('应该排除未初始化的用户', () => {
            const uninitializedUser = new User('user4');
            users.set('user4', uninitializedUser);
            
            const eligibleUsers = controller.getEligibleUsers();
            expect(eligibleUsers.map(u => u.id)).not.toContain('user4');
        });
    });

    describe('转账数量计算', () => {
        it('应该根据支付速率计算转账数量', () => {
            controller.setPaymentRate(0.5);
            
            // 测试多次以验证概率分布
            const results = [];
            for (let i = 0; i < 100; i++) {
                const count = controller.calculateTransferCount(4);
                results.push(count);
            }
            
            const average = results.reduce((a, b) => a + b, 0) / results.length;
            expect(average).toBeCloseTo(2, 0.5); // 4 * 0.5 = 2
        });

        it('应该处理边界情况', () => {
            expect(controller.calculateTransferCount(0)).toBe(0);
            
            controller.setPaymentRate(0);
            expect(controller.calculateTransferCount(10)).toBe(0);
            
            controller.setPaymentRate(1);
            expect(controller.calculateTransferCount(3)).toBe(3);
        });
    });

    describe('用户选择', () => {
        it('应该随机选择指定数量的用户', () => {
            const eligibleUsers = controller.getEligibleUsers();
            const selected = controller.selectRandomUsers(eligibleUsers, 1);
            
            expect(selected).toHaveLength(1);
            expect(eligibleUsers).toContain(selected[0]);
        });

        it('应该处理选择数量大于可用用户数量的情况', () => {
            const eligibleUsers = controller.getEligibleUsers();
            const selected = controller.selectRandomUsers(eligibleUsers, 10);
            
            expect(selected).toHaveLength(eligibleUsers.length);
        });

        it('应该选择不同的用户（随机性测试）', () => {
            const eligibleUsers = controller.getEligibleUsers();
            const selections = [];
            
            for (let i = 0; i < 20; i++) {
                const selected = controller.selectRandomUsers(eligibleUsers, 1);
                selections.push(selected[0].id);
            }
            
            // 应该有一定的随机性，不是总是选择同一个用户
            const uniqueSelections = new Set(selections);
            expect(uniqueSelections.size).toBeGreaterThan(1);
        });
    });

    describe('区块链选择', () => {
        it('应该为用户随机选择区块链', () => {
            const blockchainId = controller.selectRandomBlockchain(mockUser1);
            expect(blockchainId).toBe(mockBlockchain1.getId());
        });

        it('应该处理用户没有区块链的情况', () => {
            const blockchainId = controller.selectRandomBlockchain(mockUser3);
            expect(blockchainId).toBeNull();
        });
    });

    describe('目标用户选择', () => {
        it('应该选择不同于源用户的目标用户', () => {
            const targetUser = controller.selectRandomTargetUser(mockUser1);
            
            expect(targetUser).not.toBeNull();
            expect(targetUser.id).not.toBe('user1');
            expect(['user2', 'user3']).toContain(targetUser.id);
        });

        it('应该只选择已初始化的用户', () => {
            const uninitializedUser = new User('user4');
            users.set('user4', uninitializedUser);
            
            const targetUser = controller.selectRandomTargetUser(mockUser1);
            expect(targetUser.id).not.toBe('user4');
        });
    });

    describe('转账尝试', () => {
        beforeEach(() => {
            controller.start();
        });

        it('应该成功执行转账尝试', () => {
            const result = controller.attemptTransfer(mockUser1, 1);
            
            expect(result.success).toBe(true);
            expect(result.userId).toBe('user1');
            expect(result.blockchainId).toBe(mockBlockchain1.getId());
            expect(result.targetUserId).toBeDefined();
            expect(result.error).toBeNull();
        });

        it('应该处理用户没有区块链的情况', () => {
            const result = controller.attemptTransfer(mockUser3, 1);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('用户没有可转移的区块链');
        });

        it('应该更新统计信息', () => {
            const initialAttempts = controller.stats.totalTransferAttempts;
            const initialSuccessful = controller.stats.successfulTransfers;
            
            controller.attemptTransfer(mockUser1, 1);
            
            expect(controller.stats.totalTransferAttempts).toBe(initialAttempts + 1);
            expect(controller.stats.successfulTransfers).toBe(initialSuccessful + 1);
        });
    });

    describe('滴答处理', () => {
        beforeEach(() => {
            controller.start();
        });

        it('应该在未激活时返回空结果', () => {
            controller.stop();
            const results = controller.processTick(1);
            expect(results).toEqual([]);
        });

        it('应该根据支付速率处理转账', () => {
            controller.setPaymentRate(1.0); // 100% 转账率
            const results = controller.processTick(1);
            
            expect(results.length).toBeGreaterThan(0);
            expect(controller.stats.transfersThisTick).toBeGreaterThan(0);
        });

        it('应该在没有合格用户时返回空结果', () => {
            // 清空所有用户的区块链
            mockUser1.ownedChains.clear();
            mockUser2.ownedChains.clear();
            
            const results = controller.processTick(1);
            expect(results).toEqual([]);
        });
    });

    describe('统计和历史记录', () => {
        beforeEach(() => {
            controller.start();
        });

        it('应该正确计算统计信息', () => {
            controller.attemptTransfer(mockUser1, 1);
            controller.attemptTransfer(mockUser3, 1); // 这个会失败
            
            const stats = controller.getStats();
            expect(stats.totalTransferAttempts).toBe(2);
            expect(stats.successfulTransfers).toBe(1);
            expect(stats.failedTransfers).toBe(1);
            expect(stats.successRate).toBe(50);
        });

        it('应该记录转账历史', () => {
            controller.attemptTransfer(mockUser1, 1);
            
            const history = controller.getTransferHistory();
            expect(history).toHaveLength(1);
            expect(history[0].userId).toBe('user1');
        });

        it('应该限制历史记录大小', () => {
            controller.maxHistorySize = 2;
            
            controller.attemptTransfer(mockUser1, 1);
            controller.attemptTransfer(mockUser1, 2);
            controller.attemptTransfer(mockUser1, 3);
            
            const history = controller.getTransferHistory();
            expect(history).toHaveLength(2);
        });

        it('应该获取用户特定的转账历史', () => {
            controller.attemptTransfer(mockUser1, 1);
            controller.attemptTransfer(mockUser2, 2);
            
            const user1History = controller.getUserTransferHistory('user1');
            expect(user1History).toHaveLength(1);
            expect(user1History[0].userId).toBe('user1');
        });

        it('应该重置统计信息', () => {
            controller.attemptTransfer(mockUser1, 1);
            controller.resetStats();
            
            const stats = controller.getStats();
            expect(stats.totalTransferAttempts).toBe(0);
            expect(stats.successfulTransfers).toBe(0);
            expect(controller.getTransferHistory()).toHaveLength(0);
        });
    });

    describe('活跃转账信息', () => {
        it('应该提供活跃转账信息', () => {
            const info = controller.getActiveTransferInfo();
            
            expect(info.eligibleUsersCount).toBe(2);
            expect(info.paymentRate).toBe(0.5);
            expect(info.expectedTransfersPerTick).toBe('1.00');
            expect(info.isActive).toBe(false);
        });
    });

    describe('启动和停止', () => {
        it('应该正确启动和停止', () => {
            expect(controller.isActive).toBe(false);
            
            controller.start();
            expect(controller.isActive).toBe(true);
            
            controller.stop();
            expect(controller.isActive).toBe(false);
        });
    });

    describe('引用设置', () => {
        it('应该正确设置用户和区块链引用', () => {
            const newUsers = new Map();
            const newBlockchains = new Map();
            
            controller.setReferences(newUsers, newBlockchains);
            
            expect(controller.users).toBe(newUsers);
            expect(controller.blockchains).toBe(newBlockchains);
        });
    });
});