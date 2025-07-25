import { VirtualScroll } from './VirtualScroll.js';

/**
 * LogPanel - 日志面板
 * 负责显示系统日志、支持过滤和分页功能
 * 使用虚拟滚动优化大量数据的渲染性能
 */
export class LogPanel {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.app = uiManager.app;
        this.isInitialized = false;
        
        // 日志数据
        this.allLogs = []; // 所有日志
        this.filteredLogs = []; // 过滤后的日志
        this.currentFilter = 'all'; // 当前过滤器
        this.selectedUserId = null; // 选中的用户ID
        this.selectedChainId = null; // 选中的区块链ID
        
        // 分页设置
        this.pageSize = 100;
        this.currentPage = 1;
        this.totalPages = 1;
        
        // 搜索设置
        this.searchQuery = '';
        this.searchTimeout = null;
        
        // 日志类型映射
        this.logTypeMap = {
            'BLOCK_ADDED': { text: '区块添加', class: 'log-type-block', category: 'block' },
            'BLOCK_ACCEPTED': { text: '区块接受', class: 'log-type-block', category: 'block' },
            'BLOCK_REJECTED': { text: '区块拒绝', class: 'log-type-security', category: 'security' },
            'FORK_WARNING': { text: '分叉警告', class: 'log-type-warning', category: 'security' },
            'USER_BLACKLISTED': { text: '用户拉黑', class: 'log-type-security', category: 'security' },
            'NETWORK_EVENT': { text: '网络事件', class: 'log-type-network', category: 'network' },
            'VALIDATION_ERROR': { text: '验证错误', class: 'log-type-error', category: 'error' },
            'SYSTEM_INFO': { text: '系统信息', class: 'log-type-info', category: 'info' }
        };
        
        // DOM 元素引用
        this.container = null;
        this.logList = null;
        this.pagination = null;
        this.filterControls = null;
        this.searchInput = null;
        
        // 虚拟滚动
        this.virtualScroll = null;
        this.useVirtualScroll = true; // 是否使用虚拟滚动
        this.virtualScrollThreshold = 500; // 超过此数量时启用虚拟滚动
    }

    /**
     * 初始化日志面板
     */
    init() {
        if (this.isInitialized) return;
        
        this.container = document.getElementById('log-panel');
        if (!this.container) {
            console.error('LogPanel: 找不到日志面板容器');
            return;
        }
        
        this.createLogPanelStructure();
        this.bindEvents();
        this.loadLogs();
        
        this.isInitialized = true;
        console.log('LogPanel 初始化完成');
    }

    /**
     * 创建日志面板结构
     */
    createLogPanelStructure() {
        this.container.innerHTML = `
            <div class="log-panel-header">
                <h3>系统日志</h3>
                <div class="log-controls">
                    <div class="log-search">
                        <input type="text" id="log-search-input" placeholder="搜索日志..." />
                        <button id="log-search-clear" title="清除搜索">×</button>
                    </div>
                    <div class="log-filters">
                        <select id="log-type-filter">
                            <option value="all">所有类型</option>
                            <option value="block">区块操作</option>
                            <option value="security">安全事件</option>
                            <option value="network">网络事件</option>
                            <option value="error">错误信息</option>
                            <option value="info">系统信息</option>
                        </select>
                        <button id="log-clear-filter" title="清除过滤">清除过滤</button>
                    </div>
                </div>
            </div>
            <div class="log-panel-body">
                <div id="log-list" class="log-list"></div>
                <div id="log-pagination" class="log-pagination"></div>
            </div>
            <div class="log-panel-footer">
                <div class="log-stats">
                    <span id="log-total-count">总计: 0 条</span>
                    <span id="log-filtered-count">显示: 0 条</span>
                </div>
            </div>
        `;
        
        // 获取DOM元素引用
        this.logList = document.getElementById('log-list');
        this.pagination = document.getElementById('log-pagination');
        this.filterControls = document.getElementById('log-type-filter');
        this.searchInput = document.getElementById('log-search-input');
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 搜索功能
        this.searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        document.getElementById('log-search-clear').addEventListener('click', () => {
            this.clearSearch();
        });
        
        // 过滤功能
        this.filterControls.addEventListener('change', (e) => {
            this.handleFilter(e.target.value);
        });
        
        document.getElementById('log-clear-filter').addEventListener('click', () => {
            this.clearFilter();
        });
        
        // 监听Logger的日志更新事件
        if (this.app.logger) {
            this.app.logger.addEventListener('log', (logEntry) => {
                this.onNewLog(logEntry);
            });
            
            this.app.logger.addEventListener('clear', () => {
                this.onLogsClear();
            });
        }
    }

    /**
     * 加载日志数据
     */
    loadLogs() {
        if (!this.app.logger) {
            console.warn('LogPanel: Logger 未初始化');
            return;
        }
        
        // 获取最近的日志
        const result = this.app.logger.getLogs({}, this.currentPage, this.pageSize);
        this.allLogs = result.logs;
        this.applyFiltersAndSearch();
        this.renderLogs();
        this.renderPagination(result.pagination);
        this.updateStats();
    }

    /**
     * 应用过滤和搜索
     */
    applyFiltersAndSearch() {
        let logs = [...this.allLogs];
        
        // 应用类型过滤
        if (this.currentFilter !== 'all') {
            logs = logs.filter(log => {
                const logType = this.logTypeMap[log.type];
                return logType && logType.category === this.currentFilter;
            });
        }
        
        // 应用用户过滤
        if (this.selectedUserId) {
            logs = logs.filter(log => 
                log.relatedData.creatorId === this.selectedUserId ||
                log.relatedData.receiverId === this.selectedUserId ||
                log.relatedData.userId === this.selectedUserId
            );
        }
        
        // 应用区块链过滤
        if (this.selectedChainId) {
            logs = logs.filter(log => 
                log.relatedData.chainId === this.selectedChainId
            );
        }
        
        // 应用搜索过滤
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            logs = logs.filter(log => 
                log.message.toLowerCase().includes(query) ||
                log.type.toLowerCase().includes(query) ||
                (log.relatedData.blockId && log.relatedData.blockId.toLowerCase().includes(query)) ||
                (log.relatedData.chainId && log.relatedData.chainId.toLowerCase().includes(query)) ||
                (log.relatedData.userId && log.relatedData.userId.toLowerCase().includes(query))
            );
        }
        
        this.filteredLogs = logs;
        this.totalPages = Math.ceil(logs.length / this.pageSize);
        
        // 如果当前页超出范围，重置到第一页
        if (this.currentPage > this.totalPages && this.totalPages > 0) {
            this.currentPage = 1;
        }
    }

    /**
     * 渲染日志列表（支持虚拟滚动优化）
     */
    renderLogs() {
        if (!this.logList) return;
        
        // 如果数据量大且启用虚拟滚动，使用虚拟滚动渲染
        if (this.useVirtualScroll && this.filteredLogs.length > this.virtualScrollThreshold) {
            this.renderWithVirtualScroll();
        } else {
            this.renderWithPagination();
        }
    }

    /**
     * 使用虚拟滚动渲染
     */
    renderWithVirtualScroll() {
        // 如果虚拟滚动未初始化，创建它
        if (!this.virtualScroll) {
            this.initVirtualScroll();
        }
        
        // 隐藏分页控件
        if (this.pagination) {
            this.pagination.style.display = 'none';
        }
        
        // 设置数据到虚拟滚动
        this.virtualScroll.setData(this.filteredLogs);
    }

    /**
     * 使用传统分页渲染
     */
    renderWithPagination() {
        // 销毁虚拟滚动（如果存在）
        if (this.virtualScroll) {
            this.virtualScroll.destroy();
            this.virtualScroll = null;
        }
        
        // 显示分页控件
        if (this.pagination) {
            this.pagination.style.display = 'block';
        }
        
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const logsToShow = this.filteredLogs.slice(startIndex, endIndex);
        
        if (logsToShow.length === 0) {
            this.logList.innerHTML = '<div class="log-empty">暂无日志数据</div>';
            return;
        }
        
        // 使用 DocumentFragment 优化 DOM 操作
        const fragment = document.createDocumentFragment();
        logsToShow.forEach(log => {
            const logElement = this.createLogElement(log);
            fragment.appendChild(logElement);
        });
        
        this.logList.innerHTML = '';
        this.logList.appendChild(fragment);
        
        // 绑定日志项点击事件
        this.bindLogItemEvents();
    }

    /**
     * 初始化虚拟滚动
     */
    initVirtualScroll() {
        this.virtualScroll = new VirtualScroll({
            container: this.logList,
            itemHeight: 80, // 每个日志项的高度
            bufferSize: 10, // 缓冲区大小
            renderItem: (log, index) => this.createLogElement(log),
            getItemKey: (log, index) => log.id || index
        });
        
        console.log('虚拟滚动已初始化');
    }

    /**
     * 创建日志项DOM元素（用于虚拟滚动）
     */
    createLogElement(log) {
        const logType = this.logTypeMap[log.type] || { text: log.type, class: 'log-type-default', category: 'default' };
        const timestamp = new Date(log.timestamp).toLocaleTimeString();
        const relatedData = log.relatedData || {};
        
        // 创建日志项容器
        const logItem = document.createElement('div');
        logItem.className = `log-item ${logType.class}`;
        logItem.setAttribute('data-log-id', log.id);
        
        // 创建日志头部
        const logHeader = document.createElement('div');
        logHeader.className = 'log-header';
        logHeader.innerHTML = `
            <span class="log-type">${logType.text}</span>
            <span class="log-time">${timestamp}</span>
            <span class="log-tick">滴答: ${log.tick || 0}</span>
        `;
        
        // 创建日志消息
        const logMessage = document.createElement('div');
        logMessage.className = 'log-message';
        logMessage.textContent = log.message;
        
        // 创建相关数据
        const logRelated = document.createElement('div');
        logRelated.className = 'log-related';
        
        if (relatedData.blockId) {
            const blockSpan = document.createElement('span');
            blockSpan.className = 'log-related-data';
            blockSpan.setAttribute('data-type', 'block');
            blockSpan.setAttribute('data-id', relatedData.blockId);
            blockSpan.textContent = `区块: ${this.truncateId(relatedData.blockId)}`;
            logRelated.appendChild(blockSpan);
        }
        
        if (relatedData.chainId) {
            const chainSpan = document.createElement('span');
            chainSpan.className = 'log-related-data';
            chainSpan.setAttribute('data-type', 'chain');
            chainSpan.setAttribute('data-id', relatedData.chainId);
            chainSpan.textContent = `链: ${this.truncateId(relatedData.chainId)}`;
            logRelated.appendChild(chainSpan);
        }
        
        if (relatedData.creatorId) {
            const creatorSpan = document.createElement('span');
            creatorSpan.className = 'log-related-data';
            creatorSpan.setAttribute('data-type', 'user');
            creatorSpan.setAttribute('data-id', relatedData.creatorId);
            creatorSpan.textContent = `创建者: ${this.truncateId(relatedData.creatorId)}`;
            logRelated.appendChild(creatorSpan);
        }
        
        if (relatedData.receiverId) {
            const receiverSpan = document.createElement('span');
            receiverSpan.className = 'log-related-data';
            receiverSpan.setAttribute('data-type', 'user');
            receiverSpan.setAttribute('data-id', relatedData.receiverId);
            receiverSpan.textContent = `接收者: ${this.truncateId(relatedData.receiverId)}`;
            logRelated.appendChild(receiverSpan);
        }
        
        if (relatedData.userId) {
            const userSpan = document.createElement('span');
            userSpan.className = 'log-related-data';
            userSpan.setAttribute('data-type', 'user');
            userSpan.setAttribute('data-id', relatedData.userId);
            userSpan.textContent = `用户: ${this.truncateId(relatedData.userId)}`;
            logRelated.appendChild(userSpan);
        }
        
        // 组装日志项
        logItem.appendChild(logHeader);
        logItem.appendChild(logMessage);
        if (logRelated.children.length > 0) {
            logItem.appendChild(logRelated);
        }
        
        return logItem;
    }

    /**
     * 创建日志项HTML（用于传统渲染）
     */
    createLogItem(log) {
        const logType = this.logTypeMap[log.type] || { text: log.type, class: 'log-type-default', category: 'default' };
        const timestamp = new Date(log.timestamp).toLocaleTimeString();
        const relatedData = log.relatedData || {};
        
        // 构建相关数据显示
        let relatedInfo = '';
        if (relatedData.blockId) {
            relatedInfo += `<span class="log-related-data" data-type="block" data-id="${relatedData.blockId}">区块: ${this.truncateId(relatedData.blockId)}</span>`;
        }
        if (relatedData.chainId) {
            relatedInfo += `<span class="log-related-data" data-type="chain" data-id="${relatedData.chainId}">链: ${this.truncateId(relatedData.chainId)}</span>`;
        }
        if (relatedData.creatorId) {
            relatedInfo += `<span class="log-related-data" data-type="user" data-id="${relatedData.creatorId}">创建者: ${this.truncateId(relatedData.creatorId)}</span>`;
        }
        if (relatedData.receiverId) {
            relatedInfo += `<span class="log-related-data" data-type="user" data-id="${relatedData.receiverId}">接收者: ${this.truncateId(relatedData.receiverId)}</span>`;
        }
        if (relatedData.userId) {
            relatedInfo += `<span class="log-related-data" data-type="user" data-id="${relatedData.userId}">用户: ${this.truncateId(relatedData.userId)}</span>`;
        }
        
        return `
            <div class="log-item ${logType.class}" data-log-id="${log.id}">
                <div class="log-header">
                    <span class="log-type">${logType.text}</span>
                    <span class="log-time">${timestamp}</span>
                    <span class="log-tick">滴答: ${log.tick || 0}</span>
                </div>
                <div class="log-message">${this.escapeHtml(log.message)}</div>
                ${relatedInfo ? `<div class="log-related">${relatedInfo}</div>` : ''}
            </div>
        `;
    }

    /**
     * 绑定日志项点击事件
     */
    bindLogItemEvents() {
        if (!this.logList) return;
        
        // 绑定日志项点击事件
        this.logList.addEventListener('click', (event) => {
            const logItem = event.target.closest('.log-item');
            if (logItem) {
                const logId = logItem.dataset.logId;
                this.handleLogClick(logId, event);
                return;
            }
            
            // 处理相关数据点击
            const relatedData = event.target.closest('.log-related-data');
            if (relatedData) {
                const dataType = relatedData.dataset.type;
                const dataId = relatedData.dataset.id;
                this.handleRelatedDataClick(dataType, dataId, event);
                return;
            }
        });
    }

    /**
     * 处理日志项点击事件
     */
    handleLogClick(logId, event) {
        event.preventDefault();
        event.stopPropagation();
        
        // 查找对应的日志条目
        const logEntry = this.allLogs.find(log => log.id === logId);
        if (!logEntry) {
            console.warn('未找到日志条目:', logId);
            return;
        }
        
        console.log('日志点击:', logEntry);
        
        // 通知UIManager处理日志选择
        if (this.uiManager && this.uiManager.handleLogClick) {
            this.uiManager.handleLogClick(logId, logEntry);
        }
        
        // 通知应用处理日志选择
        if (this.app && this.app.handleLogSelection) {
            this.app.handleLogSelection(logId, logEntry);
        }
        
        // 高亮选中的日志项
        this.highlightLogItem(logId);
        
        // 根据日志相关数据更新主面板显示
        this.updateMainPanelFromLog(logEntry);
    }

    /**
     * 处理相关数据点击事件
     */
    handleRelatedDataClick(dataType, dataId, event) {
        event.preventDefault();
        event.stopPropagation();
        
        console.log('相关数据点击:', { dataType, dataId });
        
        // 根据数据类型进行不同处理
        switch (dataType) {
            case 'user':
                this.handleUserDataClick(dataId);
                break;
            case 'chain':
                this.handleChainDataClick(dataId);
                break;
            case 'block':
                this.handleBlockDataClick(dataId);
                break;
            default:
                console.warn('未知的数据类型:', dataType);
        }
    }

    /**
     * 处理用户数据点击
     */
    handleUserDataClick(userId) {
        // 通知主面板选择用户
        if (this.uiManager && this.uiManager.panels && this.uiManager.panels.main) {
            this.uiManager.panels.main.setSelectedUser(userId);
        }
        
        // 过滤显示相关日志
        this.filterLogsByUser(userId);
        
        // 通知应用
        if (this.app && this.app.handleUserSelection) {
            this.app.handleUserSelection(userId);
        }
    }

    /**
     * 处理区块链数据点击
     */
    handleChainDataClick(chainId) {
        // 通知主面板选择区块链
        if (this.uiManager && this.uiManager.panels && this.uiManager.panels.main) {
            this.uiManager.panels.main.setSelectedChain(chainId);
        }
        
        // 过滤显示相关日志
        this.filterLogsByChain(chainId);
        
        // 通知应用
        if (this.app && this.app.handleChainSelection) {
            this.app.handleChainSelection(chainId);
        }
    }

    /**
     * 处理区块数据点击
     */
    handleBlockDataClick(blockId) {
        // 查找包含该区块的区块链
        const logEntry = this.allLogs.find(log => 
            log.relatedData && log.relatedData.blockId === blockId
        );
        
        if (logEntry && logEntry.relatedData.chainId) {
            this.handleChainDataClick(logEntry.relatedData.chainId);
        }
        
        console.log('区块数据点击:', blockId);
    }

    /**
     * 高亮选中的日志项
     */
    highlightLogItem(logId) {
        // 移除之前的高亮
        const previousHighlight = this.logList.querySelector('.log-item.selected');
        if (previousHighlight) {
            previousHighlight.classList.remove('selected');
        }
        
        // 添加新的高亮
        const logItem = this.logList.querySelector(`[data-log-id="${logId}"]`);
        if (logItem) {
            logItem.classList.add('selected');
        }
    }

    /**
     * 根据日志更新主面板显示
     */
    updateMainPanelFromLog(logEntry) {
        if (!logEntry.relatedData) return;
        
        const { creatorId, receiverId, userId, chainId } = logEntry.relatedData;
        
        // 优先选择用户
        if (creatorId || receiverId || userId) {
            const targetUserId = creatorId || receiverId || userId;
            if (this.uiManager && this.uiManager.panels && this.uiManager.panels.main) {
                this.uiManager.panels.main.setSelectedUser(targetUserId);
            }
        }
        // 其次选择区块链
        else if (chainId) {
            if (this.uiManager && this.uiManager.panels && this.uiManager.panels.main) {
                this.uiManager.panels.main.setSelectedChain(chainId);
            }
        }
    }

    /**
     * 按用户过滤日志
     */
    filterLogsByUser(userId) {
        this.selectedUserId = userId;
        this.selectedChainId = null; // 清除区块链过滤
        this.currentPage = 1; // 重置到第一页
        this.applyFiltersAndSearch();
        this.renderLogs();
        this.renderPagination();
        this.updateStats();
        
        console.log('按用户过滤日志:', userId);
    }

    /**
     * 按区块链过滤日志
     */
    filterLogsByChain(chainId) {
        this.selectedChainId = chainId;
        this.selectedUserId = null; // 清除用户过滤
        this.currentPage = 1; // 重置到第一页
        this.applyFiltersAndSearch();
        this.renderLogs();
        this.renderPagination();
        this.updateStats();
        
        console.log('按区块链过滤日志:', chainId);
    }

    /**
     * 清除所有过滤
     */
    clearAllFilters() {
        this.selectedUserId = null;
        this.selectedChainId = null;
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.currentPage = 1;
        
        // 重置UI控件
        if (this.filterControls) {
            this.filterControls.value = 'all';
        }
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        
        this.applyFiltersAndSearch();
        this.renderLogs();
        this.renderPagination();
        this.updateStats();
        
        console.log('已清除所有过滤条件');
    }

    /**
     * 渲染分页控件
     */
    renderPagination(paginationInfo) {
        if (!this.pagination) return;
        
        const totalPages = this.totalPages || 1;
        const currentPage = this.currentPage || 1;
        
        let html = '<div class="pagination-controls">';
        
        // 上一页按钮
        const prevDisabled = currentPage <= 1;
        html += `<button class="btn btn-sm btn-secondary" id="log-prev-page" ${prevDisabled ? 'disabled' : ''}>上一页</button>`;
        
        // 页码信息
        html += `<span class="page-info">第 ${currentPage} 页 / 共 ${totalPages} 页</span>`;
        
        // 下一页按钮
        const nextDisabled = currentPage >= totalPages;
        html += `<button class="btn btn-sm btn-secondary" id="log-next-page" ${nextDisabled ? 'disabled' : ''}>下一页</button>`;
        
        html += '</div>';
        
        this.pagination.innerHTML = html;
        
        // 绑定分页事件
        this.bindPaginationEvents();
    }

    /**
     * 绑定分页事件
     */
    bindPaginationEvents() {
        const prevBtn = document.getElementById('log-prev-page');
        const nextBtn = document.getElementById('log-next-page');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderLogs();
                    this.renderPagination();
                }
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.renderLogs();
                    this.renderPagination();
                }
            });
        }
    }

    /**
     * 处理搜索
     */
    handleSearch(query) {
        // 防抖处理
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        this.searchTimeout = setTimeout(() => {
            this.searchQuery = query.trim();
            this.currentPage = 1; // 重置到第一页
            this.applyFiltersAndSearch();
            this.renderLogs();
            this.renderPagination();
            this.updateStats();
        }, 300);
    }

    /**
     * 清除搜索
     */
    clearSearch() {
        this.searchQuery = '';
        this.searchInput.value = '';
        this.currentPage = 1;
        this.applyFiltersAndSearch();
        this.renderLogs();
        this.renderPagination();
        this.updateStats();
    }

    /**
     * 处理过滤
     */
    handleFilter(filterType) {
        this.currentFilter = filterType;
        this.currentPage = 1; // 重置到第一页
        this.applyFiltersAndSearch();
        this.renderLogs();
        this.renderPagination();
        this.updateStats();
    }

    /**
     * 清除过滤
     */
    clearFilter() {
        this.currentFilter = 'all';
        this.filterControls.value = 'all';
        this.currentPage = 1;
        this.applyFiltersAndSearch();
        this.renderLogs();
        this.renderPagination();
        this.updateStats();
    }

    /**
     * 处理新日志事件
     */
    onNewLog(logEntry) {
        this.allLogs.unshift(logEntry); // 添加到开头
        
        // 限制日志数量，保持最近的1000条
        if (this.allLogs.length > 1000) {
            this.allLogs = this.allLogs.slice(0, 1000);
        }
        
        this.applyFiltersAndSearch();
        this.renderLogs();
        this.renderPagination();
        this.updateStats();
    }

    /**
     * 处理日志清除事件
     */
    onLogsClear() {
        this.allLogs = [];
        this.filteredLogs = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.renderLogs();
        this.renderPagination();
        this.updateStats();
    }

    /**
     * 更新统计信息
     */
    updateStats() {
        const totalCountElement = document.getElementById('log-total-count');
        const filteredCountElement = document.getElementById('log-filtered-count');
        
        if (totalCountElement) {
            totalCountElement.textContent = `总计: ${this.allLogs.length} 条`;
        }
        
        if (filteredCountElement) {
            filteredCountElement.textContent = `显示: ${this.filteredLogs.length} 条`;
        }
    }

    /**
     * 截断ID显示
     */
    truncateId(id) {
        if (!id || id.length <= 12) {
            return id || 'N/A';
        }
        return `${id.substring(0, 6)}...${id.substring(id.length - 6)}`;
    }

    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 获取日志数据
     */
    getLogs(filter = {}) {
        return this.app.logger ? this.app.logger.getLogs(filter) : { logs: [], pagination: {} };
    }

    /**
     * 刷新日志显示
     */
    refresh() {
        this.loadLogs();
    }

    /**
     * 销毁日志面板
     */
    destroy() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        this.allLogs = [];
        this.filteredLogs = [];
        this.selectedUserId = null;
        this.selectedChainId = null;
        this.isInitialized = false;
        
        console.log('LogPanel 已销毁');
    }
}