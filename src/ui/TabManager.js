/**
 * TabManager - 标签页管理核心组件
 * 负责标签页切换和状态管理
 * 优化版本：支持延迟加载、快速切换、增量更新
 */
class TabManager {
    constructor(mainPanel) {
        this.mainPanel = mainPanel;
        this.activeTab = 'help'; // 默认激活网络标签页
        this.tabStates = {
            help: {
                isLoaded: false,
                isVisible: false
            },
            network: { 
                selectedNode: null,
                networkGraphConfig: null,
                lastUpdateTime: null,
                isLoaded: false,
                isVisible: true
            },
            users: { 
                selectedUser: null,
                scrollPosition: 0,
                lastUpdateTime: null,
                isLoaded: false,
                isVisible: false
            },
            chains: { 
                selectedChain: null,
                scrollPosition: 0,
                lastUpdateTime: null,
                isLoaded: false,
                isVisible: false
            }
        };
        
        // 性能优化相关
        this.switchStartTime = null;
        this.updateQueue = new Map(); // 更新队列，用于批量处理
        this.rafId = null; // requestAnimationFrame ID
        this.isUpdating = false;
        this.pendingUpdates = new Set();
        
        // 事件监听器存储
        this.eventListeners = new Map();
        
        // 标签页内容组件
        this.helpTabContent = null;
        this.networkTabContent = null;
        this.usersTabContent = null;
        this.chainsTabContent = null;
        
        // 调整大小管理器
        this.resizeManager = null;
        
        // 初始化事件处理
        this.initEventHandlers();
        
        console.log('TabManager 初始化完成 (性能优化版本)');
    }
    
    /**
     * 初始化事件处理器
     */
    initEventHandlers() {
        // 绑定标签页点击事件处理器
        this.handleTabClick = this.handleTabClick.bind(this);
        
        // 绑定状态变化事件处理器
        this.handleStateChange = this.handleStateChange.bind(this);
    }
    
    /**
     * 切换标签页 (性能优化版本)
     * @param {string} tabName - 标签页名称 ('network', 'users', 'chains')
     * @returns {Promise<boolean>} - 切换是否成功
     */
    async switchTab(tabName) {
        try {
            // 记录切换开始时间
            this.switchStartTime = performance.now();
            
            // 验证标签页名称
            if (!this.isValidTabName(tabName)) {
                console.error('无效的标签页名称:', tabName);
                this.showErrorFeedback('无效的标签页名称');
                return false;
            }
            
            // 如果已经是当前标签页，不需要切换
            if (this.activeTab === tabName) {
                return true;
            }
            
            // 显示加载状态
            this.showLoadingState(tabName);
            
            // 保存当前标签页状态
            //this.saveCurrentTabState();
            
            // 更新激活标签页
            const previousTab = this.activeTab;
            this.activeTab = tabName;
            this.tabStates[previousTab].isVisible = false;
            this.tabStates[tabName].isVisible = true;
            
            // 快速更新UI显示（同步操作）
            this.updateTabDisplayFast();
            
            // 延迟加载标签页内容
            await this.lazyLoadTabContent(tabName);
            
            // 恢复新标签页状态
            this.restoreTabState(tabName);
            
            // 隐藏加载状态
            this.hideLoadingState(tabName);
            
            // 持久化新的激活标签页状态
            //this.persistTabStates();
            
            // 触发标签页切换事件
            this.triggerTabSwitchEvent(previousTab, tabName);
            
            // 记录切换完成时间
            const switchTime = performance.now() - this.switchStartTime;
            //console.log(`标签页切换完成: ${previousTab} -> ${tabName}, 耗时: ${switchTime.toFixed(2)}ms`);
            
            // 如果切换时间超过100ms，记录警告
            if (switchTime > 100) {
                console.warn(`标签页切换耗时过长: ${switchTime.toFixed(2)}ms`);
            }
            
            return true;
            
        } catch (error) {
            console.error('标签页切换失败:', error);
            this.showErrorFeedback('标签页切换失败');
            this.hideLoadingState(tabName);
            return false;
        }
    }
    
    /**
     * 快速更新标签页显示（同步操作，优化性能）
     */
    updateTabDisplayFast() {
        // 使用 requestAnimationFrame 确保在下一帧更新
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        this.rafId = requestAnimationFrame(() => {
            // 更新标签页头部激活状态
            const tabButtons = document.querySelectorAll('.tab-button');
            tabButtons.forEach(button => {
                const tabName = button.getAttribute('data-tab');
                button.classList.toggle('active', tabName === this.activeTab);
            });
            
            // 更新标签页内容显示
            const tabPanes = document.querySelectorAll('.tab-pane');
            tabPanes.forEach(pane => {
                const tabName = pane.id.replace('-tab', '');
                pane.classList.toggle('active', tabName === this.activeTab);
            });
        });
    }
    
    /**
     * 延迟加载标签页内容
     * @param {string} tabName - 标签页名称
     */
    async lazyLoadTabContent(tabName) {
        try {
            const tabState = this.tabStates[tabName];
            
            // 如果标签页内容已经加载过，直接返回
            if (tabState.isLoaded) {
                return;
            }
            
            // 根据标签页类型加载内容
            switch (tabName) {
                case 'help':
                    await this.loadHelpTabContent();
                    break;
                case 'network':
                    await this.loadNetworkTabContent();
                    break;
                case 'users':
                    await this.loadUsersTabContent();
                    break;
                case 'chains':
                    await this.loadChainsTabContent();
                    break;
            }
            
            // 标记为已加载
            tabState.isLoaded = true;
            
        } catch (error) {
            console.error(`延迟加载标签页内容失败 (${tabName}):`, error);
            this.showErrorFeedback(`加载${this.getTabDisplayName(tabName)}内容失败`);
        }
    }
    
    /**
     * 加载帮助标签页内容
     */
    async loadHelpTabContent() {
        return new Promise((resolve) => {
            setTimeout(() => {
                if (this.helpTabContent) {
                    this.helpTabContent.renderHelpContent();
                }
                resolve();
            }, 10);
        });
    }
    
    /**
     * 加载网络标签页内容
     */
    async loadNetworkTabContent() {
        return new Promise((resolve) => {
            // 模拟异步加载过程
            setTimeout(() => {
                if (this.networkTabContent && this.mainPanel.app) {
                    const data = this.mainPanel.app.getMainPanelData();
                    if (data && data.networkData) {
                        this.networkTabContent.renderNetworkGraph( data.AllPeers );
                    }
                }
                resolve();
            }, 10); // 最小延迟，确保异步执行
        });
    }
    
    /**
     * 加载用户标签页内容
     */
    async loadUsersTabContent() {
        return new Promise((resolve) => {
            setTimeout(() => {
                if (this.usersTabContent && this.mainPanel.app) {
                    const data = this.mainPanel.app.getMainPanelData();
                    if (data && data.userData) {
                        this.usersTabContent.renderUsersGrid(data.userData);
                    }
                }
                resolve();
            }, 10);
        });
    }
    
    /**
     * 加载区块链标签页内容
     */
    async loadChainsTabContent() {
        return new Promise((resolve) => {
            setTimeout(() => {
                if (this.chainsTabContent && this.mainPanel.app) {
                    const data = this.mainPanel.app.getMainPanelData();
                    if (data && data.chainData) {
                        this.chainsTabContent.renderChainsGrid(data.chainData);
                    }
                }
                resolve();
            }, 10);
        });
    }
    
    /**
     * 隐藏标签页内容
     * @param {string} tabName - 标签页名称
     */
    hideTabContent(tabName) {
        const tabPane = document.getElementById(`${tabName}-tab`);
        if (tabPane) {
            tabPane.classList.remove('active');
        }
    }
    
    /**
     * 显示标签页内容
     * @param {string} tabName - 标签页名称
     */
    showTabContent(tabName) {
        const tabPane = document.getElementById(`${tabName}-tab`);
        if (tabPane) {
            tabPane.classList.add('active');
        }
    }
    
    /**
     * 显示加载状态
     * @param {string} tabName - 标签页名称
     */
    showLoadingState(tabName) {
        const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
        if (tabButton) {
            tabButton.classList.add('loading');
            tabButton.disabled = true;
            
            // 添加加载指示器
            const loadingIndicator = document.createElement('span');
            loadingIndicator.className = 'tab-loading-indicator';
            loadingIndicator.innerHTML = '⟳';
            tabButton.appendChild(loadingIndicator);
        }
    }
    
    /**
     * 隐藏加载状态
     * @param {string} tabName - 标签页名称
     */
    hideLoadingState(tabName) {
        const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
        if (tabButton) {
            tabButton.classList.remove('loading');
            tabButton.disabled = false;
            
            // 移除加载指示器
            const loadingIndicator = tabButton.querySelector('.tab-loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
        }
    }
    
    /**
     * 显示错误反馈
     * @param {string} message - 错误消息
     */
    showErrorFeedback(message) {
        // 创建错误提示元素
        const errorElement = document.createElement('div');
        errorElement.className = 'tab-error-feedback';
        errorElement.textContent = message;
        
        // 添加到主面板
        const mainPanel = document.getElementById('main-panel');
        if (mainPanel) {
            mainPanel.appendChild(errorElement);
            
            // 3秒后自动移除
            setTimeout(() => {
                if (errorElement.parentNode) {
                    errorElement.parentNode.removeChild(errorElement);
                }
            }, 3000);
        }
    }
    
    /**
     * 获取标签页显示名称
     * @param {string} tabName - 标签页名称
     * @returns {string} - 显示名称
     */
    getTabDisplayName(tabName) {
        const names = {
            help: '帮助',
            network: '网络',
            users: '用户',
            chains: '区块链'
        };
        return names[tabName] || tabName;
    }
    
    /**
     * 保存当前标签页状态
     */
    saveCurrentTabState() {
        try {
            const currentState = this.getCurrentTabState();
            if (currentState) {
                this.saveTabState(this.activeTab, currentState);
            }
        } catch (error) {
            console.error('保存标签页状态失败:', error);
        }
    }
    
    /**
     * 保存标签页状态
     * @param {string} tabName - 标签页名称
     * @param {Object} state - 状态对象
     */
    saveTabState(tabName, state) {
        try {
            if (!this.isValidTabName(tabName)) {
                console.error('无效的标签页名称:', tabName);
                return;
            }
            
            // 更新状态对象
            this.tabStates[tabName] = {
                ...this.tabStates[tabName],
                ...state,
                lastUpdateTime: Date.now()
            };
            
            // 持久化状态到本地存储
            //this.persistTabStates();
            
            console.log(`标签页状态已保存: ${tabName}`, state);
            
        } catch (error) {
            console.error('保存标签页状态失败:', error);
        }
    }
    
    /**
     * 恢复标签页状态
     * @param {string} tabName - 标签页名称
     * @returns {Object} - 恢复的状态对象
     */
    restoreTabState(tabName) {
        try {
            if (!this.isValidTabName(tabName)) {
                console.error('无效的标签页名称:', tabName);
                return null;
            }
            
            const state = this.tabStates[tabName];
            
            // 应用状态到对应的标签页内容
            this.applyTabState(tabName, state);
            
            //console.log(`标签页状态已恢复: ${tabName}`, state);
            return state;
            
        } catch (error) {
            console.error('恢复标签页状态失败:', error);
            return null;
        }
    }
    
    /**
     * 获取当前标签页状态
     * @returns {Object} - 当前标签页状态
     */
    getCurrentTabState() {
        try {
            switch (this.activeTab) {
                case 'help':
                    return { }; // 帮助页面无需保存状态
                case 'network':
                    return this.getNetworkTabState();
                case 'users':
                    return this.getUsersTabState();
                case 'chains':
                    return this.getChainsTabState();
                default:
                    return null;
            }
        } catch (error) {
            console.error('获取当前标签页状态失败:', error);
            return null;
        }
    }
    
    /**
     * 获取网络标签页状态
     * @returns {Object} - 网络标签页状态
     */
    getNetworkTabState() {
        const networkTab = document.getElementById('network-tab');
        if (!networkTab) return {};
        
        // 从NetworkTabContent获取选中的节点
        const selectedNode = this.networkTabContent ? this.networkTabContent.getSelectedNode() : null;
        
        // 获取网络图配置
        const networkGraphConfig = this.networkTabContent ? this.networkTabContent.lastNetworkConfig : null;
        
        return {
            selectedNode,
            networkGraphConfig,
            scrollPosition: networkTab.scrollTop || 0
        };
    }
    
    /**
     * 获取用户标签页状态
     * @returns {Object} - 用户标签页状态
     */
    getUsersTabState() {
        const usersTab = document.getElementById('users-tab');
        if (!usersTab) return {};
        
        // 从UsersTabContent获取选中的用户
        const selectedUser = this.usersTabContent ? this.usersTabContent.getSelectedUser() : null;
        
        return {
            selectedUser,
            scrollPosition: usersTab.scrollTop || 0
        };
    }
    
    /**
     * 获取区块链标签页状态
     * @returns {Object} - 区块链标签页状态
     */
    getChainsTabState() {
        const chainsTab = document.getElementById('chains-tab');
        if (!chainsTab) return {};
        
        // 从ChainsTabContent获取选中的区块链
        const selectedChain = this.chainsTabContent ? this.chainsTabContent.getSelectedChain() : null;
        
        return {
            selectedChain,
            scrollPosition: chainsTab.scrollTop || 0
        };
    }
    
    /**
     * 应用标签页状态
     * @param {string} tabName - 标签页名称
     * @param {Object} state - 状态对象
     */
    applyTabState(tabName, state) {
        try {
            switch (tabName) {
                case 'help':
                    // 帮助页面无需恢复状态
                    break;
                case 'network':
                    this.applyNetworkTabState(state);
                    break;
                case 'users':
                    this.applyUsersTabState(state);
                    break;
                case 'chains':
                    this.applyChainsTabState(state);
                    break;
            }
        } catch (error) {
            console.error('应用标签页状态失败:', error);
        }
    }
    
    /**
     * 应用网络标签页状态
     * @param {Object} state - 网络标签页状态
     */
    applyNetworkTabState(state) {
        const networkTab = document.getElementById('network-tab');
        if (!networkTab) return;
        
        // 恢复滚动位置
        if (state.scrollPosition) {
            networkTab.scrollTop = state.scrollPosition;
        }
        
        // 恢复选中的节点（不触发日志面板切换）
        if (state.selectedNode !== null && this.networkTabContent) {
            setTimeout(() => {
                this.networkTabContent.setSelectedNode(state.selectedNode, false);
            }, 100);
        }
    }
    
    /**
     * 应用用户标签页状态
     * @param {Object} state - 用户标签页状态
     */
    applyUsersTabState(state) {
        const usersTab = document.getElementById('users-tab');
        if (!usersTab) return;
        
        // 恢复滚动位置
        if (state.scrollPosition) {
            usersTab.scrollTop = state.scrollPosition;
        }
        
        // 恢复选中的用户（不触发日志面板切换）
        if (state.selectedUser && this.usersTabContent) {
            setTimeout(() => {
                this.usersTabContent.setSelectedUser(state.selectedUser, false);
            }, 100);
        }
    }
    
    /**
     * 应用区块链标签页状态
     * @param {Object} state - 区块链标签页状态
     */
    applyChainsTabState(state) {
        const chainsTab = document.getElementById('chains-tab');
        if (!chainsTab) return;
        
        // 恢复滚动位置
        if (state.scrollPosition) {
            chainsTab.scrollTop = state.scrollPosition;
        }
        
        // 恢复选中的区块链（不触发日志面板切换）
        if (state.selectedChain && this.chainsTabContent) {
            setTimeout(() => {
                this.chainsTabContent.setSelectedChain(state.selectedChain, false);
            }, 100);
        }
    }
    
    /**
     * 更新标签页显示
     */
    updateTabDisplay() {
        try {
            // 更新标签页头部激活状态
            this.updateTabHeaders();
            
            // 更新标签页内容显示
            this.updateTabContent();
            
        } catch (error) {
            console.error('更新标签页显示失败:', error);
        }
    }
    
    /**
     * 更新标签页头部激活状态
     */
    updateTabHeaders() {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            const tabName = button.getAttribute('data-tab');
            if (tabName === this.activeTab) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }
    
    /**
     * 更新标签页内容显示
     */
    updateTabContent() {
        const tabPanes = document.querySelectorAll('.tab-pane');
        tabPanes.forEach(pane => {
            const tabName = pane.id.replace('-tab', '');
            if (tabName === this.activeTab) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });
    }
    
    /**
     * 处理标签页点击事件
     * @param {Event} event - 点击事件
     */
    handleTabClick(event) {
        const tabButton = event.target.closest('.tab-button');
        if (!tabButton) return;
        
        const tabName = tabButton.getAttribute('data-tab');
        if (tabName) {
            this.switchTab(tabName);
        }
    }
    
    /**
     * 处理状态变化事件
     * @param {string} tabName - 标签页名称
     * @param {Object} stateChange - 状态变化
     */
    handleStateChange(tabName, stateChange) {
        try {
            if (!this.isValidTabName(tabName)) {
                console.error('无效的标签页名称:', tabName);
                return;
            }
            
            // 保存状态变化（不管是否为当前激活标签页）
            //this.saveTabState(tabName, stateChange);
            
        } catch (error) {
            console.error('处理状态变化失败:', error);
        }
    }
    
    /**
     * 触发标签页切换事件
     * @param {string} previousTab - 之前的标签页
     * @param {string} currentTab - 当前标签页
     */
    triggerTabSwitchEvent(previousTab, currentTab) {
        const event = new CustomEvent('tabSwitch', {
            detail: {
                previousTab,
                currentTab,
                timestamp: Date.now()
            }
        });
        
        document.dispatchEvent(event);
    }
    
    /**
     * 持久化标签页状态到本地存储
     */
    //persistTabStates() {
        //try {
            //const stateData = {
                //activeTab: this.activeTab,
                //tabStates: this.tabStates,
                //timestamp: Date.now()
            //};
            
            //localStorage.setItem('mainPanelTabStates', JSON.stringify(stateData));
            
        //} catch (error) {
            //console.error('持久化标签页状态失败:', error);
        //}
    //}
    
    /**
     * 从本地存储恢复标签页状态
     */
    //restorePersistedStates() {
        //try {
            //const stateData = localStorage.getItem('mainPanelTabStates');
            //if (!stateData) {
                //console.log('本地存储中没有找到标签页状态数据');
                //return;
            //}
            
            //const parsedData = JSON.parse(stateData);
            
            //// 验证数据完整性
            //if (!this.validateStateData(parsedData)) {
                //console.warn('本地存储的状态数据格式无效，使用默认状态');
                //this.resetToDefaultStates();
                //return;
            //}
            
            //// 恢复标签页状态，使用安全合并
            //if (parsedData.tabStates) {
                //this.tabStates = this.mergeTabStates(this.tabStates, parsedData.tabStates);
            //}
            
            //// 恢复激活标签页
            //if (parsedData.activeTab && this.isValidTabName(parsedData.activeTab)) {
                //this.activeTab = parsedData.activeTab;
            //}
            
            //console.log('标签页状态已从本地存储恢复');
            
        //} catch (error) {
            //console.error('从本地存储恢复标签页状态失败:', error);
            //// 清除损坏的数据并使用默认状态
            //this.clearCorruptedState();
            //this.resetToDefaultStates();
        //}
    //}
    
    /**
     * 验证状态数据的完整性
     * @param {Object} stateData - 状态数据
     * @returns {boolean} - 数据是否有效
     */
    validateStateData(stateData) {
        try {
            // 检查基本结构
            if (!stateData || typeof stateData !== 'object') {
                return false;
            }
            
            // 检查必需的字段
            if (!stateData.tabStates || typeof stateData.tabStates !== 'object') {
                return false;
            }
            
            // 检查激活标签页
            if (stateData.activeTab && !this.isValidTabName(stateData.activeTab)) {
                return false;
            }
            
            // 检查各标签页状态结构
            const requiredTabs = ['network', 'users', 'chains'];
            for (const tabName of requiredTabs) {
                const tabState = stateData.tabStates[tabName];
                if (tabState && typeof tabState !== 'object') {
                    return false;
                }
            }
            
            return true;
            
        } catch (error) {
            console.error('验证状态数据时发生错误:', error);
            return false;
        }
    }
    
    /**
     * 安全合并标签页状态
     * @param {Object} defaultStates - 默认状态
     * @param {Object} restoredStates - 恢复的状态
     * @returns {Object} - 合并后的状态
     */
    mergeTabStates(defaultStates, restoredStates) {
        try {
            const mergedStates = { ...defaultStates };
            
            // 安全合并每个标签页的状态
            for (const tabName of ['network', 'users', 'chains']) {
                if (restoredStates[tabName] && typeof restoredStates[tabName] === 'object') {
                    mergedStates[tabName] = {
                        ...defaultStates[tabName],
                        ...restoredStates[tabName]
                    };
                    
                    // 验证特定字段的有效性
                    this.validateAndSanitizeTabState(tabName, mergedStates[tabName]);
                }
            }
            
            return mergedStates;
            
        } catch (error) {
            console.error('合并标签页状态时发生错误:', error);
            return defaultStates;
        }
    }
    
    /**
     * 验证和清理标签页状态
     * @param {string} tabName - 标签页名称
     * @param {Object} tabState - 标签页状态
     */
    validateAndSanitizeTabState(tabName, tabState) {
        try {
            switch (tabName) {
                case 'network':
                    // 验证选中节点
                    if (tabState.selectedNode !== null && 
                        (typeof tabState.selectedNode !== 'number' || tabState.selectedNode < 0)) {
                        tabState.selectedNode = null;
                    }
                    break;
                    
                case 'users':
                    // 验证选中用户
                    if (tabState.selectedUser !== null && 
                        (typeof tabState.selectedUser !== 'string' || !tabState.selectedUser.trim())) {
                        tabState.selectedUser = null;
                    }
                    break;
                    
                case 'chains':
                    // 验证选中区块链
                    if (tabState.selectedChain !== null && 
                        (typeof tabState.selectedChain !== 'string' || !tabState.selectedChain.trim())) {
                        tabState.selectedChain = null;
                    }
                    break;
            }
            
            // 验证滚动位置
            if (typeof tabState.scrollPosition !== 'number' || tabState.scrollPosition < 0) {
                tabState.scrollPosition = 0;
            }
            
            // 验证最后更新时间
            if (tabState.lastUpdateTime !== null && 
                (typeof tabState.lastUpdateTime !== 'number' || tabState.lastUpdateTime <= 0)) {
                tabState.lastUpdateTime = null;
            }
            
        } catch (error) {
            console.error(`验证标签页状态时发生错误 (${tabName}):`, error);
        }
    }
    
    /**
     * 清除损坏的状态数据
     */
    clearCorruptedState() {
        try {
            localStorage.removeItem('mainPanelTabStates');
            console.log('已清除损坏的状态数据');
        } catch (error) {
            console.error('清除损坏状态数据失败:', error);
        }
    }
    
    /**
     * 重置为默认状态
     */
    resetToDefaultStates() {
        this.activeTab = 'help';
        this.tabStates = {
            network: { 
                selectedNode: null,
                networkGraphConfig: null,
                lastUpdateTime: null,
                scrollPosition: 0
            },
            users: { 
                selectedUser: null,
                scrollPosition: 0,
                lastUpdateTime: null
            },
            chains: { 
                selectedChain: null,
                scrollPosition: 0,
                lastUpdateTime: null
            }
        };
        
        console.log('标签页状态已重置为默认值');
    }
    
    /**
     * 验证标签页名称是否有效
     * @param {string} tabName - 标签页名称
     * @returns {boolean} - 是否有效
     */
    isValidTabName(tabName) {
        return ['help', 'network', 'users', 'chains'].includes(tabName);
    }
    
    /**
     * 获取当前激活的标签页
     * @returns {string} - 当前激活的标签页名称
     */
    getActiveTab() {
        return this.activeTab;
    }
    
    /**
     * 获取指定标签页的状态
     * @param {string} tabName - 标签页名称
     * @returns {Object} - 标签页状态
     */
    getTabState(tabName) {
        if (!this.isValidTabName(tabName)) {
            return null;
        }
        return this.tabStates[tabName];
    }
    
    /**
     * 添加事件监听器
     * @param {string} eventType - 事件类型
     * @param {Function} handler - 事件处理器
     */
    addEventListener(eventType, handler) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(handler);
    }
    
    /**
     * 移除事件监听器
     * @param {string} eventType - 事件类型
     * @param {Function} handler - 事件处理器
     */
    removeEventListener(eventType, handler) {
        if (this.eventListeners.has(eventType)) {
            const handlers = this.eventListeners.get(eventType);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    /**
     * 显示节点详情（占位方法，将在后续任务中实现）
     * @param {string} nodeId - 节点ID
     */
    showNodeDetails(nodeId) {
        // 这个方法将在后续的任务中实现
        console.log('显示节点详情:', nodeId);
    }
    
    /**
     * 显示用户详情（占位方法，将在后续任务中实现）
     * @param {string} userId - 用户ID
     */
    showUserDetails(userId) {
        // 这个方法将在后续的任务中实现
        console.log('显示用户详情:', userId);
    }
    
    /**
     * 显示区块链详情
     * @param {string} chainId - 区块链ID
     */
    showChainDetails(chainId) {
        try {
            // 确保切换到区块链标签页
            if (this.activeTab !== 'chains') {
                this.switchTab('chains');
            }
            
            // 通过ChainsTabContent显示区块链详情
            if (this.chainsTabContent) {
                // 延迟执行以确保标签页切换完成
                setTimeout(() => {
                    this.chainsTabContent.setSelectedChain(chainId);
                }, 100);
            } else {
                console.error('ChainsTabContent 未初始化');
            }
            
            console.log('显示区块链详情:', chainId);
            
        } catch (error) {
            console.error('显示区块链详情失败:', error);
        }
    }
    
    /**
     * 初始化标签页管理器
     */
    init() {
        try {
            // 初始化标签页内容组件
            this.initTabContentComponents();
            
            // 初始化调整大小管理器
            this.initResizeManager();
            
            // 从本地存储恢复状态
            //this.restorePersistedStates();
            
            // 绑定事件监听器
            this.bindEventListeners();
            
            // 延迟应用恢复的状态，确保DOM已准备好
            setTimeout(() => {
                this.applyRestoredState();
            }, 100);
            
            console.log('TabManager 初始化完成，当前激活标签页:', this.activeTab);
            
        } catch (error) {
            console.error('TabManager 初始化失败:', error);
            this.resetToDefaultStates();
        }
    }
    
    /**
     * 初始化调整大小管理器
     */
    initResizeManager() {
        try {
            // 创建调整大小管理器实例
            this.resizeManager = new ResizeManager(this);
            
            // 初始化调整大小功能
            this.resizeManager.initialize();
            
            console.log('调整大小管理器初始化完成');
            
        } catch (error) {
            console.error('调整大小管理器初始化失败:', error);
        }
    }
    
    /**
     * 初始化标签页内容组件
     */
    initTabContentComponents() {
        try {
            // 初始化帮助标签页内容组件
            this.helpTabContent = new HelpTabContent(this);
            
            // 初始化网络标签页内容组件
            this.networkTabContent = new NetworkTabContent(this);
            
            // 初始化用户标签页内容组件
            this.usersTabContent = new UsersTabContent(this);
            
            // 初始化区块链标签页内容组件
            this.chainsTabContent = new ChainsTabContent(this);
            
            console.log('标签页内容组件初始化完成');
            
        } catch (error) {
            console.error('标签页内容组件初始化失败:', error);
        }
    }
    
    /**
     * 应用恢复的状态
     */
    applyRestoredState() {
        try {
            // 更新UI显示以反映恢复的激活标签页
            this.updateTabDisplay();
            
            // 立即加载当前激活标签页的内容
            this.lazyLoadTabContent(this.activeTab);
            
            // 恢复当前激活标签页的状态
            this.restoreTabState(this.activeTab);
            
            console.log('恢复的状态已应用，当前激活标签页:', this.activeTab);
            
        } catch (error) {
            console.error('应用恢复状态失败:', error);
            // 如果应用恢复状态失败，重置为默认状态
            this.resetToDefaultStates();
            this.updateTabDisplay();
        }
    }
    
    /**
     * 绑定事件监听器
     */
    bindEventListeners() {
        // 绑定标签页点击事件
        document.addEventListener('click', (event) => {
            if (event.target.closest('.tab-button')) {
                this.handleTabClick(event);
            }
        });
        
        // 绑定页面卸载事件，保存状态
        window.addEventListener('beforeunload', () => {
            //this.saveCurrentTabState();
            //this.persistTabStates();
        });
        
        // 绑定页面可见性变化事件，在页面隐藏时保存状态
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                //this.saveCurrentTabState();
                //this.persistTabStates();
            }
        });
    }
    
    /**
     * 增量更新数据 (性能优化版本)
     * @param {Object} newData - 新数据
     * @param {Object} previousData - 之前的数据
     */
    updateDataIncremental(newData, previousData = null) {
        try {
            // 如果正在更新中，将更新加入队列
            if (this.isUpdating) {
                this.queueUpdate(newData);
                return;
            }
            
            this.isUpdating = true;
            
            // 只更新当前激活的标签页
            const activeTabState = this.tabStates[this.activeTab];
            if (!activeTabState.isVisible) {
                this.isUpdating = false;
                return;
            }
            
            // 根据激活的标签页类型进行增量更新
            switch (this.activeTab) {
                case 'help':
                    // 帮助页面无需数据更新
                    break;
                case 'network':
                    this.updateNetworkDataIncremental(newData.AllPeers, previousData?.networkData);
                    break;
                case 'users':
                    this.updateUsersDataIncremental(newData.userData, previousData?.userData);
                    break;
                case 'chains':
                    //this.updateChainsDataIncremental(newData.chainData, previousData?.chainData);
                    break;
            }
            
            // 更新最后更新时间
            activeTabState.lastUpdateTime = Date.now();
            
            this.isUpdating = false;
            
            // 处理队列中的更新
            this.processUpdateQueue();
            
        } catch (error) {
            console.error('增量更新数据失败:', error);
            this.isUpdating = false;
        }
    }
    
    /**
     * 将更新加入队列
     * @param {Object} updateData - 更新数据
     */
    queueUpdate(updateData) {
        const updateId = Date.now() + Math.random();
        this.updateQueue.set(updateId, {
            data: updateData,
            timestamp: Date.now()
        });
        
        // 限制队列大小，移除过旧的更新
        if (this.updateQueue.size > 10) {
            const oldestKey = Array.from(this.updateQueue.keys())[0];
            this.updateQueue.delete(oldestKey);
        }
    }
    
    /**
     * 处理更新队列
     */
    processUpdateQueue() {
        if (this.updateQueue.size === 0 || this.isUpdating) {
            return;
        }
        
        // 获取最新的更新数据
        const latestUpdate = Array.from(this.updateQueue.values()).pop();
        this.updateQueue.clear();
        
        // 递归处理最新更新
        if (latestUpdate) {
            this.updateDataIncremental(latestUpdate.data);
        }
    }
    
    /**
     * 增量更新网络数据
     * @param {Object} newNetworkData - 新网络数据
     * @param {Object} previousNetworkData - 之前的网络数据
     */
    updateNetworkDataIncremental(newNetworkData, previousNetworkData) {
        if (!this.networkTabContent || !newNetworkData) {
            return;
        }
        
        //try {
            // 直接进行完整渲染，确保数据能正确显示
            this.networkTabContent.renderNetworkGraph(newNetworkData);
            
        //} catch (error) {
            //console.error('增量更新网络数据失败:', error);
        //}
    }
    
    /**
     * 增量更新用户数据
     * @param {Map} newUserData - 新用户数据
     * @param {Map} previousUserData - 之前的用户数据
     */
    updateUsersDataIncremental(newUserData, previousUserData) {
        if (!this.usersTabContent || !newUserData) {
            return;
        }
        
        try {
            // 直接进行完整渲染，确保数据能正确显示
            this.usersTabContent.renderUsersGrid(newUserData);
            
        } catch (error) {
            console.error('增量更新用户数据失败:', error);
        }
    }
    
    /**
     * 增量更新区块链数据
     * @param {Map} newChainData - 新区块链数据
     * @param {Map} previousChainData - 之前的区块链数据
     */
    updateChainsDataIncremental(newChainData, previousChainData) {
        if (!this.chainsTabContent || !newChainData) {
            return;
        }
        
        try {
            // 直接进行完整渲染，确保数据能正确显示
            this.chainsTabContent.renderChainsGrid(newChainData);
            
        } catch (error) {
            console.error('增量更新区块链数据失败:', error);
        }
    }
    
    /**
     * 检查网络配置是否发生变化
     * @param {Object} newData - 新数据
     * @param {Object} previousData - 之前的数据
     * @returns {boolean} - 是否发生变化
     */
    hasNetworkConfigChanged(newData, previousData) {
        if (!previousData) return true;
        
        return (
            newData.nodeCount !== previousData.nodeCount ||
            newData.maxConnections !== previousData.maxConnections ||
            newData.failureRate !== previousData.failureRate
        );
    }
    
    /**
     * 只更新网络统计信息
     * @param {Object} networkData - 网络数据
     */
    updateNetworkStatsOnly(networkData) {
        const container = document.getElementById('network-graph');
        if (!container) return;
        
        const statsContainer = container.querySelector('.network-stats');
        if (statsContainer) {
            const nodeCount = networkData.nodeCount || 0;
            const failedConnections = Math.floor((networkData.totalConnections || 0) * (networkData.failureRate || 0));
            
            statsContainer.innerHTML = `
                <span class="network-stat">节点: ${nodeCount}</span>
                <span class="network-stat">连接: ${networkData.activeConnections || 0}</span>
                <span class="network-stat">故障: ${failedConnections}</span>
            `;
        }
    }
    
    /**
     * 找出发生变化的用户
     * @param {Map} newUserData - 新用户数据
     * @param {Map} previousUserData - 之前的用户数据
     * @returns {Map} - 发生变化的用户
     */
    findChangedUsers(newUserData, previousUserData) {
        const changedUsers = new Map();
        
        // 检查新增或修改的用户
        for (const [userId, newUser] of newUserData) {
            const previousUser = previousUserData.get(userId);
            
            if (!previousUser || this.hasUserChanged(newUser, previousUser)) {
                changedUsers.set(userId, newUser);
            }
        }
        
        // 检查删除的用户
        for (const [userId] of previousUserData) {
            if (!newUserData.has(userId)) {
                changedUsers.set(userId, null); // null 表示删除
            }
        }
        
        return changedUsers;
    }
    
    /**
     * 找出发生变化的区块链
     * @param {Map} newChainData - 新区块链数据
     * @param {Map} previousChainData - 之前的区块链数据
     * @returns {Map} - 发生变化的区块链
     */
    findChangedChains(newChainData, previousChainData) {
        const changedChains = new Map();
        
        // 检查新增或修改的区块链
        for (const [chainId, newChain] of newChainData) {
            const previousChain = previousChainData.get(chainId);
            
            if (!previousChain || this.hasChainChanged(newChain, previousChain)) {
                changedChains.set(chainId, newChain);
            }
        }
        
        // 检查删除的区块链
        for (const [chainId] of previousChainData) {
            if (!newChainData.has(chainId)) {
                changedChains.set(chainId, null); // null 表示删除
            }
        }
        
        return changedChains;
    }
    
    /**
     * 检查用户是否发生变化
     * @param {Object} newUser - 新用户数据
     * @param {Object} previousUser - 之前的用户数据
     * @returns {boolean} - 是否发生变化
     */
    hasUserChanged(newUser, previousUser) {
        return (
            newUser.totalAssets !== previousUser.totalAssets ||
            newUser.isTransferring !== previousUser.isTransferring ||
            newUser.chainCount !== previousUser.chainCount
        );
    }
    
    /**
     * 检查区块链是否发生变化
     * @param {Object} newChain - 新区块链数据
     * @param {Object} previousChain - 之前的区块链数据
     * @returns {boolean} - 是否发生变化
     */
    hasChainChanged(newChain, previousChain) {
        return (
            newChain.value !== previousChain.value ||
            newChain.isTransferring !== previousChain.isTransferring ||
            newChain.ownerId !== previousChain.ownerId
        );
    }
    
    /**
     * 只更新发生变化的用户
     * @param {Map} changedUsers - 发生变化的用户
     */
    updateChangedUsersOnly(changedUsers) {
        const usersGrid = document.querySelector('#users-container .users-grid');
        if (!usersGrid) return;
        
        for (const [userId, user] of changedUsers) {
            if (user === null) {
                // 删除用户卡片
                const userCard = usersGrid.querySelector(`[data-user-id="${userId}"]`);
                if (userCard) {
                    userCard.remove();
                }
            } else {
                // 更新或创建用户卡片
                this.updateUserCard(usersGrid, userId, user);
            }
        }
    }
    
    /**
     * 只更新发生变化的区块链
     * @param {Map} changedChains - 发生变化的区块链
     */
    updateChangedChainsOnly(changedChains) {
        const chainsGrid = document.querySelector('#chains-container .chains-grid');
        if (!chainsGrid) return;
        
        for (const [chainId, chain] of changedChains) {
            if (chain === null) {
                // 删除区块链卡片
                const chainCard = chainsGrid.querySelector(`[data-chain-id="${chainId}"]`);
                if (chainCard) {
                    chainCard.remove();
                }
            } else {
                // 更新或创建区块链卡片
                this.updateChainCard(chainsGrid, chainId, chain);
            }
        }
    }
    
    /**
     * 更新用户卡片
     * @param {Element} usersGrid - 用户网格容器
     * @param {string} userId - 用户ID
     * @param {Object} user - 用户数据
     */
    updateUserCard(usersGrid, userId, user) {
        let userCard = usersGrid.querySelector(`[data-user-id="${userId}"]`);
        const isTransferring = user.isTransferring || false;
        
        if (!userCard) {
            // 创建新的用户卡片
            userCard = document.createElement('div');
            userCard.className = `user-card ${isTransferring ? 'transferring' : ''}`;
            userCard.setAttribute('data-user-id', userId);
            usersGrid.appendChild(userCard);
            
            // 添加点击事件监听器
            userCard.addEventListener('click', () => {
                if (this.usersTabContent) {
                    this.usersTabContent.handleUserClick(userId);
                }
            });
        }
        
        // 更新卡片内容
        userCard.innerHTML = `
            <div class="user-id">用户${user.displayNumber || '?'}</div>
            <div class="user-assets">${user.totalAssets || 0}</div>
            ${isTransferring ? '<div class="transfer-indicator">转账中</div>' : ''}
        `;
        
        // 更新样式类
        userCard.className = `user-card ${isTransferring ? 'transferring' : ''}`;
    }
    
    /**
     * 更新区块链卡片
     * @param {Element} chainsGrid - 区块链网格容器
     * @param {string} chainId - 区块链ID
     * @param {Object} chain - 区块链数据
     */
    updateChainCard(chainsGrid, chainId, chain) {
        let chainCard = chainsGrid.querySelector(`[data-chain-id="${chainId}"]`);
        const isTransferring = chain.isTransferring || false;
        
        if (!chainCard) {
            // 创建新的区块链卡片
            chainCard = document.createElement('div');
            chainCard.className = `chain-card ${isTransferring ? 'transferring' : ''}`;
            chainCard.setAttribute('data-chain-id', chainId);
            chainsGrid.appendChild(chainCard);
            
            // 添加点击事件监听器
            chainCard.addEventListener('click', () => {
                if (this.chainsTabContent) {
                    this.chainsTabContent.handleChainClick(chainId);
                }
            });
        }
        
        // 更新卡片内容
        chainCard.innerHTML = `
            <div class="chain-id">链${chain.displayNumber || '?'}</div>
            <div class="chain-value">${chain.value || 0}</div>
            <div class="chain-status">${isTransferring ? '转移中' : '正常'}</div>
        `;
        
        // 更新样式类
        chainCard.className = `chain-card ${isTransferring ? 'transferring' : ''}`;
    }
    
    /**
     * 清理性能优化相关资源
     */
    cleanupPerformanceResources() {
        // 取消待处理的 requestAnimationFrame
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        
        // 清空更新队列
        this.updateQueue.clear();
        
        // 重置更新状态
        this.isUpdating = false;
        this.pendingUpdates.clear();
    }
    
    /**
     * 销毁标签页管理器
     */
    destroy() {
        try {
            // 保存当前状态
            //this.saveCurrentTabState();
            //this.persistTabStates();
            
            // 清理性能优化相关资源
            this.cleanupPerformanceResources();
            
            // 清理事件监听器
            this.eventListeners.clear();
            
            // 销毁标签页内容组件
            if (this.networkTabContent) {
                this.networkTabContent.destroy();
            }
            if (this.usersTabContent) {
                this.usersTabContent.destroy();
            }
            if (this.chainsTabContent) {
                this.chainsTabContent.destroy();
            }
            
            console.log('TabManager 已销毁');
            
        } catch (error) {
            console.error('TabManager 销毁失败:', error);
        }
    }
}

// 导出 TabManager 类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TabManager;
}

// ES6 导出
if (typeof window !== 'undefined') {
    window.TabManager = TabManager;
}