/**
 * Block 类的单元测试
 * 验证区块创建和签名功能
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Block } from '../../src/models/Block.js';
import { Crypto } from '../../src/services/Crypto.js';

describe('Block 类测试', () => {
    let keyPair;
    let testData;

    beforeAll(async () => {
        // 生成测试用的密钥对
        keyPair = await Crypto.genKeyPair();
        testData = {
            type: 'transfer',
            blockchainId: 'test-blockchain-id',
            targetUserId: 'test-target-user'
        };
    });

    describe('构造函数和基本属性', () => {
        it('应该正确创建区块实例', () => {
            const block = new Block(testData, 'prev-block-id', keyPair.publicKey);
            
            expect(block.data).toEqual(testData);
            expect(block.prevBlockId).toBe('prev-block-id');
            expect(block.creatorId).toBe(keyPair.publicKey);
            expect(block.timestamp).toBeTypeOf('number');
            expect(block.id).toBeTypeOf('string');
            expect(block.signature).toBeNull();
        });

        it('应该自动生成时间戳', () => {
            const beforeTime = Date.now();
            const block = new Block(testData, null, keyPair.publicKey);
            const afterTime = Date.now();
            
            expect(block.timestamp).toBeGreaterThanOrEqual(beforeTime);
            expect(block.timestamp).toBeLessThanOrEqual(afterTime);
        });

        it('应该接受自定义时间戳', () => {
            const customTimestamp = 1234567890;
            const block = new Block(testData, null, keyPair.publicKey, customTimestamp);
            
            expect(block.timestamp).toBe(customTimestamp);
        });
    });

    describe('ID 生成', () => {
        it('应该生成唯一的区块ID', () => {
            const block1 = new Block(testData, 'prev-1', keyPair.publicKey, 1000);
            const block2 = new Block(testData, 'prev-2', keyPair.publicKey, 1000);
            
            expect(block1.id).not.toBe(block2.id);
        });

        it('相同内容应该生成相同的ID', () => {
            const timestamp = 1000;
            const block1 = new Block(testData, 'prev-id', keyPair.publicKey, timestamp);
            const block2 = new Block(testData, 'prev-id', keyPair.publicKey, timestamp);
            
            expect(block1.id).toBe(block2.id);
        });

        it('应该在内容变化时重新生成ID', () => {
            const block = new Block(testData, 'prev-id', keyPair.publicKey);
            const originalId = block.id;
            
            block.data = { ...testData, newField: 'new-value' };
            block.genId();
            
            expect(block.id).not.toBe(originalId);
        });
    });

    describe('签名功能', () => {
        it('应该能够签名区块', async () => {
            const block = new Block(testData, 'prev-id', keyPair.publicKey);
            
            await block.signBlock(keyPair.privateKey);
            
            expect(block.signature).toBeTypeOf('string');
            expect(block.signature.length).toBeGreaterThan(0);
        });

        it('应该能够验证正确的签名', async () => {
            const block = new Block(testData, 'prev-id', keyPair.publicKey);
            await block.signBlock(keyPair.privateKey);
            
            const isValid = await block.verifySig();
            expect(isValid).toBe(true);
        });

        it('应该拒绝错误的签名', async () => {
            const block = new Block(testData, 'prev-id', keyPair.publicKey);
            await block.signBlock(keyPair.privateKey);
            
            // 篡改签名
            block.signature = 'invalid-signature';
            
            const isValid = await block.verifySig();
            expect(isValid).toBe(false);
        });

        it('应该能够使用指定公钥验证签名', async () => {
            const anotherKeyPair = await Crypto.genKeyPair();
            const block = new Block(testData, 'prev-id', keyPair.publicKey);
            await block.signBlock(keyPair.privateKey);
            
            const isValidWithCorrectKey = await block.verifySig(keyPair.publicKey);
            const isValidWithWrongKey = await block.verifySig(anotherKeyPair.publicKey);
            
            expect(isValidWithCorrectKey).toBe(true);
            expect(isValidWithWrongKey).toBe(false);
        });
    });

    describe('时间验证', () => {
        it('应该验证有效的时间范围', () => {
            const timestamp = 1000;
            const block = new Block(testData, 'prev-id', keyPair.publicKey, timestamp);
            
            const currentTime = 1500;
            const maxDelay = 1000;
            
            const isValid = block.verifyTime(currentTime, maxDelay);
            expect(isValid).toBe(true);
        });

        it('应该拒绝超时的区块', () => {
            const timestamp = 1000;
            const block = new Block(testData, 'prev-id', keyPair.publicKey, timestamp);
            
            const currentTime = 2500;
            const maxDelay = 1000;
            
            const isValid = block.verifyTime(currentTime, maxDelay);
            expect(isValid).toBe(false);
        });

        it('应该拒绝未来时间的区块', () => {
            const timestamp = 2000;
            const block = new Block(testData, 'prev-id', keyPair.publicKey, timestamp);
            
            const currentTime = 1000;
            const maxDelay = 1000;
            
            const isValid = block.verifyTime(currentTime, maxDelay);
            expect(isValid).toBe(false);
        });
    });

    describe('序列化和反序列化', () => {
        it('应该能够序列化区块', async () => {
            const block = new Block(testData, 'prev-id', keyPair.publicKey);
            await block.signBlock(keyPair.privateKey);
            
            const serialized = block.serialize();
            
            expect(serialized).toBeTypeOf('string');
            
            const parsed = JSON.parse(serialized);
            expect(parsed.id).toBe(block.id);
            expect(parsed.data).toEqual(block.data);
            expect(parsed.prevBlockId).toBe(block.prevBlockId);
            expect(parsed.creatorId).toBe(block.creatorId);
            expect(parsed.timestamp).toBe(block.timestamp);
            expect(parsed.signature).toBe(block.signature);
        });

        it('应该能够反序列化区块', async () => {
            const originalBlock = new Block(testData, 'prev-id', keyPair.publicKey);
            await originalBlock.signBlock(keyPair.privateKey);
            
            const serialized = originalBlock.serialize();
            const deserializedBlock = Block.deserialize(serialized);
            
            expect(deserializedBlock.id).toBe(originalBlock.id);
            expect(deserializedBlock.data).toEqual(originalBlock.data);
            expect(deserializedBlock.prevBlockId).toBe(originalBlock.prevBlockId);
            expect(deserializedBlock.creatorId).toBe(originalBlock.creatorId);
            expect(deserializedBlock.timestamp).toBe(originalBlock.timestamp);
            expect(deserializedBlock.signature).toBe(originalBlock.signature);
        });

        it('序列化后反序列化应该保持签名验证能力', async () => {
            const originalBlock = new Block(testData, 'prev-id', keyPair.publicKey);
            await originalBlock.signBlock(keyPair.privateKey);
            
            const serialized = originalBlock.serialize();
            const deserializedBlock = Block.deserialize(serialized);
            
            const isValid = await deserializedBlock.verifySig();
            expect(isValid).toBe(true);
        });
    });

    describe('getter 方法', () => {
        it('应该正确返回各种属性', async () => {
            const block = new Block(testData, 'prev-id', keyPair.publicKey, 1000);
            await block.signBlock(keyPair.privateKey);
            
            expect(block.getId()).toBe(block.id);
            expect(block.getData()).toEqual(testData);
            expect(block.getCreator()).toBe(keyPair.publicKey);
            expect(block.getTime()).toBe(1000);
            expect(block.getPrevBlockId()).toBe('prev-id');
            expect(block.getSignature()).toBe(block.signature);
        });
    });

    describe('基本验证', () => {
        it('应该验证完整的区块', async () => {
            const block = new Block(testData, 'prev-id', keyPair.publicKey);
            await block.signBlock(keyPair.privateKey);
            
            const isValid = await block.validateBasic();
            expect(isValid).toBe(true);
        });

        it('应该拒绝缺少必要字段的区块', async () => {
            const block = new Block(testData, 'prev-id', keyPair.publicKey);
            await block.signBlock(keyPair.privateKey);
            
            // 删除必要字段
            block.creatorId = null;
            
            const isValid = await block.validateBasic();
            expect(isValid).toBe(false);
        });

        it('应该拒绝ID不匹配的区块', async () => {
            const block = new Block(testData, 'prev-id', keyPair.publicKey);
            await block.signBlock(keyPair.privateKey);
            
            // 篡改ID
            block.id = 'fake-id';
            
            const isValid = await block.validateBasic();
            expect(isValid).toBe(false);
        });
    });
});