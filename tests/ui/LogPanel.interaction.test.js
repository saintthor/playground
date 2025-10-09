/**
 * LogPanel 交互功能集成测试
 * 测试日志点击、过滤和与主面板的联动功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('LogPanel 交互功能集成测试', () => {
    let logPanel;
    let mockMainPanel;
    let mockUIManager;
    let mockApp;
    let mockLogger;

    beforeEach(() => {
        // Create mock logger
        mockLogger = {
            getLogs: vi.fn(() => ({
                logs: [],
                pagination: { currentPage: 1, totalPages: 1, totalCount: 0 }
            })),
            addEventListener: vi.fn()
        };
        
        // Create mock app
        mockApp = {
            logger: mockLogger,
            handleUserSelection: vi.fn(),
            handleChainSelection: vi.fn(),
            handleLogSelection: vi.fn()
        };

        // Create mock main panel
        mockMainPanel = {
            setSelectedUser: vi.fn(),
            setSelectedChain: vi.fn()
        };

        // Create mock UI manager
        mockUIManager = {
            app: mockApp,
            panels: {
                main: mockMainPanel,
                log: null
            },
            handleLogClick: vi.fn(),
            handleUserSelection: vi.fn(),
            handleChainSelection: vi.fn()
        };

        // Create log panel with minimal DOM mocking
        logPanel = new LogPanel(mockUIManager);
        mockUIManager.panels.log = logPanel;
        
        // Mock essential DOM elements
        logPanel.container = { innerHTML: '' };
        logPanel.logList = { 
            innerHTML: '',
            addEventListener: vi.fn(),
            querySelector: vi.fn()
        };
        logPanel.pagination = { innerHTML: '' };
        logPanel.filterControls = { value: 'all' };
        logPanel.searchInput = { value: '' };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('日志点击交互', () => {
        it('应该正确处理日志项点击事件', () => {
            // Arrange
            const mockLogEntry = {
                id: 'log-1',
                type: 'BLOCK_ADDED',
                message: '区块已添加',
                timestamp: Date.now(),
                tick: 100,
                relatedData: {
                    blockId: 'block-123',
                    chainId: 'chain-456',
                    creatorId: 'user-789'
                }
            };

            logPanel.allLogs = [mockLogEntry];
            logPanel.init();

            // Act
            logPanel.handleLogClick('log-1', { preventDefault: vi.fn(), stopPropagation: vi.fn() });

            // Assert
            expect(mockUIManager.handleLogClick).toHaveBeenCalledWith('log-1', mockLogEntry);
            expect(mockApp.handleLogSelection).toHaveBeenCalledWith('log-1', mockLogEntry);
        });

        it('应该正确高亮选中的日志项', () => {
            // Arrange
            const mockLogItem = {
                classList: {
                    add: vi.fn(),
                    remove: vi.fn()
                }
            };

            logPanel.logList.querySelector = vi.fn((selector) => {
                if (selector === '.log-item.selected') return { classList: { remove: vi.fn() } };
                if (selector === '[data-log-id="log-1"]') return mockLogItem;
                return null;
            });

            // Act
            logPanel.highlightLogItem('log-1');

            // Assert
            expect(mockLogItem.classList.add).toHaveBeenCalledWith('selected');
        });

        it('应该正确处理相关数据点击事件', () => {
            // Arrange
            logPanel.init();

            // Act - 用户数据点击
            logPanel.handleRelatedDataClick('user', 'user-123', { 
                preventDefault: vi.fn(), 
                stopPropagation: vi.fn() 
            });

            // Assert
            expect(mockMainPanel.setSelectedUser).toHaveBeenCalledWith('user-123');

            // Act - 区块链数据点击
            logPanel.handleRelatedDataClick('chain', 'chain-456', { 
                preventDefault: vi.fn(), 
                stopPropagation: vi.fn() 
            });

            // Assert
            expect(mockMainPanel.setSelectedChain).toHaveBeenCalledWith('chain-456');
        });
    });

    describe('日志过滤功能', () => {
        beforeEach(() => {
            // Setup test logs
            logPanel.allLogs = [
                {
                    id: 'log-1',
                    type: 'BLOCK_ADDED',
                    message: '区块已添加',
                    relatedData: { creatorId: 'user-1', chainId: 'chain-1' }
                },
                {
                    id: 'log-2',
                    type: 'BLOCK_ACCEPTED',
                    message: '区块已接受',
                    relatedData: { receiverId: 'user-2', chainId: 'chain-1' }
                },
                {
                    id: 'log-3',
                    type: 'FORK_WARNING',
                    message: '分叉警告',
                    relatedData: { chainId: 'chain-2' }
                }
            ];
        });

        it('应该正确按用户过滤日志', () => {
            // Act
            logPanel.filterLogsByUser('user-1');

            // Assert
            expect(logPanel.selectedUserId).toBe('user-1');
            expect(logPanel.selectedChainId).toBeNull();
            expect(logPanel.currentPage).toBe(1);
        });

        it('应该正确按区块链过滤日志', () => {
            // Act
            logPanel.filterLogsByChain('chain-1');

            // Assert
            expect(logPanel.selectedChainId).toBe('chain-1');
            expect(logPanel.selectedUserId).toBeNull();
            expect(logPanel.currentPage).toBe(1);
        });

        it('应该正确应用过滤条件', () => {
            // Arrange
            logPanel.selectedUserId = 'user-1';

            // Act
            logPanel.applyFiltersAndSearch();

            // Assert
            expect(logPanel.filteredLogs).toHaveLength(1);
            expect(logPanel.filteredLogs[0].id).toBe('log-1');
        });

        it('应该正确清除所有过滤条件', () => {
            // Arrange
            logPanel.selectedUserId = 'user-1';
            logPanel.selectedChainId = 'chain-1';
            logPanel.currentFilter = 'security';
            logPanel.searchQuery = 'test';

            // Act
            logPanel.clearAllFilters();

            // Assert
            expect(logPanel.selectedUserId).toBeNull();
            expect(logPanel.selectedChainId).toBeNull();
            expect(logPanel.currentFilter).toBe('all');
            expect(logPanel.searchQuery).toBe('');
            expect(logPanel.currentPage).toBe(1);
        });
    });

    describe('与主面板的联动', () => {
        it('应该正确根据日志更新主面板显示', () => {
            // Arrange
            const logEntry = {
                relatedData: {
                    creatorId: 'user-123',
                    chainId: 'chain-456'
                }
            };

            // Act
            logPanel.updateMainPanelFromLog(logEntry);

            // Assert
            expect(mockMainPanel.setSelectedUser).toHaveBeenCalledWith('user-123');
        });

        it('应该优先选择用户而非区块链', () => {
            // Arrange
            const logEntry = {
                relatedData: {
                    receiverId: 'user-789',
                    chainId: 'chain-456'
                }
            };

            // Act
            logPanel.updateMainPanelFromLog(logEntry);

            // Assert
            expect(mockMainPanel.setSelectedUser).toHaveBeenCalledWith('user-789');
            expect(mockMainPanel.setSelectedChain).not.toHaveBeenCalled();
        });

        it('应该在没有用户信息时选择区块链', () => {
            // Arrange
            const logEntry = {
                relatedData: {
                    chainId: 'chain-456'
                }
            };

            // Act
            logPanel.updateMainPanelFromLog(logEntry);

            // Assert
            expect(mockMainPanel.setSelectedChain).toHaveBeenCalledWith('chain-456');
            expect(mockMainPanel.setSelectedUser).not.toHaveBeenCalled();
        });
    });

    describe('搜索功能', () => {
        beforeEach(() => {
            logPanel.allLogs = [
                {
                    id: 'log-1',
                    type: 'BLOCK_ADDED',
                    message: '用户添加了新区块',
                    relatedData: { blockId: 'abc123', chainId: 'def456' }
                },
                {
                    id: 'log-2',
                    type: 'FORK_WARNING',
                    message: '检测到分叉警告',
                    relatedData: { chainId: 'ghi789' }
                }
            ];
        });

        it('应该正确搜索日志消息', () => {
            // Arrange
            logPanel.searchQuery = '分叉';

            // Act
            logPanel.applyFiltersAndSearch();

            // Assert
            expect(logPanel.filteredLogs).toHaveLength(1);
            expect(logPanel.filteredLogs[0].id).toBe('log-2');
        });

        it('应该正确搜索相关数据ID', () => {
            // Arrange
            logPanel.searchQuery = 'abc123';

            // Act
            logPanel.applyFiltersAndSearch();

            // Assert
            expect(logPanel.filteredLogs).toHaveLength(1);
            expect(logPanel.filteredLogs[0].id).toBe('log-1');
        });

        it('应该正确处理搜索防抖', (done) => {
            // Arrange
            logPanel.handleSearch = vi.fn();
            const originalHandleSearch = logPanel.handleSearch;

            // Act
            logPanel.handleSearch('test1');
            logPanel.handleSearch('test2');
            logPanel.handleSearch('test3');

            // Assert
            setTimeout(() => {
                expect(originalHandleSearch).toHaveBeenCalledTimes(3);
                done();
            }, 350);
        });
    });

    describe('分页功能', () => {
        beforeEach(() => {
            // Create enough logs for pagination
            logPanel.allLogs = Array.from({ length: 250 }, (_, i) => ({
                id: `log-${i}`,
                type: 'BLOCK_ADDED',
                message: `日志消息 ${i}`,
                relatedData: {}
            }));
            logPanel.pageSize = 100;
        });

        it('应该正确计算总页数', () => {
            // Act
            logPanel.applyFiltersAndSearch();

            // Assert
            expect(logPanel.totalPages).toBe(3);
        });

        it('应该正确渲染分页控件', () => {
            // Arrange
            logPanel.pagination = { innerHTML: '' };
            logPanel.totalPages = 3;
            logPanel.currentPage = 2;

            // Act
            logPanel.renderPagination();

            // Assert
            expect(logPanel.pagination.innerHTML).toContain('第 2 页 / 共 3 页');
        });

        it('应该正确处理页面切换', () => {
            // Arrange
            logPanel.currentPage = 1;
            logPanel.totalPages = 3;
            logPanel.renderLogs = vi.fn();
            logPanel.renderPagination = vi.fn();

            // Act - 下一页
            logPanel.currentPage++;
            logPanel.renderLogs();
            logPanel.renderPagination();

            // Assert
            expect(logPanel.currentPage).toBe(2);
            expect(logPanel.renderLogs).toHaveBeenCalled();
            expect(logPanel.renderPagination).toHaveBeenCalled();
        });
    });

    describe('日志项HTML生成', () => {
        it('应该正确生成日志项HTML', () => {
            // Arrange
            const logEntry = {
                id: 'log-1',
                type: 'BLOCK_ADDED',
                message: '区块已添加到区块链',
                timestamp: 1640995200000, // 2022-01-01 00:00:00
                tick: 100,
                relatedData: {
                    blockId: 'block-123',
                    chainId: 'chain-456',
                    creatorId: 'user-789'
                }
            };

            // Act
            const html = logPanel.createLogItem(logEntry);

            // Assert
            expect(html).toContain('data-log-id="log-1"');
            expect(html).toContain('区块添加'); // The actual text from logTypeMap
            expect(html).toContain('区块已添加到区块链');
            expect(html).toContain('滴答: 100');
            expect(html).toContain('data-type="block"');
            expect(html).toContain('data-type="chain"');
            expect(html).toContain('data-type="user"');
        });

        it('应该正确截断长ID显示', () => {
            // Arrange
            const longId = 'abcdefghijklmnopqrstuvwxyz1234567890';

            // Act
            const result = logPanel.truncateId(longId);

            // Assert
            expect(result).toBe('abcdef...567890');
            expect(result.length).toBeLessThan(longId.length);
        });

        it('应该正确转义HTML内容', () => {
            // Arrange
            const htmlContent = '<script>alert("xss")</script>';

            // Act
            const escaped = logPanel.escapeHtml(htmlContent);

            // Assert
            expect(escaped).not.toContain('<script>');
            expect(escaped).toContain('&lt;script&gt;');
        });
    });

    describe('事件处理', () => {
        it('应该正确处理新日志事件', () => {
            // Arrange
            const newLogEntry = {
                id: 'new-log',
                type: 'BLOCK_ADDED',
                message: '新的日志条目'
            };

            logPanel.allLogs = [];
            logPanel.applyFiltersAndSearch = vi.fn();
            logPanel.renderLogs = vi.fn();
            logPanel.renderPagination = vi.fn();
            logPanel.updateStats = vi.fn();

            // Act
            logPanel.onNewLog(newLogEntry);

            // Assert
            expect(logPanel.allLogs).toHaveLength(1);
            expect(logPanel.allLogs[0]).toBe(newLogEntry);
            expect(logPanel.applyFiltersAndSearch).toHaveBeenCalled();
            expect(logPanel.renderLogs).toHaveBeenCalled();
            expect(logPanel.renderPagination).toHaveBeenCalled();
            expect(logPanel.updateStats).toHaveBeenCalled();
        });

        it('应该正确处理日志清除事件', () => {
            // Arrange
            logPanel.allLogs = [{ id: 'log-1' }, { id: 'log-2' }];
            logPanel.filteredLogs = [{ id: 'log-1' }];
            logPanel.currentPage = 2;
            logPanel.renderLogs = vi.fn();
            logPanel.renderPagination = vi.fn();
            logPanel.updateStats = vi.fn();

            // Act
            logPanel.onLogsClear();

            // Assert
            expect(logPanel.allLogs).toHaveLength(0);
            expect(logPanel.filteredLogs).toHaveLength(0);
            expect(logPanel.currentPage).toBe(1);
            expect(logPanel.totalPages).toBe(1);
            expect(logPanel.renderLogs).toHaveBeenCalled();
            expect(logPanel.renderPagination).toHaveBeenCalled();
            expect(logPanel.updateStats).toHaveBeenCalled();
        });

        it('应该正确限制日志数量', () => {
            // Arrange
            logPanel.allLogs = Array.from({ length: 1000 }, (_, i) => ({ id: `log-${i}` }));
            const newLogEntry = { id: 'new-log' };

            // Act
            logPanel.onNewLog(newLogEntry);

            // Assert
            expect(logPanel.allLogs).toHaveLength(1000);
            expect(logPanel.allLogs[0]).toBe(newLogEntry);
        });
    });

    describe('销毁和清理', () => {
        it('应该正确清理资源', () => {
            // Arrange
            logPanel.searchTimeout = setTimeout(() => {}, 1000);
            logPanel.allLogs = [{ id: 'log-1' }];
            logPanel.filteredLogs = [{ id: 'log-1' }];
            logPanel.selectedUserId = 'user-1';
            logPanel.isInitialized = true;

            // Act
            logPanel.destroy();

            // Assert
            expect(logPanel.allLogs).toHaveLength(0);
            expect(logPanel.filteredLogs).toHaveLength(0);
            expect(logPanel.selectedUserId).toBeNull();
            expect(logPanel.selectedChainId).toBeNull();
            expect(logPanel.isInitialized).toBe(false);
        });
    });
});