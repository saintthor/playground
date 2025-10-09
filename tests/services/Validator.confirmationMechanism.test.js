/**
 * Validator 确认等待和冲突检测测试
 * 
 * 测试需求 8.4, 8.5：
 * - 确认等待期的管理（全网广播时间的四倍）
 * - 等待期内的冲突区块和警告检测
 * - 区块链转移的最终确认
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Validator } from '../../src/services/Validator.js';
import { Block } from '../../src/models/Block.js';

describe('Validator - 确认等待和冲突检测', () => {
    let validator;
    let mockBlock;
    let networkParams;
    let receiveTime;
    let broadcastTime;

    beforeEach(() => {
        validator = new Validator();
        
        // 创建模拟区块
        mockBlock = {
            getId: () => 'test-block-id',
            getTime: () => 100,
            getCreator: () => 'test-user',
            getData: () => ({
                type: 'transfer',
                blockchainId: 'test-chain',
                targetUserId: 'target-user'
            })
        };

        // 网络参数
        networkParams = {
            nodeCount: 10,
            avgConnections: 3,
            maxDelay: 9
        };

        receiveTime = 110; // 区块接收时间
        broadcastTime = validator.calculateBroadcastTime(networkParams);
    });

    describe('validateReceptionConfirmation', () => {
        it('应该在确认等待期未结束时返回等待状态', () => {
            const confirmationWaitTime = broadcastTime * 4;
            const currentTime = receiveTime + confirmationWaitTime - 1; // 等待期未结束
            
            const result = validator.validateReceptionConfirmation(
                mockBlock, receiveTime, currentTime, networkParams, [], []
            );
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('CONFIRMATION_PENDING');
            expect(result.message).toBe('确认等待期尚未结束');
            expect(result.remainingWaitTime).toBe(1);
            expect(result.confirmationWaitTime).toBe(confirmationWaitTime);
        });

        it('应该在确认等待期结束且无冲突时确认成功', () => {
            const confirmationWaitTime = broadcastTime * 4;
            const currentTime = receiveTime + confirmationWaitTime + 1; // 等待期已结束
            
            const result = validator.validateReceptionConfirmation(
                mockBlock, receiveTime, currentTime, networkParams, [], []
            );
            
            expect(result.isValid).toBe(true);
            expect(result.message).toBe('区块链转移确认成功');
            expect(result.finalConfirmation).toBe(true);
            expect(result.blockId).toBe('test-block-id');
            expect(result.receiveTime).toBe(receiveTime);
            expect(result.confirmationTime).toBe(currentTime);
        });

        it('应该检测等待期内的冲突区块', () => {
            const confirmationWaitTime = broadcastTime * 4;
            const waitEndTime = receiveTime + confirmationWaitTime;
            const currentTime = waitEndTime + 1;
            
            // 创建冲突区块（在等待期内）
            const conflictBlock = {
                getId: () => 'conflict-block-id',
                getTime: () => receiveTime + 10, // 在等待期内
                getCreator: () => 'conflict-user'
            };
            
            const result = validator.validateReceptionConfirmation(
                mockBlock, receiveTime, currentTime, networkParams, [conflictBlock], []
            );
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('CONFLICT_DETECTED');
            expect(result.message).toBe('确认等待期内检测到冲突区块');
            expect(result.conflictCount).toBe(1);
            expect(result.conflictBlocks).toHaveLength(1);
            expect(result.conflictBlocks[0].blockId).toBe('conflict-block-id');
        });

        it('应该忽略等待期外的冲突区块', () => {
            const confirmationWaitTime = broadcastTime * 4;
            const waitEndTime = receiveTime + confirmationWaitTime;
            const currentTime = waitEndTime + 1;
            
            // 创建等待期外的冲突区块
            const conflictBlockBefore = {
                getId: () => 'conflict-before',
                getTime: () => receiveTime - 10, // 在等待期之前
                getCreator: () => 'conflict-user1'
            };
            
            const conflictBlockAfter = {
                getId: () => 'conflict-after',
                getTime: () => waitEndTime + 10, // 在等待期之后
                getCreator: () => 'conflict-user2'
            };
            
            const result = validator.validateReceptionConfirmation(
                mockBlock, receiveTime, currentTime, networkParams, 
                [conflictBlockBefore, conflictBlockAfter], []
            );
            
            expect(result.isValid).toBe(true);
            expect(result.finalConfirmation).toBe(true);
        });

        it('应该检测等待期内的相关警告', () => {
            const confirmationWaitTime = broadcastTime * 4;
            const waitEndTime = receiveTime + confirmationWaitTime;
            const currentTime = waitEndTime + 1;
            
            // 创建相关警告（在等待期内）
            const warning = {
                time: receiveTime + 20,
                relatedBlockId: 'test-block-id',
                type: 'FORK_WARNING',
                message: '检测到分叉'
            };
            
            const result = validator.validateReceptionConfirmation(
                mockBlock, receiveTime, currentTime, networkParams, [], [warning]
            );
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('WARNING_DETECTED');
            expect(result.message).toBe('确认等待期内收到相关警告');
            expect(result.warningCount).toBe(1);
            expect(result.warnings).toHaveLength(1);
        });

        it('应该检测与区块链相关的警告', () => {
            const confirmationWaitTime = broadcastTime * 4;
            const waitEndTime = receiveTime + confirmationWaitTime;
            const currentTime = waitEndTime + 1;
            
            // 创建与区块链相关的警告
            const warning = {
                time: receiveTime + 30,
                relatedBlockchainId: 'test-chain',
                type: 'SECURITY_WARNING',
                message: '安全警告'
            };
            
            const result = validator.validateReceptionConfirmation(
                mockBlock, receiveTime, currentTime, networkParams, [], [warning]
            );
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('WARNING_DETECTED');
            expect(result.warningCount).toBe(1);
        });

        it('应该忽略等待期外的警告', () => {
            const confirmationWaitTime = broadcastTime * 4;
            const waitEndTime = receiveTime + confirmationWaitTime;
            const currentTime = waitEndTime + 1;
            
            // 创建等待期外的警告
            const warningBefore = {
                time: receiveTime - 5,
                relatedBlockId: 'test-block-id',
                type: 'WARNING'
            };
            
            const warningAfter = {
                time: waitEndTime + 5,
                relatedBlockId: 'test-block-id',
                type: 'WARNING'
            };
            
            const result = validator.validateReceptionConfirmation(
                mockBlock, receiveTime, currentTime, networkParams, 
                [], [warningBefore, warningAfter]
            );
            
            expect(result.isValid).toBe(true);
            expect(result.finalConfirmation).toBe(true);
        });

        it('应该处理空区块的情况', () => {
            const result = validator.validateReceptionConfirmation(
                null, receiveTime, receiveTime + 100, networkParams, [], []
            );
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('BLOCK_NULL');
            expect(result.message).toBe('区块为空');
        });
    });

    describe('确认等待时间计算', () => {
        it('应该正确计算确认等待时间为广播时间的四倍', () => {
            const confirmationWaitTime = broadcastTime * 4;
            const currentTime = receiveTime + confirmationWaitTime - 1;
            
            const result = validator.validateReceptionConfirmation(
                mockBlock, receiveTime, currentTime, networkParams, [], []
            );
            
            expect(result.confirmationWaitTime).toBe(confirmationWaitTime);
            expect(result.waitEndTime).toBe(receiveTime + confirmationWaitTime);
        });

        it('应该适应不同网络规模的广播时间', () => {
            const smallNetwork = {
                nodeCount: 5,
                avgConnections: 2,
                maxDelay: 3
            };
            
            const smallBroadcastTime = validator.calculateBroadcastTime(smallNetwork);
            const smallConfirmationTime = smallBroadcastTime * 4;
            const currentTime = receiveTime + smallConfirmationTime + 1;
            
            const result = validator.validateReceptionConfirmation(
                mockBlock, receiveTime, currentTime, smallNetwork, [], []
            );
            
            expect(result.isValid).toBe(true);
            expect(result.waitPeriod).toBe(smallConfirmationTime);
        });
    });

    describe('冲突检测边界情况', () => {
        it('应该检测恰好在等待期开始时的冲突', () => {
            const confirmationWaitTime = broadcastTime * 4;
            const currentTime = receiveTime + confirmationWaitTime + 1;
            
            const conflictBlock = {
                getId: () => 'boundary-conflict',
                getTime: () => receiveTime, // 恰好在等待期开始
                getCreator: () => 'conflict-user'
            };
            
            const result = validator.validateReceptionConfirmation(
                mockBlock, receiveTime, currentTime, networkParams, [conflictBlock], []
            );
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('CONFLICT_DETECTED');
        });

        it('应该检测恰好在等待期结束时的冲突', () => {
            const confirmationWaitTime = broadcastTime * 4;
            const waitEndTime = receiveTime + confirmationWaitTime;
            const currentTime = waitEndTime + 1;
            
            const conflictBlock = {
                getId: () => 'boundary-conflict',
                getTime: () => waitEndTime, // 恰好在等待期结束
                getCreator: () => 'conflict-user'
            };
            
            const result = validator.validateReceptionConfirmation(
                mockBlock, receiveTime, currentTime, networkParams, [conflictBlock], []
            );
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('CONFLICT_DETECTED');
        });

        it('应该忽略恰好在等待期外的冲突', () => {
            const confirmationWaitTime = broadcastTime * 4;
            const waitEndTime = receiveTime + confirmationWaitTime;
            const currentTime = waitEndTime + 1;
            
            const conflictBlock = {
                getId: () => 'outside-conflict',
                getTime: () => waitEndTime + 0.1, // 刚好在等待期外
                getCreator: () => 'conflict-user'
            };
            
            const result = validator.validateReceptionConfirmation(
                mockBlock, receiveTime, currentTime, networkParams, [conflictBlock], []
            );
            
            expect(result.isValid).toBe(true);
            expect(result.finalConfirmation).toBe(true);
        });
    });

    describe('多重冲突和警告处理', () => {
        it('应该处理多个冲突区块', () => {
            const confirmationWaitTime = broadcastTime * 4;
            const currentTime = receiveTime + confirmationWaitTime + 1;
            
            const conflictBlocks = [
                {
                    getId: () => 'conflict-1',
                    getTime: () => receiveTime + 10,
                    getCreator: () => 'user-1'
                },
                {
                    getId: () => 'conflict-2',
                    getTime: () => receiveTime + 20,
                    getCreator: () => 'user-2'
                },
                {
                    getId: () => 'conflict-3',
                    getTime: () => receiveTime + 30,
                    getCreator: () => 'user-3'
                }
            ];
            
            const result = validator.validateReceptionConfirmation(
                mockBlock, receiveTime, currentTime, networkParams, conflictBlocks, []
            );
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('CONFLICT_DETECTED');
            expect(result.conflictCount).toBe(3);
            expect(result.conflictBlocks).toHaveLength(3);
        });

        it('应该处理多个警告', () => {
            const confirmationWaitTime = broadcastTime * 4;
            const currentTime = receiveTime + confirmationWaitTime + 1;
            
            const warnings = [
                {
                    time: receiveTime + 5,
                    relatedBlockId: 'test-block-id',
                    type: 'WARNING_1'
                },
                {
                    time: receiveTime + 15,
                    relatedBlockchainId: 'test-chain',
                    type: 'WARNING_2'
                }
            ];
            
            const result = validator.validateReceptionConfirmation(
                mockBlock, receiveTime, currentTime, networkParams, [], warnings
            );
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('WARNING_DETECTED');
            expect(result.warningCount).toBe(2);
            expect(result.warnings).toHaveLength(2);
        });

        it('应该同时处理冲突和警告（优先报告冲突）', () => {
            const confirmationWaitTime = broadcastTime * 4;
            const currentTime = receiveTime + confirmationWaitTime + 1;
            
            const conflictBlock = {
                getId: () => 'conflict-block',
                getTime: () => receiveTime + 10,
                getCreator: () => 'conflict-user'
            };
            
            const warning = {
                time: receiveTime + 20,
                relatedBlockId: 'test-block-id',
                type: 'WARNING'
            };
            
            const result = validator.validateReceptionConfirmation(
                mockBlock, receiveTime, currentTime, networkParams, [conflictBlock], [warning]
            );
            
            // 应该优先报告冲突
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('CONFLICT_DETECTED');
            expect(result.conflictCount).toBe(1);
        });
    });

    describe('确认成功的完整流程', () => {
        it('应该提供完整的确认信息', () => {
            const confirmationWaitTime = broadcastTime * 4;
            const currentTime = receiveTime + confirmationWaitTime + 10;
            
            const result = validator.validateReceptionConfirmation(
                mockBlock, receiveTime, currentTime, networkParams, [], []
            );
            
            expect(result.isValid).toBe(true);
            expect(result.message).toBe('区块链转移确认成功');
            expect(result.blockId).toBe('test-block-id');
            expect(result.receiveTime).toBe(receiveTime);
            expect(result.confirmationTime).toBe(currentTime);
            expect(result.waitPeriod).toBe(confirmationWaitTime);
            expect(result.finalConfirmation).toBe(true);
        });

        it('应该在恰好等待期结束时确认成功', () => {
            const confirmationWaitTime = broadcastTime * 4;
            const currentTime = receiveTime + confirmationWaitTime; // 恰好等待期结束
            
            const result = validator.validateReceptionConfirmation(
                mockBlock, receiveTime, currentTime, networkParams, [], []
            );
            
            expect(result.isValid).toBe(true);
            expect(result.finalConfirmation).toBe(true);
        });
    });

    describe('性能测试', () => {
        it('应该快速处理大量冲突区块', () => {
            const confirmationWaitTime = broadcastTime * 4;
            const currentTime = receiveTime + confirmationWaitTime + 1;
            
            // 创建大量冲突区块
            const conflictBlocks = [];
            for (let i = 0; i < 1000; i++) {
                conflictBlocks.push({
                    getId: () => `conflict-${i}`,
                    getTime: () => receiveTime + (i % confirmationWaitTime),
                    getCreator: () => `user-${i}`
                });
            }
            
            const startTime = performance.now();
            const result = validator.validateReceptionConfirmation(
                mockBlock, receiveTime, currentTime, networkParams, conflictBlocks, []
            );
            const endTime = performance.now();
            
            expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('CONFLICT_DETECTED');
        });

        it('应该快速处理大量警告', () => {
            const confirmationWaitTime = broadcastTime * 4;
            const currentTime = receiveTime + confirmationWaitTime + 1;
            
            // 创建大量警告
            const warnings = [];
            for (let i = 0; i < 1000; i++) {
                warnings.push({
                    time: receiveTime + (i % confirmationWaitTime),
                    relatedBlockId: i % 2 === 0 ? 'test-block-id' : null,
                    relatedBlockchainId: i % 2 === 1 ? 'test-chain' : null,
                    type: `WARNING_${i}`
                });
            }
            
            const startTime = performance.now();
            const result = validator.validateReceptionConfirmation(
                mockBlock, receiveTime, currentTime, networkParams, [], warnings
            );
            const endTime = performance.now();
            
            expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('WARNING_DETECTED');
        });
    });

    describe('错误处理', () => {
        it('应该处理无效的时间参数', () => {
            const result = validator.validateReceptionConfirmation(
                mockBlock, null, null, networkParams, [], []
            );
            
            // 应该能够处理null时间参数而不崩溃
            expect(result).toBeDefined();
        });

        it('应该处理无效的网络参数', () => {
            const invalidNetworkParams = {};
            const confirmationWaitTime = validator.calculateBroadcastTime(invalidNetworkParams) * 4;
            const currentTime = receiveTime + confirmationWaitTime + 1;
            
            const result = validator.validateReceptionConfirmation(
                mockBlock, receiveTime, currentTime, invalidNetworkParams, [], []
            );
            
            expect(result.isValid).toBe(true); // 应该使用默认值并成功
        });

        it('应该处理格式错误的冲突区块', () => {
            const confirmationWaitTime = broadcastTime * 4;
            const currentTime = receiveTime + confirmationWaitTime + 1;
            
            const invalidConflictBlocks = [
                null,
                {},
                { getId: () => 'valid-id' }, // 缺少getTime方法
                { getTime: () => receiveTime + 10 } // 缺少getId方法
            ];
            
            const result = validator.validateReceptionConfirmation(
                mockBlock, receiveTime, currentTime, networkParams, invalidConflictBlocks, []
            );
            
            // 应该能够处理无效的冲突区块而不崩溃
            expect(result).toBeDefined();
        });
    });
});