/**
 * Crypto 服务类 - 提供密码学功能
 * 
 * 这是系统的核心密码学服务类，提供所有与密码学相关的操作。
 * 该类采用静态方法设计，支持高性能的异步处理和批量操作。
 * 
 * 主要功能：
 * - ECDSA P-256 密钥对生成
 * - 数字签名创建和验证
 * - SHA-256 哈希计算
 * - Base64 编码/解码
 * - 批量密码学操作优化
 * - 验证代码生成（用于教育演示）
 * 
 * 性能特性：
 * - 支持 Web Worker 并行处理
 * - 智能回退机制（Worker失败时使用主线程）
 * - 批量操作优化
 * - 性能监控和错误追踪
 * 
 * 安全特性：
 * - 使用 Web Crypto API 确保密码学安全
 * - 支持浏览器和 Node.js 环境
 * - 完整的错误处理和日志记录
 * 
 * 使用示例：
 * ```javascript
 * // 生成密钥对
 * const keyPair = await Crypto.genKeyPair();
 * 
 * // 签名数据
 * const signature = await Crypto.sign(data, privateKey);
 * 
 * // 验证签名
 * const isValid = await Crypto.verify(signature, data, publicKey);
 * 
 * // 批量验证（性能优化）
 * const results = await Crypto.batchVerify(verificationTasks);
 * ```
 * 
 * @class Crypto
 * @static
 * @version 1.0.0
 * @author P2P Blockchain Playground Team
 */

export class Crypto {
    static performanceOptimizer = null;
    static errorHandler = null;
    static systemMonitor = null;
    
    /**
     * 设置性能优化器
     * @param {PerformanceOptimizer} optimizer - 性能优化器实例
     */
    static setPerformanceOptimizer(optimizer) {
        this.performanceOptimizer = optimizer;
    }

    /**
     * 设置错误处理器
     * @param {ErrorHandler} errorHandler - 错误处理器实例
     */
    static setErrorHandler(errorHandler) {
        this.errorHandler = errorHandler;
    }

    /**
     * 设置系统监控器
     * @param {SystemMonitor} systemMonitor - 系统监控器实例
     */
    static setSystemMonitor(systemMonitor) {
        this.systemMonitor = systemMonitor;
    }

    /**
     * 处理密码学错误
     * @param {Error} error - 错误对象
     * @param {string} operation - 操作类型
     * @param {Object} context - 上下文信息
     * @returns {Promise<void>}
     */
    static async handleCryptoError(error, operation, context = {}) {
        if (this.errorHandler) {
            await this.errorHandler.handleError(
                error,
                'CRYPTO_ERROR',
                {
                    component: 'Crypto',
                    operation,
                    ...context
                }
            );
        }

        // 记录性能指标
        if (this.systemMonitor) {
            this.systemMonitor.recordMetric('CRYPTO_ERROR_RATE', {
                value: 1,
                unit: 'count',
                details: { operation, error: error.message }
            }, Date.now());
        }
    }
    /**
     * 获取 crypto 对象（支持浏览器和 Node.js 环境）
     * @returns {Crypto} crypto 对象
     */
    static getCrypto() {
        if (typeof window !== 'undefined' && window.crypto) {
            return window.crypto;
        } else if (typeof globalThis !== 'undefined' && globalThis.crypto) {
            return globalThis.crypto;
        } else {
            try {
                // Node.js 环境
                if (typeof require === 'undefined' || typeof require !== 'function') {
                    throw new Error('require is not available');
                }
                const { webcrypto } = require('crypto');
                if (!webcrypto) {
                    throw new Error('webcrypto is not available');
                }
                return webcrypto;
            } catch (error) {
                throw new Error('Crypto API 不可用');
            }
        }
    }

    /**
     * 生成密钥对（优化版本，支持异步处理）
     * @returns {Object} 包含公钥和私钥的对象
     */
    static async genKeyPair() {
        const startTime = Date.now();
        
        try {
            // 如果有性能优化器，使用 Worker 处理
            if (this.performanceOptimizer) {
                try {
                    const result = await this.performanceOptimizer.executeCryptoOperation('generateKeyPair', {});
                    
                    // 记录性能指标
                    if (this.systemMonitor) {
                        this.systemMonitor.recordMetric('CRYPTO_KEYGEN_TIME', {
                            value: Date.now() - startTime,
                            unit: 'ms',
                            details: { method: 'worker' }
                        }, Date.now());
                    }
                    
                    return result;
                } catch (error) {
                    console.warn('Worker 密钥生成失败，回退到主线程:', error);
                    await this.handleCryptoError(error, 'genKeyPair_worker', { fallback: true });
                }
            }
            
            // 主线程处理
            const crypto = this.getCrypto();
            
            const keyPair = await crypto.subtle.generateKey(
                {
                    name: "ECDSA",
                    namedCurve: "P-256"
                },
                true,
                ["sign", "verify"]
            );

            // 导出公钥和私钥
            const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
            const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

            const result = {
                publicKey: this.toBase64(publicKey),
                privateKey: this.toBase64(privateKey)
            };

            // 记录性能指标
            if (this.systemMonitor) {
                this.systemMonitor.recordMetric('CRYPTO_KEYGEN_TIME', {
                    value: Date.now() - startTime,
                    unit: 'ms',
                    details: { method: 'main_thread' }
                }, Date.now());
            }

            return result;
        } catch (error) {
            await this.handleCryptoError(error, 'genKeyPair', { duration: Date.now() - startTime });
            throw new Error('密钥生成失败');
        }
    }

    /**
     * 签名数据（优化版本，支持异步处理）
     * @param {string} data - 要签名的数据
     * @param {string} privateKeyBase64 - Base64编码的私钥
     * @returns {string} Base64编码的签名
     */
    static async sign(data, privateKeyBase64) {
        const startTime = Date.now();
        
        try {
            // 如果有性能优化器，使用 Worker 处理
            if (this.performanceOptimizer) {
                try {
                    const result = await this.performanceOptimizer.executeCryptoOperation('sign', {
                        message: data,
                        privateKey: privateKeyBase64
                    });
                    
                    // 记录性能指标
                    if (this.systemMonitor) {
                        this.systemMonitor.recordMetric('CRYPTO_SIGN_TIME', {
                            value: Date.now() - startTime,
                            unit: 'ms',
                            details: { method: 'worker', dataLength: data.length }
                        }, Date.now());
                    }
                    
                    return result;
                } catch (error) {
                    console.warn('Worker 签名失败，回退到主线程:', error);
                    await this.handleCryptoError(error, 'sign_worker', { fallback: true });
                }
            }
            
            // 主线程处理
            const crypto = this.getCrypto();
            
            // 导入私钥
            const privateKeyBuffer = this.fromBase64(privateKeyBase64);
            const privateKey = await crypto.subtle.importKey(
                "pkcs8",
                privateKeyBuffer,
                {
                    name: "ECDSA",
                    namedCurve: "P-256"
                },
                false,
                ["sign"]
            );

            // 签名数据
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);
            
            const signature = await crypto.subtle.sign(
                {
                    name: "ECDSA",
                    hash: { name: "SHA-256" }
                },
                privateKey,
                dataBuffer
            );

            const result = this.toBase64(signature);

            // 记录性能指标
            if (this.systemMonitor) {
                this.systemMonitor.recordMetric('CRYPTO_SIGN_TIME', {
                    value: Date.now() - startTime,
                    unit: 'ms',
                    details: { method: 'main_thread', dataLength: data.length }
                }, Date.now());
            }

            return result;
        } catch (error) {
            await this.handleCryptoError(error, 'sign', { 
                duration: Date.now() - startTime,
                dataLength: data.length 
            });
            throw new Error('签名失败');
        }
    }

    /**
     * 验证签名（优化版本，支持异步处理）
     * @param {string} signatureBase64 - Base64编码的签名
     * @param {string} data - 原始数据
     * @param {string} publicKeyBase64 - Base64编码的公钥
     * @returns {boolean} 验证结果
     */
    static async verify(signatureBase64, data, publicKeyBase64) {
        const startTime = Date.now();
        
        try {
            // 如果有性能优化器，使用 Worker 处理
            if (this.performanceOptimizer) {
                try {
                    const result = await this.performanceOptimizer.executeCryptoOperation('verify', {
                        signature: signatureBase64,
                        message: data,
                        publicKey: publicKeyBase64
                    });
                    
                    // 记录性能指标
                    if (this.systemMonitor) {
                        this.systemMonitor.recordMetric('CRYPTO_VERIFY_TIME', {
                            value: Date.now() - startTime,
                            unit: 'ms',
                            details: { method: 'worker', dataLength: data.length, result }
                        }, Date.now());
                    }
                    
                    return result;
                } catch (error) {
                    console.warn('Worker 验证失败，回退到主线程:', error);
                    await this.handleCryptoError(error, 'verify_worker', { fallback: true });
                }
            }
            
            // 主线程处理
            const crypto = this.getCrypto();
            
            // 导入公钥
            const publicKeyBuffer = this.fromBase64(publicKeyBase64);
            const publicKey = await crypto.subtle.importKey(
                "spki",
                publicKeyBuffer,
                {
                    name: "ECDSA",
                    namedCurve: "P-256"
                },
                false,
                ["verify"]
            );

            // 验证签名
            const signatureBuffer = this.fromBase64(signatureBase64);
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);

            const result = await crypto.subtle.verify(
                {
                    name: "ECDSA",
                    hash: { name: "SHA-256" }
                },
                publicKey,
                signatureBuffer,
                dataBuffer
            );

            // 记录性能指标
            if (this.systemMonitor) {
                this.systemMonitor.recordMetric('CRYPTO_VERIFY_TIME', {
                    value: Date.now() - startTime,
                    unit: 'ms',
                    details: { method: 'main_thread', dataLength: data.length, result }
                }, Date.now());
            }

            return result;
        } catch (error) {
            await this.handleCryptoError(error, 'verify', { 
                duration: Date.now() - startTime,
                dataLength: data.length 
            });
            return false;
        }
    }

    /**
     * 计算SHA256哈希（优化版本，支持异步处理）
     * @param {string} data - 要哈希的数据
     * @returns {string} 十六进制哈希值
     */
    static async sha256(data) {
        const startTime = Date.now();
        
        try {
            // 如果有性能优化器，使用 Worker 处理
            if (this.performanceOptimizer) {
                try {
                    const result = await this.performanceOptimizer.executeCryptoOperation('hash', {
                        message: data
                    });
                    
                    // 记录性能指标
                    if (this.systemMonitor) {
                        this.systemMonitor.recordMetric('CRYPTO_HASH_TIME', {
                            value: Date.now() - startTime,
                            unit: 'ms',
                            details: { method: 'worker', dataLength: data.length }
                        }, Date.now());
                    }
                    
                    return result;
                } catch (error) {
                    console.warn('Worker 哈希计算失败，回退到主线程:', error);
                    await this.handleCryptoError(error, 'sha256_worker', { fallback: true });
                }
            }
            
            // 主线程处理
            const crypto = this.getCrypto();
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);
            
            const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
            
            // 转换为十六进制字符串
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const result = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            // 记录性能指标
            if (this.systemMonitor) {
                this.systemMonitor.recordMetric('CRYPTO_HASH_TIME', {
                    value: Date.now() - startTime,
                    unit: 'ms',
                    details: { method: 'main_thread', dataLength: data.length }
                }, Date.now());
            }

            return result;
        } catch (error) {
            await this.handleCryptoError(error, 'sha256', { 
                duration: Date.now() - startTime,
                dataLength: data.length 
            });
            throw new Error('哈希计算失败');
        }
    }

    /**
     * 批量验证签名（性能优化）
     * @param {Array} verificationTasks - 验证任务数组，每个任务包含 {id, signature, message, publicKey}
     * @returns {Array} 验证结果数组
     */
    static async batchVerify(verificationTasks) {
        if (!verificationTasks || verificationTasks.length === 0) {
            return [];
        }

        // 如果有性能优化器，使用批量处理
        if (this.performanceOptimizer) {
            try {
                return await this.performanceOptimizer.batchVerifySignatures(verificationTasks);
            } catch (error) {
                console.warn('批量验证失败，回退到串行处理:', error);
            }
        }

        // 回退到串行处理
        const results = [];
        for (const task of verificationTasks) {
            try {
                const result = await this.verify(task.signature, task.message, task.publicKey);
                results.push({ id: task.id, success: true, result });
            } catch (error) {
                results.push({ id: task.id, success: false, error: error.message });
            }
        }
        
        return results;
    }

    /**
     * 批量生成密钥对（性能优化）
     * @param {number} count - 要生成的密钥对数量
     * @returns {Array} 密钥对数组
     */
    static async batchGenKeyPairs(count) {
        if (count <= 0) return [];

        const tasks = [];
        for (let i = 0; i < count; i++) {
            tasks.push(this.genKeyPair());
        }

        // 并行生成密钥对
        try {
            return await Promise.all(tasks);
        } catch (error) {
            console.error('批量密钥生成失败:', error);
            throw new Error('批量密钥生成失败');
        }
    }

    /**
     * 批量签名（性能优化）
     * @param {Array} signTasks - 签名任务数组，每个任务包含 {id, message, privateKey}
     * @returns {Array} 签名结果数组
     */
    static async batchSign(signTasks) {
        if (!signTasks || signTasks.length === 0) {
            return [];
        }

        const results = [];
        const promises = signTasks.map(async (task) => {
            try {
                const signature = await this.sign(task.message, task.privateKey);
                return { id: task.id, success: true, result: signature };
            } catch (error) {
                return { id: task.id, success: false, error: error.message };
            }
        });

        return await Promise.all(promises);
    }

    /**
     * 批量哈希计算（性能优化）
     * @param {Array} hashTasks - 哈希任务数组，每个任务包含 {id, message}
     * @returns {Array} 哈希结果数组
     */
    static async batchHash(hashTasks) {
        if (!hashTasks || hashTasks.length === 0) {
            return [];
        }

        const results = [];
        const promises = hashTasks.map(async (task) => {
            try {
                const hash = await this.sha256(task.message);
                return { id: task.id, success: true, result: hash };
            } catch (error) {
                return { id: task.id, success: false, error: error.message };
            }
        });

        return await Promise.all(promises);
    }

    /**
     * 转换为Base64编码
     * @param {ArrayBuffer} buffer - 要编码的数据
     * @returns {string} Base64字符串
     */
    static toBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * 从Base64解码
     * @param {string} base64String - Base64字符串
     * @returns {ArrayBuffer} 解码后的数据
     */
    static fromBase64(base64String) {
        const binary = atob(base64String);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * 生成验证代码
     * @param {string} data - 要验证的数据
     * @param {string} dataType - 数据类型 ('signature', 'hash', 'publicKey', 'blockId', 'chainId')
     * @param {Object} context - 验证上下文信息
     * @returns {string} JavaScript验证代码
     */
    static genVerifyCode(data, dataType, context = {}) {
        const { originalData, publicKey, privateKey, relatedData } = context;
        
        switch (dataType) {
            case 'signature':
                return this._generateSignatureVerifyCode(data, originalData, publicKey, relatedData);
            
            case 'hash':
                return this._generateHashVerifyCode(data, originalData, relatedData);
            
            case 'publicKey':
                return this._generatePublicKeyVerifyCode(data, relatedData);
            
            case 'blockId':
                return this._generateBlockIdVerifyCode(data, relatedData);
            
            case 'chainId':
                return this._generateChainIdVerifyCode(data, relatedData);
            
            default:
                return this._generateGenericVerifyCode(data, dataType);
        }
    }

    /**
     * 生成签名验证代码
     * @private
     */
    static _generateSignatureVerifyCode(signature, originalData, publicKey, relatedData) {
        const dataPlaceholder = originalData || 'YOUR_ORIGINAL_DATA_HERE';
        const keyPlaceholder = publicKey || 'YOUR_PUBLIC_KEY_HERE';
        
        return `// 验证数字签名
// 这段代码演示如何验证 ECDSA 数字签名
async function verifySignature() {
    // 要验证的签名 (Base64 编码)
    const signature = '${signature}';
    
    // 原始数据 (需要替换为实际数据)
    const originalData = '${dataPlaceholder}';
    
    // 签名者的公钥 (Base64 编码)
    const publicKey = '${keyPlaceholder}';
    
    try {
        // 使用 Web Crypto API 验证签名
        const crypto = window.crypto || globalThis.crypto;
        
        // 导入公钥
        const publicKeyBuffer = Uint8Array.from(atob(publicKey), c => c.charCodeAt(0));
        const cryptoKey = await crypto.subtle.importKey(
            "spki",
            publicKeyBuffer,
            { name: "ECDSA", namedCurve: "P-256" },
            false,
            ["verify"]
        );
        
        // 准备数据和签名
        const signatureBuffer = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
        const dataBuffer = new TextEncoder().encode(originalData);
        
        // 验证签名
        const isValid = await crypto.subtle.verify(
            { name: "ECDSA", hash: { name: "SHA-256" } },
            cryptoKey,
            signatureBuffer,
            dataBuffer
        );
        
        console.log('签名验证结果:', isValid);
        console.log('签名 (Base64):', signature);
        console.log('原始数据:', originalData);
        console.log('公钥 (Base64):', publicKey);
        
        return isValid;
    } catch (error) {
        console.error('签名验证失败:', error);
        return false;
    }
}

// 运行验证
verifySignature().then(result => {
    console.log('最终验证结果:', result ? '✅ 签名有效' : '❌ 签名无效');
});`;
    }

    /**
     * 生成哈希验证代码
     * @private
     */
    static _generateHashVerifyCode(hash, originalData, relatedData) {
        const dataPlaceholder = originalData || 'YOUR_ORIGINAL_DATA_HERE';
        
        return `// 验证 SHA-256 哈希
// 这段代码演示如何验证数据的 SHA-256 哈希值
async function verifyHash() {
    // 要验证的哈希值 (十六进制)
    const expectedHash = '${hash}';
    
    // 原始数据 (需要替换为实际数据)
    const originalData = '${dataPlaceholder}';
    
    try {
        // 使用 Web Crypto API 计算哈希
        const crypto = window.crypto || globalThis.crypto;
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(originalData);
        
        // 计算 SHA-256 哈希
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        
        // 转换为十六进制字符串
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        // 比较哈希值
        const isValid = expectedHash.toLowerCase() === calculatedHash.toLowerCase();
        
        console.log('哈希验证结果:', isValid);
        console.log('期望哈希:', expectedHash);
        console.log('计算哈希:', calculatedHash);
        console.log('原始数据:', originalData);
        
        return isValid;
    } catch (error) {
        console.error('哈希验证失败:', error);
        return false;
    }
}

// 运行验证
verifyHash().then(result => {
    console.log('最终验证结果:', result ? '✅ 哈希匹配' : '❌ 哈希不匹配');
});`;
    }

    /**
     * 生成公钥验证代码
     * @private
     */
    static _generatePublicKeyVerifyCode(publicKey, relatedData) {
        return `// 验证公钥格式和属性
// 这段代码演示如何验证和解析 ECDSA 公钥
async function verifyPublicKey() {
    // 要验证的公钥 (Base64 编码)
    const publicKeyBase64 = '${publicKey}';
    
    try {
        // 使用 Web Crypto API 导入公钥
        const crypto = window.crypto || globalThis.crypto;
        const publicKeyBuffer = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0));
        
        // 尝试导入公钥
        const cryptoKey = await crypto.subtle.importKey(
            "spki",
            publicKeyBuffer,
            { name: "ECDSA", namedCurve: "P-256" },
            true,
            ["verify"]
        );
        
        // 获取公钥信息
        const keyInfo = {
            type: cryptoKey.type,
            algorithm: cryptoKey.algorithm,
            extractable: cryptoKey.extractable,
            usages: cryptoKey.usages
        };
        
        console.log('公钥验证成功 ✅');
        console.log('公钥 (Base64):', publicKeyBase64);
        console.log('公钥信息:', keyInfo);
        console.log('公钥长度:', publicKeyBuffer.length, '字节');
        
        // 生成公钥指纹 (SHA-256)
        const fingerprintBuffer = await crypto.subtle.digest('SHA-256', publicKeyBuffer);
        const fingerprintArray = Array.from(new Uint8Array(fingerprintBuffer));
        const fingerprint = fingerprintArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        console.log('公钥指纹 (SHA-256):', fingerprint);
        
        return true;
    } catch (error) {
        console.error('公钥验证失败 ❌:', error);
        console.log('公钥 (Base64):', publicKeyBase64);
        return false;
    }
}

// 运行验证
verifyPublicKey().then(result => {
    console.log('最终验证结果:', result ? '✅ 公钥有效' : '❌ 公钥无效');
});`;
    }

    /**
     * 生成区块ID验证代码
     * @private
     */
    static _generateBlockIdVerifyCode(blockId, relatedData) {
        return `// 验证区块ID (签名)
// 区块ID通常是区块数据的数字签名
async function verifyBlockId() {
    // 区块ID (通常是签名的 Base64 编码)
    const blockId = '${blockId}';
    
    // 注意: 区块ID的验证需要以下信息:
    // 1. 区块的原始数据
    // 2. 创建者的公钥
    // 3. 签名算法信息
    
    console.log('区块ID:', blockId);
    console.log('区块ID长度:', blockId.length, '字符');
    
    try {
        // 尝试解码 Base64
        const decodedBytes = Uint8Array.from(atob(blockId), c => c.charCodeAt(0));
        console.log('解码后长度:', decodedBytes.length, '字节');
        
        // 显示十六进制表示
        const hexString = Array.from(decodedBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        console.log('十六进制表示:', hexString);
        
        // 要完整验证区块ID，需要:
        console.log('\\n要完整验证此区块ID，请提供:');
        console.log('1. 区块的原始数据 (JSON字符串)');
        console.log('2. 区块创建者的公钥');
        console.log('3. 然后使用签名验证代码进行验证');
        
        return true;
    } catch (error) {
        console.error('区块ID解码失败:', error);
        return false;
    }
}

// 运行验证
verifyBlockId();`;
    }

    /**
     * 生成区块链ID验证代码
     * @private
     */
    static _generateChainIdVerifyCode(chainId, relatedData) {
        return `// 验证区块链ID (哈希)
// 区块链ID通常是根区块的 SHA-256 哈希值
async function verifyChainId() {
    // 区块链ID (通常是哈希的十六进制表示)
    const chainId = '${chainId}';
    
    console.log('区块链ID:', chainId);
    console.log('ID长度:', chainId.length, '字符');
    
    // 检查是否为有效的十六进制字符串
    const isHex = /^[0-9a-fA-F]+$/.test(chainId);
    console.log('是否为十六进制:', isHex);
    
    if (isHex && chainId.length === 64) {
        console.log('✅ 格式正确: 256位 SHA-256 哈希');
        
        // 显示哈希的字节表示
        const bytes = [];
        for (let i = 0; i < chainId.length; i += 2) {
            bytes.push(parseInt(chainId.substr(i, 2), 16));
        }
        console.log('哈希字节数:', bytes.length);
        
        // 要验证区块链ID，需要根区块的原始数据
        console.log('\\n要完整验证此区块链ID，请提供:');
        console.log('1. 根区块的完整数据');
        console.log('2. 然后计算其 SHA-256 哈希值进行比较');
        
        return true;
    } else {
        console.log('❌ 格式不正确: 应为64字符的十六进制字符串');
        return false;
    }
}

// 运行验证
verifyChainId();`;
    }

    /**
     * 生成通用验证代码
     * @private
     */
    static _generateGenericVerifyCode(data, dataType) {
        return `// 通用数据验证
// 数据类型: ${dataType}
function verifyGenericData() {
    const data = '${data}';
    const dataType = '${dataType}';
    
    console.log('数据类型:', dataType);
    console.log('数据内容:', data);
    console.log('数据长度:', data.length, '字符');
    
    // 尝试检测数据格式
    try {
        // 检查是否为 Base64
        const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(data);
        if (isBase64) {
            console.log('格式: 可能是 Base64 编码');
            const decoded = atob(data);
            console.log('解码后长度:', decoded.length, '字节');
        }
        
        // 检查是否为十六进制
        const isHex = /^[0-9a-fA-F]+$/.test(data);
        if (isHex) {
            console.log('格式: 十六进制字符串');
            console.log('字节数:', data.length / 2);
        }
        
        // 检查是否为 JSON
        try {
            const parsed = JSON.parse(data);
            console.log('格式: JSON 数据');
            console.log('解析结果:', parsed);
        } catch (e) {
            // 不是 JSON，忽略
        }
        
    } catch (error) {
        console.error('数据分析失败:', error);
    }
    
    console.log('\\n要获得更具体的验证代码，请选择正确的数据类型。');
}

// 运行验证
verifyGenericData();`;
    }
}