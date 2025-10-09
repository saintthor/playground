/**
 * 核心系统集成测试
 * 测试核心功能模块的协同工作
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('核心系统集成测试', () => {
    let netManager;
    let chainManager;
    let timer;
    let logger;

    beforeEach(async () => {
        // 初始化核心服务
        logger = new Logger();
        timer = new Timer();
        
        // 初始化管理器
        netManager = new NetManager({
            nodeCount: 3,
            connectionCount: 2,
            failureRate: 0.1
        });
        chainManager = new ChainManager();
    });

    afterEach(() => {
        // 清理资源
        if (timer) {
            timer.stop();
        }
        if (netManager) {
            netManager.cleanup?.();
        }
        if (chainManager) {
            chainManager.clear?.();
        }
    });

    describe('网络初始化和管理', () => {
        it('应该能够成功初始化网络', async () => {
            await netManager.initNetwork();
            
            expect(netManager.nodes.size).toBe(3);
            expect(netManager.isInitialized).toBe(true);
            
            const status = netManager.getNetworkStatus();
            expect(status.nodeCount).toBe(3);
            expect(status.isInitialized).toBe(true);
        });

        it('应该能够处理网络消息广播', async () => {
            await netManager.initNetwork();
            
            const testMessage = {
                type: 'TEST_MESSAGE',
                data: { content: 'Hello Network' }
            };

            const sourceNodeId = Array.from(netManager.nodes.keys())[0];
            const result = await netManager.broadcastMessage(testMessage, sourceNodeId);
            
            expect(result.totalNodes).toBe(3);
            expect(result.reachedNodes).toBeGreaterThanOrEqual(0);
        });

        it('应该能够动态调整网络配置', async () => {
            await netManager.initNetwork();
            
            const initialStatus = netManager.getNetworkStatus();
            expect(initialStatus.failureRate).toBe(0.1);
            
            netManager.updateNetworkConfig({ failureRate: 0.5 });
            
            const updatedStatus = netManager.getNetworkStatus();
            expect(updatedStatus.failureRate).toBe(0.5);
        });
    });

    describe('区块链创建和管理', () => {
        let testUsers;

        beforeEach(async () => {
            // 创建测试用户
            testUsers = [];
            for (let i = 0; i < 3; i++) {
                const user = new User(`user-${i}`);
                await user.genKeyPair();
                testUsers.push({
                    id: user.id,
                    publicKey: user.publicKey,
                    privateKey: user.privateKey
                });
            }
        });

        it('应该能够根据定义创建区块链', async () => {
            const chainDef = {
                description: "测试区块链定义",
                ranges: [
                    { start: 1, end: 3, value: 100 }
                ]
            };
            const result = await chainManager.createBlockchainsFromDefinition(chainDef, testUsers);
            
            expect(result.totalCreated).toBe(3);
            expect(result.ownershipResults.successful.length).toBe(3);
            
            const stats = chainManager.getBlockchainStats();
            expect(stats.totalBlockchains).toBe(3);
            expect(stats.totalValue).toBe(300);
        });

        it('应该能够获取用户拥有的区块链', async () => {
            const chainDef = {
                description: "测试区块链定义",
                ranges: [
                    { start: 1, end: 5, value: 50 }
                ]
            };
            await chainManager.createBlockchainsFromDefinition(chainDef, testUsers);
            
            // 检查每个用户都拥有一些区块链
            let totalUserChains = 0;
            for (const user of testUsers) {
                const userChains = chainManager.getUserBlockchains(user.id);
                totalUserChains += userChains.length;
            }
            
            expect(totalUserChains).toBe(5); // 总共5个区块链
        });

        it('应该能够转移区块链所有权', async () => {
            const chainDef = {
                description: "测试区块链定义",
                ranges: [
                    { start: 1, end: 1, value: 100 }
                ]
            };
            await chainManager.createBlockchainsFromDefinition(chainDef, testUsers);
            
            const blockchains = Array.from(chainManager.getAllBlockchains().values());
            const blockchain = blockchains[0];
            
            // 找到当前所有者
            let currentOwnerId = null;
            for (const user of testUsers) {
                const userChains = chainManager.getUserBlockchains(user.id);
                if (userChains.length > 0) {
                    currentOwnerId = user.id;
                    break;
                }
            }
            
            expect(currentOwnerId).toBeTruthy();
            
            // 找到目标用户（不是当前所有者）
            const targetUser = testUsers.find(u => u.id !== currentOwnerId);
            expect(targetUser).toBeTruthy();
            
            // 执行转移
            const transferResult = await chainManager.transferBlockchain(
                blockchain.getId(),
                currentOwnerId,
                targetUser.id
            );
            
            expect(transferResult.success).toBe(true);
            expect(transferResult.fromUserId).toBe(currentOwnerId);
            expect(transferResult.toUserId).toBe(targetUser.id);
        });
    });

    describe('密码学服务集成', () => {
        it('应该能够完成完整的签名验证流程', async () => {
            const user = new User('test-user');
            await user.genKeyPair();
            
            const testData = 'test data for signing';
            
            // 签名
            const signature = await Crypto.sign(testData, user.privateKey);
            expect(signature).toBeTruthy();
            
            // 验证
            const isValid = await Crypto.verify(signature, testData, user.publicKey);
            expect(isValid).toBe(true);
            
            // 验证错误数据应该失败
            const isInvalid = await Crypto.verify(signature, 'wrong data', user.publicKey);
            expect(isInvalid).toBe(false);
        });

        it('应该能够计算数据哈希', async () => {
            const testData = 'test data for hashing';
            
            const hash1 = await Crypto.sha256(testData);
            const hash2 = await Crypto.sha256(testData);
            
            expect(hash1).toBeTruthy();
            expect(hash2).toBeTruthy();
            expect(hash1).toBe(hash2); // 相同数据应该产生相同哈希
            
            const differentHash = await Crypto.sha256('different data');
            expect(differentHash).not.toBe(hash1); // 不同数据应该产生不同哈希
        });
    });

    describe('定时器和日志系统集成', () => {
        it('应该能够启动和停止定时器', () => {
            expect(timer.isRunning).toBe(false);
            
            timer.start();
            expect(timer.isRunning).toBe(true);
            
            timer.stop();
            expect(timer.isRunning).toBe(false);
        });

        it('应该能够记录和查询日志', () => {
            // 记录不同类型的日志
            logger.log('BLOCK_ADDED', '区块添加', { blockId: 'block-1' });
            logger.log('USER_BLACKLISTED', '用户被拉黑', { userId: 'user-1' });
            logger.log('FORK_WARNING', '分叉警告', { chainId: 'chain-1' });
            
            const result = logger.getLogs();
            const logs = result.logs || result; // Handle both formats
            expect(logs.length).toBe(3);
            
            // 验证日志内容
            expect(logs[0].type).toBe('BLOCK_ADDED');
            expect(logs[1].type).toBe('USER_BLACKLISTED');
            expect(logs[2].type).toBe('FORK_WARNING');
            
            // 验证日志数据
            expect(logs[0].relatedData.blockId).toBe('block-1');
            expect(logs[1].relatedData.userId).toBe('user-1');
            expect(logs[2].relatedData.chainId).toBe('chain-1');
        });

        it('应该能够处理定时器滴答事件', (done) => {
            let tickCount = 0;
            
            timer.onTick((tick) => {
                tickCount++;
                logger.log('TIMER_TICK', `定时器滴答 ${tick}`, { tick });
                
                if (tickCount >= 3) {
                    timer.stop();
                    
                    const logs = logger.getLogs();
                    const tickLogs = logs.filter(log => log.type === 'TIMER_TICK');
                    expect(tickLogs.length).toBe(3);
                    
                    done();
                }
            });
            
            timer.start();
        });
    });

    describe('系统完整性验证', () => {
        it('应该能够验证区块链管理器的完整性', async () => {
            // 创建测试用户
            const user = new User('test-user');
            await user.genKeyPair();
            const testUsers = [{
                id: user.id,
                publicKey: user.publicKey,
                privateKey: user.privateKey
            }];
            
            // 创建区块链
            const chainDef = {
                description: "测试区块链定义",
                ranges: [
                    { start: 1, end: 2, value: 100 }
                ]
            };
            await chainManager.createBlockchainsFromDefinition(chainDef, testUsers);
            
            // 验证完整性
            const validationResult = await chainManager.validateIntegrity();
            expect(validationResult.isValid).toBe(true);
            expect(validationResult.stats.validBlockchains).toBe(2);
            expect(validationResult.errors.length).toBe(0);
        });

        it('应该能够处理错误情况', async () => {
            // 测试空用户列表
            await expect(
                chainManager.createBlockchainsFromDefinition('1-1 100', [])
            ).rejects.toThrow('用户列表不能为空');
            
            // 测试无效的区块链转移
            await expect(
                chainManager.transferBlockchain('non-existent-chain', 'user1', 'user2')
            ).rejects.toThrow();
        });
    });

    describe('性能和稳定性基础测试', () => {
        it('应该能够处理多个并发操作', async () => {
            // 创建测试用户
            const testUsers = [];
            for (let i = 0; i < 5; i++) {
                const user = new User(`user-${i}`);
                await user.genKeyPair();
                testUsers.push({
                    id: user.id,
                    publicKey: user.publicKey,
                    privateKey: user.privateKey
                });
            }
            
            // 并发创建多个区块链
            const chainPromises = [];
            for (let i = 0; i < 3; i++) {
                const chainDef = {
                    description: `测试区块链定义 ${i + 1}`,
                    ranges: [
                        { start: i + 1, end: i + 1, value: 50 }
                    ]
                };
                chainPromises.push(
                    chainManager.createBlockchainsFromDefinition(chainDef, testUsers)
                );
            }
            
            const results = await Promise.all(chainPromises);
            
            // 验证所有创建都成功
            expect(results.length).toBe(3);
            expect(results.every(result => result.totalCreated === 1)).toBe(true);
        });

        it('应该能够处理基本的内存管理', () => {
            const initialMemory = process.memoryUsage?.() || { heapUsed: 0 };
            
            // 创建一些对象
            const objects = [];
            for (let i = 0; i < 50; i++) {
                const user = new User(`test-user-${i}`);
                const blockchain = new BlockChain('test-def', i.toString());
                objects.push({ user, blockchain });
            }
            
            expect(objects.length).toBe(50);
            
            // 清理对象
            objects.length = 0;
            
            // 强制垃圾回收（如果可用）
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage?.() || { heapUsed: 0 };
            
            // 基本的内存检查
            if (initialMemory.heapUsed > 0 && finalMemory.heapUsed > 0) {
                const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
                const growthRatio = memoryGrowth / initialMemory.heapUsed;
                expect(growthRatio).toBeLessThan(5); // 内存增长不超过400%
            }
        });
    });

    describe('端到端系统工作流程', () => {
        it('应该能够完成完整的系统初始化和操作流程', async () => {
            // 1. 初始化网络
            await netManager.initNetwork();
            expect(netManager.nodes.size).toBe(3);
            
            // 2. 创建用户
            const testUsers = [];
            for (let i = 0; i < 2; i++) {
                const user = new User(`user-${i}`);
                await user.genKeyPair();
                testUsers.push({
                    id: user.id,
                    publicKey: user.publicKey,
                    privateKey: user.privateKey
                });
            }
            
            // 3. 创建区块链
            const chainDef = {
                description: "测试区块链定义",
                ranges: [
                    { start: 1, end: 3, value: 100 }
                ]
            };
            const result = await chainManager.createBlockchainsFromDefinition(chainDef, testUsers);
            expect(result.totalCreated).toBe(3);
            
            // 4. 启动定时器
            timer.start();
            expect(timer.isRunning).toBe(true);
            
            // 5. 记录系统事件
            logger.log('SYSTEM_INITIALIZED', '系统初始化完成', {
                nodeCount: netManager.nodes.size,
                chainCount: chainManager.getAllBlockchains().size,
                userCount: testUsers.length
            });
            
            // 6. 广播测试消息
            const testMessage = {
                type: 'SYSTEM_TEST',
                data: { message: 'System integration test' }
            };
            
            const sourceNodeId = Array.from(netManager.nodes.keys())[0];
            const broadcastResult = await netManager.broadcastMessage(testMessage, sourceNodeId);
            expect(broadcastResult.totalNodes).toBe(3);
            
            // 7. 验证系统状态
            const networkStatus = netManager.getNetworkStatus();
            const chainStats = chainManager.getBlockchainStats();
            const logs = logger.getLogs();
            
            expect(networkStatus.nodeCount).toBe(3);
            expect(chainStats.totalBlockchains).toBe(3);
            expect(chainStats.totalValue).toBe(300);
            expect(logs.length).toBeGreaterThan(0);
            
            // 8. 清理
            timer.stop();
            expect(timer.isRunning).toBe(false);
        });
    });
});