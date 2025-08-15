/**
 * PerformanceOptimizer - 性能优化器
 * 提供真实的性能监控和优化功能
 */
class PerformanceOptimizer {
    constructor() {
        this.initialized = false;
        this.cryptoOperations = 0;
        this.startTime = performance.now();
        this.frameCount = 0;
        this.lastFrameTime = performance.now();
        this.fpsHistory = [];
        this.memoryHistory = [];
        this.performanceObserver = null;
        
        // 绑定方法
        this.updateFPS = this.updateFPS.bind(this);
    }
    
    async init() {
        try {
            this.initialized = true;
            this.startTime = performance.now();
            
            // 启动FPS监控
            this.startFPSMonitoring();
            
            // 启动内存监控
            this.startMemoryMonitoring();
            
            // 启动性能观察器
            this.startPerformanceObserver();
            
            console.log('性能优化器初始化完成');
        } catch (error) {
            console.error('性能优化器初始化失败:', error);
            this.initialized = false;
        }
    }
    
    /**
     * 启动FPS监控
     */
    startFPSMonitoring() {
        const updateFPS = () => {
            if (!this.initialized) return;
            
            const now = performance.now();
            this.frameCount++;
            
            // 每秒计算一次FPS
            if (now - this.lastFrameTime >= 1000) {
                const fps = Math.round((this.frameCount * 1000) / (now - this.lastFrameTime));
                this.fpsHistory.push(fps);
                
                // 保持历史记录在合理范围内
                if (this.fpsHistory.length > 60) {
                    this.fpsHistory.shift();
                }
                
                this.frameCount = 0;
                this.lastFrameTime = now;
            }
            
            requestAnimationFrame(updateFPS);
        };
        
        requestAnimationFrame(updateFPS);
    }
    
    /**
     * 启动内存监控
     */
    startMemoryMonitoring() {
        const updateMemory = () => {
            if (!this.initialized) return;
            
            try {
                if (performance.memory) {
                    const memoryInfo = {
                        used: performance.memory.usedJSHeapSize,
                        total: performance.memory.totalJSHeapSize,
                        limit: performance.memory.jsHeapSizeLimit,
                        timestamp: performance.now()
                    };
                    
                    this.memoryHistory.push(memoryInfo);
                    
                    // 保持历史记录在合理范围内
                    if (this.memoryHistory.length > 100) {
                        this.memoryHistory.shift();
                    }
                }
            } catch (error) {
                console.warn('内存监控失败:', error);
            }
            
            setTimeout(updateMemory, 5000); // 每5秒更新一次
        };
        
        setTimeout(updateMemory, 1000);
    }
    
    /**
     * 启动性能观察器
     */
    startPerformanceObserver() {
        try {
            if (typeof PerformanceObserver !== 'undefined') {
                this.performanceObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        if (entry.entryType === 'measure' || entry.entryType === 'navigation') {
                            // 记录性能指标
                            console.debug('性能指标:', entry.name, entry.duration + 'ms');
                        }
                    });
                });
                
                this.performanceObserver.observe({ 
                    entryTypes: ['measure', 'navigation', 'resource'] 
                });
            }
        } catch (error) {
            console.warn('性能观察器启动失败:', error);
        }
    }
    
    /**
     * 记录密码学操作
     */
    recordCryptoOperation() {
        this.cryptoOperations++;
    }
    
    /**
     * 获取真实的性能指标
     * @returns {Object} 性能指标对象
     */
    getMetrics() {
        const now = performance.now();
        const uptime = now - this.startTime;
        
        // 计算内存使用情况
        let memoryMetrics = { used: 'N/A', total: 'N/A', percentage: 'N/A' };
        if (this.memoryHistory.length > 0) {
            const latestMemory = this.memoryHistory[this.memoryHistory.length - 1];
            memoryMetrics = {
                used: this.formatBytes(latestMemory.used),
                total: this.formatBytes(latestMemory.total),
                limit: this.formatBytes(latestMemory.limit),
                percentage: Math.round((latestMemory.used / latestMemory.total) * 100) + '%'
            };
        }
        
        // 计算平均FPS
        let avgFPS = 0;
        if (this.fpsHistory.length > 0) {
            avgFPS = Math.round(
                this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length
            );
        }
        
        // 计算密码学操作速率
        const cryptoRate = uptime > 0 ? 
            Math.round((this.cryptoOperations / uptime) * 1000) : 0;
        
        return {
            uptime: Math.round(uptime),
            memory: memoryMetrics,
            crypto: { 
                operations: this.cryptoOperations,
                operationsPerSecond: cryptoRate
            },
            rendering: { 
                fps: avgFPS,
                frameCount: this.frameCount,
                fpsHistory: [...this.fpsHistory]
            },
            performance: {
                supported: typeof performance !== 'undefined',
                memoryAPIAvailable: typeof performance.memory !== 'undefined',
                observerSupported: typeof PerformanceObserver !== 'undefined'
            }
        };
    }
    
    /**
     * 格式化字节数为可读格式
     * @param {number} bytes - 字节数
     * @returns {string} 格式化后的字符串
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * 获取性能建议
     * @returns {Array<string>} 性能建议数组
     */
    getPerformanceRecommendations() {
        const recommendations = [];
        const metrics = this.getMetrics();
        
        // 内存使用建议
        if (metrics.memory.percentage && parseInt(metrics.memory.percentage) > 80) {
            recommendations.push('内存使用率较高，建议减少数据缓存或优化内存使用');
        }
        
        // FPS建议
        if (metrics.rendering.fps < 30) {
            recommendations.push('帧率较低，建议减少DOM操作或优化渲染逻辑');
        }
        
        // 密码学操作建议
        if (metrics.crypto.operationsPerSecond > 100) {
            recommendations.push('密码学操作频率较高，考虑使用Web Workers进行优化');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('系统性能良好');
        }
        
        return recommendations;
    }
    
    /**
     * 清理资源
     */
    cleanup() {
        try {
            this.initialized = false;
            
            // 停止性能观察器
            if (this.performanceObserver) {
                this.performanceObserver.disconnect();
                this.performanceObserver = null;
            }
            
            // 清理历史数据
            this.fpsHistory = [];
            this.memoryHistory = [];
            this.cryptoOperations = 0;
            
            console.log('性能优化器已清理');
        } catch (error) {
            console.error('性能优化器清理失败:', error);
        }
    }
}