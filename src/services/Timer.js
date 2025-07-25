/**
 * Timer 类 - 时间管理器
 * 
 * 负责滴答计数、时间控制和网络延迟模拟的时间基准
 */

export class Timer {
    /**
     * 构造函数
     * @param {Object} config - 时间配置
     * @param {number} config.tickInterval - 滴答间隔（毫秒）
     */
    constructor(config = {}) {
        this.tickInterval = config.tickInterval || 1000; // 默认1秒一个滴答
        this.currentTick = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.startTime = null;
        this.pauseTime = null;
        this.totalPausedTime = 0;
        
        this.tickCallbacks = new Set(); // 滴答回调函数集合
        this.intervalId = null;
        
        // 时间统计
        this.stats = {
            totalTicks: 0,
            totalRunTime: 0,
            totalPausedTime: 0,
            averageTickInterval: 0
        };
    }

    /**
     * 启动计时器
     * @returns {boolean} 启动是否成功
     */
    start() {
        if (this.isRunning) {
            console.warn('计时器已在运行');
            return false;
        }
        
        this.isRunning = true;
        this.isPaused = false;
        this.startTime = Date.now();
        this.totalPausedTime = 0;
        
        this.intervalId = setInterval(() => {
            if (!this.isPaused) {
                this.tick();
            }
        }, this.tickInterval);
        
        console.log(`计时器启动，滴答间隔: ${this.tickInterval}ms`);
        return true;
    }

    /**
     * 暂停计时器
     * @returns {boolean} 暂停是否成功
     */
    pause() {
        if (!this.isRunning || this.isPaused) {
            console.warn('计时器未运行或已暂停');
            return false;
        }
        
        this.isPaused = true;
        this.pauseTime = Date.now();
        
        console.log(`计时器暂停在滴答 ${this.currentTick}`);
        return true;
    }

    /**
     * 恢复计时器
     * @returns {boolean} 恢复是否成功
     */
    resume() {
        if (!this.isRunning || !this.isPaused) {
            console.warn('计时器未暂停');
            return false;
        }
        
        this.isPaused = false;
        
        if (this.pauseTime) {
            this.totalPausedTime += Date.now() - this.pauseTime;
            this.pauseTime = null;
        }
        
        console.log(`计时器恢复，当前滴答: ${this.currentTick}`);
        return true;
    }

    /**
     * 停止计时器
     * @returns {boolean} 停止是否成功
     */
    stop() {
        if (!this.isRunning) {
            console.warn('计时器未运行');
            return false;
        }
        
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        // 更新统计信息
        if (this.startTime) {
            const totalTime = Date.now() - this.startTime;
            this.stats.totalRunTime = totalTime - this.totalPausedTime;
            this.stats.totalPausedTime = this.totalPausedTime;
            this.stats.totalTicks = this.currentTick;
            
            if (this.currentTick > 0) {
                this.stats.averageTickInterval = this.stats.totalRunTime / this.currentTick;
            }
        }
        
        console.log(`计时器停止，总滴答数: ${this.currentTick}`);
        return true;
    }

    /**
     * 执行一个滴答
     */
    tick() {
        this.currentTick++;
        
        // 调用所有注册的回调函数
        for (const callback of this.tickCallbacks) {
            try {
                callback(this.currentTick);
            } catch (error) {
                console.error('滴答回调执行错误:', error);
            }
        }
    }

    /**
     * 注册滴答回调函数
     * @param {Function} callback - 回调函数
     * @returns {boolean} 注册是否成功
     */
    onTick(callback) {
        if (typeof callback !== 'function') {
            console.error('回调必须是函数');
            return false;
        }
        
        this.tickCallbacks.add(callback);
        return true;
    }

    /**
     * 移除滴答回调函数
     * @param {Function} callback - 要移除的回调函数
     * @returns {boolean} 移除是否成功
     */
    offTick(callback) {
        return this.tickCallbacks.delete(callback);
    }

    /**
     * 获取当前滴答数
     * @returns {number} 当前滴答数
     */
    getCurrentTick() {
        return this.currentTick;
    }

    /**
     * 设置滴答间隔
     * @param {number} interval - 新的滴答间隔（毫秒）
     * @returns {boolean} 设置是否成功
     */
    setTickInterval(interval) {
        if (interval < 0) {
            console.error('滴答间隔不能为负数');
            return false;
        }
        
        const oldInterval = this.tickInterval;
        this.tickInterval = interval;
        
        // 如果计时器正在运行，重新启动以应用新间隔
        if (this.isRunning) {
            const wasRunning = !this.isPaused;
            
            if (this.intervalId) {
                clearInterval(this.intervalId);
            }
            
            this.intervalId = setInterval(() => {
                if (!this.isPaused) {
                    this.tick();
                }
            }, this.tickInterval);
            
            console.log(`滴答间隔从 ${oldInterval}ms 更改为 ${interval}ms`);
        }
        
        return true;
    }

    /**
     * 计算网络延迟（基于滴答）
     * @param {number} minTicks - 最小延迟滴答数
     * @param {number} maxTicks - 最大延迟滴答数
     * @returns {number} 随机延迟滴答数
     */
    calculateNetworkDelay(minTicks = 1, maxTicks = 9) {
        const min = Math.max(1, minTicks);
        const max = Math.min(9, Math.max(min, maxTicks));
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * 计算全网广播时间
     * @param {Object} networkParams - 网络参数
     * @param {number} networkParams.nodeCount - 节点数量
     * @param {number} networkParams.avgConnections - 平均连接数
     * @param {number} networkParams.maxDelay - 最大延迟
     * @returns {number} 预估全网广播时间（滴答数）
     */
    calculateBroadcastTime(networkParams) {
        const { nodeCount, avgConnections, maxDelay } = networkParams;
        
        if (!nodeCount || !avgConnections) {
            return maxDelay || 9;
        }
        
        // 基于网络拓扑计算广播时间
        // 使用对数模型：log(n) / log(avgConnections) * maxDelay
        const networkDepth = Math.ceil(Math.log(nodeCount) / Math.log(Math.max(2, avgConnections)));
        const broadcastTime = networkDepth * (maxDelay || 9);
        
        return Math.max(1, broadcastTime);
    }

    /**
     * 获取计时器状态
     * @returns {Object} 计时器状态信息
     */
    getTimerStatus() {
        const currentTime = Date.now();
        let runTime = 0;
        
        if (this.startTime) {
            if (this.isRunning) {
                const pausedTime = this.isPaused && this.pauseTime ? 
                    (currentTime - this.pauseTime) : 0;
                runTime = currentTime - this.startTime - this.totalPausedTime - pausedTime;
            } else {
                runTime = this.stats.totalRunTime;
            }
        }
        
        return {
            currentTick: this.currentTick,
            tickInterval: this.tickInterval,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            runTime,
            totalPausedTime: this.totalPausedTime,
            callbackCount: this.tickCallbacks.size,
            stats: { ...this.stats }
        };
    }

    /**
     * 重置计时器
     */
    reset() {
        this.stop();
        this.currentTick = 0;
        this.startTime = null;
        this.pauseTime = null;
        this.totalPausedTime = 0;
        this.tickCallbacks.clear();
        
        this.stats = {
            totalTicks: 0,
            totalRunTime: 0,
            totalPausedTime: 0,
            averageTickInterval: 0
        };
        
        console.log('计时器已重置');
    }

    /**
     * 手动触发滴答（用于测试）
     */
    manualTick() {
        if (!this.isRunning) {
            console.warn('计时器未运行，无法手动触发滴答');
            return;
        }
        
        this.tick();
    }

    /**
     * 获取实际运行时间与理论时间的差异
     * @returns {Object} 时间差异信息
     */
    getTimingAccuracy() {
        if (!this.startTime || this.currentTick === 0) {
            return { accuracy: 100, drift: 0 };
        }
        
        const theoreticalTime = this.currentTick * this.tickInterval;
        const actualTime = this.stats.totalRunTime || 
            (Date.now() - this.startTime - this.totalPausedTime);
        
        const drift = actualTime - theoreticalTime;
        const accuracy = Math.max(0, 100 - Math.abs(drift) / theoreticalTime * 100);
        
        return {
            accuracy: Math.round(accuracy * 100) / 100,
            drift: Math.round(drift),
            theoreticalTime,
            actualTime: Math.round(actualTime)
        };
    }
}