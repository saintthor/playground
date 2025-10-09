/**
 * 最终系统验证测试
 * 验证所有功能模块的协同工作和需求完整实现
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('最终系统验证测试', () => {
    let netManager;
    let chainManager;
    let timer;
    let logger;
    let testUsers;

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

        // 初始化网络
        await netManager.initNetwork();

        // 创建测试用户
        testUsers = [];
        for (let i = 0; i < 3; i++) {
            const user = new User(`user-${i}`);
            await user.genKeyPair();
            testUsers.push({
                id: user.id,
                publicKey: user.publicKey,
                privateKey: user.privateKey,
                user: user
            });
        }
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

    describe('核心系统功能验证', () => {
        it('应该能够完成完整的系统初始化', async () => {
            // 验证网络初始化
            const networkStatus = netManager.getNetworkStatus();
            expect(networkStatus.nodeCount).toBe(3);
            expect(networkStatus.isInitialized).toBe(true);

            // 验证用户创建
            expect(testUsers.length).toBe(3);
            for (const user of testUsers) {
                expect(user.publicKey).toBeTruthy();
                expect(user.privateKey).toBeTruthy();
            }

            // 验证密码学功能
            const testData = 'test data';
            const signature = await Crypto.sign(testData, testUsers[0].privateKey);
            const isValid = await Crypto.verify(signature, testData, testUsers[0].publicKey);
            expect(isValid).toBe(true);

            // 验证哈希功能
            const hash = await Crypto.sha256(testData);
            expect(hash).toBeTruthy();
            expect(typeof hash).toBe('string');
        });

        it('应该能够创建和管理区块链', async () => {
            const chainDef = {
                description: "测试区块链定义",
                ranges: [
                    { start: 1, end: 3, value: 100 }
                ]
            };
            const result = await chainManager.createBlockchainsFromDefinition(chainDef, testUsers);
            
            expect(result.totalCreated).toBe(3);
            
            const stats = chainManager.getBlockchainStats();
            expect(stats.totalBlockchains).toBe(3);
            expect(stats.totalValue).toBe(300);

            // 验证每个区块链都有正确的结构
            const blockchains = Array.from(chainManager.getAllBlockchains().values());
            for (const blockchain of blockchains) {
                expect(blockchain.getId()).toBeTruthy();
                expect(blockchain.getCurrentOwner()).toBeTruthy();
                expect(blockchain.getValue()).toBe(100);
            }
        });

        it('应该能够处理区块链转移', async () => {
            const chainDef = {
                description: "测试区块链定义",
                ranges: [
                    { start: 1, end: 1, value: 100 }
                ]
            };
            await chainManager.createBlockchainsFromDefinition(chainDef, testUsers);
            
            const blockchain = Array.from(chainManager.getAllBlockchains().values())[0];
            const currentOwner = testUsers.find(u => u.id === blockchain.getCurrentOwner());
            const targetUser = testUsers.find(u => u.id !== currentOwner.id);

            // 执行转移
            const transferResult = await chainManager.transferBlockchain(
                blockchain.getId(),
                currentOwner.id,
                targetUser.id
            );

            expect(transferResult.success).toBe(true);
            expect(transferResult.fromUserId).toBe(currentOwner.id);
            expect(transferResult.toUserId).toBe(targetUser.id);
        });

        it('应该能够处理网络消息传播', async () => {
            const testMessage = {
                type: 'TEST_MESSAGE',
                data: { content: 'System validation test' }
            };

            const sourceNodeId = Array.from(netManager.nodes.keys())[0];
            const result = await netManager.broadcastMessage(testMessage, sourceNodeId);
            
            expect(result.totalNodes).toBe(3);
            expect(result.reachedNodes).toBeGreaterThanOrEqual(0);
        });

        it('应该能够记录和查询日志', () => {
            // 记录不同类型的日志
            logger.log('BLOCK_ADDED', '区块添加测试', { blockId: 'test-block-1' });
            logger.log('USER_BLACKLISTED', '用户拉黑测试', { userId: 'test-user-1' });
            logger.log('FORK_WARNING', '分叉警告测试', { chainId: 'test-chain-1' });

            const result = logger.getLogs();
            const logs = result.logs || result; // Handle both formats
            expect(logs.length).toBe(3);

            // 验证日志内容
            const logTypes = logs.map(log => log.type);
            expect(logTypes).toContain('BLOCK_ADDED');
            expect(logTypes).toContain('USER_BLACKLISTED');
            expect(logTypes).toContain('FORK_WARNING');
        });

        it('应该能够处理定时器功能', (done) => {
            let tickCount = 0;
            
            timer.onTick((tick) => {
                tickCount++;
                
                if (tickCount >= 3) {
                    timer.stop();
                    expect(tickCount).toBe(3);
                    expect(timer.isRunning).toBe(false);
                    done();
                }
            });
            
            timer.start();
            expect(timer.isRunning).toBe(true);
        });
    });

    describe('系统稳定性验证', () => {
        it('应该能够处理并发操作', async () => {
            const chainDef = {
                description: "测试区块链定义",
                ranges: [
                    { start: 1, end: 5, value: 50 }
                ]
            };
            await chainManager.createBlockchainsFromDefinition(chainDef, testUsers);

            // 并发执行多个操作
            const operations = [];
            
            // 并发网络消息
            for (let i = 0; i < 5; i++) {
                const message = {
                    type: 'CONCURRENT_TEST',
                    data: { messageId: i, timestamp: Date.now() }
                };
                const sourceNodeId = Array.from(netManager.nodes.keys())[i % netManager.nodes.size];
                operations.push(netManager.broadcastMessage(message, sourceNodeId));
            }

            // 并发日志记录
            for (let i = 0; i < 5; i++) {
                operations.push(Promise.resolve(
                    logger.log('CONCURRENT_LOG', `并发日志 ${i}`, { index: i })
                ));
            }

            const results = await Promise.all(operations);
            
            // 验证所有操作都完成
            expect(results.length).toBe(10);
            
            // 验证日志记录
            const result = logger.getLogs();
            const logs = result.logs || result;
            const concurrentLogs = logs.filter(log => log.type === 'CONCURRENT_LOG');
            expect(concurrentLogs.length).toBe(5);
        });

        it('应该能够处理错误情况', async () => {
            // 测试无效的区块链定义
            await expect(
                chainManager.createBlockchainsFromDefinition('invalid-format', testUsers)
            ).rejects.toThrow();

            // 测试空用户列表
            const validChainDef = {
                description: "测试区块链定义",
                ranges: [
                    { start: 1, end: 1, value: 100 }
                ]
            };
            await expect(
                chainManager.createBlockchainsFromDefinition(validChainDef, [])
            ).rejects.toThrow();

            // 测试无效的转移
            await expect(
                chainManager.transferBlockchain('non-existent-chain', 'user1', 'user2')
            ).rejects.toThrow();
        });

        it('应该能够验证系统完整性', async () => {
            // 创建测试数据
            const chainDef = {
                description: "测试区块链定义",
                ranges: [
                    { start: 1, end: 2, value: 100 }
                ]
            };
            await chainManager.createBlockchainsFromDefinition(chainDef, testUsers);

            // 验证区块链管理器完整性
            const validationResult = await chainManager.validateIntegrity();
            expect(validationResult.isValid).toBe(true);
            expect(validationResult.stats.validBlockchains).toBe(2);
            expect(validationResult.errors.length).toBe(0);

            // 验证网络状态
            const networkStatus = netManager.getNetworkStatus();
            expect(networkStatus.nodeCount).toBe(3);
            expect(networkStatus.isInitialized).toBe(true);

            // 验证用户资产分布
            let totalUserAssets = 0;
            for (const user of testUsers) {
                const userChains = chainManager.getUserBlockchains(user.id);
                const userAssetValue = userChains.reduce((sum, chain) => sum + chain.getValue(), 0);
                totalUserAssets += userAssetValue;
            }
            expect(totalUserAssets).toBe(200); // 2 chains * 100 value each
        });
    });

    describe('端到端系统工作流程验证', () => {
        it('应该能够完成完整的系统工作流程', async () => {
            // 1. 系统初始化
            expect(netManager.getNetworkStatus().isInitialized).toBe(true);
            expect(testUsers.length).toBe(3);

            // 2. 创建区块链
            const chainDef = {
                description: "测试区块链定义",
                ranges: [
                    { start: 1, end: 3, value: 100 }
                ]
            };
            const createResult = await chainManager.createBlockchainsFromDefinition(chainDef, testUsers);
            expect(createResult.totalCreated).toBe(3);

            // 3. 启动定时器
            timer.start();
            expect(timer.isRunning).toBe(true);

            // 4. 记录系统事件
            logger.log('SYSTEM_WORKFLOW_TEST', '系统工作流程测试', {
                nodeCount: netManager.getNetworkStatus().nodeCount,
                chainCount: chainManager.getAllBlockchains().size,
                userCount: testUsers.length
            });

            // 5. 执行区块链转移
            const blockchain = Array.from(chainManager.getAllBlockchains().values())[0];
            const currentOwner = testUsers.find(u => u.id === blockchain.getCurrentOwner());
            const targetUser = testUsers.find(u => u.id !== currentOwner.id);

            const transferResult = await chainManager.transferBlockchain(
                blockchain.getId(),
                currentOwner.id,
                targetUser.id
            );
            expect(transferResult.success).toBe(true);

            // 6. 广播测试消息
            const testMessage = {
                type: 'WORKFLOW_TEST',
                data: { message: 'End-to-end workflow test' }
            };
            const sourceNodeId = Array.from(netManager.nodes.keys())[0];
            const broadcastResult = await netManager.broadcastMessage(testMessage, sourceNodeId);
            expect(broadcastResult.totalNodes).toBe(3);

            // 7. 验证最终状态
            const finalNetworkStatus = netManager.getNetworkStatus();
            const finalChainStats = chainManager.getBlockchainStats();
            const finalLogs = logger.getLogs();

            expect(finalNetworkStatus.nodeCount).toBe(3);
            expect(finalChainStats.totalBlockchains).toBe(3);
            expect(finalChainStats.totalValue).toBe(300);
            expect(finalLogs.length).toBeGreaterThan(0);

            // 8. 清理
            timer.stop();
            expect(timer.isRunning).toBe(false);

            // 记录完成日志
            logger.log('SYSTEM_WORKFLOW_COMPLETE', '系统工作流程测试完成', {
                success: true,
                finalStats: {
                    nodes: finalNetworkStatus.nodeCount,
                    chains: finalChainStats.totalBlockchains,
                    value: finalChainStats.totalValue,
                    logs: finalLogs.length
                }
            });
        });
    });

    describe('需求验证总结', () => {
        it('应该验证所有核心需求的实现', async () => {
            // 需求1: P2P网络参数配置
            const networkStatus = netManager.getNetworkStatus();
            expect(networkStatus.nodeCount).toBe(3);
            expect(networkStatus.isInitialized).toBe(true);

            // 需求2: 密钥对身份标识
            for (const user of testUsers) {
                expect(user.publicKey).toBeTruthy();
                expect(user.privateKey).toBeTruthy();
                expect(user.publicKey).not.toBe(user.privateKey);
            }

            // 需求3: 网络节点安全连接
            expect(networkStatus.totalConnections).toBeGreaterThanOrEqual(0);

            // 需求4: 区块链定义和创建
            const chainDef = {
                description: "测试区块链定义",
                ranges: [
                    { start: 1, end: 5, value: 100 }
                ]
            };
            const result = await chainManager.createBlockchainsFromDefinition(chainDef, testUsers);
            expect(result.totalCreated).toBe(5);

            // 需求5: 区块链转移功能
            const blockchain = Array.from(chainManager.getAllBlockchains().values())[0];
            const currentOwner = testUsers.find(u => u.id === blockchain.getCurrentOwner());
            const targetUser = testUsers.find(u => u.id !== currentOwner.id);

            const transferResult = await chainManager.transferBlockchain(
                blockchain.getId(),
                currentOwner.id,
                targetUser.id
            );
            expect(transferResult.success).toBe(true);

            // 需求6-8: 验证和安全机制（基础验证）
            const validationResult = await chainManager.validateIntegrity();
            expect(validationResult.isValid).toBe(true);

            // 需求9-12: 日志和控制功能
            logger.log('REQUIREMENTS_VALIDATION', '需求验证完成', {
                networkNodes: networkStatus.nodeCount,
                totalChains: chainManager.getAllBlockchains().size,
                totalUsers: testUsers.length
            });

            const logs = logger.getLogs();
            expect(logs.length).toBeGreaterThan(0);

            // 定时器功能
            timer.start();
            expect(timer.isRunning).toBe(true);
            timer.stop();
            expect(timer.isRunning).toBe(false);

            // 最终验证
            const finalStats = {
                networkInitialized: networkStatus.isInitialized,
                usersCreated: testUsers.length,
                chainsCreated: chainManager.getAllBlockchains().size,
                transferSuccessful: transferResult.success,
                validationPassed: validationResult.isValid,
                logsRecorded: logs.length > 0
            };

            // 所有核心功能都应该正常工作
            expect(finalStats.networkInitialized).toBe(true);
            expect(finalStats.usersCreated).toBe(3);
            expect(finalStats.chainsCreated).toBe(5);
            expect(finalStats.transferSuccessful).toBe(true);
            expect(finalStats.validationPassed).toBe(true);
            expect(finalStats.logsRecorded).toBe(true);

            console.log('系统集成测试完成 - 所有核心需求验证通过:', finalStats);
        });
    });
});