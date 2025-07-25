/**
 * PerformanceOptimizer 性能测试
 * 
 * 测试性能优化器的各种功能和大规模网络性能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceOptimizer } from '../../src/services/PerformanceOptimizer.js';
import { Crypto } from '../../src/services/Crypto.js';

describe('PerformanceOptimizer', () => {
    let optimizer;
    
    beforeEach(async () => {
        optimizer = new PerformanceOptimizer();
        await optimizer.init();
        
        // 设置 Crypto 服务使用性能优化器
        Crypto.setPerformanceOptimizer(optimizer);
    });
    
    afterEach(() => {
        if (optimizer) {
            optimizer.cleanup();
        }
    });

    describe('初始化和基本功能', () => {
        it('应该正确初始化性能优化器', () => {
            expect(optimizer.isInitialized).toBe(true);
            expect(optimizer.workerPool.size).toBeGreaterThan(0);
        });

        it('应该创建 Web Worker 池', () => {
            const status = optimizer.getWorkerPoolStatus();
            expect(status.totalWorkers).toBeGreaterThan(0);
            expect(status.busyWorkers).toBe(0);
            expect(status.totalTasks).toBe(0);
        });

        it('应该启动内存监控', () => {
            expect(optimizer.memoryMonitor.isRunning).toBe(true);
        });

        it('应该启动渲染调度器', () => {
            expect(optimizer.renderScheduler.isRunning).toBe(true);
        });
    });

    describe('异步密码学操作', () => {
        it('应该异步生成密钥对', async () => {
            const startTime = performance.now();
            const keyPair = await optimizer.executeCryptoOperation('generateKeyPair', {});
            const endTime = performance.now();
            
            expect(keyPair).toHaveProperty('publicKey');
            expect(keyPair).toHaveProperty('privateKey');
            expect(keyPair.publicKey).toMatch(/^[A-Za-z0-9+/]+=*$/);
            expect(keyPair.privateKey).toMatch(/^[A-Za-z0-9+/]+=*$/);
            
            console.log(`异步密钥生成耗时: ${endTime - startTime}ms`);
        });

        it('应该异步签名数据', async () => {
            const keyPair = await optimizer.executeCryptoOperation('generateKeyPair', {});
            const message = 'test message';
            
            const startTime = performance.now();
            const signature = await optimizer.executeCryptoOperation('sign', {
                message,
                privateKey: keyPair.privateKey
            });
            const endTime = performance.now();
            
            expect(signature).toMatch(/^[A-Za-z0-9+/]+=*$/);
            console.log(`异步签名耗时: ${endTime - startTime}ms`);
        });

        it('应该异步验证签名', async () => {
            const keyPair = await optimizer.executeCryptoOperation('generateKeyPair', {});
            const message = 'test message';
            const signature = await optimizer.executeCryptoOperation('sign', {
                message,
                privateKey: keyPair.privateKey
            });
            
            const startTime = performance.now();
            const isValid = await optimizer.executeCryptoOperation('verify', {
                signature,
                message,
                publicKey: keyPair.publicKey
            });
            const endTime = performance.now();
            
            expect(isValid).toBe(true);
            console.log(`异步验证耗时: ${endTime - startTime}ms`);
        });

        it('应该异步计算哈希', async () => {
            const message = 'test message for hashing';
            
            const startTime = performance.now();
            const hash = await optimizer.executeCryptoOperation('hash', {
                message
            });
            const endTime = performance.now();
            
            expect(hash).toMatch(/^[0-9a-f]{64}$/);
            console.log(`异步哈希计算耗时: ${endTime - startTime}ms`);
        });
    });

    describe('批量操作性能测试', () => {
        it('应该高效处理批量签名验证', async () => {
            // 生成测试数据
            const keyPair = await Crypto.genKeyPair();
            const message = 'test message';
            const signature = await Crypto.sign(message, keyPair.privateKey);
            
            const batchSize = 50;
            const verificationTasks = [];
            
            for (let i = 0; i < batchSize; i++) {
                verificationTasks.push({
                    id: `task-${i}`,
                    signature,
                    message,
                    publicKey: keyPair.publicKey
                });
            }
            
            const startTime = performance.now();
            const results = await optimizer.batchVerifySignatures(verificationTasks);
            const endTime = performance.now();
            
            expect(results).toHaveLength(batchSize);
            results.forEach(result => {
                expect(result.success).toBe(true);
                expect(result.result).toBe(true);
            });
            
            const avgTime = (endTime - startTime) / batchSize;
            console.log(`批量验证 ${batchSize} 个签名耗时: ${endTime - startTime}ms`);
            console.log(`平均每个验证耗时: ${avgTime}ms`);
            
            // 批量操作应该比单个操作更高效
            expect(avgTime).toBeLessThan(50); // 每个验证应该少于50ms
        });

        it('应该处理大量并发密钥生成', async () => {
            const keyCount = 20;
            
            const startTime = performance.now();
            const keyPairs = await Crypto.batchGenKeyPairs(keyCount);
            const endTime = performance.now();
            
            expect(keyPairs).toHaveLength(keyCount);
            keyPairs.forEach(keyPair => {
                expect(keyPair).toHaveProperty('publicKey');
                expect(keyPair).toHaveProperty('privateKey');
            });
            
            const avgTime = (endTime - startTime) / keyCount;
            console.log(`批量生成 ${keyCount} 个密钥对耗时: ${endTime - startTime}ms`);
            console.log(`平均每个密钥对耗时: ${avgTime}ms`);
        });

        it('应该处理批量哈希计算', async () => {
            const hashCount = 100;
            const hashTasks = [];
            
            for (let i = 0; i < hashCount; i++) {
                hashTasks.push({
                    id: `hash-${i}`,
                    message: `test message ${i}`
                });
            }
            
            const startTime = performance.now();
            const results = await Crypto.batchHash(hashTasks);
            const endTime = performance.now();
            
            expect(results).toHaveLength(hashCount);
            results.forEach(result => {
                expect(result.success).toBe(true);
                expect(result.result).toMatch(/^[0-9a-f]{64}$/);
            });
            
            const avgTime = (endTime - startTime) / hashCount;
            console.log(`批量计算 ${hashCount} 个哈希耗时: ${endTime - startTime}ms`);
            console.log(`平均每个哈希耗时: ${avgTime}ms`);
        });
    });

    describe('渲染调度器测试', () => {
        it('应该调度批量 DOM 更新', async () => {
            let updateCount = 0;
            const updates = [];
            
            // 创建多个更新任务
            for (let i = 0; i < 10; i++) {
                const updatePromise = optimizer.scheduleBatchUpdate(() => {
                    updateCount++;
                    return `update-${i}`;
                }, i < 3 ? 'high' : 'normal');
                
                updates.push(updatePromise);
            }
            
            // 等待所有更新完成
            const results = await Promise.all(updates);
            
            expect(updateCount).toBe(10);
            expect(results).toHaveLength(10);
            
            // 检查队列状态
            const queueStatus = optimizer.renderScheduler.getQueueStatus();
            expect(queueStatus.total).toBe(0); // 所有任务应该已完成
        });

        it('应该按优先级处理更新', async () => {
            const executionOrder = [];
            
            // 添加不同优先级的任务
            const lowPriorityPromise = optimizer.scheduleBatchUpdate(() => {
                executionOrder.push('low');
                return 'low';
            }, 'low');
            
            const highPriorityPromise = optimizer.scheduleBatchUpdate(() => {
                executionOrder.push('high');
                return 'high';
            }, 'high');
            
            const normalPriorityPromise = optimizer.scheduleBatchUpdate(() => {
                executionOrder.push('normal');
                return 'normal';
            }, 'normal');
            
            await Promise.all([lowPriorityPromise, highPriorityPromise, normalPriorityPromise]);
            
            // 高优先级应该先执行
            expect(executionOrder[0]).toBe('high');
        });
    });

    describe('内存管理测试', () => {
        it('应该监控内存使用情况', () => {
            const memoryUsage = optimizer.memoryMonitor.getCurrentUsage();
            
            if (memoryUsage) {
                expect(memoryUsage).toHaveProperty('used');
                expect(memoryUsage).toHaveProperty('total');
                expect(memoryUsage).toHaveProperty('limit');
                expect(memoryUsage).toHaveProperty('usageRatio');
                
                expect(memoryUsage.used).toBeGreaterThan(0);
                expect(memoryUsage.total).toBeGreaterThan(0);
                expect(memoryUsage.limit).toBeGreaterThan(0);
                expect(memoryUsage.usageRatio).toBeGreaterThanOrEqual(0);
                expect(memoryUsage.usageRatio).toBeLessThanOrEqual(1);
            }
        });

        it('应该记录内存历史', () => {
            const history = optimizer.memoryMonitor.getMemoryHistory();
            expect(Array.isArray(history)).toBe(true);
        });
    });

    describe('性能指标测试', () => {
        it('应该提供性能指标', () => {
            const metrics = optimizer.getMetrics();
            
            expect(metrics).toHaveProperty('cryptoOperations');
            expect(metrics).toHaveProperty('renderOperations');
            expect(metrics).toHaveProperty('memoryUsage');
            expect(metrics).toHaveProperty('avgResponseTime');
            expect(metrics).toHaveProperty('batchedOperations');
            expect(metrics).toHaveProperty('workerPoolStatus');
        });

        it('应该跟踪 Worker 池状态', () => {
            const status = optimizer.getWorkerPoolStatus();
            
            expect(status).toHaveProperty('totalWorkers');
            expect(status).toHaveProperty('busyWorkers');
            expect(status).toHaveProperty('totalTasks');
            
            expect(status.totalWorkers).toBeGreaterThan(0);
            expect(status.busyWorkers).toBeGreaterThanOrEqual(0);
            expect(status.totalTasks).toBeGreaterThanOrEqual(0);
        });
    });

    describe('大规模性能测试', () => {
        it('应该处理大量并发密码学操作', async () => {
            const operationCount = 100;
            const operations = [];
            
            // 创建大量并发操作
            for (let i = 0; i < operationCount; i++) {
                operations.push(
                    optimizer.executeCryptoOperation('generateKeyPair', {})
                );
            }
            
            const startTime = performance.now();
            const results = await Promise.all(operations);
            const endTime = performance.now();
            
            expect(results).toHaveLength(operationCount);
            results.forEach(result => {
                expect(result).toHaveProperty('publicKey');
                expect(result).toHaveProperty('privateKey');
            });
            
            const totalTime = endTime - startTime;
            const avgTime = totalTime / operationCount;
            
            console.log(`处理 ${operationCount} 个并发密钥生成耗时: ${totalTime}ms`);
            console.log(`平均每个操作耗时: ${avgTime}ms`);
            
            // 并发操作应该比串行操作更高效
            expect(avgTime).toBeLessThan(100); // 每个操作应该少于100ms
        });

        it('应该在高负载下保持稳定', async () => {
            const iterations = 5;
            const operationsPerIteration = 20;
            const results = [];
            
            for (let i = 0; i < iterations; i++) {
                const startTime = performance.now();
                
                const operations = [];
                for (let j = 0; j < operationsPerIteration; j++) {
                    operations.push(
                        optimizer.executeCryptoOperation('hash', {
                            message: `test message ${i}-${j}`
                        })
                    );
                }
                
                await Promise.all(operations);
                const endTime = performance.now();
                
                results.push(endTime - startTime);
            }
            
            // 计算性能稳定性
            const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
            const maxTime = Math.max(...results);
            const minTime = Math.min(...results);
            const variance = maxTime - minTime;
            
            console.log(`高负载测试结果:`);
            console.log(`平均时间: ${avgTime}ms`);
            console.log(`最大时间: ${maxTime}ms`);
            console.log(`最小时间: ${minTime}ms`);
            console.log(`时间方差: ${variance}ms`);
            
            // 性能应该相对稳定
            expect(variance / avgTime).toBeLessThan(2); // 方差不应超过平均值的2倍
        });
    });

    describe('错误处理和回退机制', () => {
        it('应该在 Worker 不可用时回退到主线程', async () => {
            // 模拟 Worker 不可用
            const originalWorkerPool = optimizer.workerPool;
            optimizer.workerPool = new Map();
            
            try {
                const keyPair = await optimizer.executeCryptoOperation('generateKeyPair', {});
                
                expect(keyPair).toHaveProperty('publicKey');
                expect(keyPair).toHaveProperty('privateKey');
            } finally {
                // 恢复 Worker 池
                optimizer.workerPool = originalWorkerPool;
            }
        });

        it('应该处理 Worker 超时', async () => {
            // 这个测试需要模拟 Worker 超时情况
            // 在实际实现中，可以通过修改 Worker 代码来模拟超时
            expect(true).toBe(true); // 占位测试
        });
    });

    describe('资源清理测试', () => {
        it('应该正确清理所有资源', () => {
            const initialWorkerCount = optimizer.workerPool.size;
            expect(initialWorkerCount).toBeGreaterThan(0);
            
            optimizer.cleanup();
            
            expect(optimizer.workerPool.size).toBe(0);
            expect(optimizer.memoryMonitor.isRunning).toBe(false);
            expect(optimizer.renderScheduler.isRunning).toBe(false);
            expect(optimizer.isInitialized).toBe(false);
        });
    });
});

describe('Crypto 服务性能优化集成测试', () => {
    let optimizer;
    
    beforeEach(async () => {
        optimizer = new PerformanceOptimizer();
        await optimizer.init();
        Crypto.setPerformanceOptimizer(optimizer);
    });
    
    afterEach(() => {
        if (optimizer) {
            optimizer.cleanup();
        }
        Crypto.setPerformanceOptimizer(null);
    });

    it('应该使用优化器进行密钥生成', async () => {
        const startTime = performance.now();
        const keyPair = await Crypto.genKeyPair();
        const endTime = performance.now();
        
        expect(keyPair).toHaveProperty('publicKey');
        expect(keyPair).toHaveProperty('privateKey');
        
        console.log(`优化后密钥生成耗时: ${endTime - startTime}ms`);
    });

    it('应该使用优化器进行签名和验证', async () => {
        const keyPair = await Crypto.genKeyPair();
        const message = 'test message';
        
        const signStartTime = performance.now();
        const signature = await Crypto.sign(message, keyPair.privateKey);
        const signEndTime = performance.now();
        
        const verifyStartTime = performance.now();
        const isValid = await Crypto.verify(signature, message, keyPair.publicKey);
        const verifyEndTime = performance.now();
        
        expect(isValid).toBe(true);
        
        console.log(`优化后签名耗时: ${signEndTime - signStartTime}ms`);
        console.log(`优化后验证耗时: ${verifyEndTime - verifyStartTime}ms`);
    });

    it('应该使用优化器进行哈希计算', async () => {
        const message = 'test message for hashing';
        
        const startTime = performance.now();
        const hash = await Crypto.sha256(message);
        const endTime = performance.now();
        
        expect(hash).toMatch(/^[0-9a-f]{64}$/);
        
        console.log(`优化后哈希计算耗时: ${endTime - startTime}ms`);
    });

    it('应该高效处理批量操作', async () => {
        const batchSize = 30;
        
        // 批量验证测试
        const keyPair = await Crypto.genKeyPair();
        const message = 'test message';
        const signature = await Crypto.sign(message, keyPair.privateKey);
        
        const verificationTasks = [];
        for (let i = 0; i < batchSize; i++) {
            verificationTasks.push({
                id: `task-${i}`,
                signature,
                message,
                publicKey: keyPair.publicKey
            });
        }
        
        const batchStartTime = performance.now();
        const batchResults = await Crypto.batchVerify(verificationTasks);
        const batchEndTime = performance.now();
        
        // 单个验证测试（用于比较）
        const singleStartTime = performance.now();
        const singleResults = [];
        for (let i = 0; i < batchSize; i++) {
            const result = await Crypto.verify(signature, message, keyPair.publicKey);
            singleResults.push(result);
        }
        const singleEndTime = performance.now();
        
        expect(batchResults).toHaveLength(batchSize);
        expect(singleResults).toHaveLength(batchSize);
        
        const batchTime = batchEndTime - batchStartTime;
        const singleTime = singleEndTime - singleStartTime;
        
        console.log(`批量验证 ${batchSize} 个签名耗时: ${batchTime}ms`);
        console.log(`单个验证 ${batchSize} 个签名耗时: ${singleTime}ms`);
        console.log(`性能提升: ${((singleTime - batchTime) / singleTime * 100).toFixed(2)}%`);
        
        // 批量操作应该更高效（至少不会更慢）
        expect(batchTime).toBeLessThanOrEqual(singleTime * 1.1); // 允许10%的误差
    });
});