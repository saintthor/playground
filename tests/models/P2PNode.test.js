/**
 * P2PNode 类单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('P2PNode', () => {
    let node1, node2, node3;

    beforeEach(async () => {
        node1 = new P2PNode('node1');
        node2 = new P2PNode('node2');
        node3 = new P2PNode('node3');
        
        // 初始化密钥对
        await node1.genKeyPair();
        await node2.genKeyPair();
        await node3.genKeyPair();
    });

    describe('构造函数和初始化', () => {
        it('应该正确创建节点实例', () => {
            const node = new P2PNode('test-node');
            expect(node.id).toBe('test-node');
            expect(node.publicKey).toBeNull();
            expect(node.privateKey).toBeNull();
            expect(node.connections).toBeInstanceOf(Set);
            expect(node.connections.size).toBe(0);
            expect(node.messageQueue).toEqual([]);
            expect(node.isInitialized).toBe(false);
        });

        it('应该成功生成密钥对', async () => {
            const node = new P2PNode('test-node');
            await node.genKeyPair();
            
            expect(node.publicKey).toBeTruthy();
            expect(node.privateKey).toBeTruthy();
            expect(node.isInitialized).toBe(true);
            expect(typeof node.publicKey).toBe('string');
            expect(typeof node.privateKey).toBe('string');
        });

        it('应该能够获取公钥', async () => {
            const node = new P2PNode('test-node');
            await node.genKeyPair();
            
            const publicKey = node.getPubKey();
            expect(publicKey).toBe(node.publicKey);
        });

        it('未初始化时获取公钥应该抛出错误', () => {
            const node = new P2PNode('test-node');
            expect(() => node.getPubKey()).toThrow('节点 test-node 尚未初始化密钥对');
        });
    });

    describe('节点连接', () => {
        it('应该成功连接到其他节点', async () => {
            const result = await node1.connectTo(node2);
            
            expect(result).toBe(true);
            expect(node1.connections.has(node2.id)).toBe(true);
            expect(node2.connections.has(node1.id)).toBe(true);
        });

        it('不应该连接到自己', async () => {
            const result = await node1.connectTo(node1);
            expect(result).toBe(false);
        });

        it('重复连接应该返回true', async () => {
            await node1.connectTo(node2);
            const result = await node1.connectTo(node2);
            
            expect(result).toBe(true);
            expect(node1.connections.size).toBe(1);
        });

        it('未初始化的节点不能建立连接', async () => {
            const uninitializedNode = new P2PNode('uninit');
            
            await expect(node1.connectTo(uninitializedNode)).rejects.toThrow('节点未初始化，无法建立连接');
        });

        it('应该能够断开连接', async () => {
            await node1.connectTo(node2);
            expect(node1.connections.has(node2.id)).toBe(true);
            
            node1.disconnect(node2.id);
            expect(node1.connections.has(node2.id)).toBe(false);
        });
    });

    describe('签名验证', () => {
        it('应该能够验证有效签名', async () => {
            const data = 'test data';
            const signature = await Crypto.sign(data, node1.privateKey);
            
            const isValid = await node1.verifyNodeSig(signature, data, node1.publicKey);
            expect(isValid).toBe(true);
        });

        it('应该拒绝无效签名', async () => {
            const data = 'test data';
            const wrongData = 'wrong data';
            const signature = await Crypto.sign(data, node1.privateKey);
            
            const isValid = await node1.verifyNodeSig(signature, wrongData, node1.publicKey);
            expect(isValid).toBe(false);
        });

        it('应该能够签名数据', async () => {
            const data = 'test data';
            const signature = await node1.signData(data);
            
            expect(typeof signature).toBe('string');
            expect(signature.length).toBeGreaterThan(0);
            
            // 验证签名
            const isValid = await Crypto.verify(signature, data, node1.publicKey);
            expect(isValid).toBe(true);
        });

        it('未初始化节点签名应该抛出错误', async () => {
            const uninitializedNode = new P2PNode('uninit');
            await expect(uninitializedNode.signData('test')).rejects.toThrow('节点 uninit 尚未初始化密钥对');
        });
    });

    describe('消息处理', () => {
        beforeEach(async () => {
            await node1.connectTo(node2);
        });

        it('应该能够接收消息', () => {
            const message = {
                type: 'BLOCK_BROADCAST',
                data: { blockId: 'test-block' },
                timestamp: Date.now()
            };

            node1.receiveMsg(message, node2.id);
            
            expect(node1.messageQueue.length).toBe(1);
            expect(node1.messageQueue[0].type).toBe('BLOCK_BROADCAST');
            expect(node1.messageQueue[0].fromNodeId).toBe(node2.id);
            expect(node1.messageQueue[0].receivedAt).toBeTruthy();
        });

        it('应该拒绝来自未连接节点的消息', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            
            const message = {
                type: 'BLOCK_BROADCAST',
                data: { blockId: 'test-block' }
            };

            node1.receiveMsg(message, node3.id); // node3 未连接到 node1
            
            expect(node1.messageQueue.length).toBe(0);
            expect(consoleSpy).toHaveBeenCalledWith('节点 node1 收到来自未连接节点 node3 的消息');
            
            consoleSpy.mockRestore();
        });

        it('应该能够转发消息', async () => {
            // 建立 node1 -> node2 -> node3 的连接
            await node2.connectTo(node3);
            
            const allNodes = new Map([
                ['node1', node1],
                ['node2', node2],
                ['node3', node3]
            ]);

            const message = {
                type: 'BLOCK_BROADCAST',
                data: { blockId: 'test-block' }
            };

            // node1 转发消息给 node2（排除 node3）
            node1.forwardMsg(message, 'node3', allNodes);
            
            expect(node2.messageQueue.length).toBe(1);
            expect(node2.messageQueue[0].type).toBe('BLOCK_BROADCAST');
            expect(node2.messageQueue[0].fromNodeId).toBe('node1');
        });

        it('应该能够广播消息', async () => {
            await node1.connectTo(node3);
            
            const allNodes = new Map([
                ['node1', node1],
                ['node2', node2],
                ['node3', node3]
            ]);

            const message = {
                type: 'FORK_WARNING',
                data: { warning: 'fork detected' }
            };

            node1.broadcast(message, allNodes);
            
            expect(node2.messageQueue.length).toBe(1);
            expect(node3.messageQueue.length).toBe(1);
            expect(node2.messageQueue[0].type).toBe('FORK_WARNING');
            expect(node3.messageQueue[0].type).toBe('FORK_WARNING');
        });

        it('应该能够清空消息队列', () => {
            const message = {
                type: 'BLOCK_BROADCAST',
                data: { blockId: 'test-block' }
            };

            node1.receiveMsg(message, node2.id);
            expect(node1.messageQueue.length).toBe(1);
            
            node1.clearMessageQueue();
            expect(node1.messageQueue.length).toBe(0);
        });

        it('应该能够获取消息队列副本', () => {
            const message = {
                type: 'BLOCK_BROADCAST',
                data: { blockId: 'test-block' }
            };

            node1.receiveMsg(message, node2.id);
            const queue = node1.getMessageQueue();
            
            expect(queue.length).toBe(1);
            expect(queue).not.toBe(node1.messageQueue); // 应该是副本
            expect(queue[0].type).toBe('BLOCK_BROADCAST');
        });
    });

    describe('连接状态', () => {
        it('应该能够获取连接状态', async () => {
            await node1.connectTo(node2);
            
            const status = node1.getConnectionStatus();
            
            expect(status.nodeId).toBe('node1');
            expect(status.publicKey).toBe(node1.publicKey);
            expect(status.connectionCount).toBe(1);
            expect(status.connectedNodes).toEqual(['node2']);
            expect(status.messageQueueSize).toBe(0);
            expect(status.isInitialized).toBe(true);
        });

        it('未初始化节点的连接状态', () => {
            const uninitializedNode = new P2PNode('uninit');
            const status = uninitializedNode.getConnectionStatus();
            
            expect(status.nodeId).toBe('uninit');
            expect(status.publicKey).toBeNull();
            expect(status.connectionCount).toBe(0);
            expect(status.connectedNodes).toEqual([]);
            expect(status.messageQueueSize).toBe(0);
            expect(status.isInitialized).toBe(false);
        });
    });

    describe('消息处理类型', () => {
        beforeEach(async () => {
            await node1.connectTo(node2);
        });

        it('应该处理区块广播消息', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            const message = {
                type: 'BLOCK_BROADCAST',
                data: { blockId: 'test-block' }
            };

            node1.receiveMsg(message, node2.id);
            
            expect(consoleSpy).toHaveBeenCalledWith('节点 node1 收到区块广播:', { blockId: 'test-block' });
            consoleSpy.mockRestore();
        });

        it('应该处理分叉警告消息', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            const message = {
                type: 'FORK_WARNING',
                data: { warning: 'fork detected' }
            };

            node1.receiveMsg(message, node2.id);
            
            expect(consoleSpy).toHaveBeenCalledWith('节点 node1 收到分叉警告:', { warning: 'fork detected' });
            consoleSpy.mockRestore();
        });

        it('应该处理黑名单更新消息', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            const message = {
                type: 'BLACKLIST_UPDATE',
                data: { blacklistedNode: 'malicious-node' }
            };

            node1.receiveMsg(message, node2.id);
            
            expect(consoleSpy).toHaveBeenCalledWith('节点 node1 收到黑名单更新:', { blacklistedNode: 'malicious-node' });
            consoleSpy.mockRestore();
        });

        it('应该处理未知类型消息', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            const message = {
                type: 'UNKNOWN_TYPE',
                data: { test: 'data' }
            };

            node1.receiveMsg(message, node2.id);
            
            expect(consoleSpy).toHaveBeenCalledWith('节点 node1 收到未知类型消息:', 'UNKNOWN_TYPE');
            consoleSpy.mockRestore();
        });
    });
});