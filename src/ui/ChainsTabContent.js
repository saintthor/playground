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
        const container = document.getElementById('chains-container');
        if (!container) {
            console.error('区块链容器未找到');
            return;
        }
        
        if (!chainData || chainData.size === 0) {
            container.innerHTML = '<p class="text-muted">系统未启动</p>';
            this.chainsGridInitialized = false;
            return;
        }
        
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
            console.error('区块链详情容器未找到');
            return;
        }
        
        try {
            // 获取区块链数据
            const chainData = this.getChainData(chainId);
            
            if (!chainData) {
                detailsContainer.innerHTML = '<p class="text-muted">区块链数据未找到</p>';
                return;
            }
            
            // 获取区块链拥有者信息
            const ownerData = this.getChainOwnerData(chainData.ownerId);
            
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
            detailsContainer.innerHTML = '<p class="text-danger">显示区块链详情时发生错误</p>';
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
    getChainData(chainId) {
        try {
            // 从应用中获取区块链数据
            if (!this.app || !this.app.mockChains) {
                console.warn('应用或区块链数据未找到');
                return null;
            }
            
            const chainData = this.app.mockChains.get(chainId);
            if (!chainData) {
                console.warn('区块链数据未找到:', chainId);
                return null;
            }
            
            return chainData;
            
        } catch (error) {
            console.error('获取区块链数据失败:', error);
            return null;
        }
    }
    
    /**
     * 获取区块链拥有者数据
     * @param {string} ownerId - 拥有者ID
     * @returns {Object} - 拥有者数据
     */
    getChainOwnerData(ownerId) {
        try {
            if (!ownerId || !this.app || !this.app.mockUsers) {
                return null;
            }
            
            const ownerData = this.app.mockUsers.get(ownerId);
            return ownerData;
            
        } catch (error) {
            console.error('获取区块链拥有者数据失败:', error);
            return null;
        }
    }
    
    /**
     * 生成区块链详情HTML
     * @param {string} chainId - 区块链ID
     * @param {Object} chainData - 区块链数据
     * @param {Object} ownerData - 拥有者数据
     * @returns {string} - 区块链详情HTML
     */
    generateChainDetailsHTML(chainId, chainData, ownerData) {
        const rootBlock = chainData.blocks && chainData.blocks[0] ? chainData.blocks[0] : null;
        
        return `
            <div class="chain-details">
                <div class="chain-details-header">
                    <h5>区块链详情 - 链${chainData.displayNumber || '?'}</h5>
                    <span class="chain-id">ID: ${this.truncateHash(chainId)}</span>
                </div>
                
                <div class="chain-basic-info">
                    <h6>基本信息</h6>
                    <div class="detail-info-grid">
                        <div class="detail-info-item">
                            <span class="detail-info-label">区块链ID (根区块哈希):</span>
                            <span class="detail-info-value crypto-hash" title="${chainId}">${this.truncateHash(chainId)}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label">显示编号:</span>
                            <span class="detail-info-value">链${chainData.displayNumber || '?'}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label">拥有者公钥:</span>
                            <span class="detail-info-value crypto-key" title="${chainData.ownerId || '未知'}">${this.truncateKey(chainData.ownerId || '未知')}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label">拥有者:</span>
                            <span class="detail-info-value">
                                ${ownerData ? `用户${ownerData.displayNumber}` : '未知用户'}
                                ${ownerData ? `<span class="owner-link" onclick="window.mainPanel.tabManager.switchTab('users'); setTimeout(() => window.mainPanel.tabManager.usersTabContent.setSelectedUser('${chainData.ownerId}'), 100);">(查看详情)</span>` : ''}
                            </span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label">当前价值:</span>
                            <span class="detail-info-value">${chainData.value || 0}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label">区块数量:</span>
                            <span class="detail-info-value">${chainData.blocks ? chainData.blocks.length : 0}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label">状态:</span>
                            <span class="detail-info-value ${chainData.isTransferring ? 'transferring' : ''}">${chainData.isTransferring ? '转移中' : '正常'}</span>
                        </div>
                    </div>
                </div>
                
                ${rootBlock ? `
                <div class="root-block-section">
                    <h6>根区块信息</h6>
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
                    <h6>所有区块 (${chainData.blocks ? chainData.blocks.length : 0})</h6>
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
            detailsContainer.innerHTML = '<p class="text-muted">请点击区块链缩略图查看详情</p>';
            detailsContainer.classList.remove('has-content');
        }
    }
    
    /**
     * 获取当前选中的区块链
     * @returns {string|null} - 选中的区块链ID
     */
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
            container.innerHTML = '<p class="text-muted">系统未启动</p>';
        }
    }
    
    /**
     * 生成区块链ID预览（前6个字符）
     * @param {string} chainId - 区块链ID
     * @returns {string} - 前6个字符
     */
    generateChainIdPreview(chainId) {
        if (!chainId || chainId === '未设置' || chainId === '未知') return '未知';
        if (chainId.length < 6) return chainId;
        return chainId.substring(0, 6);
    }
    
    /**
     * 截断密钥显示
     * @param {string} key - 密钥
     * @returns {string} - 截断后的密钥
     */
    truncateKey(key) {
        if (!key || key === '未设置' || key === '未知') return key;
        if (key.length <= 20) return key;
        return key.substring(0, 10) + '...' + key.substring(key.length - 10);
    }
    
    /**
     * 截断哈希值显示
     * @param {string} hash - 哈希值
     * @returns {string} - 截断后的哈希值
     */
    truncateHash(hash) {
        if (!hash || hash === '未知') return hash;
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