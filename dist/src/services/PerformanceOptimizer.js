/**
 * PerformanceOptimizer - 性能优化工具类
 * 
 * 提供异步处理、批量更新、内存管理等性能优化功能
 */

export class PerformanceOptimizer {
    constructor() {
        this.workerPool = new Map(); // Web Worker 池
        this.batchQueue = new Map(); // 批量处理队列
        this.memoryMonitor = new MemoryMonitor();
        this.renderScheduler = new RenderScheduler();
        
        // 性能监控指标
        this.metrics = {
            cryptoOperations: 0,
            renderOperations: 0,
            memoryUsage: 0,
            avgResponseTime: 0,
            batchedOperations: 0
        };
        
        this.isInitialized = false;
    }

    /**
     * 初始化性能优化器
     */
    async init() {
        if (this.isInitialized) return;
        
        // 初始化 Web Worker 池
        await this.initWorkerPool();
        
        // 启动内存监控
        this.memoryMonitor.start();
        
        // 启动渲染调度器
        this.renderScheduler.start();
        
        this.isInitialized = true;
        console.log('PerformanceOptimizer 初始化完成');
    }

    /**
     * 初始化 Web Worker 池
     */
    async initWorkerPool() {
        const workerCount = Math.min(navigator.hardwareConcurrency || 4, 8);
        
        for (let i = 0; i < workerCount; i++) {
            try {
                const worker = await this.createCryptoWorker();
                this.workerPool.set(`crypto-worker-${i}`, {
                    worker,
                    busy: false,
                    taskCount: 0
                });
            } catch (error) {
                console.warn(`创建 Worker ${i} 失败:`, error);
            }
        }
        
        console.log(`创建了 ${this.workerPool.size} 个 Web Workers`);
    }

    /**
     * 创建密码学计算 Worker
     */
    async createCryptoWorker() {
        const workerCode = `
            // Web Worker 中的密码学计算代码
            self.onmessage = async function(e) {
                const { id, type, data } = e.data;
                
                try {
                    let result;
                    
                    switch (type) {
                        case 'generateKeyPair':
                            result = await generateKeyPair();
                            break;
                        case 'sign':
                            result = await sign(data.message, data.privateKey);
                            break;
                        case 'verify':
                            result = await verify(data.signature, data.message, data.publicKey);
                            break;
                        case 'hash':
                            result = await hash(data.message);
                            break;
                        case 'batchVerify':
                            result = await batchVerify(data.operations);
                            break;
                        default:
                            throw new Error('未知的操作类型: ' + type);
                    }
                    
                    self.postMessage({ id, success: true, result });
                } catch (error) {
                    self.postMessage({ id, success: false, error: error.message });
                }
            };
            
            // 密码学函数实现
            async function generateKeyPair() {
                const keyPair = await crypto.subtle.generateKey(
                    { name: "ECDSA", namedCurve: "P-256" },
                    true,
                    ["sign", "verify"]
                );
                
                const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
                const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
                
                return {
                    publicKey: arrayBufferToBase64(publicKey),
                    privateKey: arrayBufferToBase64(privateKey)
                };
            }
            
            async function sign(message, privateKeyBase64) {
                const privateKeyBuffer = base64ToArrayBuffer(privateKeyBase64);
                const privateKey = await crypto.subtle.importKey(
                    "pkcs8",
                    privateKeyBuffer,
                    { name: "ECDSA", namedCurve: "P-256" },
                    false,
                    ["sign"]
                );
                
                const messageBuffer = new TextEncoder().encode(message);
                const signature = await crypto.subtle.sign(
                    { name: "ECDSA", hash: { name: "SHA-256" } },
                    privateKey,
                    messageBuffer
                );
                
                return arrayBufferToBase64(signature);
            }
            
            async function verify(signatureBase64, message, publicKeyBase64) {
                const publicKeyBuffer = base64ToArrayBuffer(publicKeyBase64);
                const publicKey = await crypto.subtle.importKey(
                    "spki",
                    publicKeyBuffer,
                    { name: "ECDSA", namedCurve: "P-256" },
                    false,
                    ["verify"]
                );
                
                const signatureBuffer = base64ToArrayBuffer(signatureBase64);
                const messageBuffer = new TextEncoder().encode(message);
                
                return await crypto.subtle.verify(
                    { name: "ECDSA", hash: { name: "SHA-256" } },
                    publicKey,
                    signatureBuffer,
                    messageBuffer
                );
            }
            
            async function hash(message) {
                const messageBuffer = new TextEncoder().encode(message);
                const hashBuffer = await crypto.subtle.digest('SHA-256', messageBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            }
            
            async function batchVerify(operations) {
                const results = [];
                for (const op of operations) {
                    try {
                        const result = await verify(op.signature, op.message, op.publicKey);
                        results.push({ id: op.id, success: true, result });
                    } catch (error) {
                        results.push({ id: op.id, success: false, error: error.message });
                    }
                }
                return results;
            }
            
            // 工具函数
            function arrayBufferToBase64(buffer) {
                const bytes = new Uint8Array(buffer);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                return btoa(binary);
            }
            
            function base64ToArrayBuffer(base64) {
                const binary = atob(base64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                return bytes.buffer;
            }
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        
        return worker;
    }

    /**
     * 异步执行密码学操作
     */
    async executeCryptoOperation(type, data) {
        const worker = this.getAvailableWorker();
        if (!worker) {
            // 如果没有可用的 Worker，回退到主线程
            return this.fallbackCryptoOperation(type, data);
        }
        
        const taskId = `task-${Date.now()}-${Math.random()}`;
        worker.busy = true;
        worker.taskCount++;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                worker.busy = false;
                reject(new Error('密码学操作超时'));
            }, 30000);
            
            const messageHandler = (e) => {
                if (e.data.id === taskId) {
                    clearTimeout(timeout);
                    worker.worker.removeEventListener('message', messageHandler);
                    worker.busy = false;
                    
                    if (e.data.success) {
                        resolve(e.data.result);
                    } else {
                        reject(new Error(e.data.error));
                    }
                }
            };
            
            worker.worker.addEventListener('message', messageHandler);
            worker.worker.postMessage({ id: taskId, type, data });
        });
    }

    /**
     * 获取可用的 Worker
     */
    getAvailableWorker() {
        for (const [id, worker] of this.workerPool) {
            if (!worker.busy) {
                return worker;
            }
        }
        return null;
    }

    /**
     * 主线程回退的密码学操作
     */
    async fallbackCryptoOperation(type, data) {
        // 导入 Crypto 服务作为回退
        const { Crypto } = await import('./Crypto.js');
        
        switch (type) {
            case 'generateKeyPair':
                return await Crypto.genKeyPair();
            case 'sign':
                return await Crypto.sign(data.message, data.privateKey);
            case 'verify':
                return await Crypto.verify(data.signature, data.message, data.publicKey);
            case 'hash':
                return await Crypto.sha256(data.message);
            default:
                throw new Error('未知的操作类型: ' + type);
        }
    }

    /**
     * 批量验证签名
     */
    async batchVerifySignatures(verificationTasks) {
        const batchSize = 10;
        const batches = [];
        
        for (let i = 0; i < verificationTasks.length; i += batchSize) {
            batches.push(verificationTasks.slice(i, i + batchSize));
        }
        
        const results = await Promise.all(
            batches.map(batch => this.processBatch(batch))
        );
        
        return results.flat();
    }

    /**
     * 处理批量任务
     */
    async processBatch(batch) {
        const worker = this.getAvailableWorker();
        if (worker) {
            return this.executeCryptoOperation('batchVerify', { operations: batch });
        } else {
            // 回退到串行处理
            const results = [];
            for (const task of batch) {
                try {
                    const result = await this.fallbackCryptoOperation('verify', task);
                    results.push({ id: task.id, success: true, result });
                } catch (error) {
                    results.push({ id: task.id, success: false, error: error.message });
                }
            }
            return results;
        }
    }

    /**
     * 调度批量 DOM 更新
     */
    scheduleBatchUpdate(updateFunction, priority = 'normal') {
        return this.renderScheduler.schedule(updateFunction, priority);
    }

    /**
     * 获取性能指标
     */
    getMetrics() {
        return {
            ...this.metrics,
            memoryUsage: this.memoryMonitor.getCurrentUsage(),
            workerPoolStatus: this.getWorkerPoolStatus()
        };
    }

    /**
     * 获取 Worker 池状态
     */
    getWorkerPoolStatus() {
        const status = {
            totalWorkers: this.workerPool.size,
            busyWorkers: 0,
            totalTasks: 0
        };
        
        for (const [id, worker] of this.workerPool) {
            if (worker.busy) status.busyWorkers++;
            status.totalTasks += worker.taskCount;
        }
        
        return status;
    }

    /**
     * 清理资源
     */
    cleanup() {
        // 终止所有 Workers
        for (const [id, worker] of this.workerPool) {
            worker.worker.terminate();
        }
        this.workerPool.clear();
        
        // 停止监控
        this.memoryMonitor.stop();
        this.renderScheduler.stop();
        
        this.isInitialized = false;
        console.log('PerformanceOptimizer 资源已清理');
    }
}

/**
 * 内存监控器
 */
class MemoryMonitor {
    constructor() {
        this.isRunning = false;
        this.interval = null;
        this.memoryHistory = [];
        this.maxHistorySize = 100;
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.interval = setInterval(() => {
            this.recordMemoryUsage();
        }, 5000); // 每5秒记录一次
        
        console.log('内存监控已启动');
    }

    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        console.log('内存监控已停止');
    }

    recordMemoryUsage() {
        if (performance.memory) {
            const usage = {
                timestamp: Date.now(),
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
            
            this.memoryHistory.push(usage);
            
            // 限制历史记录大小
            if (this.memoryHistory.length > this.maxHistorySize) {
                this.memoryHistory.shift();
            }
            
            // 检查内存使用率
            const usageRatio = usage.used / usage.limit;
            if (usageRatio > 0.8) {
                console.warn('内存使用率过高:', (usageRatio * 100).toFixed(2) + '%');
                this.triggerGarbageCollection();
            }
        }
    }

    getCurrentUsage() {
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                usageRatio: performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }

    triggerGarbageCollection() {
        // 触发垃圾回收的建议
        if (window.gc) {
            window.gc();
        } else {
            // 创建大量临时对象来触发 GC
            const temp = new Array(1000000).fill(null);
            temp.length = 0;
        }
    }

    getMemoryHistory() {
        return [...this.memoryHistory];
    }
}

/**
 * 渲染调度器
 */
class RenderScheduler {
    constructor() {
        this.isRunning = false;
        this.updateQueue = {
            high: [],
            normal: [],
            low: []
        };
        this.isProcessing = false;
        this.frameId = null;
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.scheduleNextFrame();
        
        console.log('渲染调度器已启动');
    }

    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
        
        console.log('渲染调度器已停止');
    }

    schedule(updateFunction, priority = 'normal') {
        if (!this.updateQueue[priority]) {
            priority = 'normal';
        }
        
        return new Promise((resolve, reject) => {
            this.updateQueue[priority].push({
                updateFunction,
                resolve,
                reject,
                timestamp: Date.now()
            });
        });
    }

    scheduleNextFrame() {
        if (!this.isRunning) return;
        
        this.frameId = requestAnimationFrame(() => {
            this.processUpdates();
            this.scheduleNextFrame();
        });
    }

    processUpdates() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        const startTime = performance.now();
        const maxFrameTime = 16; // 16ms for 60fps
        
        try {
            // 按优先级处理更新
            const priorities = ['high', 'normal', 'low'];
            
            for (const priority of priorities) {
                const queue = this.updateQueue[priority];
                
                while (queue.length > 0 && (performance.now() - startTime) < maxFrameTime) {
                    const task = queue.shift();
                    
                    try {
                        const result = task.updateFunction();
                        task.resolve(result);
                    } catch (error) {
                        task.reject(error);
                    }
                }
                
                // 如果时间用完，下一帧继续处理
                if ((performance.now() - startTime) >= maxFrameTime) {
                    break;
                }
            }
        } finally {
            this.isProcessing = false;
        }
    }

    getQueueStatus() {
        return {
            high: this.updateQueue.high.length,
            normal: this.updateQueue.normal.length,
            low: this.updateQueue.low.length,
            total: this.updateQueue.high.length + this.updateQueue.normal.length + this.updateQueue.low.length
        };
    }
}