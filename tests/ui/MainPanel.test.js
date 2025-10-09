/**
 * MainPanel 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock DOM environment
const mockDOM = () => {
    const mockElement = (id, innerHTML = '') => ({
        id,
        innerHTML,
        querySelector: vi.fn((selector) => {
            if (selector === '.assets-display') return mockElement('assets-display');
            if (selector === '.ownership-display') return mockElement('ownership-display');
            if (selector === '.network-display') return mockElement('network-display');
            return null;
        }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dataset: {},
        closest: vi.fn()
    });

    global.document = {
        querySelector: vi.fn((selector) => {
            if (selector === '#user-assets .assets-display') return mockElement('assets-display');
            if (selector === '#chain-ownership .ownership-display') return mockElement('ownership-display');
            if (selector === '#network-status .network-display') return mockElement('network-display');
            return null;
        }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        head: { innerHTML: '' },
        body: { innerHTML: '' }
    };
};

describe('MainPanel', () => {
    let mainPanel;
    let mockUIManager;
    let mockApp;

    beforeEach(() => {
        mockDOM();
        
        mockApp = {
            handleUserSelection: vi.fn(),
            handleChainSelection: vi.fn(),
            getMainPanelData: vi.fn()
        };

        mockUIManager = {
            app: mockApp
        };

        mainPanel = new MainPanel(mockUIManager);
    });

    afterEach(() => {
        if (mainPanel) {
            mainPanel.destroy();
        }
        vi.clearAllMocks();
    });

    describe('初始化', () => {
        it('应该正确初始化', () => {
            expect(mainPanel.uiManager).toBe(mockUIManager);
            expect(mainPanel.app).toBe(mockApp);
            expect(mainPanel.isInitialized).toBe(false);
            expect(mainPanel.userData).toBeInstanceOf(Map);
            expect(mainPanel.chainData).toBeInstanceOf(Map);
            expect(mainPanel.selectedUser).toBeNull();
            expect(mainPanel.selectedChain).toBeNull();
        });

        it('应该成功初始化面板', () => {
            expect(() => mainPanel.init()).not.toThrow();
            expect(mainPanel.isInitialized).toBe(true);
        });
    });

    describe('数据更新', () => {
        beforeEach(() => {
            mainPanel.init();
        });

        it('应该更新用户数据', () => {
            const userData = new Map([
                ['user1', {
                    publicKey: 'mockPublicKey1',
                    totalAssets: 100,
                    chainCount: 5,
                    ownedChains: [
                        { chainId: 'chain1', serialNumber: '001', value: 20 }
                    ]
                }]
            ]);

            mainPanel.updateUserData(userData);
            expect(mainPanel.userData.size).toBe(1);
            expect(mainPanel.userData.get('user1').totalAssets).toBe(100);
        });

        it('应该更新区块链数据', () => {
            const chainData = new Map([
                ['chain1', {
                    ownerId: 'mockPublicKey1',
                    ownerUserId: 'user1',
                    value: 20,
                    serialNumber: '001',
                    blocks: [
                        { blockId: 'block1', type: 'root', creator: 'system', timestamp: Date.now() }
                    ]
                }]
            ]);

            mainPanel.updateChainData(chainData);
            expect(mainPanel.chainData.size).toBe(1);
            expect(mainPanel.chainData.get('chain1').value).toBe(20);
        });

        it('应该更新网络数据', () => {
            const networkData = {
                totalUsers: 10,
                totalChains: 50,
                totalValue: 1000,
                activeConnections: 25
            };

            mainPanel.updateNetworkData(networkData);
            expect(mainPanel.networkData.totalUsers).toBe(10);
            expect(mainPanel.networkData.totalChains).toBe(50);
            expect(mainPanel.networkData.totalValue).toBe(1000);
            expect(mainPanel.networkData.activeConnections).toBe(25);
        });

        it('应该一次性更新所有数据', () => {
            const allData = {
                userData: new Map([['user1', { totalAssets: 100 }]]),
                chainData: new Map([['chain1', { value: 20 }]]),
                networkData: { totalUsers: 10 }
            };

            mainPanel.updateAllData(allData);
            expect(mainPanel.userData.size).toBe(1);
            expect(mainPanel.chainData.size).toBe(1);
            expect(mainPanel.networkData.totalUsers).toBe(10);
        });
    });

    describe('用户交互', () => {
        beforeEach(() => {
            mainPanel.init();
        });

        it('应该处理用户点击事件', () => {
            mainPanel.handleUserClick('user1');
            expect(mainPanel.selectedUser).toBe('user1');
            expect(mainPanel.selectedChain).toBeNull();
            expect(mockApp.handleUserSelection).toHaveBeenCalledWith('user1');
        });

        it('应该处理区块链点击事件', () => {
            mainPanel.handleChainClick('chain1');
            expect(mainPanel.selectedChain).toBe('chain1');
            expect(mainPanel.selectedUser).toBeNull();
            expect(mockApp.handleChainSelection).toHaveBeenCalledWith('chain1');
        });

        it('应该支持取消选择', () => {
            mainPanel.selectedUser = 'user1';
            mainPanel.handleUserClick('user1');
            expect(mainPanel.selectedUser).toBeNull();
            expect(mockApp.handleUserSelection).toHaveBeenCalledWith(null);
        });

        it('应该支持设置选中状态', () => {
            mainPanel.setSelectedUser('user1');
            expect(mainPanel.selectedUser).toBe('user1');
            expect(mainPanel.selectedChain).toBeNull();

            mainPanel.setSelectedChain('chain1');
            expect(mainPanel.selectedChain).toBe('chain1');
            expect(mainPanel.selectedUser).toBeNull();
        });

        it('应该支持清除所有选择', () => {
            mainPanel.selectedUser = 'user1';
            mainPanel.selectedChain = 'chain1';
            
            mainPanel.clearSelection();
            expect(mainPanel.selectedUser).toBeNull();
            expect(mainPanel.selectedChain).toBeNull();
        });
    });

    describe('实时更新', () => {
        beforeEach(() => {
            mainPanel.init();
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('应该启动实时更新', () => {
            mainPanel.startRealTimeUpdate();
            expect(mainPanel.updateInterval).not.toBeNull();
        });

        it('应该停止实时更新', () => {
            mainPanel.startRealTimeUpdate();
            const intervalId = mainPanel.updateInterval;
            
            mainPanel.stopRealTimeUpdate();
            expect(mainPanel.updateInterval).toBeNull();
        });

        it('应该定期请求数据更新', () => {
            mockApp.getMainPanelData.mockReturnValue({
                userData: new Map(),
                chainData: new Map(),
                networkData: {}
            });

            mainPanel.startRealTimeUpdate();
            
            // 快进时间
            vi.advanceTimersByTime(1000);
            expect(mockApp.getMainPanelData).toHaveBeenCalled();
        });

        it('应该支持设置刷新率', () => {
            mainPanel.setRefreshRate(500);
            expect(mainPanel.refreshRate).toBe(500);
            
            // 测试最小值限制
            mainPanel.setRefreshRate(50);
            expect(mainPanel.refreshRate).toBe(100);
        });
    });

    describe('工具方法', () => {
        it('应该正确格式化Base64数据', () => {
            const shortData = 'abc123';
            expect(mainPanel.formatBase64Short(shortData)).toBe('abc123');

            const longData = 'abcdefghijklmnopqrstuvwxyz123456789';
            const formatted = mainPanel.formatBase64Short(longData);
            expect(formatted).toBe('abcdef...456789');
            expect(formatted.length).toBe(15);
        });

        it('应该正确获取区块类型文本', () => {
            expect(mainPanel.getBlockTypeText('root')).toBe('根区块');
            expect(mainPanel.getBlockTypeText('ownership')).toBe('所有权区块');
            expect(mainPanel.getBlockTypeText('transfer')).toBe('转移区块');
            expect(mainPanel.getBlockTypeText('unknown')).toBe('unknown');
        });

        it('应该正确格式化时间戳', () => {
            const timestamp = 1640995200000; // 2022-01-01 00:00:00
            const formatted = mainPanel.formatTimestamp(timestamp);
            expect(formatted).toContain('2022');
            
            expect(mainPanel.formatTimestamp(null)).toBe('N/A');
            expect(mainPanel.formatTimestamp(undefined)).toBe('N/A');
        });
    });

    describe('渲染方法', () => {
        beforeEach(() => {
            mainPanel.init();
        });

        it('应该渲染用户资产显示', () => {
            expect(() => mainPanel.renderUserAssets()).not.toThrow();
        });

        it('应该渲染区块链归属显示', () => {
            expect(() => mainPanel.renderChainOwnership()).not.toThrow();
        });

        it('应该渲染网络状态显示', () => {
            expect(() => mainPanel.renderNetworkStatus()).not.toThrow();
        });

        it('应该渲染用户详细信息', () => {
            const userData = new Map([
                ['user1', {
                    ownedChains: [
                        { chainId: 'chain1', serialNumber: '001', value: 20 }
                    ]
                }]
            ]);
            mainPanel.updateUserData(userData);

            const details = mainPanel.renderUserDetails('user1');
            expect(details).toContain('拥有的区块链');
            expect(details).toContain('chain1');
        });

        it('应该渲染区块链详细信息', () => {
            const chainData = new Map([
                ['chain1', {
                    blocks: [
                        { blockId: 'block1', type: 'root', creator: 'system', timestamp: Date.now() }
                    ]
                }]
            ]);
            mainPanel.updateChainData(chainData);

            const details = mainPanel.renderChainDetails('chain1');
            expect(details).toContain('区块链中的所有区块');
            expect(details).toContain('block1');
        });
    });

    describe('销毁', () => {
        it('应该正确销毁面板', () => {
            mainPanel.init();
            mainPanel.startRealTimeUpdate();
            
            mainPanel.destroy();
            
            expect(mainPanel.updateInterval).toBeNull();
            expect(mainPanel.userData.size).toBe(0);
            expect(mainPanel.chainData.size).toBe(0);
            expect(mainPanel.selectedUser).toBeNull();
            expect(mainPanel.selectedChain).toBeNull();
            expect(mainPanel.isInitialized).toBe(false);
        });
    });
});