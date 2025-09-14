/**
 * MainPanel - Main Panel
 * Responsible for displaying network status, user assets, etc.
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
        
        this.tabManager = null;
    }
    
    init()
    {
        try
        {
            this.render();
            this.initTabMgr();
            this.isInitialized = true;
        }
        catch( error )
        {
            console.error( 'MainPanel initialization failed:', error );
        }
    }
    
    /**
     * Initializes the tab manager.
     */
    initTabMgr()
    {
        try
        {
            this.tabManager = new TabManager( this );
            
            this.tabManager.init();
            
            console.log( 'TabManager integrated into MainPanel' );
        }
        catch( error )
        {
            console.error( 'TabManager initialization failed:', error );
        }
    }
    
    render()
    {
        const mainPanel = document.getElementById( 'main-panel' );
        if( !mainPanel ) return;
        
        const panelContent = mainPanel.querySelector( '.panel-content' );
        if( !panelContent ) return;
        
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
                                        <button class="clearbtn" data-text="clear_colors" onclick="window.app.NetWorkPanal.ClearAll()">${GetText('clear_colors')}</button>
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
        
        if( this.tabManager )
        {
            this.tabManager.updateDataIncremental( data, this.lastData );
        }
        
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
     * Deep clones data for incremental update comparison.
     * @param {Object} data - The data to clone.
     * @returns {Object} - The cloned data.
     */
    cloneData( data )
    {
        try
        {
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
            console.error( 'Failed to deep clone data:', error );
            return data;
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
        
        const currentConfig = {
            nodeCount: nodeCount,
            maxConnections: networkData.maxConnections || 3,
            failureRate: networkData.failureRate || 0
        };
        
        const configChanged = !this.lastNetworkConfig || 
            this.lastNetworkConfig.nodeCount !== currentConfig.nodeCount ||
            this.lastNetworkConfig.maxConnections !== currentConfig.maxConnections ||
            this.lastNetworkConfig.failureRate !== currentConfig.failureRate;
        
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
            
            setTimeout(() => {
                this.renderD3NetworkGraph(nodeCount, networkData);
            }, 100);
        } else {
            const statsContainer = container.querySelector('.network-stats');
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <span class="network-stat">${GetText('node')}: ${nodeCount}</span>
                    <span class="network-stat">${GetText('connection')}: ${networkData.activeConnections || 0}</span>
                    <span class="network-stat">${GetText('failures')}: ${failedConnections}</span>
                `;
            }
            
            if (configChanged) {
                setTimeout(() => {
                    this.renderD3NetworkGraph(nodeCount, networkData);
                }, 100);
            }
        }
        
        this.lastNetworkConfig = currentConfig;
    }  
  
    renderD3NetworkGraph(nodeCount, networkData) {
        const container = document.getElementById('d3-network-container');
        if (!container) return;
        
        if (typeof d3 === 'undefined') {
            console.error('D3.js not loaded');
            container.innerHTML = `<div class="network-placeholder" data-text="d3_not_loaded">${GetText('d3_not_loaded')}</div>`;
            return;
        }
        
        d3.select(container).selectAll("*").remove();
        
        const width = container.clientWidth || 400;
        const height = container.clientHeight || 500;
        
        const svg = d3.select(container)
            .append("svg")
            .attr("width", width)
            .attr("height", height);
        
        const nodes = [];
        for (let i = 0; i < nodeCount; i++) {
            nodes.push({
                id: i,
                name: `Node ${i + 1}`
            });
        }
        
        const links = [];
        const maxConnections = networkData.maxConnections || 3;
        const failureRate = networkData.failureRate || 0;
        
        for (let i = 0; i < nodeCount; i++) {
            const connectedNodes = new Set();
            
            while (connectedNodes.size < maxConnections && connectedNodes.size < nodeCount - 1) {
                const targetId = Math.floor(Math.random() * nodeCount);
                if (targetId !== i) {
                    connectedNodes.add(targetId);
                }
            }
            
            connectedNodes.forEach(targetId => {
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
        
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(finalLinks).id(d => d.id).distance(50))
            .force("charge", d3.forceManyBody().strength(-100))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(15));
        
        const link = svg.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(finalLinks)
            .enter().append("line")
            .attr("stroke", d => d.active ? "#28a745" : "#dc3545")
            .attr("stroke-width", 2)
            .attr("opacity", 0.7);
        
        const node = svg.append("g")
            .attr("class", "nodes")
            .selectAll("g")
            .data(nodes)
            .enter().append("g");
        
        node.append("circle")
            .attr("r", 8)
            .attr("fill", "#007bff")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .style("cursor", "pointer");
        
        node.append("text")
            .attr("dy", 20)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("fill", "#333")
            .text(d => `N${d.id + 1}`);
        
        node.call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));
        
        function ticked() {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);
            
            node
                .attr("transform", d => `translate(${d.x},${d.y})`);
        }
        
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
        
        simulation.on("tick", ticked);
        
        this.networkLinks = finalLinks;
        this.networkSimulation = simulation;
    }    
  
  updateNetworkStats(networkData) {
        console.log('Updating network stats:', networkData);
    }
    
    updateNetworkConnections(networkData) {
        console.log('Updating network connections:', networkData);
    }
    
    /**
     * Starts real-time updates.
     */
    startRealTimeUpdate() {
        if (this.updateInterval) {
            this.stopRealTimeUpdate();
        }
        
        this.tabManager.switchTab( 'network' );
        this.updateInterval = setInterval(() => {
            this.requestDataUpdate();
        }, 1000);
        
        console.log('Main panel real-time update started');
    }

    /**
     * Stops real-time updates.
     */
    stopRealTimeUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        console.log('Main panel real-time update stopped');
    }

    /**
     * Requests a data update.
     */
    requestDataUpdate() {
        if (this.app && this.app.getMainPanelData) {
            const data = this.app.getMainPanelData();
            this.updateAllData(data);
        }
    }
    
    /**
     * Shows a detail modal.
     */
    showDetailModal(title, content) {
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
        
        const existingModal = document.getElementById('detail-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    
    /**
     * Gets user-related logs.
     */
    getUserRelatedLogs(userId) {
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
        console.log( 'MainPanel handling language change:', language );
        
        this.tabManager.helpTabContent.onLanguageChanged( language );
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MainPanel;
}

if (typeof window !== 'undefined') {
    window.MainPanel = MainPanel;
}
