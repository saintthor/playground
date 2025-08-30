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
            this.isInitialized = true;
            
            // 处理待处理的日志
            this.pendingLogs.forEach(log => {
                this.AddLog( log );
            });
            this.pendingLogs = [];
            setTimeout(() => this.switchTab( 'all' ), 500 );
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
        
        container.innerHTML = `
            <div class="log-header">
                <h3>系统日志</h3>
                <div class="log-controls">
                    <!--button class="btn btn-sm btn-secondary" id="clear-logs">清空日志</button-->
                    <button class="btn btn-sm btn-info" id="export-logs">导出日志</button>
                </div>
            </div>
            <div class="log-tabs">
                <ul class="nav nav-tabs" id="log-tabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="all-logs-tab" data-tab="all" type="button" role="tab">
                            所有日志
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="node-logs-tab" data-tab="node" type="button" role="tab">
                            节点日志
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="user-logs-tab" data-tab="user" type="button" role="tab">
                            用户日志
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="blockchain-logs-tab" data-tab="blockchain" type="button" role="tab">
                            区块链日志
                        </button>
                    </li>
                </ul>
            </div>
            <div class="log-content">
                <div class="tab-content" id="log-tab-content">
                    <div class="tab-pane active" id="all-logs-content">
                        <div class="log-list" id="all-logs-list">
                            <div class="log-placeholder">暂无日志信息</div>
                        </div>
                    </div>
                    <div class="tab-pane" id="node-logs-content">
                        <div class="log-list" id="node-logs-list">
                            <div class="log-placeholder">暂无节点日志</div>
                        </div>
                    </div>
                    <div class="tab-pane" id="user-logs-content">
                        <div class="log-list" id="user-logs-list">
                            <div class="log-placeholder">暂无用户日志</div>
                        </div>
                    </div>
                    <div class="tab-pane" id="blockchain-logs-content">
                        <div class="log-list" id="blockchain-logs-list">
                            <div class="log-placeholder">暂无区块链日志</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    bindEvents() {
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
        //console.log( 'AddLog', log );
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
        console.log( 'switchTab', tabName );
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
        
        if (!logList) return;
        
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
                const logElement = this.createLogElement(log);
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
            if (log.category.includes('node') || log.category.includes('network')) {
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
        const placeholders = {
            all: '暂无日志信息',
            node: '暂无节点日志',
            user: '暂无用户日志',
            blockchain: '暂无区块链日志'
        };
        return placeholders[tabName] || '暂无日志信息';
    }
    
    /**
     * 切换到指定的日志标签页（供外部调用）
     * @param {string} category - 日志分类 (node, user, blockchain)
     */
    switchToCategory(category) {
        if (['node', 'user', 'blockchain'].includes(category)) {
            this.switchTab(category);
        }
    }

    renderLogEntry(logEntry) {
        // 添加到所有日志标签页
        //console.log( 'renderLogEntry', logEntry );
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
        //console.log( 'addToLogList', listId, logEntry );
        const logList = document.getElementById(listId);
        if (!logList) return;
        
        // 移除占位符
        const placeholder = logList.querySelector('.log-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        const logElement = this.createLogElement(logEntry);
        logList.appendChild(logElement);
    }

    createLogElement(logEntry) {
        const logElement = document.createElement('div');
        const Pairs = [['Peer', logEntry.peer?.toString()], ['User', logEntry.user], ['Block', logEntry.block],
            ['Blockchain', logEntry.blockchain]].filter(( [k, v] ) => v ).map(( [k, v] ) => k + ':' + v.slice( 0, 8 ));
        const key = '[' + Pairs.join( ',' ) + ']';
        //console.log( key, logEntry );
        logElement.className = `log-entry`;
        logElement.innerHTML = `
            <span class="log-timestamp">${logEntry.dida}</span>
            <span class="log-message">${key + ' ' + logEntry.content}</span>
        `;
        //console.log( 'createLogElement', logElement.innerHTML );
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
}