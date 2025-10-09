/**
 * 大规模网络性能测试
 * 
 * 测试系统在大规模网络环境下的性能表现
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('大规模网络性能测试', () => {
    let netManager;
    let chainManager;
    let performanceOptimizer;
    let timer;
    
    beforeEach(async () => {
        // 初始化性能优化器
        performanceOptimizer = new PerformanceOptimizer();
        await performanceOptimizer.init();
        Crypto.setPerformanceOptimizer(performanceOptimizer);
        
        // 初始化计时器
        timer = new Timer({ tickInterval: 100 }); // 快速滴答用于测试
    });
    
    afterEach(() => {
        if (netManager) {
            netManager.cleanup();
        }
        if (chainManager) {
            chainManager.cleanup();
        }
        if (performanceOptimizer) {
            performanceOptimizer.cleanup();
        }
        if (timer) {
            timer.stop();
        }
    });

    describe('网络初始化性能测试', () => {
        it('应该快速初始化小规模网络 (10节点, 20用户)', async () => {
            const startTime = performance.now();
            
            netManager = new NetManager({
                nodeCount: 10,
                connectionCount: 3,
                failureRate: 0.1,
                tickInterval: 100
            });
            
            await netManager.initNetwork();
            
            const endTime = performance.now();
            const initTime = endTime - startTime;
            
            console.log(`小规模网络初始化耗时: ${initTime}ms`);
            
            expect(netManager.isInitialized).toBe(true);
            expect(netManager.nodes.size).toBe(10);
            expect(initTime).toBeLessThan(5000); // 应该在5秒内完成
            
            const networkStatus = netManager.getNetworkStatus();
            expect(networkStatus.nodeCount).toBe(10);
            expect(networkStatus.totalConnections).toBeGreaterThan(0);
        });

        it('应该处理中等规模网络 (50节点, 100用户)', async () => {
            const startTime = performance.now();
            
            netManager = new NetManager({
                nodeCount: 50,
                connectionCount: 5,
                failureRate: 0.1,
                tickInterval: 100
            });
            
            await netManager.initNetwork();
            
            const endTime = performance.now();
            const initTime = endTime - startTime;
            
            console.log(`中等规模网络初始化耗时: ${initTime}ms`);
            
            expect(netManager.isInitialized).toBe(true);
            expect(netManager.nodes.size).toBe(50);
            expect(initTime).toBeLessThan(15000); // 应该在15秒内完成
            
            const networkStatus = netManager.getNetworkStatus();
            expect(networkStatus.nodeCount).toBe(50);
            expect(parseFloat(networkStatus.avgConnections)).toBeGreaterThan(0);
        });

        it('应该处理大规模网络 (100节点, 200用户)', async () => {
            const startTime = performance.now();
            
            netManager = new NetManager({
                nodeCount: 100,
                connectionCount: 8,
                failureRate: 0.15,
                tickInterval: 100
            });
            
            await netManager.initNetwork();
            
            const endTime = performance.now();
            const initTime = endTime - startTime;
            
            console.log(`大规模网络初始化耗时: ${initTime}ms`);
            
            expect(netManager.isInitialized).toBe(true);
            expect(netManager.nodes.size).toBe(100);
            expect(initTime).toBeLessThan(30000); // 应该在30秒内完成
            
            const networkStatus = netManager.getNetworkStatus();
            expect(networkStatus.nodeCount).toBe(100);
            expect(networkStatus.totalConnections).toBeGreaterThan(100);
        });
    });

    describe('消息广播性能测试', () => {
        beforeEach(async () => {
            netManager = new NetManager({
                nodeCount: 50,
                connectionCount: 5,
                failureRate: 0.1,
                tickInterval: 100
            });
            
            await netManager.initNetwork();
        });

        it('应该高效广播单个消息', async () => {
            const message = {
                type: 'TEST_MESSAGE',
                data: { content: 'test broadcast message' },
                timestamp: Date.now()
            };
            
            const startTime = performance.now();
            const result = await netManager.broadcastMessage(message);
            const endTime = performance.now();
            
            const broadcastTime = endTime - startTime;
            console.log(`单个消息广播耗时: ${broadcastTime}ms`);
            console.log(`广播覆盖率: ${(result.coverage * 100).toFixed(2)}%`);
            
            expect(result.reachedNodes).toBeGreaterThan(0);
            expect(result.coverage).toBeGreaterThan(0.8); // 至少80%覆盖率
            expect(broadcastTime).toBeLessThan(1000); // 应该在1秒内完成
        });

        it('应该处理并发消息广播', async () => {
            const messageCount = 10;
            const messages = [];
            
            for (let i = 0; i < messageCount; i++) {
                messages.push({
                    type: 'CONCURRENT_MESSAGE',
                    data: { id: i, content: `concurrent message ${i}` },
                    timestamp: Date.now()
                });
            }
            
            const startTime = performance.now();
            const results = await Promise.all(
                messages.map(msg => netManager.broadcastMessage(msg))
            );
            const endTime = performance.now();
            
            const totalTime = endTime - startTime;
            const avgTime = totalTime / messageCount;
            
            console.log(`${messageCount} 个并发消息广播总耗时: ${totalTime}ms`);
            console.log(`平均每个消息广播耗时: ${avgTime}ms`);
            
            expect(results).toHaveLength(messageCount);
            results.forEach(result => {
                expect(result.reachedNodes).toBeGreaterThan(0);
                expect(result.coverage).toBeGreaterThan(0.5);
            });
            
            expect(avgTime).toBeLessThan(500); // 平均每个消息应该在500ms内完成
        });

        it('应该处理高频消息广播', async () => {
            const messageCount = 50;
            const broadcastTimes = [];
            
            for (let i = 0; i < messageCount; i++) {
                const message = {
                    type: 'HIGH_FREQUENCY_MESSAGE',
                    data: { sequence: i, timestamp: Date.now() },
                    timestamp: Date.now()
                };
                
                const startTime = performance.now();
                await netManager.broadcastMessage(message);
                const endTime = performance.now();
                
                broadcastTimes.push(endTime - startTime);
                
                // 短暂延迟模拟高频发送
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            const avgTime = broadcastTimes.reduce((a, b) => a + b, 0) / broadcastTimes.length;
            const maxTime = Math.max(...broadcastTimes);
            const minTime = Math.min(...broadcastTimes);
            
            console.log(`高频广播 ${messageCount} 个消息:`);
            console.log(`平均耗时: ${avgTime.toFixed(2)}ms`);
            console.log(`最大耗时: ${maxTime.toFixed(2)}ms`);
            console.log(`最小耗时: ${minTime.toFixed(2)}ms`);
            
            expect(avgTime).toBeLessThan(200);
            expect(maxTime).toBeLessThan(1000);
        });
    });

    describe('区块链管理性能测试', () => {
        beforeEach(async () => {
            netManager = new NetManager({
                nodeCount: 30,
                connectionCount: 4,
                failureRate: 0.1,
                tickInterval: 100
            });
            
            await netManager.initNetwork();
            
            chainManager = new ChainManager({
                netManager,
                timer
            });
        });

        it('应该快速创建大量区块链', async () => {
            const chainDefinition = {
                desc: '性能测试区块链',
                ranges: [
                    { start: 1, end: 1000, value: 1 },
                    { start: 1001, end: 2000, value: 5 },
                    { start: 2001, end: 3000, value: 10 }
                ]
            };
            
            const startTime = performance.now();
            await chainManager.initializeChains(chainDefinition);
            const endTime = performance.now();
            
            const initTime = endTime - startTime;
            const chainCount = chainManager.getAllChains().length;
            
            console.log(`创建 ${chainCount} 个区块链耗时: ${initTime}ms`);
            console.log(`平均每个区块链创建耗时: ${(initTime / chainCount).toFixed(2)}ms`);
            
            expect(chainCount).toBe(3000);
            expect(initTime).toBeLessThan(10000); // 应该在10秒内完成
            
            const avgTimePerChain = initTime / chainCount;
            expect(avgTimePerChain).toBeLessThan(5); // 每个区块链应该在5ms内创建
        });

        it('应该高效处理并发区块链转移', async () => {
            // 先创建一些区块链
            const chainDefinition = {
                desc: '转移测试区块链',
                ranges: [
                    { start: 1, end: 100, value: 1 }
                ]
            };
            
            await chainManager.initializeChains(chainDefinition);
            
            // 创建用户
            const users = [];
            for (let i = 0; i < 20; i++) {
                const user = new User(`user-${i}`);
                await user.genKeyPair();
                users.push(user);
            }
            
            const chains = chainManager.getAllChains();
            const transferCount = Math.min(50, chains.length);
            const transfers = [];
            
            // 创建并发转移任务
            for (let i = 0; i < transferCount; i++) {
                const chain = chains[i];
                const fromUser = users[i % users.length];
                const toUser = users[(i + 1) % users.length];
                
                transfers.push(async () => {
                    const transferBlock = await fromUser.createTransBlock(chain.getId(), toUser.getPubKey());
                    return chainManager.processTransferBlock(transferBlock, chain.getId());
                });
            }
            
            const startTime = performance.now();
            const results = await Promise.all(transfers.map(transfer => transfer()));
            const endTime = performance.now();
            
            const totalTime = endTime - startTime;
            const avgTime = totalTime / transferCount;
            
            console.log(`${transferCount} 个并发转移耗时: ${totalTime}ms`);
            console.log(`平均每个转移耗时: ${avgTime.toFixed(2)}ms`);
            
            const successCount = results.filter(result => result.success).length;
            console.log(`成功转移: ${successCount}/${transferCount}`);
            
            expect(successCount).toBeGreaterThan(transferCount * 0.8); // 至少80%成功率
            expect(avgTime).toBeLessThan(100); // 每个转移应该在100ms内完成
        });
    });

    describe('内存使用和资源管理测试', () => {
        it('应该在大规模操作后保持合理的内存使用', async () => {
            const initialMemory = performanceOptimizer.memoryMonitor.getCurrentUsage();
            
            // 执行大规模操作
            netManager = new NetManager({
                nodeCount: 100,
                connectionCount: 6,
                failureRate: 0.1,
                tickInterval: 100
            });
            
            await netManager.initNetwork();
            
            // 大量消息广播
            const messageCount = 100;
            for (let i = 0; i < messageCount; i++) {
                await netManager.broadcastMessage({
                    type: 'MEMORY_TEST_MESSAGE',
                    data: { id: i, payload: new Array(1000).fill('x').join('') },
                    timestamp: Date.now()
                });
            }
            
            const afterOperationMemory = performanceOptimizer.memoryMonitor.getCurrentUsage();
            
            // 清理资源
            netManager.cleanup();
            
            // 强制垃圾回收
            if (window.gc) {
                window.gc();
            }
            
            // 等待一段时间让垃圾回收完成
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const afterCleanupMemory = performanceOptimizer.memoryMonitor.getCurrentUsage();
            
            if (initialMemory && afterOperationMemory && afterCleanupMemory) {
                console.log(`初始内存使用: ${(initialMemory.used / 1024 / 1024).toFixed(2)}MB`);
                console.log(`操作后内存使用: ${(afterOperationMemory.used / 1024 / 1024).toFixed(2)}MB`);
                console.log(`清理后内存使用: ${(afterCleanupMemory.used / 1024 / 1024).toFixed(2)}MB`);
                
                const memoryIncrease = afterCleanupMemory.used - initialMemory.used;
                const memoryIncreaseRatio = memoryIncrease / initialMemory.used;
                
                console.log(`内存增长: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
                console.log(`内存增长比例: ${(memoryIncreaseRatio * 100).toFixed(2)}%`);
                
                // 内存增长应该在合理范围内
                expect(memoryIncreaseRatio).toBeLessThan(2); // 不应超过初始内存的2倍
            }
        });

        it('应该高效管理 Worker 池资源', async () => {
            const initialWorkerStatus = performanceOptimizer.getWorkerPoolStatus();
            
            // 执行大量密码学操作
            const operationCount = 200;
            const operations = [];
            
            for (let i = 0; i < operationCount; i++) {
                operations.push(
                    performanceOptimizer.executeCryptoOperation('generateKeyPair', {})
                );
            }
            
            const startTime = performance.now();
            const results = await Promise.all(operations);
            const endTime = performance.now();
            
            const finalWorkerStatus = performanceOptimizer.getWorkerPoolStatus();
            
            console.log(`${operationCount} 个密码学操作耗时: ${endTime - startTime}ms`);
            console.log(`初始 Worker 状态:`, initialWorkerStatus);
            console.log(`最终 Worker 状态:`, finalWorkerStatus);
            
            expect(results).toHaveLength(operationCount);
            expect(finalWorkerStatus.totalWorkers).toBe(initialWorkerStatus.totalWorkers);
            expect(finalWorkerStatus.busyWorkers).toBe(0); // 所有 Worker 应该已完成
            expect(finalWorkerStatus.totalTasks).toBeGreaterThan(initialWorkerStatus.totalTasks);
        });
    });

    describe('系统稳定性测试', () => {
        it('应该在长时间运行下保持稳定', async () => {
            netManager = new NetManager({
                nodeCount: 50,
                connectionCount: 4,
                failureRate: 0.1,
                tickInterval: 50 // 更快的滴答用于测试
            });
            
            await netManager.initNetwork();
            netManager.startTimer();
            
            const testDuration = 5000; // 5秒测试
            const messageInterval = 100; // 每100ms发送一个消息
            const startTime = Date.now();
            
            let messageCount = 0;
            let successCount = 0;
            let errorCount = 0;
            
            const messageTimer = setInterval(async () => {
                try {
                    messageCount++;
                    const result = await netManager.broadcastMessage({
                        type: 'STABILITY_TEST_MESSAGE',
                        data: { id: messageCount, timestamp: Date.now() },
                        timestamp: Date.now()
                    });
                    
                    if (result.reachedNodes > 0) {
                        successCount++;
                    }
                } catch (error) {
                    errorCount++;
                    console.error('消息广播失败:', error);
                }
            }, messageInterval);
            
            // 等待测试完成
            await new Promise(resolve => setTimeout(resolve, testDuration));
            clearInterval(messageTimer);
            
            netManager.stopTimer();
            
            const endTime = Date.now();
            const actualDuration = endTime - startTime;
            const successRate = successCount / messageCount;
            
            console.log(`稳定性测试结果 (${actualDuration}ms):`);
            console.log(`发送消息: ${messageCount}`);
            console.log(`成功消息: ${successCount}`);
            console.log(`失败消息: ${errorCount}`);
            console.log(`成功率: ${(successRate * 100).toFixed(2)}%`);
            
            const networkStatus = netManager.getNetworkStatus();
            console.log(`网络状态:`, networkStatus);
            
            expect(messageCount).toBeGreaterThan(0);
            expect(successRate).toBeGreaterThan(0.8); // 至少80%成功率
            expect(errorCount / messageCount).toBeLessThan(0.2); // 错误率应该低于20%
        });

        it('应该处理网络故障和恢复', async () => {
            netManager = new NetManager({
                nodeCount: 30,
                connectionCount: 4,
                failureRate: 0.2, // 较高的故障率
                tickInterval: 100
            });
            
            await netManager.initNetwork();
            
            const initialStatus = netManager.getNetworkStatus();
            
            // 模拟网络故障
            const nodeIds = Array.from(netManager.nodes.keys());
            const failureCount = Math.floor(nodeIds.length * 0.3); // 30%的连接故障
            
            for (let i = 0; i < failureCount; i++) {
                const node1 = nodeIds[i];
                const node2 = nodeIds[(i + 1) % nodeIds.length];
                netManager.simulateConnectionFailure(node1, node2);
            }
            
            const afterFailureStatus = netManager.getNetworkStatus();
            
            // 测试在故障情况下的消息传播
            const message = {
                type: 'FAILURE_TEST_MESSAGE',
                data: { content: 'testing under failure conditions' },
                timestamp: Date.now()
            };
            
            const result = await netManager.broadcastMessage(message);
            
            console.log(`网络故障测试:`);
            console.log(`初始连接数: ${initialStatus.totalConnections}`);
            console.log(`故障后连接数: ${afterFailureStatus.totalConnections}`);
            console.log(`消息覆盖率: ${(result.coverage * 100).toFixed(2)}%`);
            
            expect(afterFailureStatus.totalConnections).toBeLessThan(initialStatus.totalConnections);
            expect(result.coverage).toBeGreaterThan(0.5); // 即使在故障情况下也应该有50%以上的覆盖率
        });
    });

    describe('性能基准测试', () => {
        const performanceTargets = {
            smallNetwork: {
                nodeCount: 20,
                initTime: 3000,
                broadcastTime: 500,
                transferTime: 200
            },
            mediumNetwork: {
                nodeCount: 50,
                initTime: 8000,
                broadcastTime: 1000,
                transferTime: 500
            },
            largeNetwork: {
                nodeCount: 100,
                initTime: 20000,
                broadcastTime: 2000,
                transferTime: 1000
            }
        };

        Object.entries(performanceTargets).forEach(([networkSize, targets]) => {
            it(`应该满足 ${networkSize} 的性能目标`, async () => {
                // 网络初始化性能
                const initStartTime = performance.now();
                netManager = new NetManager({
                    nodeCount: targets.nodeCount,
                    connectionCount: Math.min(5, Math.floor(targets.nodeCount / 10)),
                    failureRate: 0.1,
                    tickInterval: 100
                });
                await netManager.initNetwork();
                const initTime = performance.now() - initStartTime;
                
                // 消息广播性能
                const broadcastStartTime = performance.now();
                await netManager.broadcastMessage({
                    type: 'BENCHMARK_MESSAGE',
                    data: { test: 'performance benchmark' },
                    timestamp: Date.now()
                });
                const broadcastTime = performance.now() - broadcastStartTime;
                
                console.log(`${networkSize} 性能测试结果:`);
                console.log(`节点数: ${targets.nodeCount}`);
                console.log(`初始化时间: ${initTime.toFixed(2)}ms (目标: <${targets.initTime}ms)`);
                console.log(`广播时间: ${broadcastTime.toFixed(2)}ms (目标: <${targets.broadcastTime}ms)`);
                
                expect(initTime).toBeLessThan(targets.initTime);
                expect(broadcastTime).toBeLessThan(targets.broadcastTime);
                
                const networkStatus = netManager.getNetworkStatus();
                expect(networkStatus.nodeCount).toBe(targets.nodeCount);
                expect(parseFloat(networkStatus.avgConnections)).toBeGreaterThan(1);
            });
        });
    });
});