/**
 * LogPanel - 日志面板
 * 负责显示系统操作日志
 */
class LogPanel {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.app = uiManager.app;
        window.LogPanel = this;
        this.isInitialized = false;
        this.logs = [];
        this.maxLogs = 1000;
        this.currentTab = 'all';
        this.pendingLogs = [];
    }
    
    init() {
        try {
            this.render();
            this.bindEvents();
            
            // 立即设置活跃标签页，不要等待
            this.switchTab( 'all' );
            
            this.isInitialized = true;
            
            // 处理待处理的日志
            this.pendingLogs.forEach(log => {
                this.AddLog( log );
            });
            this.pendingLogs = [];
            
            console.log('LogPanel 初始化完成');
        } catch (error) {
            console.error('LogPanel 初始化失败:', error);
        }
    }
    
    render() {
        const container = document.getElementById('log-panel');
        if (!container) {
            console.error('日志面板容器未找到');
            return;
        }
        
        // Always render the full content, let CSS handle visibility
        // The minimized state is controlled by CSS display properties
        const panelContent = container.querySelector('.panel-content');
        if (!panelContent) {
            console.error('日志面板内容容器未找到');
            return;
        }
        
        panelContent.innerHTML = `
            <div class="log-header">
                <h3 data-text="log_panel">系统日志</h3>
                <div class="log-controls">
                    <!--button class="btn btn-sm btn-secondary" id="clear-logs">清空日志</button-->
                    <button class="btn btn-sm btn-info" id="export-logs" data-text="export_logs">导出日志</button>
                </div>
            </div>
            <div class="log-tabs">
                <ul class="nav nav-tabs" id="log-tabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="all-logs-tab" data-tab="all" type="button" role="tab" data-text="all_logs">
                            所有日志
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="node-logs-tab" data-tab="node" type="button" role="tab" data-text="node_logs">
                            节点日志
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="user-logs-tab" data-tab="user" type="button" role="tab" data-text="user_logs">
                            用户日志
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="blockchain-logs-tab" data-tab="blockchain" type="button" role="tab" data-text="blockchain_logs">
                            区块链日志
                        </button>
                    </li>
                </ul>
            </div>
            <div class="log-content">
                <div class="tab-content" id="log-tab-content">
                    <div class="tab-pane active" id="all-logs-content">
                        <div class="log-list" id="all-logs-list">
                            <div class="log-placeholder" data-text="no_logs">暂无日志信息</div>
                        </div>
                    </div>
                    <div class="tab-pane" id="node-logs-content">
                        <div class="log-list" id="node-logs-list">
                            <div class="log-placeholder" data-text="no_node_logs">暂无节点日志</div>
                        </div>
                    </div>
                    <div class="tab-pane" id="user-logs-content">
                        <div class="log-list" id="user-logs-list">
                            <div class="log-placeholder" data-text="no_user_logs">暂无用户日志</div>
                        </div>
                    </div>
                    <div class="tab-pane" id="blockchain-logs-content">
                        <div class="log-list" id="blockchain-logs-list">
                            <div class="log-placeholder" data-text="no_blockchain_logs">暂无区块链日志</div>
                        </div>
                    </div>
                    <div class="tab-pane" id="filter-logs-content">
                        <div class="log-list" id="filter-logs-list"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    bindEvents() {
        // Always bind events since content is always rendered (CSS controls visibility)
        const clearBtn = document.getElementById('clear-logs');
        const exportBtn = document.getElementById('export-logs');
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearLogs());
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportLogs());
        }
        
        // 绑定标签页切换事件
        const tabButtons = document.querySelectorAll('#log-tabs .nav-link');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = button.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }
    
    AddLog( log ) // keys: dida, peer, user, blockchain, block, content, category, level
    {
        //console.log( 'AddLog called with:', log );
        if( !this.isInitialized )
        {
            this.pendingLogs.push( log );
            return;
        }
        
        this.logs.push( log );
        
        // 限制日志数量
        if( this.logs.length > this.maxLogs )
        {
            this.logs.shift();
        }
        
        this.renderLogEntry( log );
        this.scrollToBottom(); 
    }

    
    /**
     * 切换日志标签页
     * @param {string} tabName - 标签页名称 (all, node, user, blockchain)
     */
    switchTab(tabName) {
        // 更新标签页按钮状态
        const tabButtons = document.querySelectorAll('#log-tabs .nav-link');
        tabButtons.forEach(button => {
            button.classList.remove('active');
            if (button.getAttribute('data-tab') === tabName) {
                button.classList.add('active');
            }
        });
        
        // 更新标签页内容显示
        const tabPanes = document.querySelectorAll('#log-tab-content .tab-pane');
        tabPanes.forEach(pane => {
            pane.classList.remove('active');
        });
        
        const activePane = document.getElementById(`${tabName}-logs-content`);
        if (activePane) {
            activePane.classList.add('active');
        }
        
        this.currentTab = tabName;
        this.refreshCurrentTab();
    }
    
    /**
     * 刷新当前标签页的日志显示
     */
    refreshCurrentTab() {
        const currentTab = this.currentTab || 'all';
        const logList = document.getElementById(`${currentTab}-logs-list`);
        
        if (!logList) {
            console.error( 'refreshCurrentTab: logList not found for:', currentTab );
            return;
        }
        
        // 清空当前显示
        logList.innerHTML = '';
        
        // 根据标签页过滤日志
        let filteredLogs = this.logs;
        if (currentTab !== 'all') {
            filteredLogs = this.logs.filter(log => this.getLogCategory(log) === currentTab);
        }
        
        if (filteredLogs.length === 0) {
            const placeholder = this.getPlaceholderText(currentTab);
            logList.innerHTML = `<div class="log-placeholder">${placeholder}</div>`;
        } else {
            filteredLogs.forEach(log => {
                const logElement = this.createLogElement( log, currentTab.slice( 0, 1 ));
                logList.appendChild(logElement);
            });
        }
        
        this.scrollToBottom();
    }
    
    /**
     * 获取日志的分类
     * @param {Object} log - 日志条目
     * @returns {string} 日志分类
     */
    getLogCategory(log) {
        // 根据日志内容和类别判断分类
        if (log.category) {
            if (log.category.includes('node') || log.category.includes('peer')) {
                return 'node';
            }
            if (log.category.includes('user') || log.category.includes('payment')) {
                return 'user';
            }
            if (log.category.includes('blockchain') || log.category.includes('chain') || log.category.includes('block')) {
                return 'blockchain';
            }
        }
        
        // 根据消息内容判断
        //const message = log.message.toLowerCase();
        //if (message.includes('节点') || message.includes('node') || message.includes('连接') || message.includes('网络')) {
            //return 'node';
        //}
        //if (message.includes('用户') || message.includes('user') || message.includes('支付') || message.includes('转账')) {
            //return 'user';
        //}
        //if (message.includes('区块链') || message.includes('blockchain') || message.includes('区块') || message.includes('block')) {
            //return 'blockchain';
        //}
        
        return 'all';
    }
    
    /**
     * 获取占位符文本
     * @param {string} tabName - 标签页名称
     * @returns {string} 占位符文本
     */
    getPlaceholderText(tabName) {
        const textIds = {
            all: 'no_logs',
            node: 'no_node_logs',
            user: 'no_user_logs',
            blockchain: 'no_blockchain_logs'
        };
        return GetText(textIds[tabName] || 'no_logs');
    }
    
    /**
     * 切换到指定的日志标签页（供外部调用）
     * @param {string} category - 日志分类 (node, user, blockchain)
     */
    switchToCategory( category, itemId )
    {
        if( ['node', 'user', 'blockchain'].includes( category ))
        {
            this.switchTab( category );
            const tabPane = document.querySelector( '#log-tab-content .active' );
            tabPane.classList.remove( 'active' );
        
            document.getElementById( `filter-logs-content` ).classList.add( 'active' );
            const FilterList = document.getElementById( `filter-logs-list` );
            FilterList.innerHTML = '';
            tabPane.querySelectorAll( '.log-entry' ).forEach( div =>
            {
                console.log( div );
                if( div.childNodes[5].innerText == itemId )
                {
                    FilterList.appendChild( div );
                }
            } );
        }
    }

    renderLogEntry(logEntry) {
        // 添加到所有日志标签页
        
        this.addToLogList('all-logs-list', logEntry);
        
        // 根据日志分类添加到对应标签页
        const category = this.getLogCategory(logEntry);
        
        if (category !== 'all') {
            this.addToLogList(`${category}-logs-list`, logEntry);
        }
    }
    
    /**
     * 添加日志到指定的日志列表
     * @param {string} listId - 日志列表ID
     * @param {Object} logEntry - 日志条目
     */
    addToLogList(listId, logEntry) {
        const logList = document.getElementById(listId);
        if (!logList) {
            console.error( 'Log list element not found:', listId );
            return;
        }
        
        // 移除占位符
        const placeholder = logList.querySelector('.log-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        const logElement = this.createLogElement( logEntry, listId.slice( 0, 1 ));
        logList.appendChild(logElement);
    }

    createLogElement( logEntry, listName )
    {
        const KeyId = { a: '', u: logEntry.user, n: logEntry.peer?.toString(), b: logEntry.blockchain }[listName];
        //console.log( KeyId, listName, logEntry );
        const logElement = document.createElement('div');
        const Pairs = [['Peer', logEntry.peer?.toString()], ['User', logEntry.user], ['Block', logEntry.block],
            ['Blockchain', logEntry.blockchain]].filter(( [k, v] ) => v ).map(( [k, v] ) => k + ':' + v.slice( 0, 8 ));
        const key = '[' + Pairs.join( ',' ) + ']';
        logElement.className = `log-entry`;
        logElement.innerHTML = `
            <span class="log-timestamp">${logEntry.dida || 'N/A'}</span>
            <span class="log-message">${key + ' ' + (logEntry.content || 'No content')}</span>
            <span class="hide">${ KeyId }</span>
        `;
        return logElement;
    }

    clearLogs() {
        this.logs = [];
        
        // 清空所有标签页的日志列表
        const logLists = ['all-logs-list', 'node-logs-list', 'user-logs-list', 'blockchain-logs-list'];
        logLists.forEach(listId => {
            const logList = document.getElementById(listId);
            if (logList) {
                const tabName = listId.replace('-logs-list', '');
                const placeholder = this.getPlaceholderText(tabName);
                logList.innerHTML = `<div class="log-placeholder">${placeholder}</div>`;
            }
        });
    }

    exportLogs() {
        const currentTab = this.currentTab || 'all';
        let logsToExport = this.logs;
        
        if (currentTab !== 'all') {
            logsToExport = this.logs.filter(log => this.getLogCategory(log) === currentTab);
        }
        
        const logText = logsToExport.map( JSON.stringify ).join( '\n' );
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${currentTab}-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    scrollToBottom() {
        // 滚动当前活动的标签页到底部
        const currentTab = this.currentTab || 'all';
        const logList = document.getElementById(`${currentTab}-logs-list`);
        if (logList) {
            logList.scrollTop = logList.scrollHeight;
        }
    }
    
    /**
     * 格式化日志消息，截断base64数据只显示前6个字符
     */
    formatLogIds(message) {
        // 匹配base64格式的数据（长度大于10的字母数字字符串）
        return message.toString().replace(/\b[A-Za-z0-9+/]{10,}={0,2}\b/g, (match) => {
            if (match.length > 12) {
                return match.substring(0, 6) + '...';
            }
            return match;
        });
    }
    
    /**
     * 语言变更处理
     * @param {string} language - 新的语言代码
     */
    onLanguageChanged(language) {
        console.log('LogPanel 处理语言变更:', language);
        
        // 更新占位符文本
        this.updatePlaceholderTexts();
    }
    
    /**
     * 更新占位符文本
     */
    updatePlaceholderTexts() {
        const placeholderMappings = {
            'all-logs-list': 'no_logs',
            'node-logs-list': 'no_node_logs', 
            'user-logs-list': 'no_user_logs',
            'blockchain-logs-list': 'no_blockchain_logs'
        };
        
        Object.entries(placeholderMappings).forEach(([listId, textId]) => {
            const logList = document.getElementById(listId);
            if (logList) {
                const placeholder = logList.querySelector('.log-placeholder');
                if (placeholder) {
                    placeholder.textContent = GetText(textId);
                }
            }
        });
    }
}