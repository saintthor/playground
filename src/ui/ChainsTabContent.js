/**
 * ChainsTabContent - Chains Tab Content Component
 * Manages the display and interaction of the chains tab.
 */
class ChainsTabContent {
    constructor(tabManager) {
        this.tabManager = tabManager;
        this.mainPanel = tabManager.mainPanel;
        this.app = tabManager.mainPanel.app;
        
        this.selectedChain = null;
        this.chainsGridInitialized = false;
        
        console.log('ChainsTabContent initialized');
    }
    
    /**
     * Renders the chains grid.
     * @param {Map} chainData - The chain data.
     */
    renderChainsGrid(chainData) {
        const container = document.getElementById('chains-container');
        if (!container) {
            console.error(GetText('chains_container_not_found'));
            return;
        }
        
        if (!chainData || chainData.size === 0) {
            container.innerHTML = `<p class="text-muted" data-text="sys_not_started">${GetText("sys_not_started")}</p>`;
            this.chainsGridInitialized = false;
            return;
        }
        
        this.AllChains = chainData;
        let chainsGrid = container.querySelector('.chains-grid');
        if (!chainsGrid) {
            chainsGrid = document.createElement('div');
            chainsGrid.className = 'chains-grid';
            container.innerHTML = '';
            container.appendChild(chainsGrid);
            this.chainsGridInitialized = true;
        }
        
        for (const [chainId, chain] of chainData) {
            let chainCard = chainsGrid.querySelector(`[data-chain-id="${chainId}"]`);
            const isTransferring = !!chain.Status;
            
            if( !chainCard )
            {
                chainCard = document.createElement( 'div' );
                chainCard.className = `chain-card ${ chain.Status }`;
                chainCard.setAttribute( 'data-chain-id', chainId );
                
                const chainIdPreview = this.generateChainIdPreview( chainId );
                chainCard.innerHTML = `<span class="chain-id-preview">${ chainIdPreview }</span>`;
                chainsGrid.appendChild( chainCard );
                
                chainCard.addEventListener( 'click', () => 
                {
                    this.handleChainClick( chainId );
                });
            } 
            else
            {
                if( isTransferring )
                {
                    console.log( 'add transferring' );
                    chainCard.classList.add( 'transferring' );
                } 
                else if( !isTransferring && chainCard.classList.contains( 'transferring' ) )
                {
                    chainCard.classList.remove( 'transferring' );
                }
            }
        }
        
        const existingCards = chainsGrid.querySelectorAll('.chain-card');
        existingCards.forEach(card => {
            const chainId = card.getAttribute('data-chain-id');
            if (!chainData.has(chainId)) {
                card.remove();
            }
        });
        
        if (this.tabManager && this.tabManager.resizeManager) {
            setTimeout(() => {
                this.tabManager.resizeManager.applyRatio('chains', this.tabManager.resizeManager.getTabRatio('chains'));
            }, 0);
        }
    }
    
    /**
     * Handles a chain click event.
     * @param {string} chainId - The ID of the clicked chain.
     */
    handleChainClick(chainId) {
        try {
            this.updateChainSelection(chainId);
            
            this.showChainDetails(chainId);
            
            if (this.app && this.app.logPanel) {
                this.app.logPanel.switchToCategory( 'blockchain', chainId );
            }
            
            this.tabManager.handleStateChange('chains', {
                selectedChain: chainId
            });
            
            console.log('Chain click handled:', chainId);
            
        } catch (error) {
            console.error('Failed to handle chain click:', error);
        }
    }
    
    /**
     * Updates the chain selection.
     * @param {string} chainId - The ID of the selected chain.
     */
    updateChainSelection(chainId) {
        const chainsContainer = document.getElementById('chains-container');
        if (!chainsContainer) return;
        
        const previousSelected = chainsContainer.querySelectorAll('.chain-card.selected');
        previousSelected.forEach(card => {
            card.classList.remove('selected');
        });
        
        const selectedCard = chainsContainer.querySelector(`[data-chain-id="${chainId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        this.selectedChain = chainId;
    }
    
    /**
     * Shows the chain details.
     * @param {string} chainId - The ID of the chain.
     */
    showChainDetails(chainId) {
        const detailsContainer = document.getElementById('chain-details-container');
        if (!detailsContainer) {
            console.error(GetText('chain_details_container_not_found'));
            return;
        }
        
        try {
            const chainData = this.AllChains.get( chainId );
            
            if (!chainData) {
                detailsContainer.innerHTML = `<p class="text-muted" data-text="chain_data_not_found">${GetText('chain_data_not_found')}</p>`;
                return;
            }
            
            const ownerData = chainData.Owner;
            
            const detailsHTML = this.generateChainDetailsHTML(chainId, chainData, ownerData);
            detailsContainer.innerHTML = detailsHTML;
            
            detailsContainer.classList.add('has-content');
            
            this.forceLayoutRecalculation();
            
            console.log('Chain details shown:', chainId);
            
        } catch (error) {
            console.error('Failed to show chain details:', error);
            detailsContainer.innerHTML = `<p class="text-danger" data-text="error_showing_chain_details">${GetText('error_showing_chain_details')}</p>`;
        }
    }
    
    /**
     * Forces layout recalculation to ensure scrollbars are displayed correctly.
     */
    forceLayoutRecalculation()
    {
        try
        {
            const chainsTab = document.getElementById( 'chains-tab' );
            if( !chainsTab ) return;
            
            const upperSection = chainsTab.querySelector( '.tab-section-upper' );
            const lowerSection = chainsTab.querySelector( '.tab-section-lower' );
            
            if( upperSection && lowerSection )
            {
                upperSection.offsetHeight;
                lowerSection.offsetHeight;
                
                if( window.resizeManager && window.resizeManager.tabRatios )
                {
                    const currentRatio = window.resizeManager.tabRatios.chains || 0.6;
                    setTimeout( () =>
                    {
                        window.resizeManager.applyRatio( 'chains', currentRatio );
                    }, 0 );
                }
            }
        }
        catch( error )
        {
            console.error( 'Failed to force layout recalculation:', error );
        }
    }

    /**
     * Generates the HTML for the chain details.
     * @param {string} chainId - The ID of the chain.
     * @param {Object} chainData - The data for the chain.
     * @param {Object} ownerData - The data for the owner.
     * @returns {string} - The HTML for the chain details.
     */
    generateChainDetailsHTML(chainId, chainData, ownerData) {
        return `
            <div class="chain-details">
                <div class="chain-details-header">
                    <h5 data-text="chain_details_title">${GetText('chain_details_title')}</h5>
                    <span class="chain-id" data-text="chain_id_label">${GetText('chain_id_label')} ${this.truncateHash( chainData.Id )}</span>
                </div>
                
                <div class="chain-basic-info">
                    <h6 data-text="basic_info">${GetText('basic_info')}</h6>
                    <div class="detail-info-grid">
                        <div class="detail-info-item">
                            <span class="detail-info-label" data-text="chain_id_root_hash_label">${GetText('chain_id_root_hash_label')}</span>
                            <span class="detail-info-value crypto-hash" title="${chainId}">${this.truncateHash(chainData.Id)}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label" data-text="owner_public_key_label">${GetText('owner_public_key_label')}</span>
                            <span class="detail-info-value crypto-key" title="${ownerData.Id || GetText('unknown')}">${this.truncateKey(ownerData.Id || GetText('unknown'))}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label" data-text="owner_label">${GetText('owner_label')}</span>
                            <span class="detail-info-value">
                                ${ownerData ? `<span data-text="user">${GetText('user')}</span>${ ownerData.Id.slice( 0, 15 ) }` : `<span data-text="unknown_user">${GetText('unknown_user')}</span>`}
                                ${ownerData ? `<span class="owner-link" data-text="view_details_link" onclick="window.mainPanel.tabManager.switchTab('users'); setTimeout(() => window.mainPanel.tabManager.usersTabContent.setSelectedUser('${ownerData.Id}'), 100);">${GetText('view_details_link')}</span>` : ''}
                            </span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label" data-text="current_value_label">${GetText('current_value_label')}</span>
                            <span class="detail-info-value">${chainData.FaceVal || 0}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label" data-text="block_count_label">${GetText('block_count_label')}</span>
                            <span class="detail-info-value">${chainData.BlockNum }</span>
                        </div>
                    </div>
                </div>
                
                ${ true ? `
                <div class="root-block-section">
                    <h6 data-text="root_block_info_title">${GetText('root_block_info_title')}</h6>
                    <div class="block-info">
                        <div class="detail-info-grid">
                            <div class="detail-info-item">
                                <span class="detail-info-label" data-text="chain_root_block_id_label">${GetText('chain_root_block_id_label')}</span>
                                <span class="detail-info-value crypto-hash" title="${chainData.Id || GetText('unknown')}">${chainData.Id || GetText('unknown')}</span>
                            </div>
                            <div class="detail-info-item">
                                <span class="detail-info-value">
                                    <pre style="font-size: 0.8rem; margin: 0; white-space: pre-wrap;">${chainData.Root.Content || GetText('unknown')}</pre>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                <div class="chain-blocks-section">
                    <h6 data-text="subsequent_blocks_title">${GetText('subsequent_blocks_title')} (${chainData.BlockNum})</h6>
                    <div class="blocks-list">
                        ${chainData.BlockNum ? chainData.BlockList.sort( c => c.Index ).map( block => `
                            <div class="block-item ${block.Index === 0 ? 'root-block' : ''}">
                                <div class="block-header">
                                    <span>
                                        <span class="block-index">#${block.Index}</span><br>
                                        <span class="block-type" data-text="${block.Index === 0 ? 'root_block' : 'payment_block'}">${block.Index === 0 ? GetText('root_block') : GetText('payment_block')}</span>
                                    </span>
                                    <span class="detail-info-value" title="Id">${block.Id}</span>
                                </div>
                                <div class="block-content">
                                    <div class="block-field">
                                        <span class="field-value crypto-hash"}">
                                            <pre style="font-size: 0.7rem; margin: 0; white-space: pre-wrap;">${block.Content || GetText('unknown')}</pre>
                                        </span>
                                    </div>
                                    ${block.previousHash ? `
                                    <div class="block-field">
                                        <span class="field-label" data-text="previous_hash">${GetText('previous_hash')}:</span>
                                        <span class="field-value crypto-hash" title="${block.PrevId}">${this.truncateHash(block.PrevId)}</span>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('') : `<p class="text-muted" data-text="no_block_data">${GetText('no_block_data')}</p>`}
                    </div>
                </div>
                <div class="chain-blocks-section">
                    <h6 data-text="fork_blocks_title">${GetText('fork_blocks_title')} (${chainData.Forks.size})</h6>
                    <div class="blocks-list">
                        ${ chainData.Forks.size > 0 ? chainData.GetForks().map(( [blockId, index, peerIds] ) => `
                            <div class="block-item">
                                <div class="block-header">
                                    <span class="block-index">#${index}</span>
                                    <span class="detail-info-value" title="blockId">${blockId}</span>
                                </div>
                                <h6 data-text="support_peers">${GetText('support_peers')}</h6>
                                <div class="block-header">Peers- ${ peerIds.join( ',' )}</div>
                            </div>
                        `).join('') : `<p class="text-muted" data-text="no_fork_data">${GetText('no_fork_data')}</p>`}
                    </div>
                </div>
            </div>
        `;
    }
    
    /*
     * Updates the chain details.
     * @param {Object} chainData - The chain data.
     */
    /* updateChainDetails(chainData) {
        if (this.selectedChain !== null) {
            this.showChainDetails(this.selectedChain);
        }
    } */
    
    /**
     * Clears the selection.
     */
    clearSelection() {
        this.selectedChain = null;
        this.updateChainSelection(null);
        
        const detailsContainer = document.getElementById('chain-details-container');
        if (detailsContainer) {
            detailsContainer.innerHTML = `<p class="text-muted" data-text="click_chain_to_see_details">${GetText('click_chain_to_see_details')}</p>`;
            detailsContainer.classList.remove('has-content');
        }
    }
    
    /**
     * Gets the currently selected chain.
     * @returns {string|null} - The ID of the selected chain.
     */
    GetSelected()
    {
        return this.AllChains?.get( this.selectedChain );
    }
    
    getSelectedChain() {
        return this.selectedChain;
    }
    /**
     * Sets the selected chain.
     * @param {string|null} chainId - The ID of the chain.
     * @param {boolean} triggerLogSwitch - Whether to trigger the log panel switch.
     */
    setSelectedChain(chainId, triggerLogSwitch = true) {
        if (chainId !== null) {
            if (triggerLogSwitch) {
                this.handleChainClick(chainId);
            } else {
                this.updateChainSelection(chainId);
                this.showChainDetails(chainId);
                this.tabManager.handleStateChange('chains', {
                    selectedChain: chainId
                });
            }
        } else {
            this.clearSelection();
        }
    }
    
    /*
     * Resets the chains grid.
     */
    /* resetChainsGrid() {
        this.chainsGridInitialized = false;
        this.clearSelection();
        
        const container = document.getElementById('chains-container');
        if (container) {
            container.innerHTML = `<p class="text-muted" data-text="sys_not_started">${GetText("sys_not_started")}</p>`;
        }
    } */
    
    /**
     * Generates a preview of the chain ID.
     * @param {string} chainId - The ID of the chain.
     * @returns {string} - The first 6 characters of the chain ID.
     */
    generateChainIdPreview(chainId) {
        if (!chainId || chainId === GetText('not_set') || chainId === GetText('unknown')) return GetText('unknown');
        if (chainId.length < 6) return chainId;
        return chainId.substring(0, 6);
    }
    
    /**
     * Truncates a key for display.
     * @param {string} key - The key.
     * @returns {string} - The truncated key.
     */
    truncateKey(key) {
        if (!key || key === GetText('not_set') || key === GetText('unknown')) return key;
        if (key.length <= 20) return key;
        return key.substring(0, 10) + '...' + key.substring(key.length - 10);
    }
    
    /**
     * Truncates a hash for display.
     * @param {string} hash - The hash.
     * @returns {string} - The truncated hash.
     */
    truncateHash(hash) {
        if (!hash || hash === GetText('unknown')) return hash;
        if (hash.length <= 16) return hash;
        return hash.substring(0, 8) + '...' + hash.substring(hash.length - 8);
    }
    
    /**
     * Destroys the chains tab content.
     */
    destroy() {
        try {
            this.selectedChain = null;
            this.chainsGridInitialized = false;
            
            console.log('ChainsTabContent destroyed');
            
        } catch (error) {
            console.error('ChainsTabContent destruction failed:', error);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChainsTabContent;
}

if (typeof window !== 'undefined') {
    window.ChainsTabContent = ChainsTabContent;
}
