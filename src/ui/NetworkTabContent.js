/**
 * NetworkTabContent - 网络标签页内容组件
 * 管理网络标签页的显示和交互
 */
class NetworkTabContent {
    constructor(tabManager) {
        this.tabManager = tabManager;
        this.mainPanel = tabManager.mainPanel;
        this.app = tabManager.mainPanel.app;
        
        // 网络图相关状态
        this.selectedNode = null;
        this.networkGraph = null;
        this.networkGraphInitialized = false;
        this.networkLinks = null;
        this.networkSimulation = null;
        this.lastNetworkConfig = null;
        
        console.log('NetworkTabContent 初始化完成');
    }
    
    /**
     * 渲染网络图
     * @param {Object} networkData - 网络数据
     */
    renderNetworkGraph(networkData) {
        const statsContainer = document.getElementById('network-stats');
        const visualContainer = document.getElementById('d3-network-container');
        
        if (!statsContainer || !visualContainer) {
            console.error('网络图容器未找到');
            return;
        }
        
        if (!networkData) {
            statsContainer.innerHTML = `
                <span class="network-stat">节点: 0</span>
                <span class="network-stat">连接: 0</span>
                <span class="network-stat">故障: 0</span>
            `;
            visualContainer.innerHTML = '<p class="text-muted">暂无网络数据</p>';
            this.networkGraphInitialized = false;
            return;
        }
        
        const nodeCount = networkData.nodeCount || 0;
        const failedConnections = Math.floor((networkData.totalConnections || 0) * (networkData.failureRate || 0));
        
        // 更新统计信息
        statsContainer.innerHTML = `
            <span class="network-stat">节点: ${nodeCount}</span>
            <span class="network-stat">连接: ${networkData.activeConnections || 0}</span>
            <span class="network-stat">故障: ${failedConnections}</span>
        `;
        
        // 如果节点数为0，显示系统未启动状态
        if (nodeCount === 0) {
            visualContainer.innerHTML = '<p class="text-muted">系统未启动</p>';
            this.networkGraphInitialized = false;
            return;
        }
        
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
        
        // 如果网络图还未初始化或配置发生变化，重新渲染网络图
        if (!this.networkGraphInitialized || configChanged) {
            this.networkGraphInitialized = true;
            
            // 渲染网络图
            setTimeout(() => {
                this.renderD3NetworkGraph(nodeCount, networkData);
            }, 100);
        }
        
        // 保存当前配置
        this.lastNetworkConfig = currentConfig;
    }
    
    /**
     * 使用D3.js渲染网络图
     * @param {number} nodeCount - 节点数量
     * @param {Object} networkData - 网络数据
     */
    renderD3NetworkGraph(nodeCount, networkData) {
        const container = document.getElementById('d3-network-container');
        if (!container) {
            console.error('D3网络图容器未找到');
            return;
        }
        
        // 检查D3是否可用
        if (typeof d3 === 'undefined') {
            console.error('D3.js 未加载');
            container.innerHTML = '<div class="network-placeholder">D3.js 未加载</div>';
            return;
        }
        
        // 清除之前的内容
        d3.select(container).selectAll("*").remove();
        
        const width = container.clientWidth || 400;
        const height = container.clientHeight || 500;
        
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
            .enter().append("g")
            .attr("class", "node-group")
            .attr("data-node-id", d => d.id);
        
        // 添加节点圆圈
        node.append("circle")
            .attr("r", 8)
            .attr("fill", "#007bff")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .on("click", (event, d) => {
                this.handleNodeClick(d.id);
            });
        
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
        
        console.log(`网络图渲染完成: ${nodeCount} 个节点, ${finalLinks.length} 个连接`);
    }
    
    /**
     * 处理节点点击事件
     * @param {number} nodeId - 节点ID
     */
    handleNodeClick(nodeId) {
        try {
            // 更新选中状态
            this.updateNodeSelection(nodeId);
            
            // 显示节点详情
            this.showNodeDetails(nodeId);
            
            // 切换日志面板到节点日志
            if (this.app && this.app.logPanel) {
                this.app.logPanel.switchToCategory('node');
            }
            
            // 保存选中状态到标签页管理器
            this.tabManager.handleStateChange('network', {
                selectedNode: nodeId
            });
            
            console.log('节点点击处理完成:', nodeId);
            
        } catch (error) {
            console.error('处理节点点击失败:', error);
        }
    }
    
    /**
     * 更新节点选中状态
     * @param {number} nodeId - 节点ID
     */
    updateNodeSelection(nodeId) {
        const networkContainer = document.getElementById('d3-network-container');
        if (!networkContainer) return;
        
        // 清除之前的选中状态
        const previousSelected = networkContainer.querySelectorAll('.node-selected');
        previousSelected.forEach(node => {
            node.classList.remove('node-selected');
            const circle = node.querySelector('circle');
            if (circle) {
                circle.setAttribute('fill', '#007bff');
                circle.setAttribute('stroke-width', '2');
            }
        });
        
        // 设置新的选中状态
        const selectedNode = networkContainer.querySelector(`[data-node-id="${nodeId}"]`);
        if (selectedNode) {
            selectedNode.classList.add('node-selected');
            const circle = selectedNode.querySelector('circle');
            if (circle) {
                circle.setAttribute('fill', '#ffc107');
                circle.setAttribute('stroke-width', '3');
            }
        }
        
        this.selectedNode = nodeId;
    }
    
    /**
     * 显示节点详情
     * @param {number} nodeId - 节点ID
     */
    showNodeDetails(nodeId) {
        const detailsContainer = document.getElementById('node-details-container');
        if (!detailsContainer) {
            console.error('节点详情容器未找到');
            return;
        }
        
        try {
            // 获取节点数据
            const nodeData = this.getNodeData(nodeId);
            
            if (!nodeData) {
                detailsContainer.innerHTML = '<p class="text-muted">节点数据未找到</p>';
                return;
            }
            
            // 生成节点详情HTML
            const detailsHTML = this.generateNodeDetailsHTML(nodeId, nodeData);
            detailsContainer.innerHTML = detailsHTML;
            
            // 添加has-content类以启用滚动条
            detailsContainer.classList.add('has-content');
            
            console.log('节点详情显示完成:', nodeId);
            
        } catch (error) {
            console.error('显示节点详情失败:', error);
            detailsContainer.innerHTML = '<p class="text-danger">显示节点详情时发生错误</p>';
        }
    }
    
    /**
     * 获取节点数据
     * @param {number} nodeId - 节点ID
     * @returns {Object} - 节点数据
     */
    getNodeData(nodeId) {
        try {
            // 检查应用和配置是否存在
            if (!this.app || !this.app.config) {
                console.warn('应用或配置未找到');
                return null;
            }
            
            // 检查节点ID是否有效
            const nodeCount = this.app.config.nodeCount || 0;
            if (nodeId < 0 || nodeId >= nodeCount) {
                console.warn('无效的节点ID:', nodeId, '节点总数:', nodeCount);
                return null;
            }
            
            // 获取节点上的用户列表
            const nodeUsers = [];
            if (this.app.mockUsers) {
                for (const [userId, userData] of this.app.mockUsers) {
                    // 检查用户是否分配到这个节点（支持多节点分配）
                    const isOnNode = userData.nodeIds ? 
                        userData.nodeIds.includes(nodeId) : 
                        userData.nodeId === nodeId;
                    
                    if (isOnNode) {
                        nodeUsers.push({
                            userId: userId,
                            displayNumber: userData.displayNumber,
                            totalAssets: userData.totalAssets
                        });
                    }
                }
            }
            
            // 获取节点连接信息
            const connections = this.getNodeConnections(nodeId);
            
            return {
                nodeId: nodeId,
                nodeName: `Node ${nodeId + 1}`,
                users: nodeUsers,
                connections: connections,
                stats: {
                    totalUsers: nodeUsers.length,
                    totalConnections: connections.length,
                    activeConnections: connections.filter(conn => conn.isActive).length
                }
            };
            
        } catch (error) {
            console.error('获取节点数据失败:', error);
            return null;
        }
    }
    
    /**
     * 获取节点连接信息
     * @param {number} nodeId - 节点ID
     * @returns {Array} - 连接信息数组
     */
    getNodeConnections(nodeId) {
        const connections = [];
        
        if (!this.networkLinks) {
            return connections;
        }
        
        // 遍历网络连接，找到与当前节点相关的连接
        this.networkLinks.forEach(link => {
            let targetNodeId = null;
            let isSource = false;
            
            if (link.source.id === nodeId || link.source === nodeId) {
                targetNodeId = link.target.id || link.target;
                isSource = true;
            } else if (link.target.id === nodeId || link.target === nodeId) {
                targetNodeId = link.source.id || link.source;
                isSource = false;
            }
            
            if (targetNodeId !== null) {
                connections.push({
                    targetNodeId: targetNodeId,
                    targetNodeName: `Node ${targetNodeId + 1}`,
                    latency: Math.floor(Math.random() * 10) + 1, // 模拟延迟（滴答数）
                    isActive: link.active,
                    direction: isSource ? 'outgoing' : 'incoming'
                });
            }
        });
        
        return connections;
    }
    
    /**
     * 生成节点详情HTML
     * @param {number} nodeId - 节点ID
     * @param {Object} nodeData - 节点数据
     * @returns {string} - 节点详情HTML
     */
    generateNodeDetailsHTML(nodeId, nodeData) {
        return `
            <div class="node-details">
                <div class="node-details-header">
                    <h5>节点详情 - ${nodeData.nodeName}</h5>
                    <span class="node-id">ID: ${nodeId}</span>
                </div>
                
                <div class="node-stats">
                    <div class="stat-item">
                        <span class="stat-label">用户数:</span>
                        <span class="stat-value">${nodeData.stats.totalUsers}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">连接数:</span>
                        <span class="stat-value">${nodeData.stats.totalConnections}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">活跃连接:</span>
                        <span class="stat-value">${nodeData.stats.activeConnections}</span>
                    </div>
                </div>
                
                <div class="node-users-section">
                    <h6>节点用户 (${nodeData.users.length})</h6>
                    <div class="users-list">
                        ${nodeData.users.length > 0 ? nodeData.users.map(user => `
                            <div class="user-item" onclick="window.mainPanel.showUserDetails('${user.userId}')">
                                <span class="user-display">用户${user.displayNumber}</span>
                                <span class="user-assets">${user.totalAssets} 资产</span>
                            </div>
                        `).join('') : '<p class="text-muted">该节点暂无用户</p>'}
                    </div>
                </div>
                
                <div class="node-connections-section">
                    <h6>节点连接 (${nodeData.connections.length})</h6>
                    <div class="connections-list">
                        ${nodeData.connections.length > 0 ? nodeData.connections.map(conn => `
                            <div class="connection-item ${conn.isActive ? 'active' : 'inactive'}">
                                <span class="connection-target">${conn.targetNodeName}</span>
                                <span class="connection-latency">${conn.latency} 滴答</span>
                                <span class="connection-status ${conn.isActive ? 'status-active' : 'status-inactive'}">
                                    ${conn.isActive ? '正常' : '故障'}
                                </span>
                            </div>
                        `).join('') : '<p class="text-muted">该节点暂无连接</p>'}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 更新节点详情
     * @param {Object} nodeData - 节点数据
     */
    updateNodeDetails(nodeData) {
        if (this.selectedNode !== null) {
            this.showNodeDetails(this.selectedNode);
        }
    }
    
    /**
     * 清除选中状态
     */
    clearSelection() {
        this.selectedNode = null;
        this.updateNodeSelection(null);
        
        const detailsContainer = document.getElementById('node-details-container');
        if (detailsContainer) {
            detailsContainer.innerHTML = '<p class="text-muted">请点击网络图上的节点查看详情</p>';
            detailsContainer.classList.remove('has-content');
        }
    }
    
    /**
     * 获取当前选中的节点
     * @returns {number|null} - 选中的节点ID
     */
    getSelectedNode() {
        return this.selectedNode;
    }
    
    /**
     * 设置选中的节点
     * @param {number|null} nodeId - 节点ID
     * @param {boolean} triggerLogSwitch - 是否触发日志面板切换，默认为true
     */
    setSelectedNode(nodeId, triggerLogSwitch = true) {
        if (nodeId !== null) {
            if (triggerLogSwitch) {
                this.handleNodeClick(nodeId);
            } else {
                // 只更新选中状态和显示详情，不触发日志面板切换
                this.updateNodeSelection(nodeId);
                this.showNodeDetails(nodeId);
                this.tabManager.handleStateChange('network', {
                    selectedNode: nodeId
                });
            }
        } else {
            this.clearSelection();
        }
    }
    
    /**
     * 重置网络图
     */
    resetNetworkGraph() {
        this.networkGraphInitialized = false;
        this.networkLinks = null;
        this.networkSimulation = null;
        this.lastNetworkConfig = null;
        this.clearSelection();
        
        const statsContainer = document.getElementById('network-stats');
        const visualContainer = document.getElementById('d3-network-container');
        
        if (statsContainer) {
            statsContainer.innerHTML = `
                <span class="network-stat">节点: 0</span>
                <span class="network-stat">连接: 0</span>
                <span class="network-stat">故障: 0</span>
            `;
        }
        
        if (visualContainer) {
            visualContainer.innerHTML = '<p class="text-muted">系统未启动</p>';
        }
    }
    
    /**
     * 销毁网络标签页内容
     */
    destroy() {
        try {
            // 停止D3仿真
            if (this.networkSimulation) {
                this.networkSimulation.stop();
            }
            
            // 清理状态
            this.selectedNode = null;
            this.networkGraph = null;
            this.networkGraphInitialized = false;
            this.networkLinks = null;
            this.networkSimulation = null;
            this.lastNetworkConfig = null;
            
            console.log('NetworkTabContent 已销毁');
            
        } catch (error) {
            console.error('NetworkTabContent 销毁失败:', error);
        }
    }
}

// 导出 NetworkTabContent 类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NetworkTabContent;
}