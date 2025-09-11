/**
 * ChainsTabContent - 区块链标签页内容组件
 * 管理区块链标签页的显示和交互
 */
class ChainsTabContent {
    constructor(tabManager) {
        this.tabManager = tabManager;
        this.mainPanel = tabManager.mainPanel;
        this.app = tabManager.mainPanel.app;
        
        // 区块链相关状态
        this.selectedChain = null;
        this.chainsGridInitialized = false;
        
        console.log('ChainsTabContent 初始化完成');
    }
    
    /**
     * 渲染区块链网格
     * @param {Map} chainData - 区块链数据
     */
    renderChainsGrid(chainData) {
        //console.log( chainData.size, BlockChain.All.size );
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
        // 检查是否已经有区块链网格，如果没有则创建
        let chainsGrid = container.querySelector('.chains-grid');
        if (!chainsGrid) {
            chainsGrid = document.createElement('div');
            chainsGrid.className = 'chains-grid';
            container.innerHTML = '';
            container.appendChild(chainsGrid);
            this.chainsGridInitialized = true;
        }
        
        // 只更新发生变化的区块链卡片
        for (const [chainId, chain] of chainData) {
            let chainCard = chainsGrid.querySelector(`[data-chain-id="${chainId}"]`);
            const isTransferring = chain.isTransferring || false;
            
            if( !chainCard )
            {
                // 创建新的区块链卡片
                chainCard = document.createElement( 'div' );
                chainCard.className = `chain-card ${ isTransferring ? 'transferring' : '' }`;
                chainCard.setAttribute( 'data-chain-id', chainId );
                
                // 显示区块链ID的前6个字符
                const chainIdPreview = this.generateChainIdPreview( chainId );
                chainCard.innerHTML = `<span class="chain-id-preview">${ chainIdPreview }</span>`;
                chainsGrid.appendChild( chainCard );
                
                // 添加点击事件监听器
                chainCard.addEventListener( 'click', () => 
                {
                    this.handleChainClick( chainId );
                });
            } 
            else 
            {
                // 更新转移状态样式
                if( isTransferring && !chainCard.classList.contains( 'transferring' ) )
                {
                    chainCard.classList.add( 'transferring' );
                } 
                else if( !isTransferring && chainCard.classList.contains( 'transferring' ) )
                {
                    chainCard.classList.remove( 'transferring' );
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
        
        console.log(`区块链网格渲染完成: ${chainData.size} 个区块链`);
        
        // 触发ResizeManager重新应用比例，确保高度设置正确
        if (this.tabManager && this.tabManager.resizeManager) {
            // 使用setTimeout确保DOM更新完成后再应用比例
            setTimeout(() => {
                this.tabManager.resizeManager.applyRatio('chains', this.tabManager.resizeManager.getTabRatio('chains'));
            }, 0);
        }
    }
    
    /**
     * 处理区块链点击事件
     * @param {string} chainId - 区块链ID
     */
    handleChainClick(chainId) {
        try {
            // 更新选中状态
            this.updateChainSelection(chainId);
            
            // 显示区块链详情
            this.showChainDetails(chainId);
            
            // 切换日志面板到区块链日志
            if (this.app && this.app.logPanel) {
                this.app.logPanel.switchToCategory('blockchain');
            }
            
            // 保存选中状态到标签页管理器
            this.tabManager.handleStateChange('chains', {
                selectedChain: chainId
            });
            
            console.log('区块链点击处理完成:', chainId);
            
        } catch (error) {
            console.error('处理区块链点击失败:', error);
        }
    }
    
    /**
     * 更新区块链选中状态
     * @param {string} chainId - 区块链ID
     */
    updateChainSelection(chainId) {
        const chainsContainer = document.getElementById('chains-container');
        if (!chainsContainer) return;
        
        // 清除之前的选中状态
        const previousSelected = chainsContainer.querySelectorAll('.chain-card.selected');
        previousSelected.forEach(card => {
            card.classList.remove('selected');
        });
        
        // 设置新的选中状态
        const selectedCard = chainsContainer.querySelector(`[data-chain-id="${chainId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        this.selectedChain = chainId;
    }
    
    /**
     * 显示区块链详情
     * @param {string} chainId - 区块链ID
     */
    showChainDetails(chainId) {
        const detailsContainer = document.getElementById('chain-details-container');
        if (!detailsContainer) {
            console.error(GetText('chain_details_container_not_found'));
            return;
        }
        
        try {
            // 获取区块链数据
            const chainData = this.AllChains.get( chainId );
            
            if (!chainData) {
                detailsContainer.innerHTML = `<p class="text-muted" data-text="chain_data_not_found">${GetText('chain_data_not_found')}</p>`;
                return;
            }
            
            // 获取区块链拥有者信息
            const ownerData = chainData.Owner;
            
            // 生成区块链详情HTML
            const detailsHTML = this.generateChainDetailsHTML(chainId, chainData, ownerData);
            detailsContainer.innerHTML = detailsHTML;
            
            // 添加has-content类以启用滚动条
            detailsContainer.classList.add('has-content');
            
            // 强制重新计算布局以确保滚动条正确显示
            this.forceLayoutRecalculation();
            
            console.log('区块链详情显示完成:', chainId);
            
        } catch (error) {
            console.error('显示区块链详情失败:', error);
            detailsContainer.innerHTML = `<p class="text-danger" data-text="error_showing_chain_details">${GetText('error_showing_chain_details')}</p>`;
        }
    }
    
    /**
     * 强制重新计算布局，确保滚动条正确显示
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
                // 触发重新计算布局
                upperSection.offsetHeight;
                lowerSection.offsetHeight;
                
                // 如果有ResizeManager，使用当前比例重新应用布局
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
            console.error( '强制布局重新计算失败:', error );
        }
    }

    /**
     * 获取区块链数据
     * @param {string} chainId - 区块链ID
     * @returns {Object} - 区块链数据
     */
    //getChainData(chainId) {
        //try {
            
            //const chainData = this.app.AllChains.get(chainId);
            //if (!chainData) {
                //console.warn('区块链数据未找到:', chainId);
                //return null;
            //}
            
            //return chainData;
            
        //} catch (error) {
            //console.error('获取区块链数据失败:', error);
            //return null;
        //}
    //}
    
    /**
     * 获取区块链拥有者数据
     * @param {string} ownerId - 拥有者ID
     * @returns {Object} - 拥有者数据
     */
    //getChainOwnerData(ownerId) {
        //try {
            //if (!ownerId || !this.app || !this.app.mockUsers) {
                //return null;
            //}
            
            //const ownerData = this.app.mockUsers.get(ownerId);
            //return ownerData;
            
        //} catch (error) {
            //console.error('获取区块链拥有者数据失败:', error);
            //return null;
        //}
    //}
    
    /**
     * 生成区块链详情HTML
     * @param {string} chainId - 区块链ID
     * @param {Object} chainData - 区块链数据
     * @param {Object} ownerData - 拥有者数据
     * @returns {string} - 区块链详情HTML
     */
    generateChainDetailsHTML(chainId, chainData, ownerData) {
        //const rootBlock = chainData.blocks && chainData.blocks[0] ? chainData.blocks[0] : null;
        
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
                        <!--div class="detail-info-item">
                            <span class="detail-info-label">显示编号:</span>
                            <span class="detail-info-value">链${chainData.displayNumber || '?'}</span>
                        </div-->
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
                        <!--div class="detail-info-item">
                            <span class="detail-info-label">状态:</span>
                            <span class="detail-info-value ${chainData.isTransferring ? 'transferring' : ''}">${chainData.isTransferring ? '转移中' : '正常'}</span>
                        </div-->
                    </div>
                </div>
                
                ${ true ? `
                <div class="root-block-section">
                    <h6 data-text="root_block_info_title">${GetText('root_block_info_title')}</h6>
                    <div class="block-info">
                        <div class="detail-info-grid">
                            <!--div class="detail-info-item">
                                <span class="detail-info-label">滴答时间:</span>
                                <span class="detail-info-value">滴答 ${chainData.Root.Tick || GetText('unknown')}</span>
                            </div-->
                            <div class="detail-info-item">
                                <span class="detail-info-label" data-text="chain_root_block_id_label">${GetText('chain_root_block_id_label')}</span>
                                <span class="detail-info-value crypto-hash" title="${chainData.Id || GetText('unknown')}">${chainData.Id || GetText('unknown')}</span>
                            </div>
                            <div class="detail-info-item">
                                <!--span class="detail-info-label">数据</span-->
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
                        ${chainData.BlockNum ? chainData.BlockList.map( block => `
                            <div class="block-item ${block.Index === 0 ? 'root-block' : ''}">
                                <div class="block-header">
                                    <span class="block-index">#${block.Index}</span>
                                    <span class="block-type" data-text="${block.Index === 0 ? 'root_block' : 'payment_block'}">${block.Index === 0 ? GetText('root_block') : GetText('payment_block')}</span>
                                </div>
                                <div class="block-content">
                                    <!--div class="block-field">
                                        <span class="field-label">类型:</span>
                                        <span class="field-label">时间:</span>
                                        <span class="field-value">${block.Tick || GetText('unknown')} 滴答</span>
                                        <span class="field-value">${block.type || GetText('unknown')}</span>
                                    </div-->
                                    <div class="block-field">
                                        <!--span class="field-label">数据</span-->
                                        <span class="field-value crypto-hash"}">
                                            <pre style="font-size: 0.7rem; margin: 0; white-space: pre-wrap;">${block.Content || GetText('unknown')}</pre>
                                        </span>
                                    </div>
                                    <!--div class="block-field">
                                    </div-->
                                    ${block.previousHash ? `
                                    <div class="block-field">
                                        <span class="field-label">前区块哈希:</span>
                                        <span class="field-value crypto-hash" title="${block.PrevId}">${this.truncateHash(block.PrevId)}</span>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('') : `<p class="text-muted" data-text="no_block_data">${GetText('no_block_data')}</p>`}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 更新区块链详情
     * @param {Object} chainData - 区块链数据
     */
    updateChainDetails(chainData) {
        if (this.selectedChain !== null) {
            this.showChainDetails(this.selectedChain);
        }
    }
    
    /**
     * 清除选中状态
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
     * 获取当前选中的区块链
     * @returns {string|null} - 选中的区块链ID
     */
    GetSelected()
    {
        return this.AllChains?.get( this.selectedChain );
    }
    
    getSelectedChain() {
        return this.selectedChain;
    }
    /**
     * 设置选中的区块链
     * @param {string|null} chainId - 区块链ID
     * @param {boolean} triggerLogSwitch - 是否触发日志面板切换，默认为true
     */
    setSelectedChain(chainId, triggerLogSwitch = true) {
        if (chainId !== null) {
            if (triggerLogSwitch) {
                this.handleChainClick(chainId);
            } else {
                // 只更新选中状态和显示详情，不触发日志面板切换
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
    
    /**
     * 重置区块链网格
     */
    resetChainsGrid() {
        this.chainsGridInitialized = false;
        this.clearSelection();
        
        const container = document.getElementById('chains-container');
        if (container) {
            container.innerHTML = `<p class="text-muted" data-text="sys_not_started">${GetText("sys_not_started")}</p>`;
        }
    }
    
    /**
     * 生成区块链ID预览（前6个字符）
     * @param {string} chainId - 区块链ID
     * @returns {string} - 前6个字符
     */
    generateChainIdPreview(chainId) {
        if (!chainId || chainId === GetText('not_set') || chainId === GetText('unknown')) return GetText('unknown');
        if (chainId.length < 6) return chainId;
        return chainId.substring(0, 6);
    }
    
    /**
     * 截断密钥显示
     * @param {string} key - 密钥
     * @returns {string} - 截断后的密钥
     */
    truncateKey(key) {
        if (!key || key === GetText('not_set') || key === GetText('unknown')) return key;
        if (key.length <= 20) return key;
        return key.substring(0, 10) + '...' + key.substring(key.length - 10);
    }
    
    /**
     * 截断哈希值显示
     * @param {string} hash - 哈希值
     * @returns {string} - 截断后的哈希值
     */
    truncateHash(hash) {
        if (!hash || hash === GetText('unknown')) return hash;
        if (hash.length <= 16) return hash;
        return hash.substring(0, 8) + '...' + hash.substring(hash.length - 8);
    }
    
    /**
     * 销毁区块链标签页内容
     */
    destroy() {
        try {
            // 清理状态
            this.selectedChain = null;
            this.chainsGridInitialized = false;
            
            console.log('ChainsTabContent 已销毁');
            
        } catch (error) {
            console.error('ChainsTabContent 销毁失败:', error);
        }
    }
}

// 导出 ChainsTabContent 类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChainsTabContent;
}

// ES6 导出
if (typeof window !== 'undefined') {
    window.ChainsTabContent = ChainsTabContent;
}