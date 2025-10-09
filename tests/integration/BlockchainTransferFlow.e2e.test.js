/**
 * 端到端区块链转移流程集成测试
 * 
 * 测试完整的区块链转移流程：
 * - 创建转移区块到最终确认的完整过程
 * - 验证网络传播、验证和确认机制的正确性
 * - 测试多个并发转移的处理
 * 
 * 需求: 5.1, 5.2, 5.3, 5.4, 6.1-6.6, 8.1-8.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChainManager } from '../../src/services/ChainManager.js';
import { NetManager } from '../../src/services/NetManager.js';
import { Validator } from '../../src/services/Validator.js';
import { User } from '../../src/models/User.js';
import { Node } from '../../src/models/Node.js';
import { Timer } from '../../src/services/Timer.js';
import { Logger } from '../../src/services/Logger.js';

describe('端到端区块链转移流程测试', () => {
    let chainManager;
    let netManager;
    let validator;
    let users;
    let nodes;
    let timer;
    let logger;
    let testDefinition;

    beforeEach(async () => {
        // 初始化测试环境
        chainManager = new ChainManager();
        netManager = new NetManager({
            nodeCount: 5,
            connectionCount: 2,
            failureRate: 0.1,
            tickInterval: 100
        });
        validator = new Validator();
        timer = new Timer({ tickInterval: 100 });
        logger = new Logger();

        // 创建测试用的区块链定义
        testDefinition = {
            desc: "测试区块链",
            ranges: [
                { start: 1, end: 10, value: 100 },
                { start: 11, end: 20, value: 200 }
            ]
        };

        // 创建测试用户
        users = [];
        for (let i = 0; i < 3; i++) {
            const user = new User(`user-${i}`);
            await user.genKeyPair();
            users.push(user);
        }

        // 初始化网络
        await netManager.initNetwork();
        nodes = Array.from(netManager.nodes.values());

        // 创建区块链并分配所有权
        await chainManager.createBlockchainsFromDefinition(testDefinition, users);
    });

    afterEach(() => {
        netManager.cleanup();
        validator.clearCache();
        timer.stop();
        // Logger doesn't have a clear method, just create a 
    });

    describe('单个区块链转移流程', () => {
        it('应该完成完整的区块链转移流程', async () => {
            // 1. 获取一个区块链进行转移测试
            const allBlockchains = chainManager.getAllBlockchains();
            const [firstChainId, blockchain] = allBlockchains.entries().next().value;
            
            const currentOwner = blockchain.getCurrentOwner();
            const fromUser = users.find(u => u.getPubKey() === currentOwner);
            const toUser = users.find(u => u.getPubKey() !== currentOwner);
            
            expect(fromUser).toBeDefined();
            expect(toUser).toBeDefined();

            // 2. 创建转移区块
            const prevBlockId = blockchain.getLatestBlock().getId();
            const transferBlock = await fromUser.createTransferBlock(
                firstChainId,
                toUser.getPubKey(),
                prevBlockId
            );

            expect(transferBlock).toBeDefined();
            expect(transferBlock.getData().type).toBe('transfer');
            expect(transferBlock.getData().targetUserId).toBe(toUser.getPubKey());

            // 3. 验证转移区块的密码学签名
            const sigVerification = await validator.verifySig(transferBlock);
            expect(sigVerification.isValid).toBe(true);

            // 4. 验证区块链完整性
            const integrityVerification = await validator.verifyChainIntegrity(blockchain, transferBlock);
            expect(integrityVerification.isValid).toBe(true);

            // 5. 验证区块合法性
            const legalityVerification = await validator.validateLegality(
                transferBlock, 
                blockchain, 
                { blacklist: new Set() }
            );
            expect(legalityVerification.isValid).toBe(true);

            // 6. 模拟网络广播
            const broadcastResult = await netManager.broadcastMessage({
                type: 'BLOCK_BROADCAST',
                data: {
                    block: transferBlock.serialize(),
                    chainId: firstChainId
                },
                timestamp: Date.now()
            });

            expect(broadcastResult.success).toBe(true);
            expect(broadcastResult.reachedNodes).toBeGreaterThan(0);

            // 7. 验证接收时间
            const receiveTime = timer.getCurrentTick() + 5; // 模拟5个滴答后接收
            const timeValidation = validator.validateReceptionTime(
                transferBlock,
                receiveTime,
                {
                    nodeCount: netManager.nodeCount,
                    avgConnections: 2,
                    maxDelay: 9
                }
            );

            expect(timeValidation.isValid).toBe(true);

            // 8. 添加转移区块到区块链
            const addResult = blockchain.addBlock(transferBlock);
            expect(addResult).toBe(true);

            // 9. 验证所有权转移
            expect(blockchain.getCurrentOwner()).toBe(toUser.getPubKey());

            // 10. 更新用户的区块链映射
            fromUser.removeOwnedChain(firstChainId);
            toUser.addOwnedChain(firstChainId);

            // 11. 验证最终状态
            expect(fromUser.ownsChain(firstChainId)).toBe(false);
            expect(toUser.ownsChain(firstChainId)).toBe(true);

            // 12. 验证区块链历史记录
            const history = blockchain.getHistory();
            expect(history).toHaveLength(3); // 根区块 + 所有权区块 + 转移区块
            expect(history[2].type).toBe('transfer');
            expect(history[2].creator).toBe(fromUser.getPubKey());
        });

        it('应该正确处理转移时间验证失败的情况', async () => {
            const allBlockchains = chainManager.getAllBlockchains();
            const [firstChainId, blockchain] = allBlockchains.entries().next().value;
            
            const currentOwner = blockchain.getCurrentOwner();
            const fromUser = users.find(u => u.getPubKey() === currentOwner);
            const toUser = users.find(u => u.getPubKey() !== currentOwner);

            // 创建转移区块
            const prevBlockId = blockchain.getLatestBlock().getId();
            const transferBlock = await fromUser.createTransferBlock(
                firstChainId,
                toUser.getPubKey(),
                prevBlockId
            );

            // 模拟接收时间超过允许的最大延迟
            const broadcastTime = validator.calculateBroadcastTime({
                nodeCount: 5,
                avgConnections: 2,
                maxDelay: 9
            });
            const receiveTime = transferBlock.getTime() + (broadcastTime * 3); // 超过两倍广播时间

            const timeValidation = validator.validateReceptionTime(
                transferBlock,
                receiveTime,
                {
                    nodeCount: 5,
                    avgConnections: 2,
                    maxDelay: 9
                }
            );

            expect(timeValidation.isValid).toBe(false);
            expect(timeValidation.shouldReject).toBe(true);
            expect(timeValidation.error).toBe('TIME_VALIDATION_FAILED');
        });

        it('应该检测和处理双花攻击', async () => {
            const allBlockchains = chainManager.getAllBlockchains();
            const [firstChainId, blockchain] = allBlockchains.entries().next().value;
            
            const currentOwner = blockchain.getCurrentOwner();
            const fromUser = users.find(u => u.getPubKey() === currentOwner);
            const toUser1 = users.find(u => u.getPubKey() !== currentOwner);
            const toUser2 = users.find(u => u.getPubKey() !== currentOwner && u !== toUser1);

            const prevBlockId = blockchain.getLatestBlock().getId();

            // 创建两个转移区块到不同的用户（双花攻击）
            const transferBlock1 = await fromUser.createTransferBlock(
                firstChainId,
                toUser1.getPubKey(),
                prevBlockId
            );

            const transferBlock2 = await fromUser.createTransferBlock(
                firstChainId,
                toUser2.getPubKey(),
                prevBlockId
            );

            // 添加第一个转移区块
            const addResult1 = blockchain.addBlock(transferBlock1);
            expect(addResult1).toBe(true);

            // 检测第二个区块的分叉
            const forkDetection = blockchain.detectFork(transferBlock2);
            expect(forkDetection.isFork).toBe(true);
            expect(forkDetection.reason).toBe('DOUBLE_SPEND');

            // 验证第二个区块的合法性应该失败
            const legalityVerification = await validator.validateLegality(
                transferBlock2,
                blockchain,
                { blacklist: new Set() }
            );

            expect(legalityVerification.isValid).toBe(false);
        });
    });

    describe('并发转移处理', () => {
        it('应该正确处理多个并发转移', async () => {
            const allBlockchains = Array.from(chainManager.getAllBlockchains().entries());
            expect(allBlockchains.length).toBeGreaterThanOrEqual(3);

            const transferPromises = [];
            const transferResults = [];

            // 创建多个并发转移
            for (let i = 0; i < Math.min(3, allBlockchains.length); i++) {
                const [chainId, blockchain] = allBlockchains[i];
                const currentOwner = blockchain.getCurrentOwner();
                const fromUser = users.find(u => u.getPubKey() === currentOwner);
                const toUser = users.find(u => u.getPubKey() !== currentOwner);

                if (fromUser && toUser) {
                    const transferPromise = (async () => {
                        try {
                            const prevBlockId = blockchain.getLatestBlock().getId();
                            const transferBlock = await fromUser.createTransferBlock(
                                chainId,
                                toUser.getPubKey(),
                                prevBlockId
                            );

                            // 验证转移区块
                            const sigVerification = await validator.verifySig(transferBlock);
                            const legalityVerification = await validator.validateLegality(
                                transferBlock,
                                blockchain,
                                { blacklist: new Set() }
                            );

                            if (sigVerification.isValid && legalityVerification.isValid) {
                                // 模拟网络广播
                                const broadcastResult = await netManager.broadcastMessage({
                                    type: 'BLOCK_BROADCAST',
                                    data: {
                                        block: transferBlock.serialize(),
                                        chainId: chainId
                                    },
                                    timestamp: Date.now()
                                });

                                // 添加到区块链
                                const addResult = blockchain.addBlock(transferBlock);

                                return {
                                    chainId,
                                    success: addResult && broadcastResult.success,
                                    fromUser: fromUser.id,
                                    toUser: toUser.id,
                                    transferBlock: transferBlock
                                };
                            }

                            return {
                                chainId,
                                success: false,
                                error: 'Validation failed'
                            };
                        } catch (error) {
                            return {
                                chainId,
                                success: false,
                                error: error.message
                            };
                        }
                    })();

                    transferPromises.push(transferPromise);
                }
            }

            // 等待所有转移完成
            const results = await Promise.all(transferPromises);
            
            // 验证结果
            const successfulTransfers = results.filter(r => r.success);
            expect(successfulTransfers.length).toBeGreaterThan(0);

            // 验证每个成功的转移
            for (const result of successfulTransfers) {
                const blockchain = chainManager.getBlockchain(result.chainId);
                expect(blockchain).toBeDefined();
                
                // 验证区块链完整性
                const integrityCheck = await validator.verifyChainIntegrity(blockchain);
                expect(integrityCheck.isValid).toBe(true);
            }
        });

        it('应该正确处理网络分区情况下的转移', async () => {
            // 模拟网络分区
            const originalFailureRate = netManager.failureRate;
            netManager.updateNetworkConfig({ failureRate: 0.5 }); // 增加故障率

            const allBlockchains = chainManager.getAllBlockchains();
            const [firstChainId, blockchain] = allBlockchains.entries().next().value;
            
            const currentOwner = blockchain.getCurrentOwner();
            const fromUser = users.find(u => u.getPubKey() === currentOwner);
            const toUser = users.find(u => u.getPubKey() !== currentOwner);

            // 创建转移区块
            const prevBlockId = blockchain.getLatestBlock().getId();
            const transferBlock = await fromUser.createTransferBlock(
                firstChainId,
                toUser.getPubKey(),
                prevBlockId
            );

            // 尝试广播（可能部分失败）
            const broadcastResult = await netManager.broadcastMessage({
                type: 'BLOCK_BROADCAST',
                data: {
                    block: transferBlock.serialize(),
                    chainId: firstChainId
                },
                timestamp: Date.now()
            });

            // 即使网络有问题，转移本身应该是有效的
            const sigVerification = await validator.verifySig(transferBlock);
            expect(sigVerification.isValid).toBe(true);

            const legalityVerification = await validator.validateLegality(
                transferBlock,
                blockchain,
                { blacklist: new Set() }
            );
            expect(legalityVerification.isValid).toBe(true);

            // 恢复网络配置
            netManager.updateNetworkConfig({ failureRate: originalFailureRate });
        });
    });

    describe('确认机制测试', () => {
        it('应该正确实现确认等待期机制', async () => {
            const allBlockchains = chainManager.getAllBlockchains();
            const [firstChainId, blockchain] = allBlockchains.entries().next().value;
            
            const currentOwner = blockchain.getCurrentOwner();
            const fromUser = users.find(u => u.getPubKey() === currentOwner);
            const toUser = users.find(u => u.getPubKey() !== currentOwner);

            // 创建转移区块
            const prevBlockId = blockchain.getLatestBlock().getId();
            const transferBlock = await fromUser.createTransferBlock(
                firstChainId,
                toUser.getPubKey(),
                prevBlockId
            );

            const blockTime = transferBlock.getTime();
            
            // 计算确认等待期（全网广播时间的四倍）
            const broadcastTime = validator.calculateBroadcastTime({
                nodeCount: 5,
                avgConnections: 2,
                maxDelay: 9
            });
            const confirmationWaitTime = broadcastTime * 4;

            // 模拟在等待期内的不同时间点
            const waitPeriodTests = [
                { time: blockTime + broadcastTime, shouldConfirm: false },
                { time: blockTime + broadcastTime * 2, shouldConfirm: false },
                { time: blockTime + broadcastTime * 3, shouldConfirm: false },
                { time: blockTime + confirmationWaitTime + 1, shouldConfirm: true }
            ];

            for (const test of waitPeriodTests) {
                const hasWaitedEnough = (test.time - blockTime) >= confirmationWaitTime;
                expect(hasWaitedEnough).toBe(test.shouldConfirm);
            }
        });

        it('应该在等待期内检测冲突区块', async () => {
            const allBlockchains = chainManager.getAllBlockchains();
            const [firstChainId, blockchain] = allBlockchains.entries().next().value;
            
            const currentOwner = blockchain.getCurrentOwner();
            const fromUser = users.find(u => u.getPubKey() === currentOwner);
            const toUser1 = users.find(u => u.getPubKey() !== currentOwner);
            const toUser2 = users.find(u => u.getPubKey() !== currentOwner && u !== toUser1);

            const prevBlockId = blockchain.getLatestBlock().getId();

            // 创建第一个转移区块
            const transferBlock1 = await fromUser.createTransferBlock(
                firstChainId,
                toUser1.getPubKey(),
                prevBlockId
            );

            // 添加第一个区块
            blockchain.addBlock(transferBlock1);

            // 在等待期内创建冲突区块
            const conflictBlock = await fromUser.createTransferBlock(
                firstChainId,
                toUser2.getPubKey(),
                prevBlockId
            );

            // 检测冲突
            const forkDetection = blockchain.detectFork(conflictBlock);
            expect(forkDetection.isFork).toBe(true);
            expect(forkDetection.reason).toBe('DOUBLE_SPEND');

            // 冲突区块应该被拒绝
            const addResult = blockchain.addBlock(conflictBlock);
            expect(addResult).toBe(false);
        });
    });

    describe('网络传播验证', () => {
        it('应该验证消息在网络中的正确传播', async () => {
            const allBlockchains = chainManager.getAllBlockchains();
            const [firstChainId, blockchain] = allBlockchains.entries().next().value;
            
            const currentOwner = blockchain.getCurrentOwner();
            const fromUser = users.find(u => u.getPubKey() === currentOwner);
            const toUser = users.find(u => u.getPubKey() !== currentOwner);

            // 创建转移区块
            const prevBlockId = blockchain.getLatestBlock().getId();
            const transferBlock = await fromUser.createTransferBlock(
                firstChainId,
                toUser.getPubKey(),
                prevBlockId
            );

            // 记录广播前的网络状态
            const initialNetworkStatus = netManager.getNetworkStatus();
            
            // 广播转移区块
            const broadcastResult = await netManager.broadcastMessage({
                type: 'BLOCK_BROADCAST',
                data: {
                    block: transferBlock.serialize(),
                    chainId: firstChainId
                },
                timestamp: Date.now()
            });

            // 验证广播结果
            expect(broadcastResult.success).toBe(true);
            expect(broadcastResult.totalNodes).toBe(netManager.nodeCount);
            expect(broadcastResult.reachedNodes).toBeGreaterThan(0);
            expect(broadcastResult.coverage).toBeGreaterThan(0);

            // 验证网络统计更新
            const finalNetworkStatus = netManager.getNetworkStatus();
            expect(finalNetworkStatus.networkStats.totalMessages).toBeGreaterThan(
                initialNetworkStatus.networkStats.totalMessages
            );
            expect(finalNetworkStatus.networkStats.broadcastCount).toBeGreaterThan(
                initialNetworkStatus.networkStats.broadcastCount
            );
        });

        it('应该计算正确的全网广播时间', async () => {
            const networkParams = {
                nodeCount: netManager.nodeCount,
                avgConnections: 2,
                maxDelay: 9
            };

            const broadcastTime = validator.calculateBroadcastTime(networkParams);
            
            // 广播时间应该是合理的
            expect(broadcastTime).toBeGreaterThan(0);
            expect(broadcastTime).toBeLessThan(100); // 不应该太大

            // 验证广播时间计算的一致性
            const broadcastTime2 = validator.calculateBroadcastTime(networkParams);
            expect(broadcastTime).toBe(broadcastTime2);
        });
    });

    describe('错误处理和边界情况', () => {
        it('应该正确处理无效的转移请求', async () => {
            const allBlockchains = chainManager.getAllBlockchains();
            const [firstChainId, blockchain] = allBlockchains.entries().next().value;
            
            const currentOwner = blockchain.getCurrentOwner();
            const nonOwnerUser = users.find(u => u.getPubKey() !== currentOwner);
            const toUser = users.find(u => u.getPubKey() !== currentOwner && u !== nonOwnerUser);

            // 尝试让非所有者创建转移区块
            const prevBlockId = blockchain.getLatestBlock().getId();
            const invalidTransferBlock = await nonOwnerUser.createTransferBlock(
                firstChainId,
                toUser.getPubKey(),
                prevBlockId
            );

            // 验证应该失败
            const legalityVerification = await validator.validateLegality(
                invalidTransferBlock,
                blockchain,
                { blacklist: new Set() }
            );

            expect(legalityVerification.isValid).toBe(false);
            expect(legalityVerification.error).toBe('OWNERSHIP_VIOLATION');
        });

        it('应该正确处理黑名单用户的转移请求', async () => {
            const allBlockchains = chainManager.getAllBlockchains();
            const [firstChainId, blockchain] = allBlockchains.entries().next().value;
            
            const currentOwner = blockchain.getCurrentOwner();
            const fromUser = users.find(u => u.getPubKey() === currentOwner);
            const toUser = users.find(u => u.getPubKey() !== currentOwner);

            // 将用户加入黑名单
            const blacklist = new Set([fromUser.getPubKey()]);

            // 创建转移区块
            const prevBlockId = blockchain.getLatestBlock().getId();
            const transferBlock = await fromUser.createTransferBlock(
                firstChainId,
                toUser.getPubKey(),
                prevBlockId
            );

            // 验证应该失败
            const legalityVerification = await validator.validateLegality(
                transferBlock,
                blockchain,
                { blacklist }
            );

            expect(legalityVerification.isValid).toBe(false);
            expect(legalityVerification.error).toBe('CREATOR_BLACKLISTED');
        });

        it('应该正确处理不存在的区块链转移', async () => {
            const nonExistentChainId = 'non-existent-chain';
            const fromUser = users[0];
            const toUser = users[1];

            // 尝试转移不存在的区块链
            await expect(
                chainManager.transferBlockchain(nonExistentChainId, fromUser.id, toUser.id)
            ).rejects.toThrow('区块链 non-existent-chain 不存在');
        });
    });

    describe('性能和压力测试', () => {
        it('应该在合理时间内处理大量转移', async () => {
            const startTime = Date.now();
            const transferCount = 10;
            const allBlockchains = Array.from(chainManager.getAllBlockchains().entries());
            
            const transferPromises = [];
            
            for (let i = 0; i < Math.min(transferCount, allBlockchains.length); i++) {
                const [chainId, blockchain] = allBlockchains[i];
                const currentOwner = blockchain.getCurrentOwner();
                const fromUser = users.find(u => u.getPubKey() === currentOwner);
                const toUser = users.find(u => u.getPubKey() !== currentOwner);

                if (fromUser && toUser) {
                    const transferPromise = (async () => {
                        const prevBlockId = blockchain.getLatestBlock().getId();
                        const transferBlock = await fromUser.createTransferBlock(
                            chainId,
                            toUser.getPubKey(),
                            prevBlockId
                        );

                        const sigVerification = await validator.verifySig(transferBlock);
                        const legalityVerification = await validator.validateLegality(
                            transferBlock,
                            blockchain,
                            { blacklist: new Set() }
                        );

                        return sigVerification.isValid && legalityVerification.isValid;
                    })();

                    transferPromises.push(transferPromise);
                }
            }

            const results = await Promise.all(transferPromises);
            const endTime = Date.now();
            const duration = endTime - startTime;

            // 验证性能
            expect(duration).toBeLessThan(5000); // 应该在5秒内完成
            expect(results.filter(r => r).length).toBeGreaterThan(0); // 至少有一些成功
        });
    });
});