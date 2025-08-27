/**
 * UsersTabContent - 用户标签页内容组件
 * 管理用户标签页的显示和交互
 */
class UsersTabContent {
    constructor(tabManager) {
        this.tabManager = tabManager;
        this.mainPanel = tabManager.mainPanel;
        this.app = tabManager.mainPanel.app;
        
        // 用户相关状态
        this.selectedUser = null;
        this.usersGridInitialized = false;
        
        console.log('UsersTabContent 初始化完成');
    }
    
    /**
     * 渲染用户网格
     * @param {Map} userData - 用户数据
     */
    renderUsersGrid(userData) {
        const container = document.getElementById('users-container');
        if (!container) {
            console.error('用户容器未找到');
            return;
        }
        
        if (!userData || userData.size === 0) {
            container.innerHTML = '<p class="text-muted">系统未启动</p>';
            this.usersGridInitialized = false;
            return;
        }
        
        // 检查是否已经有用户网格，如果没有则创建
        let usersGrid = container.querySelector('.users-grid');
        if (!usersGrid) {
            usersGrid = document.createElement('div');
            usersGrid.className = 'users-grid';
            container.innerHTML = '';
            container.appendChild(usersGrid);
            this.usersGridInitialized = true;
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
                
                // 生成公钥预览（前6个字符）
                const keyPreview = this.generateKeyPreview(userId);
                
                // 生成新的HTML结构
                userCard.innerHTML = `
                    <div class="user-icon">👤</div>
                    <div class="user-key-preview">${keyPreview}</div>
                    <div class="user-tooltip">${this.truncateKey(userId)}</div>
                `;
                usersGrid.appendChild(userCard);
                
                // 添加点击事件监听器
                userCard.addEventListener('click', () => {
                    this.handleUserClick(userId);
                });
            } else {
                // 更新转账状态样式
                if (isTransferring && !userCard.classList.contains('transferring')) {
                    userCard.classList.add('transferring');
                } else if (!isTransferring && userCard.classList.contains('transferring')) {
                    userCard.classList.remove('transferring');
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
        
        console.log(`用户网格渲染完成: ${userData.size} 个用户`);
    }
    
    /**
     * 处理用户点击事件
     * @param {string} userId - 用户ID
     */
    handleUserClick(userId) {
        console.log( 'handleUserClick', userId );
        try {
            // 更新选中状态
            this.updateUserSelection(userId);
            
            // 显示用户详情
            this.showUserDetails(userId);
            
            // 切换日志面板到用户日志
            if (this.app && this.app.logPanel) {
                this.app.logPanel.switchToCategory('user');
            }
            
            // 保存选中状态到标签页管理器
            this.tabManager.handleStateChange('users', {
                selectedUser: userId
            });
            
            console.log('用户点击处理完成:', userId);
            
        } catch (error) {
            console.error('处理用户点击失败:', error);
        }
    }
    
    /**
     * 更新用户选中状态
     * @param {string} userId - 用户ID
     */
    updateUserSelection(userId) {
        const usersContainer = document.getElementById('users-container');
        if (!usersContainer) return;
        
        // 清除之前的选中状态
        const previousSelected = usersContainer.querySelectorAll('.user-card.selected');
        previousSelected.forEach(card => {
            card.classList.remove('selected');
        });
        
        // 设置新的选中状态
        const selectedCard = usersContainer.querySelector(`[data-user-id="${userId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        this.selectedUser = userId;
    }
    
    /**
     * 显示用户详情
     * @param {string} userId - 用户ID
     */
    showUserDetails(userId) {
        const detailsContainer = document.getElementById('user-details-container');
        if (!detailsContainer) {
            console.error('用户详情容器未找到');
            return;
        }
        
        try {
            // 获取用户数据
            const user = this.app.CurrUser = this.getUserData(userId);
            
            if (!user) {
                detailsContainer.innerHTML = '<p class="text-muted">用户数据未找到</p>';
                return;
            }
            
            // 获取用户拥有的区块链
            const userChains = user.OwnChains;
            
            // 生成用户详情HTML
            const detailsHTML = this.generateUserDetailsHTML(userId, user, userChains);
            detailsContainer.innerHTML = detailsHTML;
            
            // 添加has-content类以启用滚动条
            detailsContainer.classList.add('has-content');
            
            console.log('用户详情显示完成:', userId);
            
        } catch (error) {
            console.error('显示用户详情失败:', error);
            detailsContainer.innerHTML = '<p class="text-danger">显示用户详情时发生错误</p>';
        }
    }
    
    /**
     * 获取用户数据
     * @param {string} userId - 用户ID
     * @returns {Object} - 用户数据
     */
    getUserData(userId) {
        try {
            // 从应用中获取用户数据
            //if (!this.app || !this.app.mockUsers) {
                //console.warn('应用或用户数据未找到');
                //return null;
            //}
            
            const userData = this.app.AllUsers.get(userId);
            if (!userData) {
                console.warn('用户数据未找到:', userId);
                return null;
            }
            
            return userData;
            
        } catch (error) {
            console.error('获取用户数据失败:', error);
            return null;
        }
    }
    
    /**
     * 获取用户拥有的区块链
     * @param {string} userId - 用户ID
     * @param {Object} userData - 用户数据
     * @returns {Array} - 用户拥有的区块链数组
     */
    //getUserChains(userId, userData) {
        //try {
            //if (!userData.ownedChains || !this.app.mockChains) {
                //return [];
            //}
            
            //// 获取用户拥有的区块链（直接从用户数据中获取）
            //const userChains = userData.ownedChains.map(ownedChain => {
                //const chainData = this.app.mockChains.get(ownedChain.chainId);
                //return {
                    //id: ownedChain.chainId,
                    //...chainData,
                    //...ownedChain
                //};
            //});
            
            //return userChains;
            
        //} catch (error) {
            //console.error('获取用户区块链失败:', error);
            //return [];
        //}
    //}
    
    /**
     * 生成用户详情HTML
     * @param {string} userId - 用户ID
     * @param {Object} userData - 用户数据
     * @param {Array} userChains - 用户拥有的区块链
     * @returns {string} - 用户详情HTML
     */
    generateUserDetailsHTML(userId, userData, userChainIds) {
        const userChains = [...userChainIds].map( cid => BlockChain.All.get( cid )).filter( c => c );
        return `
            <div class="user-details">
                <div class="user-details-header">
                    <h5>用户详情 - ID: ${this.truncateKey(userId)}</h5>
                </div>
                
                <div class="user-basic-info">
                    <h6>基本信息</h6>
                    <div class="detail-info-grid">
                        <div class="detail-info-item">
                            <span class="detail-info-label">公钥 (用户ID):</span>
                            <span class="detail-info-value crypto-key" title="${userId}">${this.truncateKey(userId)}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label">总资产:</span>
                            <span class="detail-info-value">${userData.GetAssets() || 0}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label">拥有区块链数:</span>
                            <span class="detail-info-value">${userChains.length || 0}</span>
                        </div>
                        <div class="detail-info-item">
                            <span class="detail-info-label">所在节点:</span>
                            <span class="detail-info-value">${[...userData.Peers.values()].map(p => `Peer-${p.Id}`).join(', ')}</span>
                        </div>
                    </div>
                </div>
                
                <div class="user-chains-section">
                    <h6>拥有的区块链: (${userChains.length})</h6>
                    <div class="chains-list">
                        ${userChains.length > 0 ? userChains.map(chain => `
                            <div class="chain-item" onclick="window.mainPanel.tabManager.switchTab('chains'); setTimeout(() => window.mainPanel.showChainDetails('${chain.Id}'), 100);">
                                <span class="chain-id crypto-hash" title="${chain.Id}">${this.truncateHash(chain.Id)}</span>
                                <span class="chain-value">${chain.FaceVal}</span>
                                <!--span class="chain-status ${chain.isTransferring ? 'transferring' : ''}"></span-->
                            </div>
                        `).join('') : '<p class="text-muted">暂无区块链</p>'}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 更新用户详情
     * @param {Object} userData - 用户数据
     */
    updateUserDetails(userData) {
        if (this.selectedUser !== null) {
            this.showUserDetails(this.selectedUser);
        }
    }
    
    /**
     * 清除选中状态
     */
    clearSelection() {
        this.selectedUser = null;
        this.updateUserSelection(null);
        
        const detailsContainer = document.getElementById('user-details-container');
        if (detailsContainer) {
            detailsContainer.innerHTML = '<p class="text-muted">请点击用户缩略图查看详情</p>';
            detailsContainer.classList.remove('has-content');
        }
    }
    
    /**
     * 获取当前选中的用户
     * @returns {string|null} - 选中的用户ID
     */
    getSelectedUser() {
        return this.selectedUser;
    }
    
    /**
     * 设置选中的用户
     * @param {string|null} userId - 用户ID
     * @param {boolean} triggerLogSwitch - 是否触发日志面板切换，默认为true
     */
    setSelectedUser(userId, triggerLogSwitch = true) {
        if (userId !== null) {
            if (triggerLogSwitch) {
                this.handleUserClick(userId);
            } else {
                // 只更新选中状态和显示详情，不触发日志面板切换
                this.updateUserSelection(userId);
                this.showUserDetails(userId);
                this.tabManager.handleStateChange('users', {
                    selectedUser: userId
                });
            }
        } else {
            this.clearSelection();
        }
    }
    
    /**
     * 重置用户网格
     */
    resetUsersGrid() {
        this.usersGridInitialized = false;
        this.clearSelection();
        
        const container = document.getElementById('users-container');
        if (container) {
            container.innerHTML = '<p class="text-muted">系统未启动</p>';
        }
    }
    
    /**
     * 生成公钥预览（前6个字符）
     * @param {string} key - 公钥
     * @returns {string} - 前6个字符
     */
    generateKeyPreview(key) {
        if (!key || key === '未设置' || key === '未知') return '未知';
        if (key.length < 6) return key;
        return key.substring(0, 6);
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
     * 销毁用户标签页内容
     */
    destroy() {
        try {
            // 清理状态
            this.selectedUser = null;
            this.usersGridInitialized = false;
            
            console.log('UsersTabContent 已销毁');
            
        } catch (error) {
            console.error('UsersTabContent 销毁失败:', error);
        }
    }
}

// 导出 UsersTabContent 类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UsersTabContent;
}

// ES6 导出
if (typeof window !== 'undefined') {
    window.UsersTabContent = UsersTabContent;
}