/**
 * Timer 类的单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Timer', () => {
    let timer;

    beforeEach(() => {
        vi.useFakeTimers();
        timer = new Timer({ tickInterval: 100 });
    });

    afterEach(() => {
        timer.stop();
        vi.useRealTimers();
    });

    describe('构造函数', () => {
        it('应该使用默认配置初始化', () => {
            const defaultTimer = new Timer();
            expect(defaultTimer.tickInterval).toBe(1000);
            expect(defaultTimer.currentTick).toBe(0);
            expect(defaultTimer.isRunning).toBe(false);
            expect(defaultTimer.isPaused).toBe(false);
        });

        it('应该使用自定义配置初始化', () => {
            const customTimer = new Timer({ tickInterval: 500 });
            expect(customTimer.tickInterval).toBe(500);
        });
    });

    describe('计时器控制', () => {
        it('应该成功启动计时器', () => {
            const result = timer.start();
            
            expect(result).toBe(true);
            expect(timer.isRunning).toBe(true);
            expect(timer.isPaused).toBe(false);
            expect(timer.startTime).toBeTruthy();
        });

        it('应该拒绝重复启动', () => {
            timer.start();
            const result = timer.start();
            
            expect(result).toBe(false);
        });

        it('应该成功暂停计时器', () => {
            timer.start();
            const result = timer.pause();
            
            expect(result).toBe(true);
            expect(timer.isPaused).toBe(true);
            expect(timer.pauseTime).toBeTruthy();
        });

        it('应该拒绝暂停未运行的计时器', () => {
            const result = timer.pause();
            expect(result).toBe(false);
        });

        it('应该成功恢复计时器', () => {
            timer.start();
            timer.pause();
            const result = timer.resume();
            
            expect(result).toBe(true);
            expect(timer.isPaused).toBe(false);
            expect(timer.pauseTime).toBe(null);
        });

        it('应该拒绝恢复未暂停的计时器', () => {
            timer.start();
            const result = timer.resume();
            expect(result).toBe(false);
        });

        it('应该成功停止计时器', () => {
            timer.start();
            const result = timer.stop();
            
            expect(result).toBe(true);
            expect(timer.isRunning).toBe(false);
            expect(timer.isPaused).toBe(false);
        });

        it('应该拒绝停止未运行的计时器', () => {
            const result = timer.stop();
            expect(result).toBe(false);
        });
    });

    describe('滴答功能', () => {
        it('应该在启动后产生滴答', () => {
            timer.start();
            
            expect(timer.currentTick).toBe(0);
            
            vi.advanceTimersByTime(100);
            expect(timer.currentTick).toBe(1);
            
            vi.advanceTimersByTime(200);
            expect(timer.currentTick).toBe(3);
        });

        it('应该在暂停时停止滴答', () => {
            timer.start();
            vi.advanceTimersByTime(100);
            expect(timer.currentTick).toBe(1);
            
            timer.pause();
            vi.advanceTimersByTime(200);
            expect(timer.currentTick).toBe(1); // 应该保持不变
        });

        it('应该在恢复后继续滴答', () => {
            timer.start();
            vi.advanceTimersByTime(100);
            expect(timer.currentTick).toBe(1);
            
            timer.pause();
            vi.advanceTimersByTime(100);
            expect(timer.currentTick).toBe(1);
            
            timer.resume();
            vi.advanceTimersByTime(100);
            expect(timer.currentTick).toBe(2);
        });

        it('应该支持手动触发滴答', () => {
            timer.start();
            timer.manualTick();
            
            expect(timer.currentTick).toBe(1);
        });

        it('应该拒绝在未运行时手动触发滴答', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            timer.manualTick();
            
            expect(timer.currentTick).toBe(0);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('回调函数', () => {
        it('应该成功注册滴答回调', () => {
            const callback = vi.fn();
            const result = timer.onTick(callback);
            
            expect(result).toBe(true);
            expect(timer.tickCallbacks.has(callback)).toBe(true);
        });

        it('应该拒绝注册非函数回调', () => {
            const result = timer.onTick('not a function');
            expect(result).toBe(false);
        });

        it('应该在滴答时调用回调函数', () => {
            const callback = vi.fn();
            timer.onTick(callback);
            timer.start();
            
            vi.advanceTimersByTime(100);
            
            expect(callback).toHaveBeenCalledWith(1);
        });

        it('应该成功移除回调函数', () => {
            const callback = vi.fn();
            timer.onTick(callback);
            const result = timer.offTick(callback);
            
            expect(result).toBe(true);
            expect(timer.tickCallbacks.has(callback)).toBe(false);
        });

        it('应该处理回调函数中的错误', () => {
            const errorCallback = vi.fn(() => {
                throw new Error('Callback error');
            });
            const normalCallback = vi.fn();
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            
            timer.onTick(errorCallback);
            timer.onTick(normalCallback);
            timer.start();
            
            vi.advanceTimersByTime(100);
            
            expect(errorCallback).toHaveBeenCalled();
            expect(normalCallback).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('滴答间隔设置', () => {
        it('应该成功设置新的滴答间隔', () => {
            const result = timer.setTickInterval(200);
            
            expect(result).toBe(true);
            expect(timer.tickInterval).toBe(200);
        });

        it('应该拒绝负数滴答间隔', () => {
            const result = timer.setTickInterval(-100);
            
            expect(result).toBe(false);
            expect(timer.tickInterval).toBe(100); // 保持原值
        });

        it('应该在运行时更新滴答间隔', () => {
            timer.start();
            vi.advanceTimersByTime(100);
            expect(timer.currentTick).toBe(1);
            
            timer.setTickInterval(50);
            vi.advanceTimersByTime(50);
            expect(timer.currentTick).toBe(2);
        });
    });

    describe('网络延迟计算', () => {
        it('应该在指定范围内计算网络延迟', () => {
            for (let i = 0; i < 100; i++) {
                const delay = timer.calculateNetworkDelay(2, 5);
                expect(delay).toBeGreaterThanOrEqual(2);
                expect(delay).toBeLessThanOrEqual(5);
            }
        });

        it('应该使用默认延迟范围', () => {
            const delay = timer.calculateNetworkDelay();
            expect(delay).toBeGreaterThanOrEqual(1);
            expect(delay).toBeLessThanOrEqual(9);
        });

        it('应该处理无效的延迟范围', () => {
            const delay1 = timer.calculateNetworkDelay(0, 15);
            expect(delay1).toBeGreaterThanOrEqual(1);
            expect(delay1).toBeLessThanOrEqual(9);
            
            const delay2 = timer.calculateNetworkDelay(5, 3);
            expect(delay2).toBeGreaterThanOrEqual(5);
            expect(delay2).toBeLessThanOrEqual(5);
        });
    });

    describe('广播时间计算', () => {
        it('应该基于网络参数计算广播时间', () => {
            const networkParams = {
                nodeCount: 16,
                avgConnections: 4,
                maxDelay: 5
            };
            
            const broadcastTime = timer.calculateBroadcastTime(networkParams);
            
            // 16个节点，平均4个连接，网络深度约为log(16)/log(4) = 2
            // 广播时间应该是 2 * 5 = 10
            expect(broadcastTime).toBe(10);
        });

        it('应该处理缺少参数的情况', () => {
            const broadcastTime1 = timer.calculateBroadcastTime({});
            expect(broadcastTime1).toBe(9); // 默认maxDelay
            
            const broadcastTime2 = timer.calculateBroadcastTime({ maxDelay: 3 });
            expect(broadcastTime2).toBe(3);
        });

        it('应该确保广播时间至少为1', () => {
            const networkParams = {
                nodeCount: 1,
                avgConnections: 1,
                maxDelay: 0
            };
            
            const broadcastTime = timer.calculateBroadcastTime(networkParams);
            expect(broadcastTime).toBeGreaterThanOrEqual(1);
        });
    });

    describe('状态查询', () => {
        it('应该返回正确的计时器状态', () => {
            timer.start();
            vi.advanceTimersByTime(100);
            
            const status = timer.getTimerStatus();
            
            expect(status).toHaveProperty('currentTick', 1);
            expect(status).toHaveProperty('tickInterval', 100);
            expect(status).toHaveProperty('isRunning', true);
            expect(status).toHaveProperty('isPaused', false);
            expect(status).toHaveProperty('runTime');
            expect(status).toHaveProperty('callbackCount', 0);
        });

        it('应该计算时间精度', () => {
            timer.start();
            vi.advanceTimersByTime(300); // 3个滴答
            timer.stop();
            
            const accuracy = timer.getTimingAccuracy();
            
            expect(accuracy).toHaveProperty('accuracy');
            expect(accuracy).toHaveProperty('drift');
            expect(accuracy).toHaveProperty('theoreticalTime');
            expect(accuracy).toHaveProperty('actualTime');
        });
    });

    describe('重置功能', () => {
        it('应该完全重置计时器状态', () => {
            const callback = vi.fn();
            timer.onTick(callback);
            timer.start();
            vi.advanceTimersByTime(200);
            
            timer.reset();
            
            expect(timer.currentTick).toBe(0);
            expect(timer.isRunning).toBe(false);
            expect(timer.isPaused).toBe(false);
            expect(timer.startTime).toBe(null);
            expect(timer.tickCallbacks.size).toBe(0);
            expect(timer.stats.totalTicks).toBe(0);
        });
    });

    describe('统计信息', () => {
        it('应该在停止时更新统计信息', () => {
            timer.start();
            vi.advanceTimersByTime(300);
            timer.pause();
            vi.advanceTimersByTime(100); // 暂停时间
            timer.resume();
            vi.advanceTimersByTime(200);
            timer.stop();
            
            const status = timer.getTimerStatus();
            
            expect(status.stats.totalTicks).toBe(5);
            expect(status.stats.totalRunTime).toBeGreaterThan(0);
            expect(status.stats.totalPausedTime).toBeGreaterThan(0);
        });
    });
});