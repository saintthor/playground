/**
 * UIManager - 用户界面管理器
 * 负责管理整个应用的用户界面，协调各个面板的显示和交互
 */
class UIManager {
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
        
        // 设置全局访问
        window.mainPanel = this.panels.main;

        // 初始化日志面板
        this.panels.log = new LogPanel(this);
        this.panels.log.init();
        
        // 设置应用程序级别的日志面板引用
        this.app.logPanel = this.panels.log;

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
        // LogPanel now handles its own structure rendering
        // Just ensure the container is ready
        contentElement.innerHTML = '';
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
    }

    /**
     * 处理窗口大小变化
     * @private
     */
    _handleWindowResize() {
        console.log('窗口大小已变化，重新调整布局');
    }

    /**
     * 处理全局点击事件
     * @private
     */
    _handleGlobalClick(event) {
        const target = event.target;
        
        // 处理具有特定数据属性的元素点击
        if (target.dataset.userId) {
            this.handleUserClick(target.dataset.userId, target);
        } else if (target.dataset.chainId) {
            this.handleChainClick(target.dataset.chainId, target);
        } else if (target.dataset.logId) {
            this.handleLogClick(target.dataset.logId, target);
        }
    }

    /**
     * 处理用户点击事件
     */
    handleUserClick(userId, element) {
        console.log('用户点击事件:', userId);
        if (this.app && this.app.handleUserSelection) {
            this.app.handleUserSelection(userId);
        }
    }

    /**
     * 处理区块链点击事件
     */
    handleChainClick(chainId, element) {
        console.log('区块链点击事件:', chainId);
        if (this.app && this.app.handleChainSelection) {
            this.app.handleChainSelection(chainId);
        }
    }

    /**
     * 处理日志点击事件
     */
    handleLogClick(logId, logEntry) {
        console.log('日志点击事件:', logId, logEntry);
        
        if (this.panels.log) {
            this.panels.log.handleLogClick(logId, { target: null });
        }
        
        if (this.app && this.app.handleLogSelection) {
            this.app.handleLogSelection(logId, logEntry);
        }
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
     * 语言变更处理
     * @param {string} language - 新的语言代码
     */
    onLanguageChanged( language )
    {
        console.log( 'UIManager 处理语言变更:', language );
        
        // 通知各个面板更新语言
        if( this.panels.control && this.panels.control.onLanguageChanged )
        {
            this.panels.control.onLanguageChanged( language );
        }
        
        if( this.panels.main && this.panels.main.onLanguageChanged )
        {
            this.panels.main.onLanguageChanged( language );
        }
        
        if( this.panels.log && this.panels.log.onLanguageChanged )
        {
            this.panels.log.onLanguageChanged( language );
        }
    }
}