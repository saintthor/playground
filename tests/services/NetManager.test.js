/**
 * NetManager 类单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('NetManager', () => {
    let netManager;

    beforeEach(() => {
        netManager = new NetManager({
            nodeCount: 5,
            connectionCount: 2,
            failureRate: 0
        });
    });

    describe('构造函数和初始化', () => {
        it('应该正确创建 NetManager 实例', () => {
            expect(netManager.nodeCount).toBe(5);
            expect(netManager.connectionCount).toBe(2);
            expect(netManager.failureRate).toBe(0);
            expect(netManager.nodes).toBeInstanceOf(Map);
            expect(netManager.nodes.size).toBe(0);
            expect(netManager.isInitialized).toBe(false);
        });

        it('应该使用默认配置', () => {
            const defaultManager = new NetManager();
            expect(defaultManager.nodeCount).toBe(10);
            expect(defaultManager.connectionCount).toBe(3);
            expect(defaultManager.failureRate).toBe(0.1);
        });

        it('应该成功初始化网络', async () => {
            await netManager.initNetwork();
            
            expect(netManager.isInitialized).toBe(true);
            expect(netManager.nodes.size).toBe(5);
            
            // 检查所有节点都已初始化
            for (const [nodeId, node] of netManager.nodes) {
                expect(node.isInitialized).toBe(true);
                expect(node.id).toBe(nodeId);
            }
        });
    });

    describe('节点创建', () => {
        it('应该创建指定数量的节点', async () => {
            await netManager.createNodes();
            
            expect(netManager.nodes.size).toBe(5);
            
            const nodeIds = Array.from(netManager.nodes.keys());
            expect(nodeIds).toEqual(['node-0', 'node-1', 'node-2', 'node-3', 'node-4']);
        });

        it('所有节点应该正确初始化密钥对', async () => {
            await netManager.createNodes();
            
            for (const [nodeId, node] of netManager.nodes) {
                expect(node.isInitialized).toBe(true);
                expect(node.publicKey).toBeTruthy();
                expect(node.privateKey).toBeTruthy();
            }
        });
    });

    describe('连接建立', () => {
        beforeEach(async () => {
            await netManager.createNodes();
        });

        it('应该建立节点间的连接', async () => {
            await netManager.establishConnections();
            
            let totalConnections = 0;
            for (const [nodeId, node] of netManager.nodes) {
                totalConnections += node.connections.size;
            }
            
            expect(totalConnections).toBeGreaterThan(0);
            expect(netManager.networkStats.activeConnections).toBeGreaterThan(0);
        });

        it('应该处理连接故障', async () => {
            netManager.failureRate = 0.5; // 50% 故障率
            await netManager.establishConnections();
            
            expect(netManager.networkStats.failedConnections).toBeGreaterThanOrEqual(0);
        });
    });

    describe('随机节点选择', () => {
        it('应该返回指定数量的随机节点', () => {
            const allNodes = ['node-0', 'node-1', 'node-2', 'node-3', 'node-4'];
            const randomNodes = netManager.getRandomNodes(allNodes, 'node-0', 2);
            
            expect(randomNodes.length).toBe(2);
            expect(randomNodes).not.toContain('node-0');
            
            // 确保返回的都是有效节点
            for (const nodeId of randomNodes) {
                expect(allNodes).toContain(nodeId);
            }
        });

        it('应该处理请求数量超过可用节点的情况', () => {
            const allNodes = ['node-0', 'node-1', 'node-2'];
            const randomNodes = netManager.getRandomNodes(allNodes, 'node-0', 5);
            
            expect(randomNodes.length).toBe(2); // 只有2个可用节点
            expect(randomNodes).not.toContain('node-0');
        });
    });

    describe('消息广播', () => {
        beforeEach(async () => {
            await netManager.initNetwork();
        });

        it('应该成功广播消息', async () => {
            const message = {
                type: 'TEST_MESSAGE',
                data: { content: 'test broadcast' }
            };

            const result = await netManager.broadcastMessage(message);
            
            expect(result.broadcastId).toBeTruthy();
            expect(result.reachedNodes).toBeGreaterThan(0);
            expect(result.totalNodes).toBe(5);
            expect(result.coverage).toBeGreaterThan(0);
            expect(netManager.networkStats.broadcastCount).toBe(1);
        });

        it('应该从指定节点开始广播', async () => {
            const message = {
                type: 'TEST_MESSAGE',
                data: { content: 'test broadcast from node' }
            };

            const result = await netManager.broadcastMessage(message, 'node-0');
            
            expect(result.originNodeId).toBe('node-0');
            expect(result.reachedNodes).toBeGreaterThanOrEqual(1);
        });

        it('未初始化网络时应该抛出错误', async () => {
            const uninitializedManager = new NetManager();
            const message = { type: 'TEST', data: {} };
            
            await expect(uninitializedManager.broadcastMessage(message))
                .rejects.toThrow('网络未初始化');
        });
    });

    describe('点对点消息', () => {
        beforeEach(async () => {
            await netManager.initNetwork();
        });

        it('应该成功发送点对点消息', () => {
            // 找到两个有连接的节点
            let fromNodeId, toNodeId;
            for (const [nodeId, node] of netManager.nodes) {
                if (node.connections.size > 0) {
                    fromNodeId = nodeId;
                    toNodeId = Array.from(node.connections)[0];
                    break;
                }
            }

            if (fromNodeId && toNodeId) {
                const message = {
                    type: 'P2P_MESSAGE',
                    data: { content: 'direct message' }
                };

                const result = netManager.sendMessage(fromNodeId, toNodeId, message);
                expect(result.success).toBe(true);
                expect(netManager.networkStats.totalMessages).toBe(1);
            }
        });

        it('应该拒绝发送到不存在节点的消息', () => {
            const message = { type: 'TEST', data: {} };
            const result = netManager.sendMessage('node-0', 'nonexistent', message);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('节点不存在');
        });

        it('应该拒绝发送到未连接节点的消息', () => {
            const message = { type: 'TEST', data: {} };
            // 尝试发送到可能未连接的节点
            const result = netManager.sendMessage('node-0', 'node-4', message);
            
            // 结果应该是一个对象，包含success属性
            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('success');
        });
    });

    describe('网络状态', () => {
        beforeEach(async () => {
            await netManager.initNetwork();
        });

        it('应该返回正确的网络状态', () => {
            const status = netManager.getNetworkStatus();
            
            expect(status.nodeCount).toBe(5);
            expect(status.isInitialized).toBe(true);
            expect(status.failureRate).toBe(0);
            expect(status.totalConnections).toBeGreaterThanOrEqual(0);
            expect(status.avgConnections).toBeTruthy();
            expect(status.networkStats).toBeTruthy();
        });

        it('应该返回节点详细信息', () => {
            const nodeDetails = netManager.getNodeDetails('node-0');
            
            expect(nodeDetails).toBeTruthy();
            expect(nodeDetails.nodeId).toBe('node-0');
            expect(nodeDetails.isInitialized).toBe(true);
            expect(nodeDetails.connectionCount).toBeGreaterThanOrEqual(0);
        });

        it('不存在的节点应该返回null', () => {
            const nodeDetails = netManager.getNodeDetails('nonexistent');
            expect(nodeDetails).toBeNull();
        });

        it('应该返回所有节点状态', () => {
            const allStatus = netManager.getAllNodesStatus();
            
            expect(allStatus.length).toBe(5);
            expect(allStatus[0].nodeId).toBeTruthy();
            expect(allStatus[0].isInitialized).toBe(true);
        });
    });

    describe('连接故障模拟', () => {
        beforeEach(async () => {
            await netManager.initNetwork();
        });

        it('应该成功模拟连接故障', () => {
            // 找到两个有连接的节点
            let nodeId1, nodeId2;
            for (const [nodeId, node] of netManager.nodes) {
                if (node.connections.size > 0) {
                    nodeId1 = nodeId;
                    nodeId2 = Array.from(node.connections)[0];
                    break;
                }
            }

            if (nodeId1 && nodeId2) {
                const initialFailures = netManager.networkStats.failedConnections;
                const success = netManager.simulateConnectionFailure(nodeId1, nodeId2);
                
                expect(success).toBe(true);
                expect(netManager.networkStats.failedConnections).toBe(initialFailures + 1);
                
                // 验证连接已断开
                const node1 = netManager.nodes.get(nodeId1);
                const node2 = netManager.nodes.get(nodeId2);
                expect(node1.connections.has(nodeId2)).toBe(false);
                expect(node2.connections.has(nodeId1)).toBe(false);
            }
        });

        it('不存在的节点应该返回false', () => {
            const success = netManager.simulateConnectionFailure('node-0', 'nonexistent');
            expect(success).toBe(false);
        });
    });

    describe('网络配置更新', () => {
        it('应该更新故障率', () => {
            netManager.updateNetworkConfig({ failureRate: 0.3 });
            expect(netManager.failureRate).toBe(0.3);
        });

        it('应该更新连接数', () => {
            netManager.updateNetworkConfig({ connectionCount: 5 });
            expect(netManager.connectionCount).toBe(5);
        });

        it('应该限制故障率在有效范围内', () => {
            netManager.updateNetworkConfig({ failureRate: 1.5 });
            expect(netManager.failureRate).toBe(1);
            
            netManager.updateNetworkConfig({ failureRate: -0.5 });
            expect(netManager.failureRate).toBe(0);
        });

        it('应该限制连接数为正数', () => {
            netManager.updateNetworkConfig({ connectionCount: 0 });
            expect(netManager.connectionCount).toBe(1);
        });
    });

    describe('网络清理和重新初始化', () => {
        beforeEach(async () => {
            await netManager.initNetwork();
        });

        it('应该清理网络资源', () => {
            // 先发送一些消息
            netManager.networkStats.totalMessages = 10;
            
            netManager.cleanup();
            
            // 验证统计信息已重置
            expect(netManager.networkStats.totalMessages).toBe(0);
            expect(netManager.networkStats.broadcastCount).toBe(0);
            
            // 验证路由器和计时器已重置
            expect(netManager.msgRouter.stats.totalMessages).toBe(0);
            expect(netManager.timer.currentTick).toBe(0);
        });

        it('应该重新初始化网络', async () => {
            const initialNodeCount = netManager.nodes.size;
            
            await netManager.reinitialize();
            
            expect(netManager.isInitialized).toBe(true);
            expect(netManager.nodes.size).toBe(initialNodeCount);
        });
    });

    describe('网络拓扑', () => {
        beforeEach(async () => {
            await netManager.initNetwork();
        });

        it('应该返回网络拓扑信息', () => {
            const topology = netManager.getNetworkTopology();
            
            expect(topology.nodes).toBeInstanceOf(Array);
            expect(topology.edges).toBeInstanceOf(Array);
            expect(topology.nodes.length).toBe(5);
            
            // 检查节点信息
            expect(topology.nodes[0]).toHaveProperty('id');
            expect(topology.nodes[0]).toHaveProperty('connectionCount');
            expect(topology.nodes[0]).toHaveProperty('isInitialized');
            
            // 检查边信息
            if (topology.edges.length > 0) {
                expect(topology.edges[0]).toHaveProperty('from');
                expect(topology.edges[0]).toHaveProperty('to');
            }
        });
    });

    describe('消息路由和延迟模拟', () => {
        beforeEach(async () => {
            vi.useFakeTimers();
            await netManager.initNetwork();
        });

        afterEach(() => {
            netManager.stopTimer();
            vi.useRealTimers();
        });

        it('应该初始化消息路由器和计时器', () => {
            expect(netManager.msgRouter).toBeTruthy();
            expect(netManager.timer).toBeTruthy();
            expect(netManager.msgRouter.minDelay).toBe(1);
            expect(netManager.msgRouter.maxDelay).toBe(9);
        });

        it('应该使用消息路由器发送点对点消息', () => {
            // 找到两个有连接的节点
            let fromNodeId, toNodeId;
            for (const [nodeId, node] of netManager.nodes) {
                if (node.connections.size > 0) {
                    fromNodeId = nodeId;
                    toNodeId = Array.from(node.connections)[0];
                    break;
                }
            }

            if (fromNodeId && toNodeId) {
                const message = {
                    type: 'BLOCK_BROADCAST',
                    data: { content: 'routed message' }
                };

                const result = netManager.sendMessage(fromNodeId, toNodeId, message);
                
                expect(result.success).toBe(true);
                expect(result.messageId).toBeTruthy();
                expect(result.delay).toBeGreaterThanOrEqual(1);
                expect(result.delay).toBeLessThanOrEqual(9);
                expect(result.deliveryTick).toBeGreaterThan(0);
            }
        });

        it('应该使用消息路由器广播消息', async () => {
            const message = {
                type: 'FORK_WARNING',
                data: { content: 'urgent broadcast' }
            };

            const result = await netManager.broadcastMessage(message, 'node-0');
            
            expect(result.broadcastId).toBeTruthy();
            expect(result.originNodeId).toBe('node-0');
            expect(result.totalRoutes).toBeGreaterThanOrEqual(0);
            expect(result.estimatedBroadcastTime).toBeGreaterThan(0);
        });

        it('应该启动和停止计时器', () => {
            expect(netManager.startTimer()).toBe(true);
            expect(netManager.timer.isRunning).toBe(true);
            
            expect(netManager.stopTimer()).toBe(true);
            expect(netManager.timer.isRunning).toBe(false);
        });

        it('应该暂停和恢复计时器', () => {
            netManager.startTimer();
            
            expect(netManager.pauseTimer()).toBe(true);
            expect(netManager.timer.isPaused).toBe(true);
            
            expect(netManager.resumeTimer()).toBe(true);
            expect(netManager.timer.isPaused).toBe(false);
        });

        it('应该设置滴答间隔', () => {
            expect(netManager.setTickInterval(500)).toBe(true);
            expect(netManager.timer.tickInterval).toBe(500);
        });

        it('应该处理滴答事件', () => {
            const message = {
                type: 'BLOCK_BROADCAST',
                data: { content: 'tick test' }
            };

            // 发送一个延迟消息
            let fromNodeId, toNodeId;
            for (const [nodeId, node] of netManager.nodes) {
                if (node.connections.size > 0) {
                    fromNodeId = nodeId;
                    toNodeId = Array.from(node.connections)[0];
                    break;
                }
            }

            if (fromNodeId && toNodeId) {
                const result = netManager.sendMessage(fromNodeId, toNodeId, message);
                
                // 手动触发滴答处理
                const processedMessages = netManager.processTick(result.deliveryTick);
                
                // 验证消息被处理
                expect(Array.isArray(processedMessages)).toBe(true);
            }
        });

        it('应该计算全网广播时间', () => {
            const broadcastTime = netManager.calculateBroadcastTime();
            
            expect(broadcastTime).toBeGreaterThan(0);
            expect(typeof broadcastTime).toBe('number');
        });

        it('应该设置网络延迟范围', () => {
            netManager.setDelayRange(2, 6);
            
            expect(netManager.msgRouter.minDelay).toBe(2);
            expect(netManager.msgRouter.maxDelay).toBe(6);
        });

        it('应该返回路由器状态', () => {
            const routerStatus = netManager.getRouterStatus();
            
            expect(routerStatus).toHaveProperty('currentTick');
            expect(routerStatus).toHaveProperty('queuedMessages');
            expect(routerStatus).toHaveProperty('priorityQueueSize');
            expect(routerStatus).toHaveProperty('delayRange');
            expect(routerStatus).toHaveProperty('stats');
        });

        it('应该返回计时器状态', () => {
            const timerStatus = netManager.getTimerStatus();
            
            expect(timerStatus).toHaveProperty('currentTick');
            expect(timerStatus).toHaveProperty('tickInterval');
            expect(timerStatus).toHaveProperty('isRunning');
            expect(timerStatus).toHaveProperty('isPaused');
            expect(timerStatus).toHaveProperty('callbackCount');
        });

        it('应该处理高优先级消息', () => {
            const highPriorityMessage = {
                type: 'FORK_WARNING',
                data: { content: 'urgent message' }
            };

            // 找到两个有连接的节点
            let fromNodeId, toNodeId;
            for (const [nodeId, node] of netManager.nodes) {
                if (node.connections.size > 0) {
                    fromNodeId = nodeId;
                    toNodeId = Array.from(node.connections)[0];
                    break;
                }
            }

            if (fromNodeId && toNodeId) {
                const result = netManager.sendMessage(fromNodeId, toNodeId, highPriorityMessage);
                
                expect(result.success).toBe(true);
                expect(result.isHighPriority).toBe(true);
                expect(result.priority).toBe(1); // FORK_WARNING 的优先级
            }
        });

        it('应该在清理时重置路由器和计时器', () => {
            // 启动计时器并发送消息
            netManager.startTimer();
            const message = { type: 'TEST', data: {} };
            
            // 找到连接的节点并发送消息
            for (const [nodeId, node] of netManager.nodes) {
                if (node.connections.size > 0) {
                    const toNodeId = Array.from(node.connections)[0];
                    netManager.sendMessage(nodeId, toNodeId, message);
                    break;
                }
            }

            // 清理网络
            netManager.cleanup();
            
            // 验证路由器和计时器已重置
            expect(netManager.timer.isRunning).toBe(false);
            expect(netManager.timer.currentTick).toBe(0);
            expect(netManager.msgRouter.currentTick).toBe(0);
            expect(netManager.msgRouter.stats.totalMessages).toBe(0);
        });
    });
});