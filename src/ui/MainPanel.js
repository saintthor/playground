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
        this.networkLinks = null; // 存储网络连接的引用
    }
    
    init() {
        try {
            this.render();
            this.isInitialized = true;
            console.log('MainPanel 初始化完成');
        } catch (error) {
            console.error('MainPanel 初始化失败:', error);
        }
    }
    
    render() {
        const mainPanel = document.getElementById('main-panel');
        if (!mainPanel) return;
        
        const panelContent = mainPanel.querySelector('.panel-content');
        if (!panelContent) return;
        
        panelContent.innerHTML = `
            <!-- P2P 网络图 - 占据全宽度，无标题 -->
            <div class="network-graph-container">
                <div class="network-graph" id="network-graph">
                    <p class="text-muted">系统未启动</p>
                </div>
            </div>
            
            <!-- 用户和区块链信息放在网络图下方 -->
            <div class="info-sections">
                <div class="main-section users-section">
                    <h3>用户 (<span id="user-count">0</span>)</h3>
                    <div class="users-container" id="users-container">
                        <p class="text-muted">系统未启动</p>
                    </div>
                </div>
                
                <div class="main-section chains-section">
                    <h3>区块链 (<span id="chain-count">0</span>)</h3>
                    <div class="chains-container" id="chains-container">
                        <p class="text-muted">系统未启动</p>
                    </div>
                </div>
            </div>
            
            <!-- 详情弹窗 -->
            <div id="detail-modal" class="detail-modal">
                <div class="detail-modal-overlay" onclick="this.parentElement.classList.remove('show')"></div>
                <div class="detail-modal-content">
                    <div class="detail-modal-header">
                        <h4 id="detail-modal-title">详情</h4>
                        <button class="detail-modal-close" onclick="document.getElementById('detail-modal').classList.remove('show')">&times;</button>
                    </div>
                    <div class="detail-modal-body" id="detail-modal-body">
                        <!-- 详情内容将在这里动态生成 -->
                    </div>
                </div>
            </div>
        `;
    }
    
    updateAllData(data) {
        if (!this.isInitialized) return;
        
        // 更新网络图
        const networkGraph = document.getElementById('network-graph');
        if (networkGraph) {
            this.renderNetworkGraph(networkGraph, data.networkData);
        }
        
        // 更新用户列表
        const usersContainer = document.getElementById('users-container');
        const userCount = document.getElementById('user-count');
        if (usersContainer && userCount) {
            this.renderUsers(usersContainer, data.userData);
            userCount.textContent = data.userData ? data.userData.size : 0;
        }
        
        // 更新区块链列表
        const chainsContainer = document.getElementById('chains-container');
        const chainCount = document.getElementById('chain-count');
        if (chainsContainer && chainCount) {
            this.renderChains(chainsContainer, data.chainData);
            chainCount.textContent = data.chainData ? data.chainData.size : 0;
        }
    }
    
    renderNetworkGraph(container, networkData) {
        if (!networkData) {
            container.innerHTML = '<p class="text-muted">暂无网络数据</p>';
            this.networkGraphInitialized = false;
            return;
        }
        
        const nodeCount = networkData.totalUsers || 0;
        const failedConnections = Math.floor((networkData.totalConnections || 0) * (networkData.failureRate || 0));
        
        // 如果网络图还未初始化，创建完整的HTML结构
        if (!this.networkGraphInitialized) {
            const html = `
                <div class="network-graph-display">
                    <div class="network-stats">
                        <span class="network-stat">节点: ${nodeCount}</span>
                        <span class="network-stat">连接: ${networkData.activeConnections || 0}</span>
                        <span class="network-stat">故障: ${failedConnections}</span>
                    </div>
                    <div class="network-visual">
                        <div id="d3-network-container" style="width: 100%; height: 300px;"></div>
                    </div>
                </div>
            `;
            
            container.innerHTML = html;
            
            // 渲染D3.js网络图
            setTimeout(() => {
                this.renderD3NetworkGraph(nodeCount, networkData);
                this.networkGraphInitialized = true;
            }, 100);
        } else {
            // 只更新统计信息和连接状态
            this.updateNetworkStats(networkData);
            this.updateNetworkConnections(networkData);
        }
    }
    
    renderUsers(container, userData) {
        if (!userData || userData.size === 0) {
            container.innerHTML = '<p class="text-muted">暂无用户数据</p>';
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
                    ${isTransferring ? '<div class="transfer-indicator">转账中</div>' : ''}
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
            container.innerHTML = '<p class="text-muted">暂无区块链数据</p>';
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
                    <div class="chain-id">链${chain.displayNumber || '?'}</div>
                    <div class="chain-value">${chain.value || 0}</div>
                    <div class="chain-status">${isTransferring ? '转移中' : '正常'}</div>
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
                const newStatus = isTransferring ? '转移中' : '正常';
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
            container.innerHTML = '<div class="network-placeholder">D3.js 未加载</div>';
            return;
        }
        
        // 清除之前的内容
        d3.select(container).selectAll("*").remove();
        
        const width = container.clientWidth || 400;
        const height = 300;
        
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
        
        // 生成连接数据 - 创建一个更真实的网络拓扑
        const links = [];
        const maxConnections = networkData.maxConnections || 3;
        const activeConnections = networkData.activeConnections || Math.min(nodeCount * 2, 50);
        
        // 为每个节点创建连接，确保网络连通性
        for (let i = 0; i < nodeCount; i++) {
            const connectionCount = Math.min(maxConnections, Math.floor(Math.random() * maxConnections) + 1);
            for (let j = 0; j < connectionCount; j++) {
                const targetId = Math.floor(Math.random() * nodeCount);
                if (targetId !== i && !links.find(link => 
                    (link.source === i && link.target === targetId) || 
                    (link.source === targetId && link.target === i)
                )) {
                    links.push({
                        source: i,
                        target: targetId,
                        active: Math.random() > (networkData.failureRate || 0)
                    });
                }
            }
        }
        
        // 限制连接数量
        const finalLinks = links.slice(0, activeConnections);
        
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
     * 设置选中的用户
     */
    setSelectedUser(userId) {
        console.log('选择用户:', userId);
        this.showUserDetails(userId);
    }
    
    /**
     * 设置选中的区块链
     */
    setSelectedChain(chainId) {
        console.log('选择区块链:', chainId);
        this.showChainDetails(chainId);
    }
    
    /**
     * 显示用户详情
     */
    showUserDetails(publicKey) {
        console.log('显示用户详情:', publicKey);
        
        // 获取用户数据（用户ID就是公钥）
        const userData = this.app.mockUsers.get(publicKey);
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
        
        // 获取区块链数据
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
        const modal = document.getElementById('detail-modal');
        const modalTitle = document.getElementById('detail-modal-title');
        const modalBody = document.getElementById('detail-modal-body');
        
        if (modal && modalTitle && modalBody) {
            modalTitle.textContent = title;
            modalBody.innerHTML = content;
            modal.classList.add('show');
        }
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
                            <div class="chain-item" onclick="mainPanel.showChainDetails('${chain.id}')">
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
                        <div class="block-verify-section">
                            <button class="btn btn-primary btn-sm" onclick="mainPanel.verifyRootBlock('${chainId}', 0)">验证根区块</button>
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
                                    <button class="btn btn-sm btn-outline-primary" onclick="mainPanel.verifyBlock('${chainId}', ${index})">验证</button>
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
                                    ${block.data?.owner ? `
                                    <div class="block-field">
                                        <span class="field-label">拥有者:</span>
                                        <span class="field-value crypto-key" title="${block.data.owner}">${this.truncateKey(block.data.owner)}</span>
                                    </div>
                                    ` : ''}
                                    ${block.data?.signature ? `
                                    <div class="block-field">
                                        <span class="field-label">签名:</span>
                                        <span class="field-value crypto-hash" title="${block.data.signature}">${this.truncateHash(block.data.signature)}</span>
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
        if (this.app && this.app.uiManager && this.app.uiManager.logPanel && this.app.uiManager.logPanel.logs) {
            return this.app.uiManager.logPanel.logs.filter(log => 
                log.message.includes(userId) || 
                (log.relatedData && (log.relatedData.userId === userId || log.relatedData.fromUser === userId || log.relatedData.toUser === userId))
            );
        }
        return [];
    }
    
    /**
     * 截断密钥显示
     */
    truncateKey(key) {
        if (!key || key === '未设置') return key;
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
    
    /**
     * 验证根区块
     */
    verifyRootBlock(chainId, blockId) {
        console.log('验证根区块:', chainId, blockId);
        
        const chainData = this.app.mockChains.get(chainId);
        if (!chainData || !chainData.blocks || chainData.blocks.length === 0) {
            alert('区块链数据不完整');
            return;
        }
        
        const rootBlock = chainData.blocks[0];
        this.showBlockVerificationModal(chainId, rootBlock, 0, true);
    }
    
    /**
     * 验证区块
     */
    verifyBlock(chainId, blockIndex) {
        console.log('验证区块:', chainId, blockIndex);
        
        const chainData = this.app.mockChains.get(chainId);
        if (!chainData || !chainData.blocks || !chainData.blocks[blockIndex]) {
            alert('区块数据不完整');
            return;
        }
        
        const block = chainData.blocks[blockIndex];
        this.showBlockVerificationModal(chainId, block, blockIndex, blockIndex === 0);
    }
    
    /**
     * 显示区块验证弹窗
     */
    showBlockVerificationModal(chainId, block, blockIndex, isRootBlock) {
        const verificationHTML = `
            <div class="block-verification-container">
                <h5>${isRootBlock ? '根区块' : '区块'} 验证</h5>
                <div class="verification-info">
                    <div class="detail-info-grid">
                        <div class="detail-info-item">
                            <span class="detail-info-label">区块链ID:</span>
                            <span class="detail-info-value">${chainId}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label">区块索引:</span>
                            <span class="detail-info-value">#${blockIndex}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label">区块ID:</span>
                            <span class="detail-info-value">${block.id}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label">时间戳:</span>
                            <span class="detail-info-value">${block.timestamp}</span>
                        </div>
                    </div>
                </div>
                
                <div class="verification-actions">
                    <button class="btn btn-primary" onclick="mainPanel.performBlockVerification('${chainId}', ${blockIndex})">开始验证</button>
                    <button class="btn btn-secondary" onclick="mainPanel.showVerificationCode('${chainId}', ${blockIndex})">查看验证代码</button>
                </div>
                
                <div class="verification-result" id="verification-result-${blockIndex}">
                    <!-- 验证结果将显示在这里 -->
                </div>
            </div>
        `;
        
        this.showDetailModal(`${isRootBlock ? '根区块' : '区块'} 验证`, verificationHTML);
    }
    
    /**
     * 执行区块验证
     */
    async performBlockVerification(chainId, blockIndex) {
        const resultContainer = document.getElementById(`verification-result-${blockIndex}`);
        if (!resultContainer) return;
        
        resultContainer.innerHTML = '<div class="alert alert-info">验证中...</div>';
        
        try {
            const chainData = this.app.mockChains.get(chainId);
            const block = chainData.blocks[blockIndex];
            
            // 模拟验证过程
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 验证区块哈希
            const expectedHash = block.hash;
            const calculatedHash = await this.calculateBlockHash(block);
            
            const isValid = expectedHash === calculatedHash;
            
            resultContainer.innerHTML = `
                <div class="alert alert-${isValid ? 'success' : 'danger'}">
                    <h6>验证结果: ${isValid ? '✓ 验证通过' : '✗ 验证失败'}</h6>
                    <div class="verification-details">
                        <div><strong>期望哈希:</strong> <code>${expectedHash}</code></div>
                        <div><strong>计算哈希:</strong> <code>${calculatedHash}</code></div>
                        <div><strong>验证时间:</strong> ${new Date().toLocaleString()}</div>
                    </div>
                </div>
            `;
        } catch (error) {
            resultContainer.innerHTML = `
                <div class="alert alert-danger">
                    <strong>验证失败:</strong> ${error.message}
                </div>
            `;
        }
    }
    
    /**
     * 显示验证代码
     */
    showVerificationCode(chainId, blockIndex) {
        const chainData = this.app.mockChains.get(chainId);
        const block = chainData.blocks[blockIndex];
        
        const code = `
// 区块验证代码
const chainId = "${chainId}";
const blockIndex = ${blockIndex};
const block = ${JSON.stringify(block, null, 2)};

// 计算区块哈希
async function verifyBlock() {
    const blockData = {
        id: block.id,
        timestamp: block.timestamp,
        data: block.data || {},
        previousHash: block.previousHash || ""
    };
    
    const dataString = JSON.stringify(blockData);
    const hash = await Crypto.sha256(dataString);
    
    console.log('区块数据:', blockData);
    console.log('期望哈希:', block.hash);
    console.log('计算哈希:', hash);
    console.log('验证结果:', hash === block.hash ? '✓ 通过' : '✗ 失败');
    
    return hash === block.hash;
}

// 运行验证
verifyBlock();
        `;
        
        alert(`验证代码已生成，请在控制台中运行：\n\n${code}`);
    }
    
    /**
     * 计算区块哈希
     */
    async calculateBlockHash(block) {
        // 创建用于哈希计算的区块数据（不包含hash字段）
        const blockData = {
            type: block.type,
            creator: block.creator,
            tick: block.tick,
            data: block.data || {},
            previousHash: block.previousHash || ""
        };
        
        const dataString = JSON.stringify(blockData);
        
        try {
            // 使用应用的base64哈希生成方法保持一致性
            return this.app.generateBase64Hash(dataString);
        } catch (error) {
            console.error('哈希计算失败:', error);
            return 'hash_calculation_failed';
        }
    }
}