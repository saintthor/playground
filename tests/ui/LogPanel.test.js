/**
 * LogPanel 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock DOM
const mockDOM = () => {
    document.body.innerHTML = `
        <div id="log-panel"></div>
    `;
};

// Mock UIManager
const createMockUIManager = () => ({
    app: {
        logger: new Logger()
    },
    handleLogSelection: vi.fn(),
    mainPanel: {
        showUserDetails: vi.fn(),
        showChainDetails: vi.fn()
    }
});

describe('LogPanel', () => {
    let logPanel;
    let mockUIManager;

    beforeEach(() => {
        mockDOM();
        mockUIManager = createMockUIManager();
        logPanel = new LogPanel(mockUIManager);
    });

    afterEach(() => {
        if (logPanel) {
            logPanel.destroy();
        }
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    describe('初始化', () => {
        it('应该正确初始化LogPanel', () => {
            expect(logPanel.uiManager).toBe(mockUIManager);
            expect(logPanel.app).toBe(mockUIManager.app);
            expect(logPanel.isInitialized).toBe(false);
            expect(logPanel.pageSize).toBe(100);
            expect(logPanel.currentPage).toBe(1);
            expect(logPanel.currentFilter).toBe('all');
        });

        it('应该正确设置日志类型映射', () => {
            expect(logPanel.logTypeMap).toHaveProperty('BLOCK_ADDED');
            expect(logPanel.logTypeMap).toHaveProperty('BLOCK_ACCEPTED');
            expect(logPanel.logTypeMap).toHaveProperty('BLOCK_REJECTED');
            expect(logPanel.logTypeMap).toHaveProperty('FORK_WARNING');
            expect(logPanel.logTypeMap).toHaveProperty('USER_BLACKLISTED');
            
            expect(logPanel.logTypeMap.BLOCK_ADDED.category).toBe('block');
            expect(logPanel.logTypeMap.BLOCK_REJECTED.category).toBe('security');
        });

        it('应该在找不到容器时处理错误', () => {
            document.body.innerHTML = '';
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            
            logPanel.init();
            
            expect(consoleSpy).toHaveBeenCalledWith('LogPanel: 找不到日志面板容器');
            expect(logPanel.isInitialized).toBe(false);
            
            consoleSpy.mockRestore();
        });
    });

    describe('界面创建', () => {
        beforeEach(() => {
            logPanel.init();
        });

        it('应该创建完整的日志面板结构', () => {
            const container = document.getElementById('log-panel');
            
            expect(container.querySelector('.log-panel-header')).toBeTruthy();
            expect(container.querySelector('.log-panel-body')).toBeTruthy();
            expect(container.querySelector('.log-panel-footer')).toBeTruthy();
            
            expect(container.querySelector('#log-search-input')).toBeTruthy();
            expect(container.querySelector('#log-type-filter')).toBeTruthy();
            expect(container.querySelector('#log-list')).toBeTruthy();
            expect(container.querySelector('#log-pagination')).toBeTruthy();
        });

        it('应该正确设置DOM元素引用', () => {
            expect(logPanel.logList).toBeTruthy();
            expect(logPanel.pagination).toBeTruthy();
            expect(logPanel.filterControls).toBeTruthy();
            expect(logPanel.searchInput).toBeTruthy();
        });

        it('应该绑定事件监听器', () => {
            const searchInput = document.getElementById('log-search-input');
            const clearButton = document.getElementById('log-search-clear');
            const filterSelect = document.getElementById('log-type-filter');
            const clearFilterButton = document.getElementById('log-clear-filter');
            
            expect(searchInput).toBeTruthy();
            expect(clearButton).toBeTruthy();
            expect(filterSelect).toBeTruthy();
            expect(clearFilterButton).toBeTruthy();
        });
    });

    describe('日志显示', () => {
        beforeEach(() => {
            // 添加一些测试日志
            mockUIManager.app.logger.logBlockAdded('block1', 'chain1', 'user1', { tick: 1 });
            mockUIManager.app.logger.logBlockAccepted('block2', 'chain2', 'user2', { tick: 2 });
            mockUIManager.app.logger.logBlockRejected('block3', 'chain3', '时间验证失败', { tick: 3 });
            mockUIManager.app.logger.logForkWarning('chain4', ['block4', 'block5'], { tick: 4 });
            mockUIManager.app.logger.logUserBlacklisted('user3', '双花攻击', { tick: 5 });
            
            logPanel.init();
        });

        it('应该显示日志列表', () => {
            const logItems = logPanel.logList.querySelectorAll('.log-item');
            expect(logItems.length).toBeGreaterThan(0);
        });

        it('应该正确渲染日志项', () => {
            const firstLogItem = logPanel.logList.querySelector('.log-item');
            
            expect(firstLogItem.querySelector('.log-type')).toBeTruthy();
            expect(firstLogItem.querySelector('.log-time')).toBeTruthy();
            expect(firstLogItem.querySelector('.log-tick')).toBeTruthy();
            expect(firstLogItem.querySelector('.log-message')).toBeTruthy();
        });

        it('应该显示相关数据链接', () => {
            const relatedDataItems = logPanel.logList.querySelectorAll('.log-related-data');
            expect(relatedDataItems.length).toBeGreaterThan(0);
        });

        it('应该在没有日志时显示空状态', () => {
            mockUIManager.app.logger.clearLogs();
            logPanel.loadLogs();
            
            expect(logPanel.logList.innerHTML).toContain('暂无日志数据');
        });

        it('应该正确应用日志类型样式', () => {
            const logItems = logPanel.logList.querySelectorAll('.log-item');
            const blockLogItem = Array.from(logItems).find(item => 
                item.querySelector('.log-type-block')
            );
            const securityLogItem = Array.from(logItems).find(item => 
                item.querySelector('.log-type-security')
            );
            
            expect(blockLogItem).toBeTruthy();
            expect(securityLogItem).toBeTruthy();
        });
    });

    describe('分页功能', () => {
        beforeEach(() => {
            // 添加超过100条日志以测试分页
            for (let i = 1; i <= 150; i++) {
                mockUIManager.app.logger.logSystemInfo(`测试日志 ${i}`, { tick: i });
            }
            
            logPanel.init();
        });

        it('应该正确计算总页数', () => {
            expect(logPanel.totalPages).toBe(2); // 150条日志，每页100条，共2页
        });

        it('应该渲染分页控件', () => {
            const paginationControls = logPanel.pagination.querySelector('.pagination-controls');
            expect(paginationControls).toBeTruthy();
            
            const pageButtons = paginationControls.querySelectorAll('.pagination-btn');
            expect(pageButtons.length).toBeGreaterThan(0);
        });

        it('应该正确显示当前页信息', () => {
            const paginationInfo = logPanel.pagination.querySelector('.pagination-info');
            expect(paginationInfo.textContent).toContain('第 1 页，共 2 页');
        });

        it('应该能够跳转到指定页面', () => {
            logPanel.goToPage(2);
            
            expect(logPanel.currentPage).toBe(2);
            
            const paginationInfo = logPanel.pagination.querySelector('.pagination-info');
            expect(paginationInfo.textContent).toContain('第 2 页');
        });

        it('应该在只有一页时隐藏分页控件', () => {
            mockUIManager.app.logger.clearLogs();
            mockUIManager.app.logger.logSystemInfo('单条日志');
            logPanel.loadLogs();
            
            expect(logPanel.pagination.innerHTML).toBe('');
        });

        it('应该正确处理页面边界', () => {
            logPanel.goToPage(0); // 无效页面
            expect(logPanel.currentPage).toBe(1);
            
            logPanel.goToPage(999); // 超出范围
            expect(logPanel.currentPage).toBe(1);
        });
    });

    describe('过滤功能', () => {
        beforeEach(() => {
            // 添加不同类型的日志
            mockUIManager.app.logger.logBlockAdded('block1', 'chain1', 'user1');
            mockUIManager.app.logger.logBlockAccepted('block2', 'chain2', 'user2');
            mockUIManager.app.logger.logBlockRejected('block3', 'chain3', '验证失败');
            mockUIManager.app.logger.logForkWarning('chain4', ['block4', 'block5']);
            mockUIManager.app.logger.logUserBlacklisted('user3', '双花攻击');
            mockUIManager.app.logger.logNetworkEvent('CONNECTION', '节点连接');
            mockUIManager.app.logger.logValidationError('SIGNATURE', '签名错误');
            mockUIManager.app.logger.logSystemInfo('系统启动');
            
            logPanel.init();
        });

        it('应该能够按类型过滤日志', () => {
            logPanel.handleFilter('block');
            
            const blockLogs = logPanel.filteredLogs.filter(log => 
                logPanel.logTypeMap[log.type]?.category === 'block'
            );
            expect(logPanel.filteredLogs.length).toBe(blockLogs.length);
        });

        it('应该能够按安全事件过滤', () => {
            logPanel.handleFilter('security');
            
            const securityLogs = logPanel.filteredLogs.filter(log => 
                logPanel.logTypeMap[log.type]?.category === 'security'
            );
            expect(logPanel.filteredLogs.length).toBe(securityLogs.length);
        });

        it('应该能够按用户过滤日志', () => {
            logPanel.filterByUser('user1');
            
            const userLogs = logPanel.filteredLogs.filter(log => 
                log.relatedData.creatorId === 'user1' ||
                log.relatedData.receiverId === 'user1' ||
                log.relatedData.userId === 'user1'
            );
            expect(logPanel.filteredLogs.length).toBe(userLogs.length);
        });

        it('应该能够按区块链过滤日志', () => {
            logPanel.filterByChain('chain1');
            
            const chainLogs = logPanel.filteredLogs.filter(log => 
                log.relatedData.chainId === 'chain1'
            );
            expect(logPanel.filteredLogs.length).toBe(chainLogs.length);
        });

        it('应该能够清除过滤', () => {
            logPanel.handleFilter('block');
            expect(logPanel.filteredLogs.length).toBeLessThan(logPanel.allLogs.length);
            
            logPanel.clearFilter();
            expect(logPanel.filteredLogs.length).toBe(logPanel.allLogs.length);
            expect(logPanel.currentFilter).toBe('all');
        });

        it('应该在过滤后重置到第一页', () => {
            logPanel.currentPage = 2;
            logPanel.handleFilter('block');
            
            expect(logPanel.currentPage).toBe(1);
        });
    });

    describe('搜索功能', () => {
        beforeEach(() => {
            mockUIManager.app.logger.logBlockAdded('block123', 'chain456', 'user789');
            mockUIManager.app.logger.logSystemInfo('系统启动完成');
            mockUIManager.app.logger.logValidationError('SIGNATURE', '签名验证失败');
            
            logPanel.init();
        });

        it('应该能够搜索日志消息', () => {
            logPanel.handleSearch('系统启动');
            
            expect(logPanel.filteredLogs.length).toBe(1);
            expect(logPanel.filteredLogs[0].message).toContain('系统启动');
        });

        it('应该能够搜索区块ID', () => {
            logPanel.handleSearch('block123');
            
            expect(logPanel.filteredLogs.length).toBe(1);
            expect(logPanel.filteredLogs[0].relatedData.blockId).toBe('block123');
        });

        it('应该能够搜索用户ID', () => {
            logPanel.handleSearch('user789');
            
            expect(logPanel.filteredLogs.length).toBe(1);
            expect(logPanel.filteredLogs[0].relatedData.creatorId).toBe('user789');
        });

        it('应该支持不区分大小写搜索', () => {
            logPanel.handleSearch('BLOCK123');
            
            expect(logPanel.filteredLogs.length).toBe(1);
        });

        it('应该能够清除搜索', () => {
            logPanel.handleSearch('系统');
            expect(logPanel.filteredLogs.length).toBe(1);
            
            logPanel.clearSearch();
            expect(logPanel.filteredLogs.length).toBe(logPanel.allLogs.length);
            expect(logPanel.searchQuery).toBe('');
        });

        it('应该在搜索后重置到第一页', () => {
            logPanel.currentPage = 2;
            logPanel.handleSearch('系统');
            
            expect(logPanel.currentPage).toBe(1);
        });
    });

    describe('事件处理', () => {
        beforeEach(() => {
            logPanel.init();
        });

        it('应该处理新日志事件', () => {
            const initialCount = logPanel.allLogs.length;
            
            logPanel.onNewLog({
                id: 'new_log',
                type: 'SYSTEM_INFO',
                message: '新日志',
                timestamp: Date.now(),
                relatedData: {}
            });
            
            expect(logPanel.allLogs.length).toBe(initialCount + 1);
        });

        it('应该处理日志清空事件', () => {
            mockUIManager.app.logger.logSystemInfo('测试日志');
            logPanel.loadLogs();
            
            expect(logPanel.allLogs.length).toBeGreaterThan(0);
            
            logPanel.onLogsClear();
            
            expect(logPanel.allLogs.length).toBe(0);
            expect(logPanel.filteredLogs.length).toBe(0);
            expect(logPanel.currentPage).toBe(1);
        });

        it('应该处理日志项点击', () => {
            mockUIManager.app.logger.logSystemInfo('测试日志');
            logPanel.loadLogs();
            
            const logItem = logPanel.logList.querySelector('.log-item');
            logPanel.handleLogItemClick(logItem);
            
            expect(logItem.classList.contains('selected')).toBe(true);
            expect(mockUIManager.handleLogSelection).toHaveBeenCalled();
        });

        it('应该处理相关数据点击', () => {
            mockUIManager.app.logger.logBlockAdded('block1', 'chain1', 'user1');
            logPanel.loadLogs();
            
            const userDataItem = logPanel.logList.querySelector('[data-type="user"]');
            if (userDataItem) {
                logPanel.handleRelatedDataClick(userDataItem);
                expect(mockUIManager.mainPanel.showUserDetails).toHaveBeenCalled();
            }
            
            const chainDataItem = logPanel.logList.querySelector('[data-type="chain"]');
            if (chainDataItem) {
                logPanel.handleRelatedDataClick(chainDataItem);
                expect(mockUIManager.mainPanel.showChainDetails).toHaveBeenCalled();
            }
        });
    });

    describe('统计信息', () => {
        beforeEach(() => {
            mockUIManager.app.logger.logBlockAdded('block1', 'chain1', 'user1');
            mockUIManager.app.logger.logBlockAccepted('block2', 'chain2', 'user2');
            mockUIManager.app.logger.logBlockRejected('block3', 'chain3', '验证失败');
            
            logPanel.init();
        });

        it('应该正确显示总日志数', () => {
            const totalCountElement = document.getElementById('log-total-count');
            expect(totalCountElement.textContent).toContain('总计: 3 条');
        });

        it('应该正确显示过滤后的日志数', () => {
            const filteredCountElement = document.getElementById('log-filtered-count');
            expect(filteredCountElement.textContent).toContain('显示: 3 条');
        });

        it('应该在过滤后更新统计信息', () => {
            logPanel.handleFilter('block');
            
            const filteredCountElement = document.getElementById('log-filtered-count');
            expect(filteredCountElement.textContent).toContain('显示: 2 条');
        });
    });

    describe('工具方法', () => {
        it('应该正确截断ID', () => {
            expect(logPanel.truncateId('1234567890abcdef')).toBe('12345678...');
            expect(logPanel.truncateId('short')).toBe('short');
            expect(logPanel.truncateId('')).toBe('');
            expect(logPanel.truncateId(null)).toBe('');
        });

        it('应该正确转义HTML', () => {
            expect(logPanel.escapeHtml('<script>alert("xss")</script>'))
                .toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
            expect(logPanel.escapeHtml('normal text')).toBe('normal text');
        });
    });

    describe('销毁', () => {
        beforeEach(() => {
            logPanel.init();
        });

        it('应该正确销毁LogPanel', () => {
            logPanel.destroy();
            
            expect(logPanel.isInitialized).toBe(false);
        });

        it('应该清除搜索定时器', () => {
            logPanel.searchTimeout = setTimeout(() => {}, 1000);
            
            logPanel.destroy();
            
            // 定时器应该被清除，但我们无法直接测试这一点
            // 这里主要确保destroy方法不会抛出错误
            expect(logPanel.isInitialized).toBe(false);
        });
    });

    describe('边界情况', () => {
        it('应该处理Logger未初始化的情况', () => {
            mockUIManager.app.logger = null;
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            
            logPanel.init();
            logPanel.loadLogs();
            
            expect(consoleSpy).toHaveBeenCalledWith('LogPanel: Logger 未初始化');
            
            consoleSpy.mockRestore();
        });

        it('应该处理空的相关数据', () => {
            mockUIManager.app.logger.log('TEST_TYPE', '测试消息', {});
            logPanel.init();
            
            const logItem = logPanel.logList.querySelector('.log-item');
            expect(logItem).toBeTruthy();
        });

        it('应该处理未知的日志类型', () => {
            mockUIManager.app.logger.log('UNKNOWN_TYPE', '未知类型日志', {});
            logPanel.init();
            
            const logItem = logPanel.logList.querySelector('.log-item');
            expect(logItem).toBeTruthy();
            expect(logItem.querySelector('.log-type-default')).toBeTruthy();
        });

        it('应该在当前页超出范围时重置页码', () => {
            // 添加多页日志
            for (let i = 1; i <= 150; i++) {
                mockUIManager.app.logger.logSystemInfo(`日志 ${i}`);
            }
            
            logPanel.init();
            logPanel.currentPage = 2;
            
            // 应用过滤，使结果只有一页
            logPanel.handleFilter('nonexistent');
            
            expect(logPanel.currentPage).toBe(1);
        });
    });
});