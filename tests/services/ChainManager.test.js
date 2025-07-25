/**
 * ChainManager 单元测试
 * 
 * 测试区块链批量创建和管理功能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChainManager } from '../../src/services/ChainManager.js';
import { Crypto } from '../../src/services/Crypto.js';

describe('ChainManager', () => {
    let chainManager;
    let testUsers;
    let testDefinition;

    beforeEach(async () => {
        chainManager = new ChainManager();
        
        // 创建测试用户
        testUsers = [];
        for (let i = 0; i < 3; i++) {
            const keyPair = await Crypto.genKeyPair();
            testUsers.push({
                id: `user${i + 1}`,
                publicKey: keyPair.publicKey,
                privateKey: keyPair.privateKey
            });
        }

        // 创建测试定义
        testDefinition = {
            description: "测试区块链定义",
            ranges: [
                { start: 1, end: 5, value: 1 },
                { start: 6, end: 10, value: 5 }
            ]
        };
    });

    describe('createBlockchainsFromDefinition', () => {
        it('应该成功创建所有区块链', async () => {
            const result = await chainManager.createBlockchainsFromDefinition(
                testDefinition, 
                testUsers
            );

            expect(result.totalCreated).toBe(10); // 5 + 5 = 10个区块链
            expect(result.totalErrors).toBe(0);
            expect(result.createdChains).toHaveLength(10);
            expect(result.ownershipResults.successful).toHaveLength(10);
            expect(result.ownershipResults.failed).toHaveLength(0);
        });

        it('应该正确分配区块链价值', async () => {
            const result = await chainManager.createBlockchainsFromDefinition(
                testDefinition, 
                testUsers
            );

            // 检查前5个区块链的价值为1
            const lowValueChains = result.createdChains.filter(chain => 
                parseInt(chain.serialNumber) <= 5
            );
            expect(lowValueChains).toHaveLength(5);
            lowValueChains.forEach(chain => {
                expect(chain.value).toBe(1);
            });

            // 检查后5个区块链的价值为5
            const highValueChains = result.createdChains.filter(chain => 
                parseInt(chain.serialNumber) > 5
            );
            expect(highValueChains).toHaveLength(5);
            highValueChains.forEach(chain => {
                expect(chain.value).toBe(5);
            });
        });

        it('应该随机分配所有权给用户', async () => {
            const result = await chainManager.createBlockchainsFromDefinition(
                testDefinition, 
                testUsers
            );

            // 验证所有用户都分配到了区块链
            const userDistribution = result.ownershipResults.userDistribution;
            expect(userDistribution.size).toBe(3);

            let totalAssigned = 0;
            for (const [userId, stats] of userDistribution) {
                expect(stats.count).toBeGreaterThanOrEqual(0);
                expect(stats.totalValue).toBeGreaterThanOrEqual(0);
                expect(stats.chains).toHaveLength(stats.count);
                totalAssigned += stats.count;
            }

            expect(totalAssigned).toBe(10);
        });

        it('应该拒绝空的用户列表', async () => {
            await expect(chainManager.createBlockchainsFromDefinition(
                testDefinition, 
                []
            )).rejects.toThrow('用户列表不能为空');
        });

        it('应该处理无效的定义文件', async () => {
            const invalidDefinition = {
                ranges: [] // 空范围
            };

            await expect(chainManager.createBlockchainsFromDefinition(
                invalidDefinition, 
                testUsers
            )).rejects.toThrow('ranges数组不能为空');
        });
    });

    describe('createSingleBlockchain', () => {
        it('应该创建有效的区块链', async () => {
            const blockchain = await chainManager.createSingleBlockchain(
                testDefinition, 
                1
            );

            expect(blockchain).toBeDefined();
            expect(blockchain.getId()).toBeDefined();
            expect(blockchain.getSerialN