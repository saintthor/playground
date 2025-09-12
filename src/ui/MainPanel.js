/**
 * MainPanel - 主面板
 * 负责显示网络状态、用户资产等信息
 */
class MainPanel {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.app = uiManager.app;
        this.isInitialized = false;
        this.updateInterval = null;
        this.networkGraphInitialized = false;
        this.networkLinks = null;
        this.networkSimulation = null;
        
        // 标签页管理器
        this.tabManager = null;
    }
    
    init()
    {
        try
        {
            this.render();
            this.initTabMgr();
            this.isInitialized = true;
            //console.log( 'MainPanel 初始化完成' );
        }
        catch( error )
        {
            console.error( 'MainPanel 初始化失败:', error );
        }
    }
    
    /**
     * 初始化标签页管理器
     */
    initTabMgr()
    {
        try
        {
            // 创建标签页管理器实例
            this.tabManager = new TabManager( this );
            
            // 初始化标签页管理器
            this.tabManager.init();
            
            console.log( 'TabManager 已集成到 MainPanel' );
        }
        catch( error )
        {
            console.error( 'TabManager 初始化失败:', error );
        }
    }
    
    render()
    {
        const mainPanel = document.getElementById( 'main-panel' );
        if( !mainPanel ) return;
        
        const panelContent = mainPanel.querySelector( '.panel-content' );
        if( !panelContent ) return;
        
        // 生成标签页HTML结构
        panelContent.innerHTML = `
            <div class="main-panel-tabs">
                <div class="tab-header">
                    <div class="tab-actions">
                        <button class="btn btn-primary btn-sm" id="send-btn" data-text="transfer" onclick="window.mainPanel.Transfer()">${GetText('transfer')}</button>
                        <button class="btn btn-danger btn-sm" id="attack-btn" data-text="attack" onclick="window.mainPanel.Attack()">${GetText('attack')}</button>
                    </div>
                    <div class="tab-buttons">
                        <button class="tab-button active" data-tab="help" data-text="help_tab">${GetText('help_tab')}</button>
                        <button class="tab-button" data-tab="network" data-text="network_tab">${GetText('network_tab')}</button>
                        <button class="tab-button" data-tab="users" data-text="users_tab">${GetText('users_tab')}</button>
                        <button class="tab-button" data-tab="chains" data-text="chains_tab">${GetText('chains_tab')}</button>
                    </div>
                </div>
                
                <div class="tab-content active">
                    <div class="tab-pane" id="help-tab">
                        <div class="help-content" id="help-content">
                            <div class="help-loading">Loading...</div>
                        </div>
                    </div>
                    
                    <div class="tab-pane" id="network-tab">
                        <div class="tab-section-upper">
                            <div class="network-layout">
                                <div class="network-stats-panel">
                                </div>
                                <div class="network-graph-panel">
                                    <div class="network-visual" id="network-visual">
                                        <div id="d3-network-container" style="width: 100%; height: 100%;">
                                            <p class="text-muted" data-text="sys_not_started">${GetText('sys_not_started')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="tab-section-lower">
                            <div class="node-details-container" id="node-details-container">
                                <p class="text-muted" data-text="click_node_prompt">${GetText('click_node_prompt')}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="tab-pane" id="users-tab">
                        <div class="tab-section-upper">
                            <div class="users-container" id="users-container">
                                <p class="text-muted" data-text="sys_not_started">${GetText('sys_not_started')}</p>
                            </div>
                        </div>
                        <div class="tab-section-lower">
                            <div class="user-details-container" id="user-details-container">
                                <p class="text-muted" data-text="click_user">${GetText('click_user')}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="tab-pane" id="chains-tab">
                        <div class="tab-section-upper">
                            <div class="chains-container" id="chains-container">
                                <p class="text-muted" data-text="sys_not_started">${GetText('sys_not_started')}</p>
                            </div>
                        </div>
                        <div class="tab-section-lower">
                            <div class="chain-details-container" id="chain-details-container">
                                <p class="text-muted" data-text="click_chain">${GetText('click_chain')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }    

    updateAllData( data )
    {
        if( !this.isInitialized ) return;
        
        // 使用增量更新系统（性能优化版本）
        if( this.tabManager )
        {
            this.tabManager.updateDataIncremental( data, this.lastData );
        }
        
        // 保存当前数据作为下次更新的参考
        this.lastData = this.cloneData( data );
    }
    
    Transfer()
    {
        let TargetChain = this.tabManager.chainsTabContent.GetSelected();
        if( !TargetChain )
        {
            const SrcUser = this.tabManager.usersTabContent.GetSelected();
            TargetChain = SrcUser?.RandChain || this.app.AllBlockchains.RandVal();
        }
        //console.log( TargetChain );
        window.LogPanel.AddLog( { dida: this.app.Tick, blockchain: TargetChain.Id, content: 'start transfer.', category: 'blockchain' } );
        const UserIds = [...this.app.AllUsers.keys()].filter( uid => uid != TargetChain.Owner.Id );
        if( UserIds.length > 0 )
        {
            const idx = Math.floor( Math.random() * UserIds.length );
            TargetChain.Owner.Transfer( this.app.Tick, TargetChain, UserIds[idx] );     
            this.LastTransUser = TargetChain.Owner;
        } 
    }
    
    Attack()
    {
        if( !this.LastTransUser )
        {
            console.log( 'transfer once before attacking.' );
            return;
        }
        this.LastTransUser.DoubleSpend( this.app.Tick );
     }


    /**
     * 深度克隆数据用于增量更新比较
     * @param {Object} data - 要克隆的数据
     * @returns {Object} - 克隆后的数据
     */
    cloneData( data )
    {
        try
        {
            // 对于Map类型的数据，需要特殊处理
            const clonedData = { };
            
            if( data.networkData )
            {
                clonedData.networkData = { ...data.networkData };
            }
            
            if( data.userData )
            {
                clonedData.userData = new Map( );
                for( const [key, value] of data.userData )
                {
                    clonedData.userData.set( key, { ...value } );
                }
            }
            
            if( data.chainData )
            {
                clonedData.chainData = new Map( );
                for( const [key, value] of data.chainData )
                {
                    clonedData.chainData.set( key, { ...value } );
                }
            }
            
            return clonedData;
            
        }
        catch( error )
        {
            console.error( '深度克隆数据失败:', error );
            return data; // 回退到原始数据
        }
    }
    
    renderNetworkGraph(container, networkData) {
        if (!networkData) {
            container.innerHTML = `<p class="text-muted" data-text="no_network_data">${GetText('no_network_data')}</p>`;
            this.networkGraphInitialized = false;
            return;
        }
        
        const nodeCount = networkData.nodeCount || 0;
        const failedConnections = Math.floor((networkData.totalConnections || 0) * (networkData.failureRate || 0));
        
        // 检查网络配置是否发生变化
        const currentConfig = {
            nodeCount: nodeCount,
            maxConnections: networkData.maxConnections || 3,
            failureRate: networkData.failureRate || 0
        };
        
        const configChanged = !this.lastNetworkConfig || 
            this.lastNetworkConfig.nodeCount !== currentConfig.nodeCount ||
            this.lastNetworkConfig.maxConnections !== currentConfig.maxConnections ||
            this.lastNetworkConfig.failureRate !== currentConfig.failureRate;
        
        // 如果网络图还未初始化，创建完整的HTML结构
        if (!this.networkGraphInitialized) {
            const html = `
                <div class="network-graph-display">
                    <div class="network-stats">
                    </div>
                    <div class="network-visual">
                        <div id="d3-network-container" style="width: 100%; height: 100%;"></div>
                    </div>
                </div>
            `;
            
            container.innerHTML = html;
            this.networkGraphInitialized = true;
            
            // 首次渲染网络图
            setTimeout(() => {
                this.renderD3NetworkGraph(nodeCount, networkData);
            }, 100);
        } else {
            // 更新统计信息
            const statsContainer = container.querySelector('.network-stats');
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <span class="network-stat">${GetText('node')}: ${nodeCount}</span>
                    <span class="network-stat">${GetText('connection')}: ${networkData.activeConnections || 0}</span>
                    <span class="network-stat">${GetText('failures')}: ${failedConnections}</span>
                `;
            }
            
            // 只有在配置发生变化时才重新渲染网络图
            if (configChanged) {
                setTimeout(() => {
                    this.renderD3NetworkGraph(nodeCount, networkData);
                }, 100);
            }
        }
        
        // 保存当前配置
        this.lastNetworkConfig = currentConfig;
    }  
  
    renderUsers(container, userData) {
        if (!userData || userData.size === 0) {
            container.innerHTML = `<p class="text-muted" data-text="no_user_data">${GetText('no_user_data')}</p>`;
            return;
        }
        
        // 检查是否已经有用户网格，如果没有则创建
        let usersGrid = container.querySelector('.users-grid');
        if (!usersGrid) {
            usersGrid = document.createElement('div');
            usersGrid.className = 'users-grid';
            container.innerHTML = '';
            container.appendChild(usersGrid);
        }
        
        // 只更新发生变化的用户卡片
        for (const [userId, user] of userData) {
            let userCard = usersGrid.querySelector(`[data-user-id="${userId}"]`);
            const isTransferring = user.isTransferring || false;
            
            if (!userCard) {
                // 创建新的用户卡片
                userCard = document.createElement('div');
                userCard.className = `user-card ${isTransferring ? 'transferring' : ''}`;
                userCard.setAttribute('data-user-id', userId);
                userCard.innerHTML = `
                    <div class="user-id">用户${user.displayNumber || '?'}</div>
                    <div class="user-assets">${user.totalAssets || 0}</div>
                    ${isTransferring ? '<div class="transfer-indicator">transferring</div>' : ''}
                `;
                usersGrid.appendChild(userCard);
                
                // 添加点击事件监听器
                userCard.addEventListener('click', () => {
                    this.showUserDetails(userId);
                });
            } else {
                // 更新现有用户卡片
                const assetsElement = userCard.querySelector('.user-assets');
                if (assetsElement && assetsElement.textContent !== String(user.totalAssets || 0)) {
                    assetsElement.textContent = user.totalAssets || 0;
                }
                
                // 更新转账状态
                const hasTransferIndicator = userCard.querySelector('.transfer-indicator');
                if (isTransferring && !hasTransferIndicator) {
                    userCard.classList.add('transferring');
                    userCard.insertAdjacentHTML('beforeend', '<div class="transfer-indicator">转账中</div>');
                } else if (!isTransferring && hasTransferIndicator) {
                    userCard.classList.remove('transferring');
                    hasTransferIndicator.remove();
                }
            }
        }
        
        // 移除不存在的用户卡片
        const existingCards = usersGrid.querySelectorAll('.user-card');
        existingCards.forEach(card => {
            const userId = card.getAttribute('data-user-id');
            if (!userData.has(userId)) {
                card.remove();
            }
        });
    }    

    renderChains(container, chainData) {
        if (!chainData || chainData.size === 0) {
            container.innerHTML = `<p class="text-muted" data-text="no_chain_data">${GetText('no_chain_data')}</p>`;
            return;
        }
        
        // 检查是否已经有区块链网格，如果没有则创建
        let chainsGrid = container.querySelector('.chains-grid');
        if (!chainsGrid) {
            chainsGrid = document.createElement('div');
            chainsGrid.className = 'chains-grid';
            container.innerHTML = '';
            container.appendChild(chainsGrid);
        }
        
        // 只更新发生变化的区块链卡片
        for (const [chainId, chain] of chainData) {
            let chainCard = chainsGrid.querySelector(`[data-chain-id="${chainId}"]`);
            const isTransferring = chain.isTransferring || false;
            
            if (!chainCard) {
                // 创建新的区块链卡片
                chainCard = document.createElement('div');
                chainCard.className = `chain-card ${isTransferring ? 'transferring' : ''}`;
                chainCard.setAttribute('data-chain-id', chainId);
                chainCard.innerHTML = `
                    <div class="chain-id">${chain.displayNumber || '?'}</div>
                    <div class="chain-value">${chain.value || 0}</div>
                    <div class="chain-status">${isTransferring ? 'transferring' : 'rest'}</div>
                `;
                chainsGrid.appendChild(chainCard);
                
                // 添加点击事件监听器
                chainCard.addEventListener('click', () => {
                    this.showChainDetails(chainId);
                });
            } else {
                // 更新现有区块链卡片
                const valueElement = chainCard.querySelector('.chain-value');
                if (valueElement && valueElement.textContent !== String(chain.value || 0)) {
                    valueElement.textContent = chain.value || 0;
                }
                
                const statusElement = chainCard.querySelector('.chain-status');
                const newStatus = isTransferring ? 'transferring' : 'rest';
                if (statusElement && statusElement.textContent !== newStatus) {
                    statusElement.textContent = newStatus;
                }
                
                // 更新转移状态样式
                if (isTransferring && !chainCard.classList.contains('transferring')) {
                    chainCard.classList.add('transferring');
                } else if (!isTransferring && chainCard.classList.contains('transferring')) {
                    chainCard.classList.remove('transferring');
                }
            }
        }
        
        // 移除不存在的区块链卡片
        const existingCards = chainsGrid.querySelectorAll('.chain-card');
        existingCards.forEach(card => {
            const chainId = card.getAttribute('data-chain-id');
            if (!chainData.has(chainId)) {
                card.remove();
            }
        });
    }    

    renderD3NetworkGraph(nodeCount, networkData) {
        const container = document.getElementById('d3-network-container');
        if (!container) return;
        
        // 检查D3是否可用
        if (typeof d3 === 'undefined') {
            console.error('D3.js 未加载');
            container.innerHTML = `<div class="network-placeholder" data-text="d3_not_loaded">${GetText('d3_not_loaded')}</div>`;
            return;
        }
        
        // 清除之前的内容
        d3.select(container).selectAll("*").remove();
        
        const width = container.clientWidth || 400;
        const height = container.clientHeight || 500; // 使用容器高度，默认500px
        
        // 创建SVG
        const svg = d3.select(container)
            .append("svg")
            .attr("width", width)
            .attr("height", height);
        
        // 生成节点数据
        const nodes = [];
        for (let i = 0; i < nodeCount; i++) {
            nodes.push({
                id: i,
                name: `Node ${i + 1}`
            });
        }
        
        // 生成连接数据 - 确保每个节点都达到最大连接数
        const links = [];
        const maxConnections = networkData.maxConnections || 3;
        const failureRate = networkData.failureRate || 0;
        
        // 为每个节点创建连接，确保达到最大连接数
        for (let i = 0; i < nodeCount; i++) {
            const connectedNodes = new Set();
            
            // 尝试为当前节点创建最大连接数的连接
            while (connectedNodes.size < maxConnections && connectedNodes.size < nodeCount - 1) {
                const targetId = Math.floor(Math.random() * nodeCount);
                if (targetId !== i) {
                    connectedNodes.add(targetId);
                }
            }
            
            // 创建连接（避免重复）
            connectedNodes.forEach(targetId => {
                // 检查是否已存在此连接（双向检查）
                const existingLink = links.find(link => 
                    (link.source === i && link.target === targetId) || 
                    (link.source === targetId && link.target === i)
                );
                
                if (!existingLink) {
                    links.push({
                        source: i,
                        target: targetId,
                        active: Math.random() > failureRate
                    });
                }
            });
        }
        
        const finalLinks = links;
        
        // 创建力导向仿真
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(finalLinks).id(d => d.id).distance(50))
            .force("charge", d3.forceManyBody().strength(-100))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(15));
        
        // 创建连接线组
        const link = svg.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(finalLinks)
            .enter().append("line")
            .attr("stroke", d => d.active ? "#28a745" : "#dc3545")
            .attr("stroke-width", 2)
            .attr("opacity", 0.7);
        
        // 创建节点组
        const node = svg.append("g")
            .attr("class", "nodes")
            .selectAll("g")
            .data(nodes)
            .enter().append("g");
        
        // 添加节点圆圈
        node.append("circle")
            .attr("r", 8)
            .attr("fill", "#007bff")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .style("cursor", "pointer");
        
        // 添加节点标签
        node.append("text")
            .attr("dy", 20)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("fill", "#333")
            .text(d => `N${d.id + 1}`);
        
        // 添加拖拽功能
        node.call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));
        
        // 更新位置的函数
        function ticked() {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);
            
            node
                .attr("transform", d => `translate(${d.x},${d.y})`);
        }
        
        // 拖拽事件处理
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
        
        // 启动仿真
        simulation.on("tick", ticked);
        
        // 存储连接数据以便后续更新
        this.networkLinks = finalLinks;
        this.networkSimulation = simulation;
    }    
  
  updateNetworkStats(networkData) {
        // 简单的统计更新
        console.log('更新网络统计:', networkData);
    }
    
    updateNetworkConnections(networkData) {
        // 简单的连接更新
        console.log('更新网络连接:', networkData);
    }
    
    /**
     * 开始实时更新
     */
    startRealTimeUpdate() {
        if (this.updateInterval) {
            this.stopRealTimeUpdate();
        }
        
        this.tabManager.switchTab( 'network' );
        this.updateInterval = setInterval(() => {
            this.requestDataUpdate();
        }, 1000); // 每秒更新一次
        
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
     * 显示用户详情
     */
    showUserDetails(publicKey) {
        console.log('显示用户详情:', publicKey);
        
        // 获取用户数据（用户ID就是公钥）
        const userData = this.app.AllUsers.get(publicKey);
        if (!userData) {
            alert('用户数据未找到');
            return;
        }
        
        // 获取用户拥有的区块链（直接从用户数据中获取）
        const userChains = userData.ownedChains.map(ownedChain => {
            const chainData = this.app.mockChains.get(ownedChain.chainId);
            return {
                id: ownedChain.chainId,
                ...chainData,
                ...ownedChain
            };
        });
        
        // 获取与用户相关的日志
        const userLogs = this.getUserRelatedLogs(publicKey);
        
        // 显示详情弹窗
        this.showDetailModal('用户详情', this.generateUserDetailHTML(publicKey, userData, userChains, userLogs));
    }
    
    /**
     * 显示区块链详情
     */
    showChainDetails(chainId) {
        console.log('显示区块链详情:', chainId);
        
        // 如果有标签页管理器，使用标签页方式显示
        if (this.tabManager) {
            this.tabManager.showChainDetails(chainId);
            return;
        }
        
        // 回退到弹窗方式（兼容性）
        const chainData = this.app.mockChains.get(chainId);
        if (!chainData) {
            alert('区块链数据未找到');
            return;
        }
        
        // 显示详情弹窗
        this.showDetailModal('区块链详情', this.generateChainDetailHTML(chainId, chainData));
    }
    
    /**
     * 显示详情弹窗
     */
    showDetailModal(title, content) {
        // 创建弹窗HTML
        const modalHTML = `
            <div id="detail-modal" class="detail-modal show">
                <div class="detail-modal-overlay" onclick="document.getElementById('detail-modal').remove()"></div>
                <div class="detail-modal-content">
                    <div class="detail-modal-header">
                        <h4 id="detail-modal-title">${title}</h4>
                        <button class="detail-modal-close" onclick="document.getElementById('detail-modal').remove()">&times;</button>
                    </div>
                    <div class="detail-modal-body" id="detail-modal-body">
                        ${content}
                    </div>
                </div>
            </div>
        `;
        
        // 移除现有弹窗
        const existingModal = document.getElementById('detail-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 添加新弹窗
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    /**
     * 生成用户详情HTML
     */
    generateUserDetailHTML(publicKey, userData, userChains, userLogs) {
        return `
            <div class="user-detail-container">
                <div class="user-basic-info">
                    <h5>基本信息</h5>
                    <div class="detail-info-grid">
                        <div class="detail-info-item">
                            <span class="detail-info-label">公钥 (用户ID):</span>
                            <span class="detail-info-value crypto-key" title="${publicKey}">${this.truncateKey(publicKey)}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label">总资产:</span>
                            <span class="detail-info-value">${userData.totalAssets || 0}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label">拥有区块链数:</span>
                            <span class="detail-info-value">${userData.chainCount || 0}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label">状态:</span>
                            <span class="detail-info-value ${userData.isTransferring ? 'transferring' : ''}">${userData.isTransferring ? '转账中' : '正常'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="user-chains-section">
                    <h5>拥有的区块链 (${userChains.length})</h5>
                    <div class="chains-list">
                        ${userChains.length > 0 ? userChains.map(chain => `
                            <div class="chain-item" onclick="document.getElementById('detail-modal').remove(); window.mainPanel.showChainDetails('${chain.id}')">
                                <span class="chain-id crypto-hash" title="${chain.id}">${this.truncateHash(chain.id)}</span>
                                <span class="chain-value">${chain.value}</span>
                                <span class="chain-status ${chain.isTransferring ? 'transferring' : ''}">${chain.isTransferring ? '转移中' : '正常'}</span>
                            </div>
                        `).join('') : '<p class="text-muted">暂无区块链</p>'}
                    </div>
                </div>
                
                <div class="user-logs-section">
                    <h5>相关日志 (${userLogs.length})</h5>
                    <div class="logs-list">
                        ${userLogs.length > 0 ? userLogs.map(log => `
                            <div class="log-item log-type-${log.type}">
                                <span class="log-timestamp">滴答 ${log.tick || log.timestamp}</span>
                                <span class="log-message">${log.message}</span>
                            </div>
                        `).join('') : '<p class="text-muted">暂无相关日志</p>'}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 生成区块链详情HTML
     */
    generateChainDetailHTML(chainId, chainData) {
        const rootBlock = chainData.blocks && chainData.blocks[0] ? chainData.blocks[0] : null;
        
        return `
            <div class="chain-detail-container">
                <div class="chain-basic-info">
                    <h5>基本信息</h5>
                    <div class="detail-info-grid">
                        <div class="detail-info-item">
                            <span class="detail-info-label">区块链ID (根区块哈希):</span>
                            <span class="detail-info-value crypto-hash" title="${chainId}">${this.truncateHash(chainId)}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label">拥有者公钥:</span>
                            <span class="detail-info-value crypto-key" title="${chainData.ownerId || '未知'}">${this.truncateKey(chainData.ownerId || '未知')}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label">当前价值:</span>
                            <span class="detail-info-value">${chainData.value || 0}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label">状态:</span>
                            <span class="detail-info-value ${chainData.isTransferring ? 'transferring' : ''}">${chainData.isTransferring ? '转移中' : '正常'}</span>
                        </div>
                    </div>
                </div>
                
                ${rootBlock ? `
                <div class="root-block-section">
                    <h5>根区块信息</h5>
                    <div class="block-info">
                        <div class="detail-info-grid">
                            <div class="detail-info-item">
                                <span class="detail-info-label">滴答时间:</span>
                                <span class="detail-info-value">滴答 ${rootBlock.tick || rootBlock.timestamp || '未知'}</span>
                            </div>
                            <div class="detail-info-item">
                                <span class="detail-info-label">哈希值 (区块链ID):</span>
                                <span class="detail-info-value crypto-hash" title="${rootBlock.hash || '未知'}">${this.truncateHash(rootBlock.hash || '未知')}</span>
                            </div>
                            <div class="detail-info-item">
                                <span class="detail-info-label">根区块数据:</span>
                                <span class="detail-info-value">
                                    <pre style="font-size: 0.8rem; margin: 0; white-space: pre-wrap;">${rootBlock.data || '未知'}</pre>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                <div class="chain-blocks-section">
                    <h5>所有区块 (${chainData.blocks ? chainData.blocks.length : 0})</h5>
                    <div class="blocks-list">
                        ${chainData.blocks && chainData.blocks.length > 0 ? chainData.blocks.map((block, index) => `
                            <div class="block-item ${index === 0 ? 'root-block' : ''}">
                                <div class="block-header">
                                    <span class="block-index">#${index}</span>
                                    <span class="block-type">${index === 0 ? '根区块' : (block.type === 'ownership' ? '所有权区块' : '普通区块')}</span>
                                </div>
                                <div class="block-content">
                                    <div class="block-field">
                                        <span class="field-label">类型:</span>
                                        <span class="field-value">${block.type || '未知'}</span>
                                    </div>
                                    <div class="block-field">
                                        <span class="field-label">哈希:</span>
                                        <span class="field-value crypto-hash" title="${block.hash || '未知'}">${this.truncateHash(block.hash || '未知')}</span>
                                    </div>
                                    <div class="block-field">
                                        <span class="field-label">滴答时间:</span>
                                        <span class="field-value">滴答 ${block.tick || block.timestamp || '未知'}</span>
                                    </div>
                                    ${block.previousHash ? `
                                    <div class="block-field">
                                        <span class="field-label">前区块哈希:</span>
                                        <span class="field-value crypto-hash" title="${block.previousHash}">${this.truncateHash(block.previousHash)}</span>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('') : '<p class="text-muted">暂无区块数据</p>'}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取与用户相关的日志
     */
    getUserRelatedLogs(userId) {
        // 从应用的日志系统获取与用户相关的日志
        if (this.app && this.app.uiManager && this.app.uiManager.panels && this.app.uiManager.panels.log && this.app.uiManager.panels.log.logs) {
            return this.app.uiManager.panels.log.logs.filter(log => 
                log.message.includes(userId) || 
                (log.relatedData && (log.relatedData.userId === userId || log.relatedData.fromUser === userId || log.relatedData.toUser === userId))
            );
        }
        return [];
    }
    
    onLanguageChanged( language )
    {
        console.log( 'MainPanal 处理语言变更:', language );
        
        this.tabManager.helpTabContent.onLanguageChanged( language );
    }
    
    /**
     * 截断密钥显示
     */
    truncateKey(key) {
        if (!key || key === '未设置' || key === '未知') return key;
        if (key.length <= 20) return key;
        return key.substring(0, 10) + '...' + key.substring(key.length - 10);
    }
    
    /**
     * 截断哈希值显示
     */
    truncateHash(hash) {
        if (!hash || hash === '未知') return hash;
        if (hash.length <= 16) return hash;
        return hash.substring(0, 8) + '...' + hash.substring(hash.length - 8);
    }
}

// 导出 MainPanel 类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MainPanel;
}

// ES6 导出
if (typeof window !== 'undefined') {
    window.MainPanel = MainPanel;
}