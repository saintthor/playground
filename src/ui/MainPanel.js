/**
 * MainPanel - 主面板
 * 负责显示用户资产、区块链归属和网络状态信息
 */
export class MainPanel {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.app = uiManager.app;
        this.isInitialized = false;
        
        // 数据缓存
        this.userData = new Map(); // userId -> { totalAssets, ownedChains }
        this.chainData = new Map(); // chainId -> { owner, value, serialNumber }
        this.networkData = {
            totalUsers: 0,
            totalChains: 0,
            totalValue: 0,
            activeConnections: 0
        };
        
        // 选中状态
        this.selectedUser = null;
        this.selectedChain = null;
        
        // 更新间隔
        this.updateInterval = null;
        this.refreshRate = 1000; // 1秒更新一次
    }

    /**
     * 初始化主面板
     */
    init() {
        try {
            this.setupEventListeners();
            this.renderInitialContent();
            this.isInitialized = true;
            console.log('MainPanel 初始化完成');
        } catch (error) {
            console.error('MainPanel 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 渲染初始内容
     */
    renderInitialContent() {
        this.renderUserAssets();
        this.renderChainOwnership();
        this.renderNetworkStatus();
    }

    /**
     * 渲染用户资产显示
     */
    renderUserAssets() {
        const assetsContainer = document.querySelector('#user-assets .assets-display');
        if (!assetsContainer) {
            throw new Error('用户资产容器未找到');
        }

        if (this.userData.size === 0) {
            assetsContainer.innerHTML = '<p class="text-muted">系统未启动或无用户数据</p>';
            return;
        }

        let html = '<div class="user-assets-grid">';
        
        for (const [userId, userInfo] of this.userData) {
            const isSelected = this.selectedUser === userId;
            const publicKeyShort = userInfo.publicKey ? 
                this.formatBase64Short(userInfo.publicKey) : 'N/A';
            
            html += `
                <div class="user-asset-card ${isSelected ? 'selected' : ''}" 
                     data-user-id="${userId}">
                    <div class="user-header">
                        <h5 class="user-id">用户 ${userId}</h5>
                        <span class="user-key base64-data" 
                              data-full-data="${userInfo.publicKey || ''}"
                              title="点击查看详情">
                            ${publicKeyShort}
                        </span>
                    </div>
                    <div class="user-stats">
                        <div class="stat-item">
                            <span class="stat-label">拥有区块链:</span>
                            <span class="stat-value">${userInfo.chainCount || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">总资产:</span>
                            <span class="stat-value asset-value">${userInfo.totalAssets || 0}</span>
                        </div>
                    </div>
                    ${isSelected ? this.renderUserDetails(userId) : ''}
                </div>
            `;
        }
        
        html += '</div>';
        assetsContainer.innerHTML = html;
    }

    /**
     * 渲染用户详细信息
     */
    renderUserDetails(userId) {
        const userInfo = this.userData.get(userId);
        if (!userInfo || !userInfo.ownedChains) {
            return '<div class="user-details"><p class="text-muted">无详细信息</p></div>';
        }

        let html = '<div class="user-details">';
        html += '<h6>拥有的区块链:</h6>';
        html += '<div class="owned-chains-list">';
        
        for (const chain of userInfo.ownedChains) {
            const chainIdShort = this.formatBase64Short(chain.chainId);
            html += `
                <div class="owned-chain-item" data-chain-id="${chain.chainId}">
                    <span class="chain-id base64-data" 
                          data-full-data="${chain.chainId}"
                          title="点击查看区块链详情">
                        ${chainIdShort}
                    </span>
                    <span class="chain-serial">序列号: ${chain.serialNumber}</span>
                    <span class="chain-value">价值: ${chain.value}</span>
                </div>
            `;
        }
        
        html += '</div></div>';
        return html;
    }

    /**
     * 渲染区块链归属显示
     */
    renderChainOwnership() {
        const ownershipContainer = document.querySelector('#chain-ownership .ownership-display');
        if (!ownershipContainer) {
            throw new Error('区块链归属容器未找到');
        }

        if (this.chainData.size === 0) {
            ownershipContainer.innerHTML = '<p class="text-muted">系统未启动或无区块链数据</p>';
            return;
        }

        let html = '<div class="chain-ownership-grid">';
        
        // 按价值分组显示
        const chainsByValue = new Map();
        for (const [chainId, chainInfo] of this.chainData) {
            const value = chainInfo.value;
            if (!chainsByValue.has(value)) {
                chainsByValue.set(value, []);
            }
            chainsByValue.get(value).push({ chainId, ...chainInfo });
        }

        // 按价值排序
        const sortedValues = Array.from(chainsByValue.keys()).sort((a, b) => b - a);
        
        for (const value of sortedValues) {
            const chains = chainsByValue.get(value);
            html += `
                <div class="value-group">
                    <h6 class="value-header">面值 ${value} (${chains.length} 个)</h6>
                    <div class="chains-in-value">
            `;
            
            for (const chain of chains) {
                const isSelected = this.selectedChain === chain.chainId;
                const chainIdShort = this.formatBase64Short(chain.chainId);
                const ownerIdShort = chain.ownerId ? 
                    this.formatBase64Short(chain.ownerId) : 'N/A';
                
                html += `
                    <div class="chain-ownership-card ${isSelected ? 'selected' : ''}" 
                         data-chain-id="${chain.chainId}">
                        <div class="chain-header">
                            <span class="chain-id base64-data" 
                                  data-full-data="${chain.chainId}"
                                  title="点击查看区块链详情">
                                ${chainIdShort}
                            </span>
                            <span class="chain-serial">序列号: ${chain.serialNumber}</span>
                        </div>
                        <div class="chain-owner">
                            <span class="owner-label">所有者:</span>
                            <span class="owner-id base64-data" 
                                  data-full-data="${chain.ownerId || ''}"
                                  data-user-id="${chain.ownerUserId || ''}"
                                  title="点击查看用户详情">
                                ${ownerIdShort}
                            </span>
                        </div>
                        ${isSelected ? this.renderChainDetails(chain.chainId) : ''}
                    </div>
                `;
            }
            
            html += '</div></div>';
        }
        
        html += '</div>';
        ownershipContainer.innerHTML = html;
    }

    /**
     * 渲染区块链详细信息
     */
    renderChainDetails(chainId) {
        const chainInfo = this.chainData.get(chainId);
        if (!chainInfo || !chainInfo.blocks) {
            return '<div class="chain-details"><p class="text-muted">无详细信息</p></div>';
        }

        let html = '<div class="chain-details">';
        html += '<h6>区块链中的所有区块:</h6>';
        html += '<div class="blocks-list">';
        
        for (const block of chainInfo.blocks) {
            const blockIdShort = this.formatBase64Short(block.blockId);
            const creatorShort = this.formatBase64Short(block.creator);
            
            html += `
                <div class="block-item" data-block-id="${block.blockId}">
                    <div class="block-header">
                        <span class="block-id base64-data" 
                              data-full-data="${block.blockId}"
                              title="区块ID">
                            ${blockIdShort}
                        </span>
                        <span class="block-type">${this.getBlockTypeText(block.type)}</span>
                    </div>
                    <div class="block-info">
                        <span class="block-creator">创建者: 
                            <span class="base64-data" 
                                  data-full-data="${block.creator}">
                                ${creatorShort}
                            </span>
                        </span>
                        <span class="block-time">${this.formatTimestamp(block.timestamp)}</span>
                    </div>
                </div>
            `;
        }
        
        html += '</div></div>';
        return html;
    }

    /**
     * 渲染网络状态显示
     */
    renderNetworkStatus() {
        const networkContainer = document.querySelector('#network-status .network-display');
        if (!networkContainer) {
            throw new Error('网络状态容器未找到');
        }

        const html = `
            <div class="network-stats-grid">
                <div class="network-stat-card">
                    <h6>总用户数</h6>
                    <div class="stat-value">${this.networkData.totalUsers}</div>
                </div>
                <div class="network-stat-card">
                    <h6>总区块链数</h6>
                    <div class="stat-value">${this.networkData.totalChains}</div>
                </div>
                <div class="network-stat-card">
                    <h6>总价值</h6>
                    <div class="stat-value">${this.networkData.totalValue}</div>
                </div>
                <div class="network-stat-card">
                    <h6>活跃连接</h6>
                    <div class="stat-value">${this.networkData.activeConnections}</div>
                </div>
            </div>
        `;
        
        networkContainer.innerHTML = html;
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 用户卡片点击事件
        document.addEventListener('click', (event) => {
            const userCard = event.target.closest('[data-user-id]');
            if (userCard) {
                const userId = userCard.dataset.userId;
                this.handleUserClick(userId);
                return;
            }

            const chainCard = event.target.closest('[data-chain-id]');
            if (chainCard) {
                const chainId = chainCard.dataset.chainId;
                this.handleChainClick(chainId);
                return;
            }
        });
    }

    /**
     * 处理用户点击事件
     */
    handleUserClick(userId) {
        if (this.selectedUser === userId) {
            // 取消选择
            this.selectedUser = null;
        } else {
            // 选择用户
            this.selectedUser = userId;
            this.selectedChain = null; // 清除区块链选择
        }
        
        // 重新渲染
        this.renderUserAssets();
        this.renderChainOwnership();
        
        // 通知应用
        if (this.app && this.app.handleUserSelection) {
            this.app.handleUserSelection(this.selectedUser);
        }
        
        console.log('用户选择:', userId);
    }

    /**
     * 处理区块链点击事件
     */
    handleChainClick(chainId) {
        if (this.selectedChain === chainId) {
            // 取消选择
            this.selectedChain = null;
        } else {
            // 选择区块链
            this.selectedChain = chainId;
            this.selectedUser = null; // 清除用户选择
        }
        
        // 重新渲染
        this.renderUserAssets();
        this.renderChainOwnership();
        
        // 通知应用
        if (this.app && this.app.handleChainSelection) {
            this.app.handleChainSelection(this.selectedChain);
        }
        
        console.log('区块链选择:', chainId);
    }

    /**
     * 更新用户数据
     * @param {Map} userData - 用户数据映射
     */
    updateUserData(userData) {
        this.userData = new Map(userData);
        if (this.isInitialized) {
            this.renderUserAssets();
        }
    }

    /**
     * 更新区块链数据
     * @param {Map} chainData - 区块链数据映射
     */
    updateChainData(chainData) {
        this.chainData = new Map(chainData);
        if (this.isInitialized) {
            this.renderChainOwnership();
        }
    }

    /**
     * 更新网络数据
     * @param {Object} networkData - 网络数据
     */
    updateNetworkData(networkData) {
        this.networkData = { ...this.networkData, ...networkData };
        if (this.isInitialized) {
            this.renderNetworkStatus();
        }
    }

    /**
     * 更新所有数据
     * @param {Object} data - 包含所有数据的对象
     */
    updateAllData(data) {
        if (data.userData) {
            this.updateUserData(data.userData);
        }
        if (data.chainData) {
            this.updateChainData(data.chainData);
        }
        if (data.networkData) {
            this.updateNetworkData(data.networkData);
        }
    }

    /**
     * 开始实时更新
     */
    startRealTimeUpdate() {
        if (this.updateInterval) {
            this.stopRealTimeUpdate();
        }
        
        this.updateInterval = setInterval(() => {
            this.requestDataUpdate();
        }, this.refreshRate);
        
        console.log('主面板实时更新已启动');
    }

    /**
     * 停止实时更新
     */
    stopRealTimeUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        console.log('主面板实时更新已停止');
    }

    /**
     * 请求数据更新
     */
    requestDataUpdate() {
        if (this.app && this.app.getMainPanelData) {
            const data = this.app.getMainPanelData();
            this.updateAllData(data);
        }
    }

    /**
     * 设置刷新率
     * @param {number} rate - 刷新率（毫秒）
     */
    setRefreshRate(rate) {
        this.refreshRate = Math.max(100, rate); // 最小100ms
        
        if (this.updateInterval) {
            this.stopRealTimeUpdate();
            this.startRealTimeUpdate();
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
     * 获取区块类型文本
     * @param {string} type - 区块类型
     * @returns {string} 类型文本
     */
    getBlockTypeText(type) {
        const typeMap = {
            'root': '根区块',
            'ownership': '所有权区块',
            'transfer': '转移区块'
        };
        return typeMap[type] || type;
    }

    /**
     * 格式化时间戳
     * @param {number} timestamp - 时间戳
     * @returns {string} 格式化的时间字符串
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleString('zh-CN');
    }

    /**
     * 获取选中的用户
     * @returns {string|null} 选中的用户ID
     */
    getSelectedUser() {
        return this.selectedUser;
    }

    /**
     * 获取选中的区块链
     * @returns {string|null} 选中的区块链ID
     */
    getSelectedChain() {
        return this.selectedChain;
    }

    /**
     * 设置选中的用户
     * @param {string|null} userId - 用户ID
     */
    setSelectedUser(userId) {
        this.selectedUser = userId;
        this.selectedChain = null;
        if (this.isInitialized) {
            this.renderUserAssets();
            this.renderChainOwnership();
        }
    }

    /**
     * 设置选中的区块链
     * @param {string|null} chainId - 区块链ID
     */
    setSelectedChain(chainId) {
        this.selectedChain = chainId;
        this.selectedUser = null;
        if (this.isInitialized) {
            this.renderUserAssets();
            this.renderChainOwnership();
        }
    }

    /**
     * 清除所有选择
     */
    clearSelection() {
        this.selectedUser = null;
        this.selectedChain = null;
        if (this.isInitialized) {
            this.renderUserAssets();
            this.renderChainOwnership();
        }
    }

    /**
     * 销毁主面板
     */
    destroy() {
        this.stopRealTimeUpdate();
        this.userData.clear();
        this.chainData.clear();
        this.selectedUser = null;
        this.selectedChain = null;
        this.isInitialized = false;
        console.log('MainPanel 已销毁');
    }
}