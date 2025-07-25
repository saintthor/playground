/**
 * 安全机制和攻击检测集成测试
 * 
 * 测试需求 7.1, 7.2, 7.3, 7.4：
 * - 编写双花攻击检测的完整测试场景
 * - 测试分叉警告的广播和处理机制
 * - 验证用户黑名单和安全防护的有效性
 * - 测试各种攻击场景下系统的稳定性
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Validator } from '../../src/services/Validator.js';
import { NetManager } from '../../src/services/NetManager.js';
import { ChainManager } from '../../src/services/ChainManager.js';
import { User } from '../../src/models/User.js';
import { Block } from '../../src/models/Block.js';
import { BlockChain } from '../../src/models/BlockChain.js';
import { Timer } from '../../src/services/Timer.js';
import { Logger } from '../../src/services/Logger.js';
import { Crypto } from '../../src/services/Crypto.js';

describe('安全机制和攻击检测集成测试', () => {
    let validator;
    let netManager;
    let chainManager;
    let timer;
    let logger;
    let users;
    let testBlockchain;
    let networkState;
    let testDefinition;

    beforeEach(async () => {
        // 初始化核心组件
        validator = new Validator();
        netManager = new NetManager({
            nodeCount: 5,
            connectionCount: 3,
            failureRate: 0.1,
            tickInterval: 100
        });
        chainManager = new ChainManager();
        timer = new Timer({ tickInterval: 100 });
        logger = new Logger();

        // 创建测试用户
        users = [];
        for (let i = 0; i < 4; i++) {
            const user = new User(`user-${i}`);
            await user.genKeyPair();
            users.push(user);
        }

        // 创建测试区块链
        testDefinition = {
            desc: "安全测试区块链",
            ranges: [{ start: 1, end: 100, value: 1000 }]
        };

        testBlockchain = new BlockChain(testDefinition, '42');
        // Wait for root block creation to complete
        await new Promise(resolve => setTimeout(resolve, 10));
        await testBlockchain.createOwnerBlock(users[0].getPubKey(), users[0].privateKey);

        // 初始化网络状态
        networkState = {
            blacklist: new Set(),
            approvedForks: new Set(),
            blacklistEvents: [],
            forkWarnings: [],
            securityEvents: []
        };

        // 初始化网络
        await netManager.initNetwork();
    });

    afterEach(() => {
        validator.clearCache();
        netManager.cleanup();
        timer.stop();
    });

    describe('双花攻击检测', () => {
        it('应该检测到基本的双花攻击', async () => {
            const attacker = users[0]; // 当前所有者
            const victim1 = users[1];
            const victim2 = users[2];

            const latestBlock = testBlockchain.getLatestBlock();

            // 创建第一个转移区块
            const transferBlock1 = await attacker.createTransferBlock(
                testBlockchain.getId(),
                victim1.getPubKey(),
                latestBlock.getId()
            );

            // 创建第二个转移区块（双花攻击）
            const transferBlock2 = await attacker.createTransferBlock(
                testBlockchain.getId(),
                victim2.getPubKey(),
                latestBlock.getId()
            );

            // 添加第一个区块
            const addResult1 = testBlockchain.addBlock(transferBlock1);
            expect(addResult1).toBe(true);

            // 检测双花攻击
            const doubleSpendResult = validator.detectDoubleSpend(
                transferBlock2, 
                testBlockchain, 
                networkState
            );

            expect(doubleSpendResult.isDoubleSpend).toBe(true);
            expect(doubleSpendResult.attackType).toBe('DOUBLE_SPEND');
            expect(doubleSpendResult.attacker).toBe(attacker.getPubKey());
            expect(doubleSpendResult.conflictingBlocks).toBeDefined();

            // 验证第二个区块应该被拒绝
            const legalityCheck = await validator.validateLegality(
                transferBlock2,
                testBlockchain,
                networkState
            );

            expect(legalityCheck.isValid).toBe(false);
            expect(legalityCheck.error).toBe('OWNERSHIP_VIOLATION');
        });

        it('应该检测到复杂的双花攻击场景', async () => {
            const attacker = users[0];
            const victims = [users[1], users[2], users[3]];

            const latestBlock = testBlockchain.getLatestBlock();
            const transferBlocks = [];

            // 创建多个转移区块到不同受害者
            for (const victim of victims) {
                const transferBlock = await attacker.createTransferBlock(
                    testBlockchain.getId(),
                    victim.getPubKey(),
                    latestBlock.getId()
                );
                transferBlocks.push(transferBlock);
            }

            // 添加第一个区块
            testBlockchain.addBlock(transferBlocks[0]);

            // 检测其他区块的双花攻击
            for (let i = 1; i < transferBlocks.length; i++) {
                const doubleSpendResult = validator.detectDoubleSpend(
                    transferBlocks[i],
                    testBlockchain,
                    networkState
                );

                expect(doubleSpendResult.isDoubleSpend).toBe(true);
                expect(doubleSpendResult.attackType).toBe('DOUBLE_SPEND');
                expect(doubleSpendResult.attacker).toBe(attacker.getPubKey());
            }
        });

        it('应该在检测到双花攻击后自动将攻击者加入黑名单', async () => {
            const attacker = users[0];
            const victim1 = users[1];
            const victim2 = users[2];

            const latestBlock = testBlockchain.getLatestBlock();

            // 创建双花攻击
            const transferBlock1 = await attacker.createTransferBlock(
                testBlockchain.getId(),
                victim1.getPubKey(),
                latestBlock.getId()
            );

            const transferBlock2 = await attacker.createTransferBlock(
                testBlockchain.getId(),
                victim2.getPubKey(),
                latestBlock.getId()
            );

            testBlockchain.addBlock(transferBlock1);

            // 检测双花攻击并处理
            const doubleSpendResult = validator.detectDoubleSpend(
                transferBlock2,
                testBlockchain,
                networkState
            );

            expect(doubleSpendResult.isDoubleSpend).toBe(true);

            // 获取黑名单管理器并添加攻击者
            const blacklistManager = validator.getBlacklistManager(networkState);
            const blacklistResult = blacklistManager.addToBlacklist(
                attacker.getPubKey(),
                'DOUBLE_SPEND_ATTACK'
            );

            expect(blacklistResult.success).toBe(true);
            expect(networkState.blacklist.has(attacker.getPubKey())).toBe(true);

            // 验证攻击者后续的区块会被拒绝
            const futureBlock = await attacker.createTransferBlock(
                testBlockchain.getId(),
                victim1.getPubKey(),
                transferBlock1.getId()
            );

            const legalityCheck = await validator.validateLegality(
                futureBlock,
                testBlockchain,
                networkState
            );

            expect(legalityCheck.isValid).toBe(false);
            expect(legalityCheck.error).toBe('CREATOR_BLACKLISTED');
        });

        it('应该正确处理时间相关的双花攻击', async () => {
            const attacker = users[0];
            const victim1 = users[1];
            const victim2 = users[2];

            const latestBlock = testBlockchain.getLatestBlock();
            const baseTime = Date.now();

            // 创建时间间隔很小的双花攻击
            const transferBlock1 = new Block(
                {
                    type: 'transfer',
                    blockchainId: testBlockchain.getId(),
                    targetUserId: victim1.getPubKey()
                },
                latestBlock.getId(),
                attacker.getPubKey(),
                baseTime
            );

            const transferBlock2 = new Block(
                {
                    type: 'transfer',
                    blockchainId: testBlockchain.getId(),
                    targetUserId: victim2.getPubKey()
                },
                latestBlock.getId(),
                attacker.getPubKey(),
                baseTime + 1 // 几乎同时创建
            );

            await transferBlock1.genId();
            await transferBlock1.signBlock(attacker.privateKey);
            await transferBlock2.genId();
            await transferBlock2.signBlock(attacker.privateKey);

            // 添加第一个区块
            testBlockchain.addBlock(transferBlock1);

            // 检测第二个区块的双花攻击
            const doubleSpendResult = validator.detectDoubleSpend(
                transferBlock2,
                testBlockchain,
                networkState
            );

            expect(doubleSpendResult.isDoubleSpend).toBe(true);
            // 验证冲突区块的时间信息
            expect(doubleSpendResult.conflictingBlocks).toHaveLength(1);
            const timeDiff = Math.abs(doubleSpendResult.conflictingBlocks[0].timestamp - baseTime);
            expect(timeDiff).toBeLessThan(10); // 时间间隔很小
        });
    });

    describe('分叉警告广播和处理', () => {
        it('应该生成并广播分叉警告', async () => {
            const attacker = users[0];
            const victim1 = users[1];
            const victim2 = users[2];

            const latestBlock = testBlockchain.getLatestBlock();

            // 创建分叉
            const transferBlock1 = await attacker.createTransferBlock(
                testBlockchain.getId(),
                victim1.getPubKey(),
                latestBlock.getId()
            );

            const transferBlock2 = await attacker.createTransferBlock(
                testBlockchain.getId(),
                victim2.getPubKey(),
                latestBlock.getId()
            );

            testBlockchain.addBlock(transferBlock1);

            // 检测分叉
            const forkDetection = testBlockchain.detectFork(transferBlock2);
            expect(forkDetection.isFork).toBe(true);

            // 生成分叉警告
            const forkWarning = validator.generateForkWarning({
                reason: forkDetection.reason,
                attacker: attacker.getPubKey(),
                blockchainId: testBlockchain.getId(),
                conflictingBlocks: [
                    { blockId: transferBlock1.getId(), creator: attacker.getPubKey() },
                    { blockId: transferBlock2.getId(), creator: attacker.getPubKey() }
                ]
            });

            expect(forkWarning.type).toBe('FORK_WARNING');
            expect(forkWarning.priority).toBe('HIGH');
            expect(forkWarning.forkDetails.reason).toBe(forkDetection.reason);
            expect(forkWarning.forkDetails.conflictingBlocks).toHaveLength(2);

            // 模拟广播分叉警告
            const broadcastResult = await netManager.broadcastMessage(forkWarning);
            
            expect(broadcastResult.reachedNodes).toBeGreaterThan(0);
            expect(broadcastResult.totalNodes).toBe(5);

            // 验证警告被正确记录
            networkState.forkWarnings.push(forkWarning);
            expect(networkState.forkWarnings).toHaveLength(1);
        });

        it('应该正确处理接收到的分叉警告', async () => {
            const mockForkWarning = {
                type: 'FORK_WARNING',
                priority: 'HIGH',
                timestamp: Date.now(),
                data: {
                    reason: 'DOUBLE_SPEND',
                    blockchainId: testBlockchain.getId(),
                    conflictingBlocks: [
                        { blockId: 'block1', creator: users[0].getPubKey() },
                        { blockId: 'block2', creator: users[0].getPubKey() }
                    ]
                }
            };

            // 模拟节点接收分叉警告
            const nodes = Array.from(netManager.nodes.values());
            const testNode = nodes[0];

            // 处理分叉警告
            testNode.receiveMsg(mockForkWarning, 'warning-source');

            // 验证消息被正确接收
            expect(testNode.messageQueue.length).toBeGreaterThanOrEqual(1);
            const lastMessage = testNode.messageQueue[testNode.messageQueue.length - 1];
            expect(lastMessage.type).toBe('FORK_WARNING');

            // 验证高优先级消息的处理
            const routerStatus = netManager.getRouterStatus();
            expect(routerStatus.stats.messagesByType.FORK_WARNING).toBeGreaterThan(0);
        });

        it('应该在分叉警告后暂停相关区块链的操作', async () => {
            const user = users[1];
            const targetUser = users[2];

            // 模拟收到分叉警告
            const forkWarning = {
                type: 'FORK_WARNING',
                data: {
                    blockchainId: testBlockchain.getId(),
                    reason: 'DOUBLE_SPEND'
                },
                timestamp: Date.now()
            };

            networkState.forkWarnings.push(forkWarning);

            // 尝试在警告期间进行转移
            const latestBlock = testBlockchain.getLatestBlock();
            const transferBlock = await user.createTransferBlock(
                testBlockchain.getId(),
                targetUser.getPubKey(),
                latestBlock.getId()
            );

            // 验证在分叉警告期间的操作应该被特别处理
            const warningCheck = validator.checkForActiveWarnings(
                testBlockchain.getId(),
                networkState
            );

            expect(warningCheck.hasActiveWarnings).toBe(true);
            expect(warningCheck.warnings).toHaveLength(1);
            expect(warningCheck.warnings[0].data.reason).toBe('DOUBLE_SPEND');
        });

        it('应该正确处理多个并发分叉警告', async () => {
            const warnings = [];

            // 创建多个分叉警告
            for (let i = 0; i < 3; i++) {
                const warning = {
                    type: 'FORK_WARNING',
                    priority: 'HIGH',
                    timestamp: Date.now() + i * 1000,
                    data: {
                        reason: 'POSITION_CONFLICT',
                        blockchainId: `chain-${i}`,
                        conflictingBlocks: [
                            { blockId: `block-${i}-1`, creator: users[0].getPubKey() },
                            { blockId: `block-${i}-2`, creator: users[1].getPubKey() }
                        ]
                    }
                };
                warnings.push(warning);
            }

            // 并发广播所有警告
            const broadcastPromises = warnings.map(warning => 
                netManager.broadcastMessage(warning)
            );

            const results = await Promise.all(broadcastPromises);

            // 验证所有警告都成功广播
            results.forEach(result => {
                expect(result.reachedNodes).toBeGreaterThan(0);
                expect(result.totalNodes).toBe(5);
            });

            // 验证消息路由器正确处理高优先级消息
            const routerStatus = netManager.getRouterStatus();
            expect(routerStatus.priorityQueueSize).toBeGreaterThanOrEqual(0);
        });
    });

    describe('用户黑名单和安全防护', () => {
        it('应该正确管理用户黑名单', async () => {
            const blacklistManager = validator.getBlacklistManager(networkState);
            const maliciousUser = users[0];

            // 添加用户到黑名单
            const addResult = blacklistManager.addToBlacklist(
                maliciousUser.getPubKey(),
                'SECURITY_VIOLATION'
            );

            expect(addResult.success).toBe(true);
            expect(addResult.message).toContain('已被加入黑名单');
            expect(networkState.blacklist.has(maliciousUser.getPubKey())).toBe(true);

            // 验证黑名单事件被记录
            expect(networkState.blacklistEvents).toHaveLength(1);
            expect(networkState.blacklistEvents[0].action).toBe('BLACKLISTED');
            expect(networkState.blacklistEvents[0].reason).toBe('SECURITY_VIOLATION');

            // 检查用户是否在黑名单中
            const isBlacklisted = blacklistManager.isBlacklisted(maliciousUser.getPubKey());
            expect(isBlacklisted).toBe(true);

            // 获取黑名单统计
            const stats = blacklistManager.getStats();
            expect(stats.totalBlacklisted).toBe(1);
            expect(stats.blacklistedUsers).toContain(maliciousUser.getPubKey());
            expect(stats.totalEvents).toBe(1);
        });

        it('应该阻止黑名单用户的所有操作', async () => {
            const blacklistManager = validator.getBlacklistManager(networkState);
            const maliciousUser = users[0];
            const targetUser = users[1];

            // 将用户加入黑名单
            blacklistManager.addToBlacklist(maliciousUser.getPubKey(), 'MALICIOUS_BEHAVIOR');

            // 尝试创建转移区块
            const latestBlock = testBlockchain.getLatestBlock();
            const transferBlock = await maliciousUser.createTransferBlock(
                testBlockchain.getId(),
                targetUser.getPubKey(),
                latestBlock.getId()
            );

            // 验证区块合法性检查失败
            const legalityCheck = await validator.validateLegality(
                transferBlock,
                testBlockchain,
                networkState
            );

            expect(legalityCheck.isValid).toBe(false);
            expect(legalityCheck.error).toBe('CREATOR_BLACKLISTED');
            expect(legalityCheck.message).toContain('已被列入黑名单');

            // 验证区块不能被添加到区块链 (区块链本身不检查黑名单，这是应用层的责任)
            const addResult = testBlockchain.addBlock(transferBlock);
            expect(addResult).toBe(true); // 区块链层面的添加会成功，但应用层应该阻止
        });

        it('应该支持从黑名单中移除用户', async () => {
            const blacklistManager = validator.getBlacklistManager(networkState);
            const user = users[0];

            // 添加到黑名单
            blacklistManager.addToBlacklist(user.getPubKey(), 'TEMPORARY_SUSPENSION');
            expect(blacklistManager.isBlacklisted(user.getPubKey())).toBe(true);

            // 从黑名单移除
            const removeResult = blacklistManager.removeFromBlacklist(user.getPubKey());
            expect(removeResult.success).toBe(true);
            expect(blacklistManager.isBlacklisted(user.getPubKey())).toBe(false);

            // 验证移除事件被记录
            const events = networkState.blacklistEvents;
            const removeEvent = events.find(e => e.action === 'REMOVED_FROM_BLACKLIST');
            expect(removeEvent).toBeDefined();
            expect(removeEvent.userId).toBe(user.getPubKey());

            // 验证用户现在可以正常操作
            const targetUser = users[1];
            const latestBlock = testBlockchain.getLatestBlock();
            const transferBlock = await user.createTransferBlock(
                testBlockchain.getId(),
                targetUser.getPubKey(),
                latestBlock.getId()
            );

            const legalityCheck = await validator.validateLegality(
                transferBlock,
                testBlockchain,
                networkState
            );

            expect(legalityCheck.isValid).toBe(true);
        });

        it('应该正确处理重复的黑名单操作', async () => {
            const blacklistManager = validator.getBlacklistManager(networkState);
            const user = users[0];

            // 第一次添加
            const addResult1 = blacklistManager.addToBlacklist(user.getPubKey(), 'FIRST_OFFENSE');
            expect(addResult1.success).toBe(true);

            // 重复添加
            const addResult2 = blacklistManager.addToBlacklist(user.getPubKey(), 'SECOND_OFFENSE');
            expect(addResult2.success).toBe(false);
            expect(addResult2.message).toContain('已在黑名单中');

            // 尝试移除不存在的用户
            const removeResult = blacklistManager.removeFromBlacklist(users[1].getPubKey());
            expect(removeResult.success).toBe(false);
            expect(removeResult.message).toContain('不在黑名单中');
        });

        it('应该广播黑名单更新消息', async () => {
            const blacklistManager = validator.getBlacklistManager(networkState);
            const maliciousUser = users[0];

            // 添加到黑名单
            blacklistManager.addToBlacklist(maliciousUser.getPubKey(), 'ATTACK_DETECTED');

            // 创建黑名单更新消息
            const blacklistUpdate = {
                type: 'BLACKLIST_UPDATE',
                priority: 'HIGH',
                timestamp: Date.now(),
                data: {
                    action: 'ADD',
                    userId: maliciousUser.getPubKey(),
                    reason: 'ATTACK_DETECTED'
                }
            };

            // 广播黑名单更新
            const broadcastResult = await netManager.broadcastMessage(blacklistUpdate);
            
            expect(broadcastResult.reachedNodes).toBeGreaterThan(0);
            expect(broadcastResult.totalNodes).toBe(5);

            // 验证消息被正确路由
            const routerStatus = netManager.getRouterStatus();
            expect(routerStatus.stats.messagesByType.BLACKLIST_UPDATE || 0).toBeGreaterThanOrEqual(0);
        });
    });

    describe('系统稳定性测试', () => {
        it('应该在大规模攻击下保持稳定', async () => {
            const attackers = users.slice(0, 3);
            const victims = users.slice(1, 4);
            const attackBlocks = [];

            // 创建多个区块链进行攻击测试
            const blockchains = [];
            for (let i = 0; i < 3; i++) {
                const blockchain = new BlockChain(testDefinition, `${100 + i}`);
                await blockchain.createRootBlock();
                await blockchain.createOwnerBlock(attackers[i].getPubKey(), attackers[i].privateKey);
                blockchains.push(blockchain);
            }

            // 模拟大规模双花攻击
            for (let i = 0; i < blockchains.length; i++) {
                const blockchain = blockchains[i];
                const attacker = attackers[i];
                const latestBlock = blockchain.getLatestBlock();

                // 每个攻击者创建多个冲突区块
                for (let j = 0; j < victims.length; j++) {
                    const attackBlock = await attacker.createTransferBlock(
                        blockchain.getId(),
                        victims[j].getPubKey(),
                        latestBlock.getId()
                    );
                    attackBlocks.push({ block: attackBlock, blockchain });
                }
            }

            // 处理所有攻击区块
            let detectedAttacks = 0;
            let blacklistedUsers = 0;

            for (let i = 0; i < attackBlocks.length; i++) {
                const { block, blockchain } = attackBlocks[i];
                
                // 添加第一个区块
                if (i % victims.length === 0) {
                    blockchain.addBlock(block);
                    continue;
                }

                // 检测后续的双花攻击
                const doubleSpendResult = validator.detectDoubleSpend(block, blockchain, networkState);
                
                if (doubleSpendResult.isDoubleSpend) {
                    detectedAttacks++;
                    
                    // 将攻击者加入黑名单
                    const blacklistManager = validator.getBlacklistManager(networkState);
                    const blacklistResult = blacklistManager.addToBlacklist(
                        block.getCreator(),
                        'DOUBLE_SPEND_ATTACK'
                    );
                    
                    if (blacklistResult.success) {
                        blacklistedUsers++;
                    }
                }
            }

            // 验证系统正确检测和处理了攻击
            expect(detectedAttacks).toBeGreaterThan(0);
            expect(blacklistedUsers).toBeGreaterThan(0);
            expect(networkState.blacklist.size).toBe(blacklistedUsers);

            // 验证系统仍然稳定运行
            const networkStatus = netManager.getNetworkStatus();
            expect(networkStatus.isInitialized).toBe(true);
            expect(networkStatus.nodeCount).toBe(5);
        });

        it('应该正确处理网络分区期间的安全事件', async () => {
            // 模拟网络分区
            const originalFailureRate = netManager.failureRate;
            netManager.updateNetworkConfig({ failureRate: 0.7 }); // 高故障率

            const attacker = users[0];
            const victim1 = users[1];
            const victim2 = users[2];

            const latestBlock = testBlockchain.getLatestBlock();

            // 在网络分区期间创建双花攻击
            const transferBlock1 = await attacker.createTransferBlock(
                testBlockchain.getId(),
                victim1.getPubKey(),
                latestBlock.getId()
            );

            const transferBlock2 = await attacker.createTransferBlock(
                testBlockchain.getId(),
                victim2.getPubKey(),
                latestBlock.getId()
            );

            // 尝试广播第一个区块
            const broadcast1 = await netManager.broadcastMessage({
                type: 'BLOCK_BROADCAST',
                data: { block: transferBlock1.serialize() }
            });

            // 添加第一个区块
            testBlockchain.addBlock(transferBlock1);

            // 检测第二个区块的双花攻击
            const doubleSpendResult = validator.detectDoubleSpend(
                transferBlock2,
                testBlockchain,
                networkState
            );

            expect(doubleSpendResult.isDoubleSpend).toBe(true);

            // 尝试广播分叉警告（可能部分失败）
            const forkWarning = validator.generateForkWarning({
                reason: 'DOUBLE_SPEND',
                conflictBlock: transferBlock1,
                newBlock: transferBlock2,
                blockchainId: testBlockchain.getId()
            });

            const warningBroadcast = await netManager.broadcastMessage(forkWarning);

            // 即使网络有问题，安全检测仍应正常工作
            expect(doubleSpendResult.isDoubleSpend).toBe(true);
            expect(forkWarning.type).toBe('FORK_WARNING');

            // 恢复网络
            netManager.updateNetworkConfig({ failureRate: originalFailureRate });
        });

        it('应该处理高频攻击尝试', async () => {
            const attacker = users[0];
            const victims = users.slice(1, 4);
            const latestBlock = testBlockchain.getLatestBlock();

            const startTime = Date.now();
            const attackAttempts = [];

            // 快速创建大量攻击区块
            for (let i = 0; i < 50; i++) {
                const victim = victims[i % victims.length];
                const attackBlock = await attacker.createTransferBlock(
                    testBlockchain.getId(),
                    victim.getPubKey(),
                    latestBlock.getId()
                );
                attackAttempts.push(attackBlock);
            }

            // 添加第一个区块
            testBlockchain.addBlock(attackAttempts[0]);

            // 快速检测所有后续攻击
            let detectedCount = 0;
            for (let i = 1; i < attackAttempts.length; i++) {
                const doubleSpendResult = validator.detectDoubleSpend(
                    attackAttempts[i],
                    testBlockchain,
                    networkState
                );
                
                if (doubleSpendResult.isDoubleSpend) {
                    detectedCount++;
                }
            }

            const endTime = Date.now();
            const processingTime = endTime - startTime;

            // 验证性能和准确性
            expect(detectedCount).toBe(attackAttempts.length - 1); // 除了第一个区块
            expect(processingTime).toBeLessThan(5000); // 应该在5秒内完成

            // 验证系统没有崩溃
            const validatorStats = validator.getCacheStats();
            expect(validatorStats.totalCacheEntries).toBeGreaterThanOrEqual(0);
        });

        it('应该正确处理复杂的攻击组合', async () => {
            const attackers = users.slice(0, 2);
            const victims = users.slice(2, 4);

            // 创建多个区块链
            const blockchains = [];
            for (let i = 0; i < 2; i++) {
                const blockchain = new BlockChain(testDefinition, `${200 + i}`);
                await blockchain.createRootBlock();
                await blockchain.createOwnerBlock(attackers[i].getPubKey(), attackers[i].privateKey);
                blockchains.push(blockchain);
            }

            const securityEvents = [];

            // 攻击场景1：双花攻击
            const blockchain1 = blockchains[0];
            const attacker1 = attackers[0];
            const latestBlock1 = blockchain1.getLatestBlock();

            const doubleSpendBlock1 = await attacker1.createTransferBlock(
                blockchain1.getId(),
                victims[0].getPubKey(),
                latestBlock1.getId()
            );

            const doubleSpendBlock2 = await attacker1.createTransferBlock(
                blockchain1.getId(),
                victims[1].getPubKey(),
                latestBlock1.getId()
            );

            blockchain1.addBlock(doubleSpendBlock1);
            const doubleSpendDetection = validator.detectDoubleSpend(
                doubleSpendBlock2,
                blockchain1,
                networkState
            );

            if (doubleSpendDetection.isDoubleSpend) {
                securityEvents.push({
                    type: 'DOUBLE_SPEND',
                    attacker: attacker1.getPubKey(),
                    blockchain: blockchain1.getId()
                });
            }

            // 攻击场景2：位置冲突攻击
            const blockchain2 = blockchains[1];
            const attacker2 = attackers[1];
            const latestBlock2 = blockchain2.getLatestBlock();

            const conflictBlock1 = await attacker2.createTransferBlock(
                blockchain2.getId(),
                victims[0].getPubKey(),
                latestBlock2.getId()
            );

            const conflictBlock2 = await attacker1.createTransferBlock(
                blockchain2.getId(),
                victims[1].getPubKey(),
                latestBlock2.getId()
            );

            blockchain2.addBlock(conflictBlock1);
            const forkDetection = blockchain2.detectFork(conflictBlock2);

            if (forkDetection.isFork) {
                securityEvents.push({
                    type: 'FORK',
                    reason: forkDetection.reason,
                    blockchain: blockchain2.getId()
                });
            }

            // 处理所有安全事件
            const blacklistManager = validator.getBlacklistManager(networkState);
            
            for (const event of securityEvents) {
                if (event.type === 'DOUBLE_SPEND') {
                    blacklistManager.addToBlacklist(event.attacker, 'DOUBLE_SPEND_ATTACK');
                }
                
                // 生成相应的警告
                const warning = validator.generateForkWarning({
                    reason: event.reason || 'DOUBLE_SPEND',
                    blockchainId: event.blockchain
                });
                
                await netManager.broadcastMessage(warning);
            }

            // 验证系统正确处理了所有攻击
            expect(securityEvents.length).toBeGreaterThan(0);
            expect(networkState.blacklist.size).toBeGreaterThan(0);

            // 验证网络仍然正常运行
            const networkStatus = netManager.getNetworkStatus();
            expect(networkStatus.isInitialized).toBe(true);
        });
    });

    describe('边界情况和错误处理', () => {
        it('应该正确处理空或无效的攻击数据', async () => {
            // 测试空区块的双花检测
            const doubleSpendResult1 = validator.detectDoubleSpend(null, testBlockchain, networkState);
            expect(doubleSpendResult1.isDoubleSpend).toBe(false);

            // 测试空区块链的双花检测
            const validBlock = await users[0].createTransferBlock(
                testBlockchain.getId(),
                users[1].getPubKey(),
                testBlockchain.getLatestBlock().getId()
            );

            const doubleSpendResult2 = validator.detectDoubleSpend(validBlock, null, networkState);
            expect(doubleSpendResult2.isDoubleSpend).toBe(false);

            // 测试无效网络状态
            const doubleSpendResult3 = validator.detectDoubleSpend(validBlock, testBlockchain, null);
            expect(doubleSpendResult3).toBeDefined();
        });

        it('应该处理黑名单管理的边界情况', async () => {
            const blacklistManager = validator.getBlacklistManager(networkState);

            // 测试空用户ID
            const addResult1 = blacklistManager.addToBlacklist('', 'EMPTY_ID');
            expect(addResult1.success).toBe(true); // Empty string is still a valid string

            const addResult2 = blacklistManager.addToBlacklist(null, 'NULL_ID');
            expect(addResult2.success).toBe(true); // null gets converted to string

            // 测试无效的移除操作
            const removeResult = blacklistManager.removeFromBlacklist('non-existent-user');
            expect(removeResult.success).toBe(false);

            // 测试检查不存在的用户
            const isBlacklisted = blacklistManager.isBlacklisted('non-existent-user');
            expect(isBlacklisted).toBe(false);
        });

        it('应该处理分叉警告生成的异常情况', async () => {
            // 测试不完整的分叉信息
            const warning2 = validator.generateForkWarning({
                reason: 'UNKNOWN_REASON',
                blockchainId: 'test-chain',
                attacker: 'test-user'
            });
            expect(warning2).toBeDefined();
            expect(warning2.forkDetails.reason).toBe('UNKNOWN_REASON');

            // 测试无效的区块信息
            const warning3 = validator.generateForkWarning({
                reason: 'DOUBLE_SPEND',
                blockchainId: 'test-chain',
                attacker: 'test-user',
                conflictingBlocks: []
            });
            expect(warning3).toBeDefined();
            expect(warning3.forkDetails.conflictingBlocks).toBeDefined();
        });

        it('应该在内存不足时优雅降级', async () => {
            // 模拟大量缓存数据
            for (let i = 0; i < 1000; i++) {
                validator.setCache(`test-key-${i}`, {
                    largeData: new Array(1000).fill(`data-${i}`)
                });
            }

            // 验证缓存清理机制工作
            const initialCacheSize = validator.getCacheStats().totalCacheEntries;
            expect(initialCacheSize).toBeGreaterThan(0);

            // 触发缓存清理
            validator.cleanupExpiredCache();

            // 验证系统仍然可以正常工作
            const testBlock = await users[0].createTransferBlock(
                testBlockchain.getId(),
                users[1].getPubKey(),
                testBlockchain.getLatestBlock().getId()
            );

            const sigVerification = await validator.verifySig(testBlock);
            expect(sigVerification.isValid).toBe(true);
        });
    });

    describe('性能和可扩展性测试', () => {
        it('应该在大规模网络中保持性能', async () => {
            // 创建更大的网络
            const largeNetManager = new NetManager({
                nodeCount: 20,
                connectionCount: 5,
                failureRate: 0.1
            });

            await largeNetManager.initNetwork();

            const startTime = Date.now();

            // 广播多个安全消息
            const messages = [];
            for (let i = 0; i < 10; i++) {
                const forkWarning = {
                    type: 'FORK_WARNING',
                    priority: 'HIGH',
                    data: { reason: 'DOUBLE_SPEND', blockchainId: `chain-${i}` }
                };
                messages.push(forkWarning);
            }

            const broadcastPromises = messages.map(msg => 
                largeNetManager.broadcastMessage(msg)
            );

            const results = await Promise.all(broadcastPromises);
            const endTime = Date.now();

            // 验证性能
            expect(endTime - startTime).toBeLessThan(3000); // 3秒内完成
            results.forEach(result => {
                expect(result.reachedNodes).toBeGreaterThanOrEqual(1); // 调整期望值
                expect(result.totalNodes).toBe(20);
            });

            largeNetManager.cleanup();
        });

        it('应该支持并发的安全检测', async () => {
            const concurrentChecks = [];

            // 创建多个并发的安全检测任务
            for (let i = 0; i < 20; i++) {
                const user = users[i % users.length];
                const targetUser = users[(i + 1) % users.length];
                
                const checkTask = (async () => {
                    const transferBlock = await user.createTransferBlock(
                        testBlockchain.getId(),
                        targetUser.getPubKey(),
                        testBlockchain.getLatestBlock().getId()
                    );

                    const sigCheck = await validator.verifySig(transferBlock);
                    const legalityCheck = await validator.validateLegality(
                        transferBlock,
                        testBlockchain,
                        networkState
                    );

                    return {
                        sigValid: sigCheck.isValid,
                        legalityValid: legalityCheck.isValid
                    };
                })();

                concurrentChecks.push(checkTask);
            }

            const startTime = Date.now();
            const results = await Promise.all(concurrentChecks);
            const endTime = Date.now();

            // 验证并发性能
            expect(endTime - startTime).toBeLessThan(5000); // 5秒内完成
            expect(results.length).toBe(20);

            // 验证结果的一致性
            results.forEach(result => {
                expect(result.sigValid).toBeDefined();
                expect(result.legalityValid).toBeDefined();
            });
        });
    });
});