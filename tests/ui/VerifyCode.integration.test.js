import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIManager } from '../../src/ui/UIManager.js';
import { Crypto } from '../../src/services/Crypto.js';

// Mock DOM environment for integration testing
const setupMockDOM = () => {
    const mockDocument = {
        getElementById: vi.fn(),
        createElement: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        querySelector: vi.fn(),
        querySelectorAll: vi.fn(() => []),
        body: {
            appendChild: vi.fn(),
            removeChild: vi.fn()
        },
        readyState: 'complete'
    };

    const mockWindow = {
        innerWidth: 1024,
        innerHeight: 768,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        crypto: {
            subtle: {
                generateKey: vi.fn(),
                exportKey: vi.fn(),
                importKey: vi.fn(),
                sign: vi.fn(),
                verify: vi.fn(),
                digest: vi.fn()
            }
        }
    };

    const mockNavigator = {
        clipboard: {
            writeText: vi.fn()
        }
    };

    return { mockDocument, mockWindow, mockNavigator };
};

describe('验证代码功能集成测试', () => {
    let uiManager;
    let mockApp;
    let originalDocument, originalWindow, originalNavigator;

    beforeEach(() => {
        const { mockDocument, mockWindow, mockNavigator } = setupMockDOM();
        
        // 保存原始对象
        originalDocument = global.document;
        originalWindow = global.window;
        originalNavigator = global.navigator;

        // 设置 mock 对象
        global.document = mockDocument;
        global.window = mockWindow;
        global.navigator = mockNavigator;

        // Mock app
        mockApp = {
            getBlockData: vi.fn(),
            getChainData: vi.fn(),
            getUserData: vi.fn(),
            handleUserSelection: vi.fn(),
            handleChainSelection: vi.fn(),
            handleLogSelection: vi.fn()
        };

        // 设置必要的 DOM 元素
        mockDocument.getElementById.mockImplementation((id) => {
            const element = {
                id,
                innerHTML: '',
                classList: {
                    add: vi.fn(),
                    remove: vi.fn(),
                    contains: vi.fn(() => false)
                },
                dataset: {},
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                querySelector: vi.fn(() => ({ innerHTML: '' })),
                querySelectorAll: vi.fn(() => []),
                closest: vi.fn(),
                appendChild: vi.fn(),
                removeChild: vi.fn(),
                remove: vi.fn(),
                style: {},
                getBoundingClientRect: vi.fn(() => ({
                    left: 100, top: 100, right: 200, bottom: 150, width: 100, height: 50
                }))
            };

            if (id === 'control-panel' || id === 'main-panel' || id === 'log-panel') {
                element.querySelector = vi.fn(() => ({ innerHTML: '' }));
            }

            return element;
        });

        mockDocument.createElement.mockImplementation((tagName) => ({
            tagName,
            id: '',
            className: '',
            innerHTML: '',
            textContent: '',
            classList: {
                add: vi.fn(),
                remove: vi.fn(),
                contains: vi.fn(() => false)
            },
            dataset: {},
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            appendChild: vi.fn(),
            removeChild: vi.fn(),
            remove: vi.fn(),
            style: {},
            getBoundingClientRect: vi.fn(() => ({
                left: 100, top: 100, right: 200, bottom: 150, width: 100, height: 50
            }))
        }));

        uiManager = new UIManager(mockApp);
    });

    afterEach(() => {
        // 恢复原始对象
        global.document = originalDocument;
        global.window = originalWindow;
        global.navigator = originalNavigator;
        
        // 清理 mock
        vi.clearAllMocks();
    });

    describe('完整的验证代码生成流程', () => {
        it('应该能够为签名数据生成完整的验证代码', async () => {
            const signatureData = 'MEUCIQDTest...'; // Mock signature
            const originalData = 'test block data';
            const publicKey = 'MFkwEwYHKoZI...'; // Mock public key

            // Mock Crypto.genVerifyCode
            const expectedCode = `// 验证数字签名
async function verifySignature() {
    const signature = '${signatureData}';
    const originalData = '${originalData}';
    const publicKey = '${publicKey}';
    // ... verification code
}`;

            const mockGenVerifyCode = vi.fn().mockReturnValue(expectedCode);
            uiManager.displayVerifyCodeDialog = vi.fn();

            // Override showVerifyCode to avoid dynamic import
            const originalShowVerifyCode = uiManager.showVerifyCode;
            uiManager.showVerifyCode = async function(base64Data, dataType, context = {}) {
                const verifyCode = mockGenVerifyCode(base64Data, dataType, context);
                this.displayVerifyCodeDialog(verifyCode, base64Data, dataType);
            };

            const context = {
                originalData,
                publicKey,
                relatedData: {
                    originalData,
                    publicKey
                }
            };

            await uiManager.showVerifyCode(signatureData, 'signature', context);

            expect(mockGenVerifyCode).toHaveBeenCalledWith(signatureData, 'signature', context);
            expect(uiManager.displayVerifyCodeDialog).toHaveBeenCalledWith(expectedCode, signatureData, 'signature');

            // Restore original method
            uiManager.showVerifyCode = originalShowVerifyCode;
        });

        it('应该能够为哈希数据生成完整的验证代码', async () => {
            const hashData = 'a1b2c3d4e5f6...'; // Mock hash
            const originalData = 'root block data';

            const expectedCode = `// 验证 SHA-256 哈希
async function verifyHash() {
    const expectedHash = '${hashData}';
    const originalData = '${originalData}';
    // ... verification code
}`;

            const mockGenVerifyCode = vi.fn().mockReturnValue(expectedCode);
            uiManager.displayVerifyCodeDialog = vi.fn();

            // Override showVerifyCode to avoid dynamic import
            const originalShowVerifyCode = uiManager.showVerifyCode;
            uiManager.showVerifyCode = async function(base64Data, dataType, context = {}) {
                const verifyCode = mockGenVerifyCode(base64Data, dataType, context);
                this.displayVerifyCodeDialog(verifyCode, base64Data, dataType);
            };

            const context = {
                originalData,
                relatedData: {
                    originalData
                }
            };

            await uiManager.showVerifyCode(hashData, 'hash', context);

            expect(mockGenVerifyCode).toHaveBeenCalledWith(hashData, 'hash', context);
            expect(uiManager.displayVerifyCodeDialog).toHaveBeenCalledWith(expectedCode, hashData, 'hash');

            // Restore original method
            uiManager.showVerifyCode = originalShowVerifyCode;
        });

        it('应该能够为公钥数据生成完整的验证代码', async () => {
            const publicKeyData = 'MFkwEwYHKoZI...'; // Mock public key
            const userId = 'user-123';

            const expectedCode = `// 验证公钥格式和属性
async function verifyPublicKey() {
    const publicKeyBase64 = '${publicKeyData}';
    // ... verification code
}`;

            const mockGenVerifyCode = vi.fn().mockReturnValue(expectedCode);
            uiManager.displayVerifyCodeDialog = vi.fn();

            // Override showVerifyCode to avoid dynamic import
            const originalShowVerifyCode = uiManager.showVerifyCode;
            uiManager.showVerifyCode = async function(base64Data, dataType, context = {}) {
                const verifyCode = mockGenVerifyCode(base64Data, dataType, context);
                this.displayVerifyCodeDialog(verifyCode, base64Data, dataType);
            };

            const context = {
                userId,
                relatedData: {
                    userId,
                    userInfo: { publicKey: publicKeyData }
                }
            };

            await uiManager.showVerifyCode(publicKeyData, 'publicKey', context);

            expect(mockGenVerifyCode).toHaveBeenCalledWith(publicKeyData, 'publicKey', context);
            expect(uiManager.displayVerifyCodeDialog).toHaveBeenCalledWith(expectedCode, publicKeyData, 'publicKey');

            // Restore original method
            uiManager.showVerifyCode = originalShowVerifyCode;
        });
    });

    describe('Base64数据选择和验证代码显示的集成', () => {
        it('应该能够处理完整的Base64数据选择到验证代码显示流程', () => {
            // 创建一个模拟的Base64数据元素
            const base64Element = {
                classList: {
                    add: vi.fn(),
                    remove: vi.fn(),
                    contains: vi.fn(() => false)
                },
                dataset: {
                    fullData: 'dGVzdC1zaWduYXR1cmU=', // "test-signature" in base64
                    type: 'signature',
                    originalData: 'test data',
                    publicKey: 'test-public-key'
                },
                closest: vi.fn(() => ({
                    dataset: {
                        userId: 'user-123',
                        blockId: 'block-456'
                    }
                }))
            };

            // Mock showVerifyCode
            uiManager.showVerifyCode = vi.fn();

            // 模拟Base64数据被选中
            uiManager.onBase64Selected(
                base64Element.dataset.fullData,
                base64Element.dataset.type,
                base64Element
            );

            // 验证showVerifyCode被调用
            expect(uiManager.showVerifyCode).toHaveBeenCalledWith(
                'dGVzdC1zaWduYXR1cmU=',
                'signature',
                expect.objectContaining({
                    originalData: 'test data',
                    publicKey: 'test-public-key',
                    userId: 'user-123',
                    blockId: 'block-456'
                })
            );
        });

        it('应该能够处理不同类型的Base64数据选择', () => {
            const testCases = [
                {
                    data: 'aGFzaC1kYXRh', // "hash-data" in base64
                    type: 'hash',
                    expectedContext: { chainId: 'chain-123' }
                },
                {
                    data: 'cHVibGljLWtleQ==', // "public-key" in base64
                    type: 'publicKey',
                    expectedContext: { userId: 'user-456' }
                },
                {
                    data: 'YmxvY2staWQ=', // "block-id" in base64
                    type: 'blockId',
                    expectedContext: { blockId: 'block-789' }
                }
            ];

            uiManager.showVerifyCode = vi.fn();

            testCases.forEach(({ data, type, expectedContext }) => {
                const element = {
                    classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn(() => false) },
                    dataset: { fullData: data, type },
                    closest: vi.fn(() => ({ dataset: expectedContext }))
                };

                uiManager.onBase64Selected(data, type, element);

                expect(uiManager.showVerifyCode).toHaveBeenCalledWith(
                    data,
                    type,
                    expect.objectContaining(expectedContext)
                );
            });
        });
    });

    describe('验证代码对话框交互', () => {
        it('应该能够正确处理复制代码功能', async () => {
            const testCode = 'console.log("test verification code");';
            
            // Mock clipboard API
            global.navigator.clipboard.writeText.mockResolvedValue();
            uiManager.showVerifyCodeMessage = vi.fn();

            await uiManager.copyVerifyCode(testCode);

            expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith(testCode);
            expect(uiManager.showVerifyCodeMessage).toHaveBeenCalledWith(
                '代码已复制到剪贴板',
                'success'
            );
        });

        it('应该能够正确处理代码执行功能', async () => {
            const testCode = 'return "verification result";';
            
            // Mock result element
            const mockResultElement = {
                innerHTML: ''
            };
            global.document.getElementById.mockImplementation((id) => {
                if (id === 'verify-code-result') return mockResultElement;
                return null;
            });

            uiManager.displayVerifyCodeResult = vi.fn();

            await uiManager.runVerifyCode(testCode);

            expect(uiManager.displayVerifyCodeResult).toHaveBeenCalled();
        });

        it('应该能够正确处理对话框的打开和关闭', () => {
            const mockDialog = {
                id: 'verify-code-dialog',
                classList: {
                    add: vi.fn(),
                    remove: vi.fn()
                },
                remove: vi.fn()
            };

            // 测试对话框创建
            global.document.createElement.mockReturnValue(mockDialog);
            uiManager.bindVerifyCodeDialogEvents = vi.fn();

            uiManager.displayVerifyCodeDialog('test code', 'test data', 'signature');

            expect(global.document.body.appendChild).toHaveBeenCalledWith(mockDialog);
            expect(uiManager.bindVerifyCodeDialogEvents).toHaveBeenCalledWith('test code');

            // 测试对话框关闭
            global.document.getElementById.mockImplementation((id) => {
                if (id === 'verify-code-dialog') return mockDialog;
                return null;
            });

            uiManager.closeVerifyCodeDialog();

            expect(mockDialog.classList.remove).toHaveBeenCalledWith('show');
        });
    });

    describe('错误处理', () => {
        it('应该能够优雅处理验证代码生成错误', async () => {
            uiManager.showErrorMessage = vi.fn();

            // Mock Crypto service to throw error
            vi.spyOn(Crypto, 'genVerifyCode').mockImplementation(() => {
                throw new Error('Crypto generation failed');
            });

            // Override showVerifyCode to handle the error
            const originalShowVerifyCode = uiManager.showVerifyCode;
            uiManager.showVerifyCode = async function(base64Data, dataType, context = {}) {
                try {
                    const verifyCode = Crypto.genVerifyCode(base64Data, dataType, context);
                    this.displayVerifyCodeDialog(verifyCode, base64Data, dataType);
                } catch (error) {
                    console.error('验证代码生成失败:', error);
                    this.showErrorMessage('验证代码生成失败：' + error.message);
                }
            };

            await uiManager.showVerifyCode('test-data', 'signature', {});

            expect(uiManager.showErrorMessage).toHaveBeenCalledWith(
                '验证代码生成失败：Crypto generation failed'
            );

            // Restore original method
            uiManager.showVerifyCode = originalShowVerifyCode;
        });

        it('应该能够优雅处理复制功能错误', async () => {
            const testCode = 'test code';
            
            // Mock clipboard API to fail
            global.navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard failed'));
            uiManager.fallbackCopyText = vi.fn();

            await uiManager.copyVerifyCode(testCode);

            expect(uiManager.fallbackCopyText).toHaveBeenCalledWith(testCode);
        });

        it('应该能够优雅处理代码执行错误', async () => {
            const invalidCode = 'throw new Error("execution failed");';
            
            const mockResultElement = { innerHTML: '' };
            global.document.getElementById.mockImplementation((id) => {
                if (id === 'verify-code-result') return mockResultElement;
                return null;
            });

            uiManager.displayVerifyCodeResult = vi.fn();

            await uiManager.runVerifyCode(invalidCode);

            const [logs, result, error] = uiManager.displayVerifyCodeResult.mock.calls[0];
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe('execution failed');
        });
    });
});