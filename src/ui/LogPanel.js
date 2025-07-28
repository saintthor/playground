/**
 * LogPanel - 日志面板
 * 负责显示系统操作日志
 */
class LogPanel {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.app = uiManager.app;
        this.isInitialized = false;
        this.logs = [];
    }
    
    init() {
        try {
            this.render();
            this.isInitialized = true;
            console.log('LogPanel 初始化完成');
        } catch (error) {
            console.error('LogPanel 初始化失败:', error);
        }
    }
    
    render() {
        const logPanel = document.getElementById('log-panel');
        if (!logPanel) return;
        
        const panelContent = logPanel.querySelector('.panel-content');
        if (!panelContent) return;
        
        panelContent.innerHTML = `
            <div class="log-controls">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div class="log-filters">
                        <select class="form-control" id="log-filter" style="width: auto; display: inline-block;">
                            <option value="all">所有日志</option>
                            <option value="block">区块操作</option>
                            <option value="network">网络事件</option>
                            <option value="security">安全事件</option>
                        </select>
                    </div>
                    <div class="log-pagination">
                        <button class="btn btn-secondary btn-sm" id="log-prev" disabled>上一页</button>
                        <span class="text-muted" id="log-page-info">第 1 页</span>
                        <button class="btn btn-secondary btn-sm" id="log-next" disabled>下一页</button>
                    </div>
                </div>
            </div>
            
            <div class="log-display" id="log-entries">
                <p class="text-muted text-center">暂无日志记录</p>
            </div>
        `;
    }
    
    addLog(type, message, relatedData = {}) {
        const log = {
            id: Date.now(),
            type: type,
            message: message,
            timestamp: new Date().toLocaleTimeString(),
            relatedData: relatedData
        };
        
        // 新日志添加到末尾（底部）
        this.logs.push(log);
        if (this.logs.length > 100) {
            this.logs = this.logs.slice(-100); // 保留最后100条
        }
        
        this.updateDisplay();
    }
    
    updateDisplay() {
        const logEntries = document.getElementById('log-entries');
        if (!logEntries) return;
        
        if (this.logs.length === 0) {
            logEntries.innerHTML = '<p class="text-muted text-center">暂无日志记录</p>';
            return;
        }
        
        // 显示最后10条日志（最新的在底部）
        const recentLogs = this.logs.slice(-10);
        const logsHtml = recentLogs.map(log => `
            <div class="log-entry log-type-${log.type}">
                <span class="log-timestamp">${log.timestamp}</span>
                <span class="log-message">${this.formatLogMessage(log.message)}</span>
            </div>
        `).join('');
        
        logEntries.innerHTML = logsHtml;
        
        // 自动滚动到底部显示最新日志
        logEntries.scrollTop = logEntries.scrollHeight;
    }
    
    handleLogClick(logId, event) {
        console.log('日志点击:', logId);
    }
    
    filterLogsByUser(userId) {
        console.log('按用户过滤日志:', userId);
    }
    
    filterLogsByChain(chainId) {
        console.log('按区块链过滤日志:', chainId);
    }
    
    clearAllFilters() {
        console.log('清除所有过滤器');
    }
    
    /**
     * 格式化日志消息，截断base64数据只显示前6个字符
     */
    formatLogMessage(message) {
        // 匹配base64格式的数据（长度大于10的字母数字字符串）
        return message.replace(/\b[A-Za-z0-9+/]{10,}={0,2}\b/g, (match) => {
            if (match.length > 6) {
                return match.substring(0, 6) + '...';
            }
            return match;
        });
    }
}