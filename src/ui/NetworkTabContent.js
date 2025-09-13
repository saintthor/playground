/**
 * NetworkTabContent - 网络标签页内容组件
 * 管理网络标签页的显示和交互
 */
class NetworkTabContent {
    constructor(tabManager) {
        this.tabManager = tabManager;
        this.mainPanel = tabManager.mainPanel;
        this.app = tabManager.mainPanel.app;
        this.app.NetWorkPanal = this;
        
        // 网络图相关状态
        this.selectedNode = null;
        this.networkGraph = null;
        this.networkGraphInitialized = false;
        this.networkLinks = null;
        this.networkSimulation = null;
        this.ConnsJson = null;
        this.NodeColors = new Map();
        this.ShowedMsgs = new Set();
        
        console.log('NetworkTabContent 初始化完成');
    }
    
    /**
     * 渲染网络图
     * @param {Object} networkData - 网络数据
     */
    renderNetworkGraph( allPeers ) {
        //console.log( 'renderNetworkGraph', allPeers );
        const statsContainer = document.getElementById('network-stats');
        const visualContainer = document.getElementById('d3-network-container');
        
        if( !allPeers ) {
            //statsContainer.innerHTML = `
                //<span class="network-stat" data-text="node_label">${GetText('node_label')}: 0</span>
                //<span class="network-stat" data-text="connections_label">${GetText('connections_label')}: 0</span>
                //<span class="network-stat" data-text="failures_label">${GetText('failures_label')}: 0</span>
            //`;
            visualContainer.innerHTML = `<p class="text-muted" data-text="no_network_data_to_display">${GetText('no_network_data_to_display')}</p>`;
            this.networkGraphInitialized = false;
            return;
        }
        
        //if( this.SVG )
        //{
            //this.UpdateD3Graph();
            //return;
        //}
        
        const nodeCount = allPeers.size || 0;
        //const failedConnections = Math.floor((networkData.totalConnections || 0) * (networkData.failureRate || 0));
        
        // 更新统计信息
        const ConnNum = nodeCount > 0 ? [...allPeers.values()].map( p => p.Connections.size ).reduce(( a, b ) => a + b ) / 2 : 0;
        //statsContainer.innerHTML = `
            //<span class="network-stat" data-text="node_label">${GetText('node_label')}: ${ nodeCount }</span>
            //<span class="network-stat" data-text="connections_label">${GetText('connections_label')}: ${ ConnNum || 0 }</span>
            //<span class="network-stat" data-text="failures_label">${GetText('failures_label')}: </span>
        //`;
        
        // 如果节点数为0，显示系统未启动状态
        if (nodeCount === 0) {
            visualContainer.innerHTML = `<p class="text-muted" data-text="sys_not_started">${GetText('sys_not_started')}</p>`;
            this.networkGraphInitialized = false;
            return;
        }
        
        const NewConns = [...allPeers.values()].map( p => [...p.Connections.values()].map( c => [p.Id, c[0].Id, c[1]] ))
                                .reduce(( cs, cs2 ) => [...cs, ...cs2] ).filter(( [Id, Id2, t] ) => Id < Id2 )
                                .map( l => ( { source: l[0], target: l[1], distance: l[2] * 10 } ));
        NewConns.sort();
        
        const NewJson = JSON.stringify( NewConns );

        // 检查网络配置是否发生变化
        //const currentConfig = {
            //nodeCount: nodeCount,
            //maxConnections: allPeers.maxConnections || 3,
            //failureRate: allPeers.failureRate || 0
        //};
        
        //const configChanged = !this.lastNetworkConfig || 
            //this.lastNetworkConfig.nodeCount !== currentConfig.nodeCount ||
            //this.lastNetworkConfig.maxConnections !== currentConfig.maxConnections ||
            //this.lastNetworkConfig.failureRate !== currentConfig.failureRate;
        
        // 如果网络图还未初始化或配置发生变化，重新渲染网络图
        if( !this.networkGraphInitialized || this.ConnsJson != NewJson )
        {
            //console.log( 'diff', this.ConnsJson );
            //console.log( JSON.stringify( NewConns ));
            this.networkGraphInitialized = true;
            // 渲染网络图
            const Nodes = [...allPeers.values()].map( p => ( { id: p.Id, name: `Peer ${p.Id}` } ));
            setTimeout(() => {
                this.renderD3NetworkGraph( Nodes, NewConns );
            }, 100);
        }
        
        // 保存当前配置
        this.ConnsJson = NewJson;
    }
    
    /**
     * 使用D3.js渲染网络图
     * @param {number} nodeCount - 节点数量
     * @param {Object} networkData - 网络数据
     */
    
    UpdateD3Graph( update )
    {
        const DefColor = '#007bff';
        
        //this.SVG.selectAll( '.links line' ).attr( "stroke", l => 'gray' ).attr( "stroke-width", 1 ).attr( "stroke-opacity", 1 );
    }
    
    renderD3NetworkGraph( nodes, conns )
    {
        const container = document.getElementById( 'd3-network-container' );
        if (!container) {
            console.error(GetText('d3_container_not_found'));
            return;
        }
        
        // 检查D3是否可用
        if (typeof d3 === 'undefined') {
            console.error(GetText('d3_not_loaded'));
            container.innerHTML = `<div class="network-placeholder" data-text="d3_not_loaded_placeholder">${GetText('d3_not_loaded_placeholder')}</div>`;
            return;
        }
        
        // 清除之前的内容
        d3.select( container ).selectAll( "*" ).remove();
        
        const width = container.clientWidth || 600;
        const height = container.clientHeight || 500;
        
        // 创建SVG
        const svg = this.SVG = d3.select( container ).append( "svg" ).attr( "width", width ).attr( "height", height );
        
        // 创建力导向仿真
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink( conns ).id(d => d.id))
            .force("charge", d3.forceManyBody().strength(-100))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(15));
        
        // 创建连接线组
        const link = svg.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data( conns )
            .enter().append("line")
            .attr( "stroke", d => d.color || "#aaaaf5" )
            .attr("stroke-width", 1)
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
            .attr( "fill", d => this.NodeColors.get( d.id ) || "#007bff" )
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
            .text(d => `N${d.id}`);
        
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
        this.networkSimulation = simulation;
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
                this.app.logPanel.switchToCategory( 'node', nodeId );
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
    
    ClearAll()
    {
        document.getElementById( 'd3-network-container' ).querySelectorAll( `circle` ).forEach( c => c.setAttribute( 'fill', '#007bff' ));
    }
    
    UpdateTrans( reached, trusted )
    {
        //console.log( 'UpdateTrans', reached, trusted );
        const networkContainer = document.getElementById( 'd3-network-container' );
        const AlterNodes = new Set();
        trusted.forEach( id => 
        {
            AlterNodes.add( id );
            this.NodeColors.set( id, '#007bff' );
        } );
        reached.forEach(( [id, color] ) => 
        {
            AlterNodes.add( id );
            this.NodeColors.set( id, color );
        } );
        
        AlterNodes.forEach( id => networkContainer.querySelector( `[data-node-id="${id}"] circle` )?.setAttribute( 'fill', this.NodeColors.get( id )));
    }
    /**
     * 显示节点详情
     * @param {number} nodeId - 节点ID
     */
    showNodeDetails(nodeId) {
        const detailsContainer = document.getElementById('node-details-container');
        if (!detailsContainer) {
            console.error(GetText('node_details_container_not_found'));
            return;
        }
        
        try {
            // 获取节点数据
            const nodeData = this.getNodeData(nodeId);
            
            if (!nodeData) {
                detailsContainer.innerHTML = `<p class="text-muted" data-text="no_node_selected">${GetText('no_node_selected')}</p>`;
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
            detailsContainer.innerHTML = `<p class="text-danger" data-text="error_showing_node_details">${GetText('error_showing_node_details')}</p>`;
        }
        
        if( this.tabManager && this.tabManager.resizeManager )
        {
            setTimeout(() => this.tabManager.resizeManager.applyRatio( 'network', this.tabManager.resizeManager.getTabRatio( 'network' )), 0 );
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
            //if (!this.app || !this.app.config) {
                //console.warn('应用或配置未找到');
                //return null;
            //}
            
            //// 检查节点ID是否有效
            //const nodeCount = this.app.config.nodeCount || 0;
            //if (nodeId < 0 || nodeId >= nodeCount) {
                //console.warn('无效的节点ID:', nodeId, '节点总数:', nodeCount);
                //return null;
            //}
            
            // 获取节点上的用户列表
            const CurrPeer = this.app.AllPeers.get( nodeId );
            
            //const nodeUsers = [];
            //if (this.app.mockUsers) {
                //for (const [userId, userData] of this.app.mockUsers) {
                    //// 检查用户是否分配到这个节点（支持多节点分配）
                    //const isOnNode = userData.nodeIds ? 
                        //userData.nodeIds.includes(nodeId) : 
                        //userData.nodeId === nodeId;
                    
                    //if (isOnNode) {
                        //nodeUsers.push({
                            //userId: userId,
                            //displayNumber: userData.displayNumber,
                            //totalAssets: userData.totalAssets
                        //});
                    //}
                //}
            //}
            
            // 获取节点连接信息
            //const connections = this.getNodeConnections(nodeId);
            
            return {
                nodeId: nodeId,
                nodeName: `Node ${nodeId}`,
                users: [...CurrPeer.Users.values()],
                connections: [...CurrPeer.Connections.values()],
                stats: {
                    totalUsers: CurrPeer.Users.size,
                    totalConnections: CurrPeer.Connections.size,
                    activeConnections: 0
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
    //getNodeConnections(nodeId) {
        //const connections = [];
        
        // 遍历网络连接，找到与当前节点相关的连接
        //this.networkLinks.forEach(link => {
            //let targetNodeId = null;
            //let isSource = false;
            
            //if (link.source.id === nodeId || link.source === nodeId) {
                //targetNodeId = link.target.id || link.target;
                //isSource = true;
            //} else if (link.target.id === nodeId || link.target === nodeId) {
                //targetNodeId = link.source.id || link.source;
                //isSource = false;
            //}
            
            //if (targetNodeId !== null) {
                //connections.push({
                    //targetNodeId: targetNodeId,
                    //targetNodeName: `Node ${targetNodeId + 1}`,
                    //latency: Math.floor(Math.random() * 10) + 1, // 模拟延迟（滴答数）
                    //isActive: link.active,
                    //direction: isSource ? 'outgoing' : 'incoming'
                //});
            //}
        //});
        
        //return connections;
    //}
    
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
                    <h5 data-text="node_details_title">${GetText('node_details_title')} ${nodeData.nodeName}</h5>
                </div>
                
                <!--div class="node-stats">
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
                </div-->
                
                <div class="node-users-section">
                    <h6 data-text="node_users_title">${GetText('node_users_title')} (${nodeData.users.length})</h6>
                    <div class="users-list">
                        ${nodeData.users.length > 0 ? nodeData.users.map(user => `
                            <div class="user-item" onclick0="window.mainPanel.showUserDetails('${user.Id}')"  onclick="window.mainPanel.tabManager.switchTab('users'); setTimeout(() => window.mainPanel.tabManager.usersTabContent.setSelectedUser('${user.Id}'), 100);">
                                <span class="user-display" data-text="user">${GetText('user')}&emsp;<span style="font-size: smaller;">${user.Id.slice( 0, 17 ) + '...'}</span></span>
                                <span class="user-assets">${user.GetAssets()} <span data-text="assets">${GetText('assets')}</span></span>
                            </div>
                        `).join('') : `<p class="text-muted" data-text="no_users">${GetText('no_users')}</p>`}
                    </div>
                </div>
                
                <div class="node-connections-section">
                    <h6 data-text="node_connections">${GetText('node_connections')} (${nodeData.connections.length})</h6>
                    <div class="connections-list">
                        ${nodeData.connections.length > 0 ? nodeData.connections.map(conn => `
                            <div class="connection-item active">
                                <span class="connection-target" data-text="adjoining_node">${GetText('adjoining_node')}&ensp;${conn[0].Id}</span>
                                <span class="connection-latency">${conn[1]} <span data-text="ticks">${GetText('ticks')}</span></span>
                                <!--span class="connection-status ${conn.isActive ? 'status-active' : 'status-inactive'}">
                                    ${conn.isActive ? GetText('status_normal') : GetText('status_faulty')}
                                </span-->
                            </div>
                        `).join('') : `<p class="text-muted" data-text="no_connections">${GetText('no_connections')}</p>`}
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
            detailsContainer.innerHTML = `<p class="text-muted" data-text="click_node_prompt">${GetText('click_node_prompt')}</p>`;
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
    
    ShowMessage( msg )
    {
        const MsgId = ( msg.from || '' ) + msg.Id;
        console.log( 'ShowMessage', MsgId );
        if( this.ShowedMsgs.has( MsgId ))
        {
            return;
        }
        const MsgContainer = document.querySelector( '.network-stats-panel' );
        const MsgIcon = document.createElement( 'div' );
        MsgIcon.innerHTML = `<div class="msgicon" style="background-color:${ msg.color }">&emsp;</div>
                            <span>${ msg.type }</span>`;
        MsgIcon.title = JSON.stringify( msg );
        MsgContainer.appendChild( MsgIcon );
        this.ShowedMsgs.add( MsgId );
    }
    /**
     * 重置网络图
     */
    resetNetworkGraph() {
        this.networkGraphInitialized = false;
        this.networkLinks = null;
        this.networkSimulation = null;
        this.ConnsJson = null;
        this.clearSelection();
        
        const statsContainer = document.getElementById('network-stats');
        const visualContainer = document.getElementById('d3-network-container');
        
        //if (statsContainer) {
            //statsContainer.innerHTML = `
                //<span class="network-stat" data-text="node_label">${GetText('node_label')}: 0</span>
                //<span class="network-stat" data-text="connections_label">${GetText('connections_label')}: 0</span>
                //<span class="network-stat" data-text="failures_label">${GetText('failures_label')}: 0</span>
            //`;
        //}
        
        if (visualContainer) {
            visualContainer.innerHTML = `<p class="text-muted" data-text="sys_not_started">${GetText('sys_not_started')}</p>`;
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
            this.ConnsJson = null;
            
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