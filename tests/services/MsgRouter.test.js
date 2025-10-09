/**
 * MsgRouter 类的单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('MsgRouter', () => {
    let msgRouter;
    let mockNodes;

    beforeEach(() => {
        msgRouter = new MsgRouter({
            minDelay: 1,
            maxDelay: 9
        });

        // 创建模拟节点
        mockNodes = new Map();
        for (let i = 0; i < 3; i++) {
            const nodeId = `node-${i}`;
            mockNodes.set(nodeId, {
                id: nodeId,
                receiveMsg: vi.fn(),
                connections: new Set()
            });
        }

        // 建立连接关系
        mockNodes.get('node-0').connections.add('node-1');
        mockNodes.get('node-1').connections.add('node-0');
        mockNodes.get('node-1').connections.add('node-2');
        mockNodes.get('node-2').connections.add('node-1');
    });

    describe('构造函数', () => {
        it('应该使用默认配置初始化', () => {
            const router = new MsgRouter();
            expect(router.minDelay).toBe(1);
            expect(router.maxDelay).toBe(9);
            expect(router.currentTick).toBe(0);
        });

        it('应该使用自定义配置初始化', () => {
            const router = new MsgRouter({ minDelay: 2, maxDelay: 5 });
            expect(router.minDelay).toBe(2);
            expect(router.maxDelay).toBe(5);
        });
    });

    describe('消息优先级', () => {
        it('应该正确识别高优先级消息', () => {
            const highPriorityMessage = { type: 'FORK_WARNING', data: 'test' };
            const lowPriorityMessage = { type: 'HEARTBEAT', data: 'test' };

            expect(msgRouter.isHighPriority(highPriorityMessage)).toBe(true);
            expect(msgRouter.isHighPriority(lowPriorityMessage)).toBe(false);
        });

        it('应该返回正确的消息优先级数值', () => {
            expect(msgRouter.getMessagePriority({ type: 'FORK_WARNING' })).toBe(1);
            expect(msgRouter.getMessagePriority({ type: 'BLOCK_BROADCAST' })).toBe(4);
            expect(msgRouter.getMessagePriority({ type: 'UNKNOWN_TYPE' })).toBe(10);
        });
    });

    describe('延迟计算', () => {
        it('应该为高优先级消息计算较小延迟', () => {
            const highPriorityMessage = { type: 'FORK_WARNING' };
            const delay = msgRouter.calculateDelay(highPriorityMessage);
            
            expect(delay).toBeGreaterThanOrEqual(1);
            expect(delay).toBeLessThanOrEqual(3);
        });

        it('应该为普通消息计算正常延迟范围', () => {
            const normalMessage = { type: 'BLOCK_BROADCAST' };
            const delay = msgRouter.calculateDelay(normalMessage);
            
            expect(delay).toBeGreaterThanOrEqual(1);
            expect(delay).toBeLessThanOrEqual(9);
        });

        it('应该在设定的延迟范围内', () => {
            const router = new MsgRouter({ minDelay: 3, maxDelay: 6 });
            const message = { type: 'BLOCK_BROADCAST' };
            
            for (let i = 0; i < 100; i++) {
                const delay = router.calculateDelay(message);
                expect(delay).toBeGreaterThanOrEqual(3);
                expect(delay).toBeLessThanOrEqual(6);
            }
        });
    });

    describe('消息路由', () => {
        it('应该成功路由普通消息', () => {
            const message = { type: 'BLOCK_BROADCAST', data: 'test' };
            const result = msgRouter.routeMessage(message, 'node-0', 'node-1', mockNodes);

            expect(result).toHaveProperty('messageId');
            expect(result).toHaveProperty('delay');
            expect(result).toHaveProperty('deliveryTick');
            expect(result).toHaveProperty('priority');
            expect(result.isHighPriority).toBe(false);
        });

        it('应该立即处理高优先级消息', () => {
            const message = { type: 'FORK_WARNING', data: 'urgent' };
            const result = msgRouter.routeMessage(message, 'node-0', 'node-1', mockNodes);

            expect(result.isHighPriority).toBe(true);
            expect(msgRouter.priorityQueue.length).toBe(1);
        });

        it('应该将普通消息加入延迟队列', () => {
            const message = { type: 'BLOCK_BROADCAST', data: 'normal' };
            const result = msgRouter.routeMessage(message, 'node-0', 'node-1', mockNodes);

            expect(msgRouter.messageQueue.has(result.deliveryTick)).toBe(true);
        });
    });

    describe('消息广播', () => {
        it('应该成功广播消息到网络', () => {
            const message = { type: 'BLOCK_BROADCAST', data: 'broadcast test' };
            const connections = new Map();
            connections.set('node-0', new Set(['node-1']));
            connections.set('node-1', new Set(['node-0', 'node-2']));
            connections.set('node-2', new Set(['node-1']));

            const result = msgRouter.broadcastMessage(message, 'node-0', mockNodes, connections);

            expect(result).toHaveProperty('broadcastId');
            expect(result).toHaveProperty('originNodeId', 'node-0');
            expect(result).toHaveProperty('totalRoutes');
            expect(result).toHaveProperty('reachedNodes');
            expect(result.reachedNodes).toBeGreaterThan(0);
        });

        it('应该计算广播时间', () => {
            const message = { type: 'BLOCK_BROADCAST', data: 'test' };
            const connections = new Map();
            connections.set('node-0', new Set(['node-1']));
            connections.set('node-1', new Set(['node-2']));

            const result = msgRouter.broadcastMessage(message, 'node-0', mockNodes, connections);
            
            expect(result.estimatedBroadcastTime).toBeGreaterThan(0);
        });
    });

    describe('滴答处理', () => {
        it('应该处理高优先级消息', () => {
            const message = { type: 'FORK_WARNING', data: 'urgent' };
            msgRouter.routeMessage(message, 'node-0', 'node-1', mockNodes);

            const processed = msgRouter.processTick(mockNodes);
            
            expect(processed.length).toBe(1);
            expect(mockNodes.get('node-1').receiveMsg).toHaveBeenCalled();
        });

        it('应该按滴答处理延迟消息', () => {
            const message = { type: 'BLOCK_BROADCAST', data: 'delayed' };
            const result = msgRouter.routeMessage(message, 'node-0', 'node-1', mockNodes);

            // 在投递滴答之前不应该处理消息
            msgRouter.currentTick = result.deliveryTick - 1;
            let processed = msgRouter.processTick(mockNodes);
            expect(processed.length).toBe(0);

            // 在投递滴答时应该处理消息
            msgRouter.currentTick = result.deliveryTick;
            processed = msgRouter.processTick(mockNodes);
            expect(processed.length).toBe(1);
        });

        it('应该按优先级排序处理消息', () => {
            // 添加不同优先级的消息到同一滴答
            const highPriorityMsg = { type: 'BLACKLIST_UPDATE', data: 'high' };
            const lowPriorityMsg = { type: 'HEARTBEAT', data: 'low' };

            msgRouter.currentTick = 5;
            msgRouter.messageQueue.set(5, [
                {
                    message: lowPriorityMsg,
                    fromNodeId: 'node-0',
                    toNodeId: 'node-1',
                    priority: msgRouter.getMessagePriority(lowPriorityMsg)
                },
                {
                    message: highPriorityMsg,
                    fromNodeId: 'node-0',
                    toNodeId: 'node-1',
                    priority: msgRouter.getMessagePriority(highPriorityMsg)
                }
            ]);

            const processed = msgRouter.processTick(mockNodes);
            expect(processed.length).toBe(2);
            // 高优先级消息应该先处理
            expect(processed[0].message.data).toBe('high');
            expect(processed[1].message.data).toBe('low');
        });
    });

    describe('广播时间计算', () => {
        it('应该基于路由结果计算广播时间', () => {
            const routingResults = [
                { delay: 2 },
                { delay: 5 },
                { delay: 3 }
            ];

            const broadcastTime = msgRouter.calculateBroadcastTime(routingResults);
            expect(broadcastTime).toBe(Math.ceil(5 * 1.5)); // 最大延迟 * 1.5
        });

        it('应该处理空路由结果', () => {
            const broadcastTime = msgRouter.calculateBroadcastTime([]);
            expect(broadcastTime).toBe(0);
        });
    });

    describe('统计信息', () => {
        it('应该正确更新统计信息', () => {
            const message = { type: 'BLOCK_BROADCAST', data: 'test' };
            msgRouter.routeMessage(message, 'node-0', 'node-1', mockNodes);

            const stats = msgRouter.stats;
            expect(stats.totalMessages).toBe(1);
            expect(stats.delayedMessages).toBe(1);
            expect(stats.messagesByType.get('BLOCK_BROADCAST')).toBe(1);
        });

        it('应该计算平均延迟', () => {
            const message1 = { type: 'BLOCK_BROADCAST', data: 'test1' };
            const message2 = { type: 'BLOCK_BROADCAST', data: 'test2' };

            // 模拟固定延迟以便测试
            vi.spyOn(msgRouter, 'calculateDelay').mockReturnValueOnce(2).mockReturnValueOnce(4);

            msgRouter.routeMessage(message1, 'node-0', 'node-1', mockNodes);
            msgRouter.routeMessage(message2, 'node-0', 'node-1', mockNodes);

            expect(msgRouter.stats.averageDelay).toBe(3); // (2 + 4) / 2
        });
    });

    describe('路由器状态', () => {
        it('应该返回完整的路由器状态', () => {
            const message = { type: 'BLOCK_BROADCAST', data: 'test' };
            msgRouter.routeMessage(message, 'node-0', 'node-1', mockNodes);

            const status = msgRouter.getRouterStatus();
            
            expect(status).toHaveProperty('currentTick');
            expect(status).toHaveProperty('queuedMessages');
            expect(status).toHaveProperty('priorityQueueSize');
            expect(status).toHaveProperty('delayRange');
            expect(status).toHaveProperty('stats');
        });
    });

    describe('清理功能', () => {
        it('应该清理过期消息', () => {
            msgRouter.currentTick = 150;
            msgRouter.messageQueue.set(40, [{ message: 'old' }]);
            msgRouter.messageQueue.set(140, [{ message: 'recent' }]);

            msgRouter.cleanupExpiredMessages(100);

            expect(msgRouter.messageQueue.has(40)).toBe(false);
            expect(msgRouter.messageQueue.has(140)).toBe(true);
        });

        it('应该重置路由器状态', () => {
            const message = { type: 'BLOCK_BROADCAST', data: 'test' };
            msgRouter.routeMessage(message, 'node-0', 'node-1', mockNodes);
            msgRouter.currentTick = 10;

            msgRouter.reset();

            expect(msgRouter.currentTick).toBe(0);
            expect(msgRouter.messageQueue.size).toBe(0);
            expect(msgRouter.priorityQueue.length).toBe(0);
            expect(msgRouter.stats.totalMessages).toBe(0);
        });
    });

    describe('延迟范围设置', () => {
        it('应该正确设置延迟范围', () => {
            msgRouter.setDelayRange(2, 7);
            
            expect(msgRouter.minDelay).toBe(2);
            expect(msgRouter.maxDelay).toBe(7);
        });

        it('应该限制延迟范围在有效区间内', () => {
            msgRouter.setDelayRange(0, 15);
            
            expect(msgRouter.minDelay).toBe(1); // 最小值限制为1
            expect(msgRouter.maxDelay).toBe(9); // 最大值限制为9
        });

        it('应该确保最小延迟不大于最大延迟', () => {
            msgRouter.setDelayRange(8, 3);
            
            expect(msgRouter.minDelay).toBe(8);
            expect(msgRouter.maxDelay).toBe(8); // 调整为不小于minDelay
        });
    });
});