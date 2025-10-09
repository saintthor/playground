/**
 * 长时间运行稳定性测试
 * 验证系统在长时间运行下的稳定性
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('长时间运行稳定性测试', () => {
    let netManager;
    let chainManager;
    let timer;
    let logger;
    let autoTransferManager;
    let paymentRateController;
    let systemMonitor;

    beforeEach(async () => {
        // 初始化系统组件
        logger = new Logger();
        timer = new Timer();
        netManager = new NetManager(10, 20, 5, 0.1);
        chainManager = new ChainManager();
        systemMonitor = new SystemMonitor();
        
        await netManager.initNetwork();
        
        const chainDef = `
            # 测试区块链定义
            1-50 10
            51-100 20
        `;
        await chainManager.initializeChains(chainDef);

        // 初始化自动转账管理器
        autoTransferManager = new AutoTransferManager(netManager, chainManager, logger);
        paymentRateController = new PaymentRateController(0.1); // 10% 支付速率
    });

    afterEach(() => {
        // 清理资源
        timer?.stop();
        autoTransferManager?.stop();
        systemMonitor?.stop();
        netManager?.cleanup?.();
        chainManager?.cleanup?.();
    });

    describe('长时间运行测试', () => {
        it('应该能够稳定运行1000个滴答', async () => {
            const targetTicks = 1000;
            let currentTick = 0;
            let errors = [];
            let performanceMetrics = {
                avgProcessingTime: 0,
                maxProcessingTime: 0,
                totalOperations: 0,
                memoryUsage: []
            };

            // 启动系统监控
            systemMonitor.start();
            timer.start();

            return new Promise((resolve) => {
                const tickInterval = setInterval(async () => {
                    const tickStartTime = Date.now();
                    
                    try {
                        currentTick++;
                        
                        // 记录内存使用情况
                        const memUsage = process.memoryUsage?.() || { heapUsed: 0, heapTotal: 0 };
                        performanceMetrics.memoryUsage.push({
                            tick: currentTick,
                            heapUsed: memUsage.heapUsed,
                            heapTotal: memUsage.heapTotal
                        });

                        // 模拟网络活动
                        if (currentTick % 10 === 0) {
                            // 每10个滴答进行一次自动转账
                            const transferResult = await autoTransferManager.processAutoTransfers();
                            performanceMetrics.totalOperations += transferResult.transferCount || 0;
                        }

                        // 模拟支付速率控制
                        if (paymentRateController.shouldProcessPayment()) {
                            const users = Array.from(netManager.users.values());
                            const randomUser = users[Math.floor(Math.random() * users.length)];
                            const chains = chainManager.getUserChains(randomUser.publicKey);
                            
                            if (chains.length > 0) {
                                const randomChain = chains[Math.floor(Math.random() * chains.length)];
                                const targetUser = users[Math.floor(Math.random() * users.length)];
                                
                                try {
                                    const transferBlock = randomUser.createTransferBlock(
                                        randomChain.id,
                                        randomChain.getLatestBlock().id,
                                        targetUser.publicKey
                                    );
                                    
                                    if (transferBlock) {
                                        await netManager.broadcastMessage({
                                            type: 'BLOCK_BROADCAST',
                                            data: transferBlock,
                                            sourceNodeId: Array.from(netManager.nodes.keys())[0]
                                        });
                                        performanceMetrics.totalOperations++;
                                    }
                                } catch (error) {
                                    // 记录但不中断测试
                                    errors.push({ tick: currentTick, error: error.message });
                                }
                            }
                        }

                        // 记录系统状态
                        if (currentTick % 100 === 0) {
                            logger.log('SYSTEM_STATUS', `系统运行状态检查 - 滴答 ${currentTick}`, {
                                tick: currentTick,
                                activeNodes: netManager.getNetworkStatus().activeConnections,
                                totalChains: chainManager.getAllChains().length,
                                errors: errors.length
                            });
                        }

                        // 计算处理时间
                        const processingTime = Date.now() - tickStartTime;
                        performanceMetrics.avgProcessingTime = 
                            (performanceMetrics.avgProcessingTime * (currentTick - 1) + processingTime) / currentTick;
                        performanceMetrics.maxProcessingTime = Math.max(
                            performanceMetrics.maxProcessingTime, 
                            processingTime
                        );

                        // 检查是否完成
                        if (currentTick >= targetTicks) {
                            clearInterval(tickInterval);
                            timer.stop();
                            systemMonitor.stop();

                            // 验证系统稳定性
                            expect(currentTick).toBe(targetTicks);
                            expect(errors.length).toBeLessThan(targetTicks * 0.01); // 错误率小于1%
                            expect(performanceMetrics.avgProcessingTime).toBeLessThan(100); // 平均处理时间小于100ms
                            expect(performanceMetrics.totalOperations).toBeGreaterThan(0);

                            // 验证内存使用稳定
                            if (performanceMetrics.memoryUsage.length > 10) {
                                const firstMemUsage = performanceMetrics.memoryUsage[0].heapUsed;
                                const lastMemUsage = performanceMetrics.memoryUsage[performanceMetrics.memoryUsage.length - 1].heapUsed;
                                const memoryGrowthRatio = (lastMemUsage - firstMemUsage) / firstMemUsage;
                                expect(memoryGrowthRatio).toBeLessThan(5); // 内存增长不超过500%
                            }

                            console.log('长时间运行测试完成:', {
                                totalTicks: currentTick,
                                totalErrors: errors.length,
                                avgProcessingTime: performanceMetrics.avgProcessingTime.toFixed(2) + 'ms',
                                maxProcessingTime: performanceMetrics.maxProcessingTime + 'ms',
                                totalOperations: performanceMetrics.totalOperations
                            });

                            resolve();
                        }
                    } catch (error) {
                        errors.push({ tick: currentTick, error: error.message });
                        
                        // 如果错误太多，提前结束测试
                        if (errors.length > targetTicks * 0.1) {
                            clearInterval(tickInterval);
                            timer.stop();
                            systemMonitor.stop();
                            throw new Error(`测试失败：错误过多 (${errors.length}/${currentTick})`);
                        }
                    }
                }, 5); // 5ms 间隔，快速测试
            });
        }, 30000); // 30秒超时

        it('应该能够处理高频率的网络活动', async () => {
            const duration = 5000; // 5秒测试
            const startTime = Date.now();
            let operationCount = 0;
            let errors = [];

            timer.start();
            autoTransferManager.start();

            return new Promise((resolve) => {
                const highFrequencyInterval = setInterval(async () => {
                    try {
                        const currentTime = Date.now();
                        
                        if (currentTime - startTime >= duration) {
                            clearInterval(highFrequencyInterval);
                            timer.stop();
                            autoTransferManager.stop();

                            // 验证高频操作结果
                            expect(operationCount).toBeGreaterThan(100); // 至少100次操作
                            expect(errors.length).toBeLessThan(operationCount * 0.05); // 错误率小于5%

                            console.log('高频率测试完成:', {
                                duration: duration + 'ms',
                                operations: operationCount,
                                errors: errors.length,
                                opsPerSecond: (operationCount / (duration / 1000)).toFixed(2)
                            });

                            resolve();
                            return;
                        }

                        // 执行高频操作
                        const users = Array.from(netManager.users.values());
                        const randomUser = users[Math.floor(Math.random() * users.length)];
                        
                        // 模拟消息广播
                        await netManager.broadcastMessage({
                            type: 'HEARTBEAT',
                            data: { timestamp: currentTime, userId: randomUser.publicKey },
                            sourceNodeId: Array.from(netManager.nodes.keys())[0]
                        });

                        operationCount++;

                        // 每50次操作记录一次日志
                        if (operationCount % 50 === 0) {
                            logger.log('HIGH_FREQUENCY_TEST', `高频测试进行中`, {
                                operations: operationCount,
                                errors: errors.length,
                                timestamp: currentTime
                            });
                        }

                    } catch (error) {
                        errors.push({ operation: operationCount, error: error.message });
                    }
                }, 1); // 1ms 间隔，极高频率
            });
        }, 10000); // 10秒超时
    });

    describe('资源管理测试', () => {
        it('应该能够正确管理内存资源', async () => {
            const initialMemory = process.memoryUsage?.() || { heapUsed: 0 };
            const objects = [];

            // 创建大量临时对象
            for (let i = 0; i < 1000; i++) {
                const user = netManager.users.values().next().value;
                const chains = chainManager.getAllChains();
                
                // 创建临时转账区块
                for (let j = 0; j < 10; j++) {
                    const chain = chains[j % chains.length];
                    const targetUser = Array.from(netManager.users.values())[j % netManager.users.size];
                    
                    try {
                        const transferBlock = user.createTransferBlock(
                            chain.id,
                            chain.getLatestBlock().id,
                            targetUser.publicKey
                        );
                        objects.push(transferBlock);
                    } catch (error) {
                        // 忽略创建失败的情况
                    }
                }
            }

            expect(objects.length).toBeGreaterThan(0);

            // 清理对象
            objects.length = 0;

            // 强制垃圾回收
            if (global.gc) {
                global.gc();
            }

            // 等待垃圾回收完成
            await new Promise(resolve => setTimeout(resolve, 100));

            const finalMemory = process.memoryUsage?.() || { heapUsed: 0 };

            // 验证内存没有显著泄漏
            if (initialMemory.heapUsed > 0 && finalMemory.heapUsed > 0) {
                const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
                const growthRatio = memoryGrowth / initialMemory.heapUsed;
                expect(growthRatio).toBeLessThan(3); // 内存增长不超过200%
            }
        });

        it('应该能够处理连接池的动态管理', async () => {
            const initialConnections = netManager.getNetworkStatus().activeConnections;
            
            // 模拟连接故障
            netManager.updateFailureRate(0.5);
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const failureConnections = netManager.getNetworkStatus().activeConnections;
            expect(failureConnections).toBeLessThan(initialConnections);

            // 恢复连接
            netManager.updateFailureRate(0.1);
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const recoveredConnections = netManager.getNetworkStatus().activeConnections;
            expect(recoveredConnections).toBeGreaterThan(failureConnections);
        });
    });

    describe('并发处理测试', () => {
        it('应该能够处理并发的区块链转移', async () => {
            const concurrentTransfers = 50;
            const transferPromises = [];
            const users = Array.from(netManager.users.values());
            const chains = chainManager.getAllChains();

            // 创建并发转移操作
            for (let i = 0; i < concurrentTransfers; i++) {
                const sourceUser = users[i % users.length];
                const targetUser = users[(i + 1) % users.length];
                const chain = chains[i % chains.length];

                const transferPromise = (async () => {
                    try {
                        const transferBlock = sourceUser.createTransferBlock(
                            chain.id,
                            chain.getLatestBlock().id,
                            targetUser.publicKey
                        );

                        if (transferBlock) {
                            const result = await netManager.broadcastMessage({
                                type: 'BLOCK_BROADCAST',
                                data: transferBlock,
                                sourceNodeId: Array.from(netManager.nodes.keys())[0]
                            });
                            return { success: true, result };
                        }
                        return { success: false, error: 'Failed to create transfer block' };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                })();

                transferPromises.push(transferPromise);
            }

            // 等待所有转移完成
            const results = await Promise.all(transferPromises);
            
            // 验证结果
            const successfulTransfers = results.filter(r => r.success).length;
            const failedTransfers = results.filter(r => !r.success).length;

            expect(successfulTransfers).toBeGreaterThan(0);
            expect(successfulTransfers + failedTransfers).toBe(concurrentTransfers);
            
            // 允许一定的失败率（由于并发冲突）
            const failureRate = failedTransfers / concurrentTransfers;
            expect(failureRate).toBeLessThan(0.5); // 失败率小于50%

            console.log('并发转移测试结果:', {
                total: concurrentTransfers,
                successful: successfulTransfers,
                failed: failedTransfers,
                failureRate: (failureRate * 100).toFixed(2) + '%'
            });
        });

        it('应该能够处理并发的网络消息', async () => {
            const concurrentMessages = 100;
            const messagePromises = [];

            // 创建并发消息
            for (let i = 0; i < concurrentMessages; i++) {
                const messagePromise = netManager.broadcastMessage({
                    type: 'CONCURRENT_TEST',
                    data: { messageId: i, timestamp: Date.now() },
                    sourceNodeId: Array.from(netManager.nodes.keys())[i % netManager.nodes.size]
                });

                messagePromises.push(messagePromise);
            }

            // 等待所有消息处理完成
            const results = await Promise.all(messagePromises);
            
            // 验证所有消息都被处理
            expect(results.length).toBe(concurrentMessages);
            
            const successfulMessages = results.filter(r => r.success).length;
            expect(successfulMessages).toBeGreaterThan(concurrentMessages * 0.8); // 至少80%成功
        });
    });
});