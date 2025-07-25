/**
 * Validator 时间验证和拒绝机制测试
 * 
 * 测试需求 8.1, 8.2, 8.3：
 * - 区块接收时间验证，检查是否超过全网广播时间的两倍
 * - 拒绝区块的创建和广播功能
 * - 全网广播时间的动态计算
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Validator } from '../../src/services/Validator.js';
import { Block } from '../../src/models/Block.js';

describe('Validator - 时间验证和拒绝机制', () => {
    let validator;
    let mockBlock;
    let networkParams;

    beforeEach(() => {
        validator = new Validator();
        
        // 创建模拟区块
        mockBlock = {
            getId: () => 'test-block-id',
            getTime: () => 100, // 区块创建时间为滴答100
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
    });

    describe('calculateBroadcastTime', () => {
        it('应该根据网络参数计算全网广播时间', () => {
            const broadcastTime = validator.calculateBroadcastTime(networkParams);
            
            // 基于对数模型：log(10) / log(3) * 9 ≈ 2.1 * 9 ≈ 19
            expect(broadcastTime).toBeGreaterThan(0);
            expect(broadcastTime).toBeLessThan(100);
        });

        it('应该处理缺少网络参数的情况', () => {
            const broadcastTime = validator.calculateBroadcastTime({});
            expect(broadcastTime).toBe(9); // 默认返回maxDelay
        });

        it('应该处理只有maxDelay的情况', () => {
            const broadcastTime = validator.calculateBroadcastTime({ maxDelay: 15 });
            expect(broadcastTime).toBe(15);
        });

        it('应该确保广播时间至少为1', () => {
            const broadcastTime = validator.calculateBroadcastTime({
                nodeCount: 1,
                avgConnections: 1,
                maxDelay: 0
            });
            expect(broadcastTime).toBeGreaterThanOrEqual(1);
        });
    });

    describe('validateReceptionTime', () => {
        it('应该验证通过在允许时间内接收的区块', () => {
            const receiveTime = 110; // 区块时间100 + 延迟10
            const result = validator.validateReceptionTime(mockBlock, receiveTime, networkParams);
            
            expect(result.isValid).toBe(true);
            expect(result.message).toBe('时间验证通过');
            expect(result.blockId).toBe('test-block-id');
            expect(result.actualDelay).toBe(10);
        });

        it('应该拒绝超过最大允许延迟的区块', () => {
            const broadcastTime = validator.calculateBroadcastTime(networkParams);
            const maxAllowedDelay = broadcastTime * 2;
            const receiveTime = 100 + maxAllowedDelay + 1; // 超过允许延迟
            
            const result = validator.validateReceptionTime(mockBlock, receiveTime, networkParams);
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('TIME_VALIDATION_FAILED');
            expect(result.shouldReject).toBe(true);
            expect(result.actualDelay).toBe(maxAllowedDelay + 1);
        });

        it('应该处理空区块的情况', () => {
            const result = validator.validateReceptionTime(null, 110, networkParams);
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('BLOCK_NULL');
            expect(result.message).toBe('区块为空');
        });

        it('应该正确计算实际延迟', () => {
            const receiveTime = 150;
            const result = validator.validateReceptionTime(mockBlock, receiveTime, networkParams);
            
            expect(result.actualDelay).toBe(50); // 150 - 100
            expect(result.blockTime).toBe(100);
            expect(result.receiveTime).toBe(150);
        });

        it('应该包含广播时间信息', () => {
            const receiveTime = 110;
            const result = validator.validateReceptionTime(mockBlock, receiveTime, networkParams);
            
            expect(result.broadcastTime).toBeGreaterThan(0);
            expect(result.maxAllowedDelay).toBe(result.broadcastTime * 2);
        });
    });

    describe('createRejectionBlock', () => {
        it('应该创建拒绝区块', async () => {
            const rejectorId = 'rejector-node';
            const reason = 'TIME_VALIDATION_FAILED';
            const currentTick = 200;
            
            const rejectionBlock = await validator.createRejectionBlock(
                mockBlock, 
                rejectorId, 
                reason, 
                currentTick
            );
            
            expect(rejectionBlock).toBeDefined();
            expect(rejectionBlock.getCreator()).toBe(rejectorId);
            expect(rejectionBlock.getTime()).toBe(currentTick);
            
            const rejectionData = rejectionBlock.getData();
            expect(rejectionData.type).toBe('rejection');
            expect(rejectionData.originalBlockId).toBe('test-block-id');
            expect(rejectionData.rejectionReason).toBe(reason);
            expect(rejectionData.rejectorId).toBe(rejectorId);
        });

        it('应该为拒绝区块生成唯一ID', async () => {
            const rejectionBlock1 = await validator.createRejectionBlock(
                mockBlock, 'rejector1', 'reason1', 200
            );
            const rejectionBlock2 = await validator.createRejectionBlock(
                mockBlock, 'rejector2', 'reason2', 201
            );
            
            expect(rejectionBlock1.getId()).toBeDefined();
            expect(rejectionBlock2.getId()).toBeDefined();
            expect(rejectionBlock1.getId()).not.toBe(rejectionBlock2.getId());
        });

        it('应该包含原始区块的完整信息', async () => {
            const rejectionBlock = await validator.createRejectionBlock(
                mockBlock, 'rejector', 'test-reason', 200
            );
            
            const rejectionData = rejectionBlock.getData();
            expect(rejectionData.originalBlockCreator).toBe('test-user');
            expect(rejectionData.originalBlockTime).toBe(100);
            expect(rejectionData.rejectionTime).toBe(200);
        });
    });

    describe('时间验证集成测试', () => {
        it('应该完整处理时间验证失败的流程', async () => {
            // 1. 创建一个延迟过长的区块
            const broadcastTime = validator.calculateBroadcastTime(networkParams);
            const maxAllowedDelay = broadcastTime * 2;
            const receiveTime = 100 + maxAllowedDelay + 10;
            
            // 2. 验证时间
            const timeValidation = validator.validateReceptionTime(
                mockBlock, receiveTime, networkParams
            );
            
            expect(timeValidation.isValid).toBe(false);
            expect(timeValidation.shouldReject).toBe(true);
            
            // 3. 创建拒绝区块
            const rejectionBlock = await validator.createRejectionBlock(
                mockBlock,
                'validator-node',
                timeValidation.error,
                receiveTime
            );
            
            expect(rejectionBlock.getData().rejectionReason).toBe('TIME_VALIDATION_FAILED');
            expect(rejectionBlock.getData().originalBlockId).toBe('test-block-id');
        });

        it('应该处理边界情况 - 恰好在允许时间内', () => {
            const broadcastTime = validator.calculateBroadcastTime(networkParams);
            const maxAllowedDelay = broadcastTime * 2;
            const receiveTime = 100 + maxAllowedDelay; // 恰好等于最大允许延迟
            
            const result = validator.validateReceptionTime(mockBlock, receiveTime, networkParams);
            
            expect(result.isValid).toBe(true);
            expect(result.actualDelay).toBe(maxAllowedDelay);
        });

        it('应该处理边界情况 - 刚好超过允许时间', () => {
            const broadcastTime = validator.calculateBroadcastTime(networkParams);
            const maxAllowedDelay = broadcastTime * 2;
            const receiveTime = 100 + maxAllowedDelay + 0.1; // 刚好超过最大允许延迟
            
            const result = validator.validateReceptionTime(mockBlock, receiveTime, networkParams);
            
            expect(result.isValid).toBe(false);
            expect(result.shouldReject).toBe(true);
        });
    });

    describe('不同网络规模的广播时间计算', () => {
        it('应该为小型网络计算合理的广播时间', () => {
            const smallNetwork = {
                nodeCount: 5,
                avgConnections: 2,
                maxDelay: 5
            };
            
            const broadcastTime = validator.calculateBroadcastTime(smallNetwork);
            expect(broadcastTime).toBeGreaterThan(0);
            expect(broadcastTime).toBeLessThan(50);
        });

        it('应该为大型网络计算合理的广播时间', () => {
            const largeNetwork = {
                nodeCount: 1000,
                avgConnections: 10,
                maxDelay: 9
            };
            
            const broadcastTime = validator.calculateBroadcastTime(largeNetwork);
            expect(broadcastTime).toBeGreaterThan(0);
            expect(broadcastTime).toBeLessThan(200);
        });

        it('应该处理高连接度网络', () => {
            const highConnectivity = {
                nodeCount: 100,
                avgConnections: 50,
                maxDelay: 9
            };
            
            const broadcastTime = validator.calculateBroadcastTime(highConnectivity);
            expect(broadcastTime).toBeGreaterThan(0);
            // 高连接度应该导致较短的广播时间
        });
    });

    describe('错误处理', () => {
        it('应该处理无效的网络参数', () => {
            const invalidParams = {
                nodeCount: -1,
                avgConnections: 0,
                maxDelay: -5
            };
            
            const broadcastTime = validator.calculateBroadcastTime(invalidParams);
            expect(broadcastTime).toBeGreaterThanOrEqual(1);
        });

        it('应该处理缺少区块ID的情况', () => {
            const invalidBlock = {
                getId: () => null,
                getTime: () => 100,
                getCreator: () => 'test-user',
                getData: () => ({ type: 'transfer' })
            };
            
            const result = validator.validateReceptionTime(invalidBlock, 110, networkParams);
            expect(result.isValid).toBe(false);
        });

        it('应该处理异常的接收时间', () => {
            // 接收时间早于区块创建时间
            const receiveTime = 50; // 早于区块时间100
            const result = validator.validateReceptionTime(mockBlock, receiveTime, networkParams);
            
            expect(result.actualDelay).toBe(-50);
            expect(result.isValid).toBe(true); // 负延迟是允许的（时钟同步问题）
        });
    });

    describe('性能测试', () => {
        it('应该快速计算广播时间', () => {
            const startTime = performance.now();
            
            for (let i = 0; i < 1000; i++) {
                validator.calculateBroadcastTime(networkParams);
            }
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(100); // 应该在100ms内完成1000次计算
        });

        it('应该快速验证接收时间', () => {
            const startTime = performance.now();
            
            for (let i = 0; i < 1000; i++) {
                validator.validateReceptionTime(mockBlock, 110 + i, networkParams);
            }
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(200); // 应该在200ms内完成1000次验证
        });
    });
});