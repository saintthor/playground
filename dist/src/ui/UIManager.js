import { CtrlPanel } from './CtrlPanel.js';
import { MainPanel } from './MainPanel.js';
import { LogPanel } from './LogPanel.js';

/**
 * UIManager - 用户界面管理器
 * 负责管理整个应用的用户界面，协调各个面板的显示和交互
 */
export class UIManager {
    constructor(app) {
        this.app = app;
        this.panels = {
            control: null,
            main: null,
            log: null
        };
        this.isInitialized = false;
    }

    /**
     * 初始化用户界面
     */
    initUI() {
        try {
            // 确保 DOM 已加载
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this._doInit());
            } else {
                this._doInit();
            }
        } catch (error) {
            console.error('UI初始化失败:', error);
            throw new Error(`UI初始化失败: ${error.message}`);
        }
    }

    /**
     * 执行实际的初始化工作
     * @private
     */
    _doInit() {
        // 验证必要的DOM元素存在
        this._validateDOMElements();
        
        // 初始化各个面板
        this._initializePanels();
        
        // 设置全局事件监听器
        this._setupGlobalEventListeners();
        
        // 标记为已初始化
        this.isInitialized = true;
        
        console.log('UIManager 初始化完成');
    }

    /**
     * 验证必要的DOM元素是否存在
     * @private
     */
    _validateDOMElements() {
        const requiredElements = [
            'control-panel',
            'main-panel', 
            'log-panel'
        ];

        for (const elementId of requiredElements) {
            const element = document.getElementById(elementId);
            if (!element) {
                throw new Error(`必需的DOM元素未找到: ${elementId}`);
            }
        }
    }

    /**
     * 初始化各个面板
     * @private
     */
    _initializePanels() {
        // 获取面板容器元素
        const controlPanelElement = document.getElementById('control-panel');
        const mainPanelElement = document.getElementById('main-panel');
        const logPanelElement = document.getElementById('log-panel');

        // 为面板添加基础内容结构
        this._setupPanelStructure(controlPanelElement, 'control');
        this._setupPanelStructure(mainPanelElement, 'main');
        this._setupPanelStructure(logPanelElement, 'log');

        // 初始化控制面板
        this.panels.control = new CtrlPanel(this);
        this.panels.control.init();

        // 初始化主面板
        this.panels.main = new MainPanel(this);
        this.panels.main.init();

        // 初始化日志面板
        this.panels.log = new LogPanel(this);
        this.panels.log.init();

        console.log('面板结构初始化完成');
    }

    /**
     * 设置面板的基础结构
     * @private
     */
    _setupPanelStructure(panelElement, panelType) {
        const contentElement = panelElement.querySelector('.panel-content');
        if (!contentElement) {
            throw new Error(`面板内容容器未找到: ${panelType}`);
        }

        // 根据面板类型添加特定的结构
        switch (panelType) {
            case 'control':
                this._setupControlPanelStructure(contentElement);
                break;
            case 'main':
                this._setupMainPanelStructure(contentElement);
                break;
            case 'log':
                this._setupLogPanelStructure(contentElement);
                break;
        }
    }

    /**
     * 设置控制面板结构
     * @private
     */
    _setupControlPanelStructure(contentElement) {
        contentElement.innerHTML = `
            <div class="control-section" id="system-controls">
                <h3>系统控制</h3>
                <div class="control-buttons">
                    <!-- 控制按钮将由 CtrlPanel 类添加 -->
                </div>
            </div>
            
            <div class="control-section" id="network-settings">
                <h3>网络设置</h3>
                <div class="settings-form">
                    <!-- 网络参数设置将由 CtrlPanel 类添加 -->
                </div>
            </div>
            
            <div class="control-section" id="chain-definition">
                <h3>区块链定义</h3>
                <div class="chain-def-editor">
                    <!-- 区块链定义编辑器将由 CtrlPanel 类添加 -->
                </div>
            </div>
            
            <div class="control-section" id="runtime-controls">
                <h3>运行时控制</h3>
                <div class="runtime-settings">
                    <!-- 运行时控制将由 CtrlPanel 类添加 -->
                </div>
            </div>
        `;
    }

    /**
     * 设置主面板结构
     * @private
     */
    _setupMainPanelStructure(contentElement) {
        contentElement.innerHTML = `
            <div class="main-section" id="user-assets">
                <h3>用户资产</h3>
                <div class="assets-display">
                    <p class="text-muted">系统未启动</p>
                </div>
            </div>
            
            <div class="main-section" id="chain-ownership">
                <h3>区块链归属</h3>
                <div class="ownership-display">
                    <p class="text-muted">系统未启动</p>
                </div>
            </div>
            
            <div class="main-section" id="network-status">
                <h3>网络状态</h3>
                <div class="network-display">
                    <p class="text-muted">系统未启动</p>
                </div>
            </div>
        `;
    }

    /**
     * 设置日志面板结构
     * @private
     */
    _setupLogPanelStructure(contentElement) {
        contentElement.innerHTML = `
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

    /**
     * 设置全局事件监听器
     * @private
     */
    _setupGlobalEventListeners() {
        // 窗口大小变化时重新调整布局
        window.addEventListener('resize', this._handleWindowResize.bind(this));
        
        // 全局点击事件处理
        document.addEventListener('click', this._handleGlobalClick.bind(this));
        
        // 全局鼠标悬停事件处理（用于Base64数据显示）
        document.addEventListener('mouseover', this._handleGlobalMouseOver.bind(this));
        document.addEventListener('mouseout', this._handleGlobalMouseOut.bind(this));
    }

    /**
     * 处理窗口大小变化
     * @private
     */
    _handleWindowResize() {
        // 可以在这里添加响应式布局调整逻辑
        console.log('窗口大小已变化，重新调整布局');
    }

    /**
     * 处理全局点击事件
     * @private
     */
    _handleGlobalClick(event) {
        const target = event.target;
        
        // 处理Base64数据的选择
        if (target.classList.contains('base64-data')) {
            this.handleBase64Click(target, event);
            return;
        }
        
        // 处理具有特定数据属性的元素点击
        if (target.dataset.userId) {
            this.handleUserClick(target.dataset.userId, target);
        } else if (target.dataset.chainId) {
            this.handleChainClick(target.dataset.chainId, target);
        } else if (target.dataset.logId) {
            this.handleLogClick(target.dataset.logId, target);
        } else {
            // 点击其他地方时清除Base64选择
            this.clearBase64Selection();
        }
    }

    /**
     * 处理全局鼠标悬停事件
     * @private
     */
    _handleGlobalMouseOver(event) {
        const target = event.target;
        
        // 处理Base64数据的悬停显示
        if (target.classList.contains('base64-data')) {
            this.showBase64Tooltip(target);
        }
    }

    /**
     * 处理全局鼠标离开事件
     * @private
     */
    _handleGlobalMouseOut(event) {
        const target = event.target;
        
        // 隐藏Base64数据的悬停显示
        if (target.classList.contains('base64-data')) {
            this.hideBase64Tooltip();
        }
    }

    /**
     * 更新控制面板
     */
    updateControlPanel(data) {
        if (!this.isInitialized) {
            console.warn('UI未初始化，无法更新控制面板');
            return;
        }
        
        // 这个方法将由 CtrlPanel 类具体实现
        console.log('更新控制面板:', data);
    }

    /**
     * 更新主面板
     */
    updateMainPanel(data) {
        if (!this.isInitialized) {
            console.warn('UI未初始化，无法更新主面板');
            return;
        }
        
        if (this.panels.main) {
            this.panels.main.updateAllData(data);
        }
    }

    /**
     * 更新日志面板
     */
    updateLogPanel(logs) {
        if (!this.isInitialized) {
            console.warn('UI未初始化，无法更新日志面板');
            return;
        }
        
        // 这个方法将由 LogPanel 类具体实现
        console.log('更新日志面板:', logs);
    }

    /**
     * 处理用户点击事件
     */
    handleUserClick(userId, element) {
        console.log('用户点击事件:', userId);
        // 通知应用处理用户选择
        if (this.app && this.app.handleUserSelection) {
            this.app.handleUserSelection(userId);
        }
    }

    /**
     * 处理区块链点击事件
     */
    handleChainClick(chainId, element) {
        console.log('区块链点击事件:', chainId);
        // 通知应用处理区块链选择
        if (this.app && this.app.handleChainSelection) {
            this.app.handleChainSelection(chainId);
        }
    }

    /**
     * 处理日志点击事件
     */
    handleLogClick(logId, logEntry) {
        console.log('日志点击事件:', logId, logEntry);
        
        // 通知日志面板处理点击
        if (this.panels.log) {
            this.panels.log.handleLogClick(logId, { target: null });
        }
        
        // 通知应用处理日志选择
        if (this.app && this.app.handleLogSelection) {
            this.app.handleLogSelection(logId, logEntry);
        }
        
        // 实现日志与主面板的联动
        this.linkLogToMainPanel(logEntry);
    }

    /**
     * 实现日志与主面板的联动显示
     */
    linkLogToMainPanel(logEntry) {
        if (!logEntry || !logEntry.relatedData || !this.panels.main) {
            return;
        }
        
        const { creatorId, receiverId, userId, chainId } = logEntry.relatedData;
        
        // 优先选择用户相关信息
        if (creatorId) {
            this.panels.main.setSelectedUser(creatorId);
            console.log('日志联动: 选择创建者用户', creatorId);
        } else if (receiverId) {
            this.panels.main.setSelectedUser(receiverId);
            console.log('日志联动: 选择接收者用户', receiverId);
        } else if (userId) {
            this.panels.main.setSelectedUser(userId);
            console.log('日志联动: 选择相关用户', userId);
        } else if (chainId) {
            this.panels.main.setSelectedChain(chainId);
            console.log('日志联动: 选择相关区块链', chainId);
        }
    }

    /**
     * 处理用户选择变化（从主面板或其他地方触发）
     */
    handleUserSelection(userId) {
        console.log('用户选择变化:', userId);
        
        // 更新主面板选择
        if (this.panels.main) {
            this.panels.main.setSelectedUser(userId);
        }
        
        // 更新日志面板过滤
        if (this.panels.log) {
            if (userId) {
                this.panels.log.filterLogsByUser(userId);
            } else {
                this.panels.log.clearAllFilters();
            }
        }
        
        // 通知应用
        if (this.app && this.app.handleUserSelection) {
            this.app.handleUserSelection(userId);
        }
    }

    /**
     * 处理区块链选择变化（从主面板或其他地方触发）
     */
    handleChainSelection(chainId) {
        console.log('区块链选择变化:', chainId);
        
        // 更新主面板选择
        if (this.panels.main) {
            this.panels.main.setSelectedChain(chainId);
        }
        
        // 更新日志面板过滤
        if (this.panels.log) {
            if (chainId) {
                this.panels.log.filterLogsByChain(chainId);
            } else {
                this.panels.log.clearAllFilters();
            }
        }
        
        // 通知应用
        if (this.app && this.app.handleChainSelection) {
            this.app.handleChainSelection(chainId);
        }
    }

    /**
     * 显示Base64数据的完整内容
     */
    showBase64Tooltip(element) {
        const fullData = element.dataset.fullData;
        const dataType = element.dataset.type || 'data';
        if (!fullData) return;

        // 创建或更新tooltip
        let tooltip = document.getElementById('base64-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'base64-tooltip';
            tooltip.className = 'base64-tooltip';
            document.body.appendChild(tooltip);
        }

        // 设置tooltip内容
        const typeText = this.getDataTypeDisplayName(dataType);
        tooltip.innerHTML = `
            <div class="base64-tooltip-header">${typeText}</div>
            <div class="base64-tooltip-content">${fullData}</div>
        `;
        
        tooltip.style.display = 'block';
        
        // 定位tooltip
        this.positionTooltip(tooltip, element);
    }

    /**
     * 隐藏Base64数据的完整内容
     */
    hideBase64Tooltip() {
        const tooltip = document.getElementById('base64-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    /**
     * 定位tooltip
     * @private
     */
    positionTooltip(tooltip, element) {
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let left = rect.left;
        let top = rect.bottom + 8;
        
        // 确保tooltip不超出视口右边界
        if (left + tooltipRect.width > viewportWidth - 10) {
            left = viewportWidth - tooltipRect.width - 10;
        }
        
        // 确保tooltip不超出视口左边界
        if (left < 10) {
            left = 10;
        }
        
        // 如果下方空间不足，显示在上方
        if (top + tooltipRect.height > viewportHeight - 10) {
            top = rect.top - tooltipRect.height - 8;
        }
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    }

    /**
     * 获取数据类型的显示名称
     * @private
     */
    getDataTypeDisplayName(dataType) {
        const typeMap = {
            'publicKey': '公钥',
            'signature': '签名',
            'hash': '哈希',
            'blockId': '区块ID',
            'chainId': '区块链ID',
            'userId': '用户ID',
            'data': '数据'
        };
        return typeMap[dataType] || '数据';
    }

    /**
     * 处理Base64数据点击事件
     */
    handleBase64Click(element, event) {
        event.stopPropagation();
        
        // 清除之前的选择
        this.clearBase64Selection();
        
        // 选中当前元素
        element.classList.add('selected');
        
        // 存储选中的元素引用
        this.selectedBase64Element = element;
        
        const fullData = element.dataset.fullData;
        const dataType = element.dataset.type || 'data';
        
        console.log('Base64数据被选中:', { fullData, dataType });
        
        // 触发选择事件（为后续验证代码功能准备）
        this.onBase64Selected(fullData, dataType, element);
    }

    /**
     * 清除Base64数据选择
     */
    clearBase64Selection() {
        // 移除所有选中状态
        const selectedElements = document.querySelectorAll('.base64-data.selected');
        selectedElements.forEach(element => {
            element.classList.remove('selected');
        });
        
        this.selectedBase64Element = null;
    }

    /**
     * Base64数据选中时的回调
     * @param {string} data - Base64数据
     * @param {string} dataType - 数据类型
     * @param {HTMLElement} element - 被选中的元素
     */
    onBase64Selected(data, dataType, element) {
        console.log('Base64数据选中事件:', { data, dataType, element });
        
        // 收集验证上下文信息
        const context = this.collectVerificationContext(element, dataType);
        
        // 显示验证代码
        this.showVerifyCode(data, dataType, context);
    }

    /**
     * 收集验证上下文信息
     * @param {HTMLElement} element - 被选中的元素
     * @param {string} dataType - 数据类型
     * @returns {Object} 验证上下文
     */
    collectVerificationContext(element, dataType) {
        const context = {};
        
        // 从元素的数据属性中收集信息
        if (element.dataset.originalData) {
            context.originalData = element.dataset.originalData;
        }
        if (element.dataset.publicKey) {
            context.publicKey = element.dataset.publicKey;
        }
        if (element.dataset.privateKey) {
            context.privateKey = element.dataset.privateKey;
        }
        
        // 从父元素或相关元素中收集信息
        const parentElement = element.closest('[data-user-id], [data-chain-id], [data-block-id], [data-log-id]');
        if (parentElement) {
            if (parentElement.dataset.userId) {
                context.userId = parentElement.dataset.userId;
            }
            if (parentElement.dataset.chainId) {
                context.chainId = parentElement.dataset.chainId;
            }
            if (parentElement.dataset.blockId) {
                context.blockId = parentElement.dataset.blockId;
            }
            if (parentElement.dataset.logId) {
                context.logId = parentElement.dataset.logId;
            }
        }
        
        // 根据数据类型收集特定信息
        switch (dataType) {
            case 'signature':
                // 对于签名，尝试找到相关的原始数据和公钥
                context.relatedData = this.findRelatedDataForSignature(element);
                break;
            case 'hash':
                // 对于哈希，尝试找到原始数据
                context.relatedData = this.findRelatedDataForHash(element);
                break;
            case 'publicKey':
                // 对于公钥，收集用户相关信息
                context.relatedData = this.findRelatedDataForPublicKey(element);
                break;
        }
        
        return context;
    }

    /**
     * 查找签名相关的数据
     * @private
     */
    findRelatedDataForSignature(element) {
        // 尝试从应用数据中查找相关信息
        const relatedData = {};
        
        // 如果是区块签名，查找区块数据
        const blockElement = element.closest('[data-block-id]');
        if (blockElement && this.app && this.app.getBlockData) {
            const blockId = blockElement.dataset.blockId;
            const blockData = this.app.getBlockData(blockId);
            if (blockData) {
                relatedData.originalData = JSON.stringify(blockData.data);
                relatedData.publicKey = blockData.creatorPublicKey;
            }
        }
        
        return relatedData;
    }

    /**
     * 查找哈希相关的数据
     * @private
     */
    findRelatedDataForHash(element) {
        const relatedData = {};
        
        // 如果是区块链ID（哈希），查找根区块数据
        const chainElement = element.closest('[data-chain-id]');
        if (chainElement && this.app && this.app.getChainData) {
            const chainId = chainElement.dataset.chainId;
            const chainData = this.app.getChainData(chainId);
            if (chainData && chainData.rootBlock) {
                relatedData.originalData = JSON.stringify(chainData.rootBlock.data);
            }
        }
        
        return relatedData;
    }

    /**
     * 查找公钥相关的数据
     * @private
     */
    findRelatedDataForPublicKey(element) {
        const relatedData = {};
        
        // 如果是用户公钥，查找用户信息
        const userElement = element.closest('[data-user-id]');
        if (userElement && this.app && this.app.getUserData) {
            const userId = userElement.dataset.userId;
            const userData = this.app.getUserData(userId);
            if (userData) {
                relatedData.userId = userId;
                relatedData.userInfo = userData;
            }
        }
        
        return relatedData;
    }

    /**
     * 显示验证代码
     * @param {string} base64Data - Base64数据
     * @param {string} dataType - 数据类型
     * @param {Object} context - 验证上下文
     */
    showVerifyCode(base64Data, dataType, context = {}) {
        console.log('显示验证代码:', { base64Data, dataType, context });
        
        // 导入Crypto服务
        import('../services/Crypto.js').then(({ Crypto }) => {
            // 生成验证代码
            const verifyCode = Crypto.genVerifyCode(base64Data, dataType, context);
            
            // 显示验证代码对话框
            this.displayVerifyCodeDialog(verifyCode, base64Data, dataType);
        }).catch(error => {
            console.error('加载Crypto服务失败:', error);
            this.showErrorMessage('无法生成验证代码：Crypto服务加载失败');
        });
    }

    /**
     * 显示验证代码对话框
     * @param {string} verifyCode - 验证代码
     * @param {string} base64Data - 原始Base64数据
     * @param {string} dataType - 数据类型
     */
    displayVerifyCodeDialog(verifyCode, base64Data, dataType) {
        // 移除现有的对话框
        this.closeVerifyCodeDialog();
        
        // 创建对话框
        const dialog = document.createElement('div');
        dialog.id = 'verify-code-dialog';
        dialog.className = 'verify-code-dialog';
        
        const typeDisplayName = this.getDataTypeDisplayName(dataType);
        const shortData = this.formatBase64Short(base64Data);
        
        dialog.innerHTML = `
            <div class="verify-code-overlay" id="verify-code-overlay"></div>
            <div class="verify-code-content">
                <div class="verify-code-header">
                    <h4>验证代码 - ${typeDisplayName}</h4>
                    <button class="verify-code-close" id="verify-code-close" title="关闭">×</button>
                </div>
                <div class="verify-code-info">
                    <p><strong>数据:</strong> <span class="base64-short">${shortData}</span></p>
                    <p><strong>类型:</strong> ${typeDisplayName}</p>
                </div>
                <div class="verify-code-body">
                    <div class="verify-code-tabs">
                        <button class="verify-code-tab active" data-tab="code">验证代码</button>
                        <button class="verify-code-tab" data-tab="console">控制台运行</button>
                    </div>
                    <div class="verify-code-tab-content">
                        <div class="verify-code-tab-pane active" id="verify-code-tab-code">
                            <div class="verify-code-actions">
                                <button class="btn btn-primary" id="verify-code-copy">复制代码</button>
                                <button class="btn btn-success" id="verify-code-run">直接运行</button>
                            </div>
                            <pre class="verify-code-pre"><code class="verify-code-text" id="verify-code-text">${this.escapeHtml(verifyCode)}</code></pre>
                        </div>
                        <div class="verify-code-tab-pane" id="verify-code-tab-console">
                            <div class="verify-code-console-info">
                                <p>您可以将以下代码复制到浏览器的开发者控制台中运行：</p>
                                <ol>
                                    <li>按 F12 打开开发者工具</li>
                                    <li>切换到 "Console" 标签</li>
                                    <li>粘贴代码并按回车执行</li>
                                </ol>
                            </div>
                            <div class="verify-code-actions">
                                <button class="btn btn-primary" id="verify-code-copy-console">复制到剪贴板</button>
                            </div>
                            <pre class="verify-code-pre"><code class="verify-code-text">${this.escapeHtml(verifyCode)}</code></pre>
                        </div>
                    </div>
                </div>
                <div class="verify-code-footer">
                    <div class="verify-code-result" id="verify-code-result"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // 绑定事件
        this.bindVerifyCodeDialogEvents(verifyCode);
        
        // 显示对话框
        setTimeout(() => {
            dialog.classList.add('show');
        }, 10);
    }

    /**
     * 绑定验证代码对话框事件
     * @param {string} verifyCode - 验证代码
     */
    bindVerifyCodeDialogEvents(verifyCode) {
        // 关闭按钮
        document.getElementById('verify-code-close').addEventListener('click', () => {
            this.closeVerifyCodeDialog();
        });
        
        // 点击遮罩关闭
        document.getElementById('verify-code-overlay').addEventListener('click', () => {
            this.closeVerifyCodeDialog();
        });
        
        // 标签切换
        document.querySelectorAll('.verify-code-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                this.switchVerifyCodeTab(targetTab);
            });
        });
        
        // 复制代码按钮
        document.getElementById('verify-code-copy').addEventListener('click', () => {
            this.copyVerifyCode(verifyCode);
        });
        
        document.getElementById('verify-code-copy-console').addEventListener('click', () => {
            this.copyVerifyCode(verifyCode);
        });
        
        // 直接运行按钮
        document.getElementById('verify-code-run').addEventListener('click', () => {
            this.runVerifyCode(verifyCode);
        });
        
        // ESC键关闭
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeVerifyCodeDialog();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    /**
     * 切换验证代码标签
     * @param {string} tabName - 标签名称
     */
    switchVerifyCodeTab(tabName) {
        // 移除所有活动状态
        document.querySelectorAll('.verify-code-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.verify-code-tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        
        // 激活选中的标签
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`verify-code-tab-${tabName}`).classList.add('active');
    }

    /**
     * 复制验证代码到剪贴板
     * @param {string} verifyCode - 验证代码
     */
    async copyVerifyCode(verifyCode) {
        try {
            await navigator.clipboard.writeText(verifyCode);
            this.showVerifyCodeMessage('代码已复制到剪贴板', 'success');
        } catch (error) {
            console.error('复制失败:', error);
            // 降级方案：使用传统方法
            this.fallbackCopyText(verifyCode);
        }
    }

    /**
     * 降级复制方法
     * @param {string} text - 要复制的文本
     */
    fallbackCopyText(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showVerifyCodeMessage('代码已复制到剪贴板', 'success');
        } catch (error) {
            console.error('降级复制也失败:', error);
            this.showVerifyCodeMessage('复制失败，请手动选择代码', 'error');
        } finally {
            document.body.removeChild(textArea);
        }
    }

    /**
     * 直接运行验证代码
     * @param {string} verifyCode - 验证代码
     */
    async runVerifyCode(verifyCode) {
        const resultElement = document.getElementById('verify-code-result');
        if (!resultElement) return;
        
        try {
            resultElement.innerHTML = '<div class="verify-result-loading">正在执行验证代码...</div>';
            
            // 创建一个安全的执行环境
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            const executeCode = new AsyncFunction(verifyCode);
            
            // 捕获console输出
            const originalLog = console.log;
            const originalError = console.error;
            const logs = [];
            
            console.log = (...args) => {
                logs.push({ type: 'log', args });
                originalLog.apply(console, args);
            };
            
            console.error = (...args) => {
                logs.push({ type: 'error', args });
                originalError.apply(console, args);
            };
            
            // 执行代码
            const result = await executeCode();
            
            // 恢复console
            console.log = originalLog;
            console.error = originalError;
            
            // 显示结果
            this.displayVerifyCodeResult(logs, result, null);
            
        } catch (error) {
            console.error('验证代码执行失败:', error);
            this.displayVerifyCodeResult([], null, error);
        }
    }

    /**
     * 显示验证代码执行结果
     * @param {Array} logs - 控制台日志
     * @param {*} result - 执行结果
     * @param {Error} error - 执行错误
     */
    displayVerifyCodeResult(logs, result, error) {
        const resultElement = document.getElementById('verify-code-result');
        if (!resultElement) return;
        
        let html = '<div class="verify-result">';
        
        if (error) {
            html += `<div class="verify-result-error">
                <h5>执行错误:</h5>
                <pre>${this.escapeHtml(error.message)}</pre>
            </div>`;
        } else {
            html += '<div class="verify-result-success"><h5>执行成功</h5></div>';
        }
        
        if (logs.length > 0) {
            html += '<div class="verify-result-logs"><h5>控制台输出:</h5>';
            logs.forEach(log => {
                const logClass = log.type === 'error' ? 'log-error' : 'log-info';
                const logText = log.args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                ).join(' ');
                html += `<div class="verify-log ${logClass}">${this.escapeHtml(logText)}</div>`;
            });
            html += '</div>';
        }
        
        if (result !== undefined && result !== null) {
            html += `<div class="verify-result-return">
                <h5>返回值:</h5>
                <pre>${this.escapeHtml(JSON.stringify(result, null, 2))}</pre>
            </div>`;
        }
        
        html += '</div>';
        resultElement.innerHTML = html;
    }

    /**
     * 显示验证代码消息
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 ('success', 'error', 'info')
     */
    showVerifyCodeMessage(message, type = 'info') {
        const resultElement = document.getElementById('verify-code-result');
        if (!resultElement) return;
        
        const messageClass = `verify-message-${type}`;
        resultElement.innerHTML = `<div class="${messageClass}">${message}</div>`;
        
        // 3秒后清除消息
        setTimeout(() => {
            if (resultElement.innerHTML.includes(message)) {
                resultElement.innerHTML = '';
            }
        }, 3000);
    }

    /**
     * 关闭验证代码对话框
     */
    closeVerifyCodeDialog() {
        const dialog = document.getElementById('verify-code-dialog');
        if (dialog) {
            dialog.classList.remove('show');
            setTimeout(() => {
                dialog.remove();
            }, 300);
        }
    }

    /**
     * 格式化Base64数据为短格式
     * @param {string} base64Data - Base64数据
     * @returns {string} 短格式字符串
     */
    formatBase64Short(base64Data) {
        if (!base64Data || base64Data.length <= 12) {
            return base64Data || 'N/A';
        }
        return `${base64Data.substring(0, 6)}...${base64Data.substring(base64Data.length - 6)}`;
    }

    /**
     * HTML转义
     * @param {string} text - 要转义的文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 显示错误消息
     * @param {string} message - 错误消息
     */
    showErrorMessage(message) {
        console.error(message);
        // 可以在这里添加用户友好的错误显示
        alert(message);
    }

    /**
     * 获取面板元素
     */
    getPanelElement(panelType) {
        const panelId = `${panelType}-panel`;
        return document.getElementById(panelId);
    }

    /**
     * 获取面板内容元素
     */
    getPanelContentElement(panelType) {
        const panel = this.getPanelElement(panelType);
        return panel ? panel.querySelector('.panel-content') : null;
    }

    /**
     * 销毁UI管理器
     */
    destroy() {
        // 销毁面板
        if (this.panels.control) {
            this.panels.control.destroy();
            this.panels.control = null;
        }
        
        if (this.panels.main) {
            this.panels.main.destroy();
            this.panels.main = null;
        }
        
        if (this.panels.log) {
            this.panels.log.destroy();
            this.panels.log = null;
        }
        
        // 移除事件监听器
        window.removeEventListener('resize', this._handleWindowResize.bind(this));
        document.removeEventListener('click', this._handleGlobalClick.bind(this));
        document.removeEventListener('mouseover', this._handleGlobalMouseOver.bind(this));
        document.removeEventListener('mouseout', this._handleGlobalMouseOut.bind(this));
        
        // 清理tooltip
        const tooltip = document.getElementById('base64-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
        
        this.isInitialized = false;
        console.log('UIManager 已销毁');
    }
}