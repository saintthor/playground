/**
 * Crypto 类的单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Crypto } from '../../src/services/Crypto.js';
import { ErrorHandler } from '../../src/services/ErrorHandler.js';
import { SystemMonitor } from '../../src/services/SystemMonitor.js';

describe('Crypto', () => {
    let mockErrorHandler;
    let mockSystemMonitor;

    beforeEach(() => {
        // 创建模拟对象
        mockErrorHandler = {
            handleError: vi.fn().mockResolvedValue({ handled: true })
        };

        mockSystemMonitor = {
            recordMetric: vi.fn()
        };

        // 设置错误处理器和系统监控器
        Crypto.setErrorHandler(mockErrorHandler);
        Crypto.setSystemMonitor(mockSystemMonitor);
    });
    describe('密钥生成', () => {
        it('应该成功生成密钥对', async () => {
            const keyPair = await Crypto.genKeyPair();
            
            expect(keyPair).toHaveProperty('publicKey');
            expect(keyPair).toHaveProperty('privateKey');
            expect(typeof keyPair.publicKey).toBe('string');
            expect(typeof keyPair.privateKey).toBe('string');
            
            // 验证Base64格式
            expect(() => atob(keyPair.publicKey)).not.toThrow();
            expect(() => atob(keyPair.privateKey)).not.toThrow();
        });

        it('应该生成不同的密钥对', async () => {
            const keyPair1 = await Crypto.genKeyPair();
            const keyPair2 = await Crypto.genKeyPair();
            
            expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
            expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
        });
    });

    describe('数字签名', () => {
        let keyPair;
        const testData = 'Hello, Blockchain!';

        beforeEach(async () => {
            keyPair = await Crypto.genKeyPair();
        });

        it('应该成功签名数据', async () => {
            const signature = await Crypto.sign(testData, keyPair.privateKey);
            
            expect(typeof signature).toBe('string');
            expect(signature.length).toBeGreaterThan(0);
            
            // 验证Base64格式
            expect(() => atob(signature)).not.toThrow();
        });

        it('应该成功验证有效签名', async () => {
            const signature = await Crypto.sign(testData, keyPair.privateKey);
            const isValid = await Crypto.verify(signature, testData, keyPair.publicKey);
            
            expect(isValid).toBe(true);
        });

        it('应该拒绝无效签名', async () => {
            const signature = await Crypto.sign(testData, keyPair.privateKey);
            const isValid = await Crypto.verify(signature, 'Modified data', keyPair.publicKey);
            
            expect(isValid).toBe(false);
        });

        it('应该拒绝错误的公钥', async () => {
            const otherKeyPair = await Crypto.genKeyPair();
            const signature = await Crypto.sign(testData, keyPair.privateKey);
            const isValid = await Crypto.verify(signature, testData, otherKeyPair.publicKey);
            
            expect(isValid).toBe(false);
        });

        it('应该处理签名错误', async () => {
            await expect(Crypto.sign(testData, 'invalid-private-key')).rejects.toThrow();
        });

        it('应该处理验证错误', async () => {
            const signature = await Crypto.sign(testData, keyPair.privateKey);
            const isValid = await Crypto.verify('invalid-signature', testData, keyPair.publicKey);
            
            expect(isValid).toBe(false);
        });
    });

    describe('哈希计算', () => {
        it('应该计算正确的SHA256哈希', async () => {
            const data = 'Hello, World!';
            const hash = await Crypto.sha256(data);
            
            expect(typeof hash).toBe('string');
            expect(hash.length).toBe(64); // SHA256 = 32字节 = 64个十六进制字符
            expect(/^[0-9a-f]+$/.test(hash)).toBe(true); // 只包含十六进制字符
        });

        it('应该为相同数据生成相同哈希', async () => {
            const data = 'Test data';
            const hash1 = await Crypto.sha256(data);
            const hash2 = await Crypto.sha256(data);
            
            expect(hash1).toBe(hash2);
        });

        it('应该为不同数据生成不同哈希', async () => {
            const hash1 = await Crypto.sha256('Data 1');
            const hash2 = await Crypto.sha256('Data 2');
            
            expect(hash1).not.toBe(hash2);
        });

        it('应该处理空字符串', async () => {
            const hash = await Crypto.sha256('');
            
            expect(typeof hash).toBe('string');
            expect(hash.length).toBe(64);
        });

        it('应该处理Unicode字符', async () => {
            const hash = await Crypto.sha256('你好，世界！🌍');
            
            expect(typeof hash).toBe('string');
            expect(hash.length).toBe(64);
        });
    });

    describe('Base64编码', () => {
        it('应该正确编码ArrayBuffer', () => {
            const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
            const base64 = Crypto.toBase64(data.buffer);
            
            expect(base64).toBe('SGVsbG8=');
        });

        it('应该正确解码Base64字符串', () => {
            const base64 = 'SGVsbG8=';
            const buffer = Crypto.fromBase64(base64);
            const data = new Uint8Array(buffer);
            
            expect(Array.from(data)).toEqual([72, 101, 108, 108, 111]);
        });

        it('应该处理编码解码往返', () => {
            const originalData = new Uint8Array([1, 2, 3, 4, 5, 255, 128, 0]);
            const base64 = Crypto.toBase64(originalData.buffer);
            const decodedBuffer = Crypto.fromBase64(base64);
            const decodedData = new Uint8Array(decodedBuffer);
            
            expect(Array.from(decodedData)).toEqual(Array.from(originalData));
        });
    });

    describe('验证代码生成', () => {
        it('应该生成签名验证代码', () => {
            const signature = 'test-signature';
            const originalData = 'test-data';
            const publicKey = 'test-public-key';
            
            const code = Crypto.genVerifyCode(signature, 'signature', {
                originalData,
                publicKey
            });
            
            expect(typeof code).toBe('string');
            expect(code).toContain('verifySignature');
            expect(code).toContain(signature);
            expect(code).toContain(originalData);
            expect(code).toContain(publicKey);
        });

        it('应该生成哈希验证代码', () => {
            const hash = 'test-hash';
            const originalData = 'test-data';
            
            const code = Crypto.genVerifyCode(hash, 'hash', {
                originalData
            });
            
            expect(typeof code).toBe('string');
            expect(code).toContain('verifyHash');
            expect(code).toContain(hash);
            expect(code).toContain(originalData);
        });

        it('应该生成公钥验证代码', () => {
            const publicKey = 'test-public-key';
            
            const code = Crypto.genVerifyCode(publicKey, 'publicKey');
            
            expect(typeof code).toBe('string');
            expect(code).toContain('verifyPublicKey');
            expect(code).toContain(publicKey);
        });

        it('应该生成区块ID验证代码', () => {
            const blockId = 'test-block-id';
            
            const code = Crypto.genVerifyCode(blockId, 'blockId');
            
            expect(typeof code).toBe('string');
            expect(code).toContain('verifyBlockId');
            expect(code).toContain(blockId);
        });

        it('应该生成区块链ID验证代码', () => {
            const chainId = 'test-chain-id';
            
            const code = Crypto.genVerifyCode(chainId, 'chainId');
            
            expect(typeof code).toBe('string');
            expect(code).toContain('verifyChainId');
            expect(code).toContain(chainId);
        });

        it('应该生成通用验证代码', () => {
            const data = 'test-data';
            const dataType = 'unknown';
            
            const code = Crypto.genVerifyCode(data, dataType);
            
            expect(typeof code).toBe('string');
            expect(code).toContain('verifyGenericData');
            expect(code).toContain(data);
            expect(code).toContain(dataType);
        });
    });

    describe('错误处理', () => {
        it('应该处理getCrypto错误', () => {
            // 模拟没有crypto对象的环境
            const originalCrypto = globalThis.crypto;
            const originalWindow = globalThis.window;
            
            delete globalThis.crypto;
            delete globalThis.window;
            
            // 模拟require失败
            const originalRequire = globalThis.require;
            globalThis.require = vi.fn(() => {
                throw new Error('Module not found');
            });
            
            expect(() => Crypto.getCrypto()).toThrow();
            
            // 恢复环境
            globalThis.crypto = originalCrypto;
            globalThis.window = originalWindow;
            globalThis.require = originalRequire;
        });

        it('应该处理无效的Base64字符串', () => {
            expect(() => Crypto.fromBase64('invalid-base64!')).toThrow();
        });
    });

    describe('错误处理集成', () => {
        it('应该在密钥生成失败时调用错误处理器', async () => {
            // 模拟crypto API失败
            const originalCrypto = globalThis.crypto;
            globalThis.crypto = {
                subtle: {
                    generateKey: vi.fn().mockRejectedValue(new Error('密钥生成失败'))
                }
            };

            await expect(Crypto.genKeyPair()).rejects.toThrow('密钥生成失败');
            
            expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
                expect.any(Error),
                'CRYPTO_ERROR',
                expect.objectContaining({
                    component: 'Crypto',
                    operation: 'genKeyPair'
                })
            );

            // 恢复原始crypto对象
            globalThis.crypto = originalCrypto;
        });

        it('应该在签名失败时调用错误处理器', async () => {
            const keyPair = await Crypto.genKeyPair();
            
            // 模拟签名失败
            const originalCrypto = globalThis.crypto;
            globalThis.crypto = {
                subtle: {
                    importKey: vi.fn().mockRejectedValue(new Error('私钥导入失败')),
                    sign: vi.fn()
                }
            };

            await expect(Crypto.sign('test data', keyPair.privateKey)).rejects.toThrow('签名失败');
            
            expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
                expect.any(Error),
                'CRYPTO_ERROR',
                expect.objectContaining({
                    component: 'Crypto',
                    operation: 'sign'
                })
            );

            globalThis.crypto = originalCrypto;
        });

        it('应该在验证失败时调用错误处理器', async () => {
            const keyPair = await Crypto.genKeyPair();
            const signature = await Crypto.sign('test data', keyPair.privateKey);
            
            // 模拟验证失败
            const originalCrypto = globalThis.crypto;
            globalThis.crypto = {
                subtle: {
                    importKey: vi.fn().mockRejectedValue(new Error('公钥导入失败')),
                    verify: vi.fn()
                }
            };

            const result = await Crypto.verify(signature, 'test data', keyPair.publicKey);
            
            expect(result).toBe(false);
            expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
                expect.any(Error),
                'CRYPTO_ERROR',
                expect.objectContaining({
                    component: 'Crypto',
                    operation: 'verify'
                })
            );

            globalThis.crypto = originalCrypto;
        });

        it('应该在哈希计算失败时调用错误处理器', async () => {
            // 模拟哈希计算失败
            const originalCrypto = globalThis.crypto;
            globalThis.crypto = {
                subtle: {
                    digest: vi.fn().mockRejectedValue(new Error('哈希计算失败'))
                }
            };

            await expect(Crypto.sha256('test data')).rejects.toThrow('哈希计算失败');
            
            expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
                expect.any(Error),
                'CRYPTO_ERROR',
                expect.objectContaining({
                    component: 'Crypto',
                    operation: 'sha256'
                })
            );

            globalThis.crypto = originalCrypto;
        });

        it('应该记录性能指标到系统监控器', async () => {
            const keyPair = await Crypto.genKeyPair();
            
            expect(mockSystemMonitor.recordMetric).toHaveBeenCalledWith(
                'CRYPTO_KEYGEN_TIME',
                expect.objectContaining({
                    value: expect.any(Number),
                    unit: 'ms',
                    details: expect.objectContaining({
                        method: expect.any(String)
                    })
                }),
                expect.any(Number)
            );
        });

        it('应该记录签名性能指标', async () => {
            const keyPair = await Crypto.genKeyPair();
            mockSystemMonitor.recordMetric.mockClear(); // 清除之前的调用
            
            await Crypto.sign('test data', keyPair.privateKey);
            
            expect(mockSystemMonitor.recordMetric).toHaveBeenCalledWith(
                'CRYPTO_SIGN_TIME',
                expect.objectContaining({
                    value: expect.any(Number),
                    unit: 'ms',
                    details: expect.objectContaining({
                        method: expect.any(String),
                        dataLength: expect.any(Number)
                    })
                }),
                expect.any(Number)
            );
        });

        it('应该记录验证性能指标', async () => {
            const keyPair = await Crypto.genKeyPair();
            const signature = await Crypto.sign('test data', keyPair.privateKey);
            mockSystemMonitor.recordMetric.mockClear();
            
            await Crypto.verify(signature, 'test data', keyPair.publicKey);
            
            expect(mockSystemMonitor.recordMetric).toHaveBeenCalledWith(
                'CRYPTO_VERIFY_TIME',
                expect.objectContaining({
                    value: expect.any(Number),
                    unit: 'ms',
                    details: expect.objectContaining({
                        method: expect.any(String),
                        dataLength: expect.any(Number),
                        result: expect.any(Boolean)
                    })
                }),
                expect.any(Number)
            );
        });

        it('应该记录哈希计算性能指标', async () => {
            mockSystemMonitor.recordMetric.mockClear();
            
            await Crypto.sha256('test data');
            
            expect(mockSystemMonitor.recordMetric).toHaveBeenCalledWith(
                'CRYPTO_HASH_TIME',
                expect.objectContaining({
                    value: expect.any(Number),
                    unit: 'ms',
                    details: expect.objectContaining({
                        method: expect.any(String),
                        dataLength: expect.any(Number)
                    })
                }),
                expect.any(Number)
            );
        });
    });

    describe('集成测试', () => {
        it('应该完成完整的签名验证流程', async () => {
            // 生成密钥对
            const keyPair = await Crypto.genKeyPair();
            
            // 准备数据
            const data = JSON.stringify({
                type: 'transfer',
                from: 'user1',
                to: 'user2',
                amount: 100,
                timestamp: Date.now()
            });
            
            // 签名
            const signature = await Crypto.sign(data, keyPair.privateKey);
            
            // 验证
            const isValid = await Crypto.verify(signature, data, keyPair.publicKey);
            
            expect(isValid).toBe(true);
            
            // 生成验证代码
            const verifyCode = Crypto.genVerifyCode(signature, 'signature', {
                originalData: data,
                publicKey: keyPair.publicKey
            });
            
            expect(verifyCode).toContain('async function verifySignature');
        });

        it('应该完成完整的哈希验证流程', async () => {
            // 准备数据
            const blockData = {
                previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
                transactions: ['tx1', 'tx2', 'tx3'],
                timestamp: Date.now(),
                nonce: 12345
            };
            
            const dataString = JSON.stringify(blockData);
            
            // 计算哈希
            const hash = await Crypto.sha256(dataString);
            
            // 验证哈希格式
            expect(hash).toMatch(/^[0-9a-f]{64}$/);
            
            // 重新计算验证
            const verifyHash = await Crypto.sha256(dataString);
            expect(hash).toBe(verifyHash);
            
            // 生成验证代码
            const verifyCode = Crypto.genVerifyCode(hash, 'hash', {
                originalData: dataString
            });
            
            expect(verifyCode).toContain('async function verifyHash');
        });
    });
});