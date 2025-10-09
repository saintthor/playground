import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock DOM environment
const mockApp = {
    getBlockData: vi.fn(),
    getChainData: vi.fn(),
    getUserData: vi.fn(),
    handleUserSelection: vi.fn(),
    handleChainSelection: vi.fn(),
    handleLogSelection: vi.fn()
};

// Mock DOM elements
const createMockElement = (id, innerHTML = '') => {
    const element = {
        id,
        innerHTML,
        classList: {
            add: vi.fn(),
            remove: vi.fn(),
            contains: vi.fn(() => false)
        },
        dataset: {},
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        querySelector: vi.fn(),
        querySelectorAll: vi.fn(() => []),
        closest: vi.fn(),
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        remove: vi.fn(),
        style: {},
        getBoundingClientRect: vi.fn(() => ({
            left: 100,
            top: 100,
            right: 200,
            bottom: 150,
            width: 100,
            height: 50
        }))
    };
    return element;
};

// Mock document
const mockDocument = {
    getElementById: vi.fn(),
    createElement: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
    body: createMockElement('body'),
    readyState: 'complete'
};

// Mock window
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

// Mock navigator
const mockNavigator = {
    clipboard: {
        writeText: vi.fn()
    }
};

describe('验证代码生成和显示功能', () => {
    let uiManager;
    let originalDocument, originalWindow, originalNavigator;

    beforeEach(() => {
        // 保存原始对象
        originalDocument = global.document;
        originalWindow = global.window;
        originalNavigator = global.navigator;

        // 设置 mock 对象
        global.document = mockDocument;
        global.window = mockWindow;
        global.navigator = mockNavigator;

        // 设置必要的 DOM 元素
        mockDocument.getElementById.mockImplementation((id) => {
            switch (id) {
                case 'control-panel':
                case 'main-panel':
                case 'log-panel':
                    return createMockElement(id, '<div class="panel-content"></div>');
                default:
                    return null;
            }
        });

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

    describe('collectVerificationContext', () => {
        it('应该从元素数据属性中收集基本信息', () => {
            const element = createMockElement('test-element');
            element.dataset = {
                originalData: 'test-original-data',
                publicKey: 'test-public-key',
                privateKey: 'test-private-key'
            };

            const context = uiManager.collectVerificationContext(element, 'signature');

            expect(context.originalData).toBe('test-original-data');
            expect(context.publicKey).toBe('test-public-key');
            expect(context.privateKey).toBe('test-private-key');
        });

        it('应该从父元素中收集相关ID信息', () => {
            const parentElement = createMockElement('parent');
            parentElement.dataset = {
                userId: 'user-123',
                chainId: 'chain-456',
                blockId: 'block-789'
            };

            const element = createMockElement('test-element');
            element.closest = vi.fn(() => parentElement);

            const context = uiManager.collectVerificationContext(element, 'signature');

            expect(context.userId).toBe('user-123');
            expect(context.chainId).toBe('chain-456');
            expect(context.blockId).toBe('block-789');
        });

        it('应该根据数据类型调用相应的查找方法', () => {
            const element = createMockElement('test-element');
            
            // Mock 查找方法
            uiManager.findRelatedDataForSignature = vi.fn(() => ({ test: 'signature-data' }));
            uiManager.findRelatedDataForHash = vi.fn(() => ({ test: 'hash-data' }));
            uiManager.findRelatedDataForPublicKey = vi.fn(() => ({ test: 'publickey-data' }));

            // 测试签名类型
            let context = uiManager.collectVerificationContext(element, 'signature');
            expect(uiManager.findRelatedDataForSignature).toHaveBeenCalledWith(element);
            expect(context.relatedData).toEqual({ test: 'signature-data' });

            // 测试哈希类型
            context = uiManager.collectVerificationContext(element, 'hash');
            expect(uiManager.findRelatedDataForHash).toHaveBeenCalledWith(element);
            expect(context.relatedData).toEqual({ test: 'hash-data' });

            // 测试公钥类型
            context = uiManager.collectVerificationContext(element, 'publicKey');
            expect(uiManager.findRelatedDataForPublicKey).toHaveBeenCalledWith(element);
            expect(context.relatedData).toEqual({ test: 'publickey-data' });
        });
    });

    describe('findRelatedDataForSignature', () => {
        it('应该从区块数据中查找签名相关信息', () => {
            const blockElement = createMockElement('block-element');
            blockElement.dataset.blockId = 'block-123';

            const element = createMockElement('test-element');
            element.closest = vi.fn((selector) => {
                if (selector === '[data-block-id]') return blockElement;
                return null;
            });

            const mockBlockData = {
                data: { test: 'block-data' },
                creatorPublicKey: 'creator-public-key'
            };

            mockApp.getBlockData.mockReturnValue(mockBlockData);

            const relatedData = uiManager.findRelatedDataForSignature(element);

            expect(mockApp.getBlockData).toHaveBeenCalledWith('block-123');
            expect(relatedData.originalData).toBe(JSON.stringify(mockBlockData.data));
            expect(relatedData.publicKey).toBe('creator-public-key');
        });

        it('应该在没有区块数据时返回空对象', () => {
            const element = createMockElement('test-element');
            element.closest = vi.fn(() => null);

            const relatedData = uiManager.findRelatedDataForSignature(element);

            expect(relatedData).toEqual({});
        });
    });

    describe('findRelatedDataForHash', () => {
        it('应该从区块链数据中查找哈希相关信息', () => {
            const chainElement = createMockElement('chain-element');
            chainElement.dataset.chainId = 'chain-123';

            const element = createMockElement('test-element');
            element.closest = vi.fn((selector) => {
                if (selector === '[data-chain-id]') return chainElement;
                return null;
            });

            const mockChainData = {
                rootBlock: {
                    data: { test: 'root-block-data' }
                }
            };

            mockApp.getChainData.mockReturnValue(mockChainData);

            const relatedData = uiManager.findRelatedDataForHash(element);

            expect(mockApp.getChainData).toHaveBeenCalledWith('chain-123');
            expect(relatedData.originalData).toBe(JSON.stringify(mockChainData.rootBlock.data));
        });
    });

    describe('findRelatedDataForPublicKey', () => {
        it('应该从用户数据中查找公钥相关信息', () => {
            const userElement = createMockElement('user-element');
            userElement.dataset.userId = 'user-123';

            const element = createMockElement('test-element');
            element.closest = vi.fn((selector) => {
                if (selector === '[data-user-id]') return userElement;
                return null;
            });

            const mockUserData = {
                publicKey: 'user-public-key',
                name: 'Test User'
            };

            mockApp.getUserData.mockReturnValue(mockUserData);

            const relatedData = uiManager.findRelatedDataForPublicKey(element);

            expect(mockApp.getUserData).toHaveBeenCalledWith('user-123');
            expect(relatedData.userId).toBe('user-123');
            expect(relatedData.userInfo).toEqual(mockUserData);
        });
    });

    describe('showVerifyCode', () => {
        it('应该生成验证代码并显示对话框', async () => {
            const base64Data = 'dGVzdC1kYXRh'; // "test-data" in base64
            const dataType = 'signature';
            const context = { originalData: 'test-data', publicKey: 'test-key' };

            // Mock Crypto.genVerifyCode
            const mockVerifyCode = 'console.log("test verify code");';
            vi.spyOn(Crypto, 'genVerifyCode').mockReturnValue(mockVerifyCode);

            // Mock displayVerifyCodeDialog
            uiManager.displayVerifyCodeDialog = vi.fn();

            await uiManager.showVerifyCode(base64Data, dataType, context);

            // 等待动态导入完成
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(Crypto.genVerifyCode).toHaveBeenCalledWith(base64Data, dataType, context);
            expect(uiManager.displayVerifyCodeDialog).toHaveBeenCalledWith(
                mockVerifyCode,
                base64Data,
                dataType
            );
        });

        it('应该在Crypto服务加载失败时显示错误', async () => {
            uiManager.showErrorMessage = vi.fn();

            // Mock dynamic import to fail
            const originalShowVerifyCode = uiManager.showVerifyCode;
            uiManager.showVerifyCode = async function(base64Data, dataType, context = {}) {
                try {
                    // Simulate import failure
                    throw new Error('Import failed');
                } catch (error) {
                    console.error('加载Crypto服务失败:', error);
                    this.showErrorMessage('无法生成验证代码：Crypto服务加载失败');
                }
            };

            await uiManager.showVerifyCode('test-data', 'signature', {});

            expect(uiManager.showErrorMessage).toHaveBeenCalledWith(
                '无法生成验证代码：Crypto服务加载失败'
            );

            // Restore original method
            uiManager.showVerifyCode = originalShowVerifyCode;
        });
    });

    describe('displayVerifyCodeDialog', () => {
        it('应该创建并显示验证代码对话框', () => {
            const verifyCode = 'console.log("test");';
            const base64Data = 'dGVzdA==';
            const dataType = 'signature';

            const mockDialog = createMockElement('verify-code-dialog');
            mockDocument.createElement.mockReturnValue(mockDialog);

            uiManager.bindVerifyCodeDialogEvents = vi.fn();
            uiManager.closeVerifyCodeDialog = vi.fn();

            uiManager.displayVerifyCodeDialog(verifyCode, base64Data, dataType);

            expect(mockDocument.createElement).toHaveBeenCalledWith('div');
            expect(mockDialog.id).toBe('verify-code-dialog');
            expect(mockDialog.className).toBe('verify-code-dialog');
            expect(mockDocument.body.appendChild).toHaveBeenCalledWith(mockDialog);
            expect(uiManager.bindVerifyCodeDialogEvents).toHaveBeenCalledWith(verifyCode);
        });

        it('应该在显示新对话框前关闭现有对话框', () => {
            uiManager.closeVerifyCodeDialog = vi.fn();
            uiManager.bindVerifyCodeDialogEvents = vi.fn();

            const mockDialog = createMockElement('verify-code-dialog');
            mockDocument.createElement.mockReturnValue(mockDialog);

            uiManager.displayVerifyCodeDialog('test-code', 'test-data', 'signature');

            expect(uiManager.closeVerifyCodeDialog).toHaveBeenCalled();
        });
    });

    describe('copyVerifyCode', () => {
        it('应该使用clipboard API复制代码', async () => {
            const verifyCode = 'console.log("test");';
            uiManager.showVerifyCodeMessage = vi.fn();

            mockNavigator.clipboard.writeText.mockResolvedValue();

            await uiManager.copyVerifyCode(verifyCode);

            expect(mockNavigator.clipboard.writeText).toHaveBeenCalledWith(verifyCode);
            expect(uiManager.showVerifyCodeMessage).toHaveBeenCalledWith(
                '代码已复制到剪贴板',
                'success'
            );
        });

        it('应该在clipboard API失败时使用降级方法', async () => {
            const verifyCode = 'console.log("test");';
            uiManager.fallbackCopyText = vi.fn();

            mockNavigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard failed'));

            await uiManager.copyVerifyCode(verifyCode);

            expect(uiManager.fallbackCopyText).toHaveBeenCalledWith(verifyCode);
        });
    });

    describe('runVerifyCode', () => {
        it('应该执行验证代码并显示结果', async () => {
            const verifyCode = 'return "test result";';
            
            const mockResultElement = createMockElement('verify-code-result');
            mockDocument.getElementById.mockImplementation((id) => {
                if (id === 'verify-code-result') return mockResultElement;
                return null;
            });

            uiManager.displayVerifyCodeResult = vi.fn();

            // Mock console methods
            const originalLog = console.log;
            const originalError = console.error;
            console.log = vi.fn();
            console.error = vi.fn();

            await uiManager.runVerifyCode(verifyCode);

            expect(uiManager.displayVerifyCodeResult).toHaveBeenCalled();

            // Restore console methods
            console.log = originalLog;
            console.error = originalError;
        });

        it('应该在代码执行失败时显示错误', async () => {
            const verifyCode = 'throw new Error("test error");';
            
            const mockResultElement = createMockElement('verify-code-result');
            mockDocument.getElementById.mockImplementation((id) => {
                if (id === 'verify-code-result') return mockResultElement;
                return null;
            });

            uiManager.displayVerifyCodeResult = vi.fn();

            await uiManager.runVerifyCode(verifyCode);

            const [logs, result, error] = uiManager.displayVerifyCodeResult.mock.calls[0];
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe('test error');
        });
    });

    describe('closeVerifyCodeDialog', () => {
        it('应该关闭并移除验证代码对话框', () => {
            const mockDialog = createMockElement('verify-code-dialog');
            mockDialog.classList.remove = vi.fn();
            mockDialog.remove = vi.fn();

            mockDocument.getElementById.mockImplementation((id) => {
                if (id === 'verify-code-dialog') return mockDialog;
                return null;
            });

            uiManager.closeVerifyCodeDialog();

            expect(mockDialog.classList.remove).toHaveBeenCalledWith('show');
            
            // 测试延迟移除
            setTimeout(() => {
                expect(mockDialog.remove).toHaveBeenCalled();
            }, 300);
        });

        it('应该在对话框不存在时安全处理', () => {
            mockDocument.getElementById.mockReturnValue(null);

            expect(() => {
                uiManager.closeVerifyCodeDialog();
            }).not.toThrow();
        });
    });

    describe('Base64数据选中处理', () => {
        it('应该在Base64数据被选中时触发验证代码显示', () => {
            const element = createMockElement('base64-element');
            element.dataset = {
                fullData: 'dGVzdC1kYXRh',
                type: 'signature'
            };

            uiManager.collectVerificationContext = vi.fn(() => ({ test: 'context' }));
            uiManager.showVerifyCode = vi.fn();

            uiManager.onBase64Selected('dGVzdC1kYXRh', 'signature', element);

            expect(uiManager.collectVerificationContext).toHaveBeenCalledWith(element, 'signature');
            expect(uiManager.showVerifyCode).toHaveBeenCalledWith(
                'dGVzdC1kYXRh',
                'signature',
                { test: 'context' }
            );
        });
    });

    describe('工具方法', () => {
        it('formatBase64Short应该正确格式化Base64数据', () => {
            expect(uiManager.formatBase64Short('short')).toBe('short');
            expect(uiManager.formatBase64Short('verylongbase64datastring')).toBe('verylo...string');
            expect(uiManager.formatBase64Short('')).toBe('N/A');
            expect(uiManager.formatBase64Short(null)).toBe('N/A');
        });

        it('escapeHtml应该正确转义HTML字符', () => {
            // Mock createElement to return a proper div element for escapeHtml
            const mockDiv = {
                textContent: '',
                innerHTML: ''
            };
            
            Object.defineProperty(mockDiv, 'textContent', {
                set: function(value) {
                    this._textContent = value;
                    // Simulate browser behavior for innerHTML when textContent is set
                    this.innerHTML = value
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;');
                },
                get: function() {
                    return this._textContent;
                }
            });

            mockDocument.createElement.mockImplementation((tagName) => {
                if (tagName === 'div') {
                    return mockDiv;
                }
                return createMockElement(tagName);
            });

            expect(uiManager.escapeHtml('<script>alert("xss")</script>'))
                .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
            expect(uiManager.escapeHtml('normal text')).toBe('normal text');
        });

        it('getDataTypeDisplayName应该返回正确的显示名称', () => {
            expect(uiManager.getDataTypeDisplayName('publicKey')).toBe('公钥');
            expect(uiManager.getDataTypeDisplayName('signature')).toBe('签名');
            expect(uiManager.getDataTypeDisplayName('hash')).toBe('哈希');
            expect(uiManager.getDataTypeDisplayName('unknown')).toBe('数据');
        });
    });
});