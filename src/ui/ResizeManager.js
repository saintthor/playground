/**
 * ResizeManager - 标签页区域调整大小管理器
 * 负责管理所有标签页的上下区域高度调整功能
 */
class ResizeManager {
    constructor(tabManager) {
        this.tabManager = tabManager;
        this.isResizing = false;
        this.currentTab = null;
        this.defaultRatio = 0.6; // 默认上半部占60%
        this.minRatio = 0.01; // 最小1%，几乎无限制
        this.maxRatio = 0.99; // 最大99%，几乎无限制
        
        // 拖拽状态
        this.dragState = {
            isDragging: false,
            startY: 0,
            startRatio: 0,
            currentRatio: 0,
            containerHeight: 0,
            minHeight: 20 // 最小高度20px
        };
        
        // 标签页比例状态
        this.tabRatios = {
            network: this.defaultRatio,
            users: this.defaultRatio,
            chains: this.defaultRatio,
            msgs: this.defaultRatio
        };
        
        // 存储管理
        this.storageKey = 'tabSectionRatios';
        
        // 事件处理器绑定
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleDoubleClick = this.handleDoubleClick.bind(this);
        this.handleContextMenu = this.handleContextMenu.bind(this);
        
        // 节流定时器
        this.throttleTimer = null;
        this.rafId = null;
        
        console.log('ResizeManager 初始化完成');
    }
    
    /**
     * 初始化调整大小功能
     */
    initialize() {
        try {
            // 加载保存的设置
            this.loadSavedSettings();
            
            // 创建调整大小手柄
            this.createResizeHandles();
            
            // 绑定事件监听器
            this.attachEventListeners();
            
            // 应用初始比例
            this.applyInitialRatios();
            
            console.log('ResizeManager 初始化完成，当前比例:', this.tabRatios);
            
        } catch (error) {
            console.error('ResizeManager 初始化失败:', error);
        }
    }
    
    /**
     * 创建调整大小手柄
     */
    createResizeHandles() {
        try {
            const tabNames = ['network', 'users', 'chains', 'msgs'];
            
            tabNames.forEach(tabName => {
                const tabPane = document.getElementById(`${tabName}-tab`);
                if (!tabPane) {
                    console.warn(`标签页 ${tabName} 未找到`);
                    return;
                }
                
                // 检查是否已存在调整手柄
                let resizeHandle = tabPane.querySelector('.resize-handle');
                if (resizeHandle) {
                    console.log(`标签页 ${tabName} 的调整手柄已存在`);
                    return;
                }
                
                // 创建调整手柄HTML结构
                const handleHTML = this.createResizeHandleHTML(tabName);
                
                // 找到上半部和下半部区域
                const upperSection = tabPane.querySelector('.tab-section-upper');
                const lowerSection = tabPane.querySelector('.tab-section-lower');
                
                if (!upperSection || !lowerSection) {
                    console.warn(`标签页 ${tabName} 缺少上下区域结构`);
                    return;
                }
                
                // 在上下区域之间插入调整手柄
                upperSection.insertAdjacentHTML('afterend', handleHTML);
                
                console.log(`已为标签页 ${tabName} 创建调整手柄`);
            });
            
        } catch (error) {
            console.error('创建调整手柄失败:', error);
        }
    }
    
    /**
     * 创建调整手柄HTML结构
     * @param {string} tabName - 标签页名称
     * @returns {string} - HTML字符串
     */
    createResizeHandleHTML(tabName) {
        return `
            <div class="resize-handle" data-tab="${tabName}">
                <div class="resize-handle-line"></div>
                <div class="resize-handle-grip">
                    <span class="grip-dot"></span>
                    <span class="grip-dot"></span>
                    <span class="grip-dot"></span>
                </div>
                <div class="resize-tooltip" style="display: none;">
                    <span class="ratio-text">60% : 40%</span>
                </div>
            </div>
        `;
    }
    
    /**
     * 绑定事件监听器
     */
    attachEventListeners() 
    {
        try 
        {
            // 鼠标事件
            document.addEventListener( 'mousedown', this.handleMouseDown );
            document.addEventListener( 'mousemove', this.throttle( this.handleMouseMove, 16 ) );
            document.addEventListener( 'mouseup', this.handleMouseUp );
            
            // 触摸事件
            document.addEventListener('touchstart', this.handleTouchStart, { passive: false });
            document.addEventListener('touchmove', this.throttle(this.handleTouchMove, 16), { passive: false });
            document.addEventListener('touchend', this.handleTouchEnd);
            
            // 双击和右键事件
            document.addEventListener('dblclick', this.handleDoubleClick);
            document.addEventListener('contextmenu', this.handleContextMenu);
            
            // 窗口大小变化事件
            window.addEventListener('resize', this.throttle(() => {
                this.handleWindowResize();
            }, 100));
            
            console.log('ResizeManager 事件监听器已绑定');
            
        } catch (error) {
            console.error('绑定事件监听器失败:', error);
        }
    }
    
    /**
     * 处理鼠标按下事件
     * @param {MouseEvent} event - 鼠标事件
     */
    handleMouseDown(event) {
        const resizeHandle = event.target.closest('.resize-handle');
        if (!resizeHandle) return;
        
        event.preventDefault();
        this.startResize(resizeHandle, event.clientY);
    }
    
    /**
     * 处理鼠标移动事件
     * @param {MouseEvent} event - 鼠标事件
     */
    handleMouseMove(event) {
        if (!this.dragState.isDragging) return;
        
        event.preventDefault();
        this.updateResize(event.clientY);
    }
    
    /**
     * 处理鼠标释放事件
     * @param {MouseEvent} event - 鼠标事件
     */
    handleMouseUp(event) {
        if (!this.dragState.isDragging) return;
        
        event.preventDefault();
        this.endResize();
    }
    
    /**
     * 处理触摸开始事件
     * @param {TouchEvent} event - 触摸事件
     */
    handleTouchStart(event) {
        const resizeHandle = event.target.closest('.resize-handle');
        if (!resizeHandle) return;
        
        event.preventDefault();
        const touch = event.touches[0];
        this.startResize(resizeHandle, touch.clientY);
    }
    
    /**
     * 处理触摸移动事件
     * @param {TouchEvent} event - 触摸事件
     */
    handleTouchMove(event) {
        if (!this.dragState.isDragging) return;
        
        event.preventDefault();
        const touch = event.touches[0];
        this.updateResize(touch.clientY);
    }
    
    /**
     * 处理触摸结束事件
     * @param {TouchEvent} event - 触摸事件
     */
    handleTouchEnd(event) {
        if (!this.dragState.isDragging) return;
        
        event.preventDefault();
        this.endResize();
    }
    
    /**
     * 处理双击事件（重置比例）
     * @param {MouseEvent} event - 鼠标事件
     */
    handleDoubleClick(event) {
        const resizeHandle = event.target.closest('.resize-handle');
        if (!resizeHandle) return;
        
        event.preventDefault();
        const tabName = resizeHandle.getAttribute('data-tab');
        this.resetTabRatio(tabName);
    }
    
    /**
     * 处理右键菜单事件
     * @param {MouseEvent} event - 鼠标事件
     */
    handleContextMenu(event) {
        const resizeHandle = event.target.closest('.resize-handle');
        if (!resizeHandle) return;
        
        event.preventDefault();
        const tabName = resizeHandle.getAttribute('data-tab');
        this.showContextMenu(event, tabName);
    }
    
    /**
     * 开始调整大小
     * @param {HTMLElement} resizeHandle - 调整手柄元素
     * @param {number} clientY - 鼠标Y坐标
     */
    startResize(resizeHandle, clientY) {
        try {
            const tabName = resizeHandle.getAttribute('data-tab');
            const tabPane = document.getElementById(`${tabName}-tab`);
            
            if (!tabPane) {
                console.error(`标签页 ${tabName} 未找到`);
                return;
            }
            
            // 设置拖拽状态
            this.dragState = {
                isDragging: true,
                startY: clientY,
                startRatio: this.tabRatios[tabName],
                currentRatio: this.tabRatios[tabName],
                containerHeight: tabPane.offsetHeight,
                minHeight: 10
            };
            
            this.currentTab = tabName;
            this.isResizing = true;
            
            // 添加拖拽样式
            resizeHandle.classList.add('dragging');
            document.body.classList.add('resizing');
            
            // 显示比例提示
            this.showRatioTooltip(resizeHandle, this.dragState.currentRatio);
            
            // 禁用文本选择和指针事件
            document.body.style.userSelect = 'none';
            document.body.style.pointerEvents = 'none';
            resizeHandle.style.pointerEvents = 'auto';
            
            console.log(`开始调整 ${tabName} 标签页大小`);
            
        } catch (error) {
            console.error('开始调整大小失败:', error);
        }
    }
    
    /**
     * 更新调整大小
     * @param {number} clientY - 当前鼠标Y坐标
     */
    updateResize(clientY) {
        if (!this.dragState.isDragging || !this.currentTab) return;
        
        try {
            // 获取当前容器的实际高度
            const tabPane = document.getElementById(`${this.currentTab}-tab`);
            if (!tabPane) return;
            
            const resizeHandle = tabPane.querySelector('.resize-handle');
            const handleHeight = resizeHandle ? resizeHandle.offsetHeight : 8;
            const currentContainerHeight = tabPane.offsetHeight;
            const availableHeight = currentContainerHeight - handleHeight;
            
            // 计算鼠标移动的距离和对应的比例变化
            const deltaY = clientY - this.dragState.startY;
            const deltaRatio = deltaY / this.dragState.containerHeight;
            let newRatio = this.dragState.startRatio + deltaRatio;
            
            // 移除所有高度限制，让用户可以自由调整
            // 只保留基本的边界检查，确保比例在0-1之间
            newRatio = Math.max(0.01, Math.min(0.99, newRatio));
            // 更新当前比例
            this.dragState.currentRatio = newRatio;
            
            // 应用新比例
            this.applyRatio(this.currentTab, newRatio);
            
            // 更新比例提示
            const resizeHandleElement = document.querySelector(`[data-tab="${this.currentTab}"] .resize-handle`);
            if (resizeHandleElement) {
                this.updateRatioTooltip(resizeHandleElement, newRatio);
            }
            
        } catch (error) {
            console.error('更新调整大小失败:', error);
        }
    }
    
    /**
     * 结束调整大小
     */
    endResize() {
        if (!this.dragState.isDragging || !this.currentTab) return;
        
        try {
            // 保存新的比例
            this.tabRatios[this.currentTab] = this.dragState.currentRatio;
            
            // 保存设置到存储
            this.saveSettings();
            
            // 清除拖拽状态
            this.dragState.isDragging = false;
            this.isResizing = false;
            
            // 移除拖拽样式
            const resizeHandle = document.querySelector(`[data-tab="${this.currentTab}"] .resize-handle`);
            if (resizeHandle) {
                resizeHandle.classList.remove('dragging');
                this.hideRatioTooltip(resizeHandle);
            }
            
            document.body.classList.remove('resizing');
            
            // 恢复文本选择和指针事件
            document.body.style.userSelect = '';
            document.body.style.pointerEvents = '';
            
            // 触发内容重新布局
            this.triggerContentResize(this.currentTab);
            
            console.log(`${this.currentTab} 标签页调整完成，新比例: ${this.dragState.currentRatio.toFixed(2)}`);
            
            this.currentTab = null;
            
        } catch (error) {
            console.error('结束调整大小失败:', error);
        }
    }
    
    /**
     * 验证比例是否在有效范围内
     * @param {number} ratio - 比例值
     * @returns {number} - 验证后的比例值
     */
    validateRatio(ratio) {
        return Math.max(this.minRatio, Math.min(this.maxRatio, ratio));
    }
    
    /**
     * 应用比例到标签页
     * @param {string} tabName - 标签页名称
     * @param {number} ratio - 上半部比例
     */
    applyRatio(tabName, ratio) {
        try {
            const tabPane = document.getElementById(`${tabName}-tab`);
            if (!tabPane) return;
            
            const upperSection = tabPane.querySelector('.tab-section-upper');
            const lowerSection = tabPane.querySelector('.tab-section-lower');
            const resizeHandle = tabPane.querySelector('.resize-handle');
            
            if (!upperSection || !lowerSection || !resizeHandle) return;
            
            // 使用requestAnimationFrame确保流畅更新
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
            }
            
            this.rafId = requestAnimationFrame(() => {
                // 获取容器的实际可用高度（减去resize-handle的高度）
                const containerHeight = tabPane.offsetHeight;
                const handleHeight = resizeHandle.offsetHeight || 8; // 默认8px
                const availableHeight = containerHeight - handleHeight;
                
                // 计算精确的像素高度，确保总和等于可用高度
                const upperHeight = Math.round(availableHeight * ratio);
                const lowerHeight = availableHeight - upperHeight; // 确保精确互补
                //console.log( upperHeight, lowerHeight, availableHeight, containerHeight, upperSection, lowerSection );
                // 直接设置像素高度，避免百分比计算误差
                upperSection.style.height = `${upperHeight}px`;
                lowerSection.style.height = `${lowerHeight}px`;
                
                // 移除所有可能影响高度的CSS属性
                upperSection.style.flexShrink = '0';
                upperSection.style.flexGrow = '0';
                upperSection.style.flexBasis = 'auto';
                upperSection.style.minHeight = 'unset';
                upperSection.style.maxHeight = 'unset';
                
                lowerSection.style.flexShrink = '0';
                lowerSection.style.flexGrow = '0';
                lowerSection.style.flexBasis = 'auto';
                lowerSection.style.minHeight = 'unset';
                lowerSection.style.maxHeight = 'unset';
                
                // 强制重新计算布局
                upperSection.offsetHeight;
                lowerSection.offsetHeight;
            });
            
        } catch (error) {
            console.error('应用比例失败:', error);
        }
    }
    
    /**
     * 重置标签页比例
     * @param {string} tabName - 标签页名称
     */
    resetTabRatio(tabName) {
        try {
            if (!this.isValidTabName(tabName)) {
                console.error('无效的标签页名称:', tabName);
                return;
            }
            
            const oldRatio = this.tabRatios[tabName];
            const newRatio = this.defaultRatio;
            
            // 使用动画过渡到新比例
            this.animateRatioChange(tabName, oldRatio, newRatio, 200);
            
            // 更新存储的比例
            this.tabRatios[tabName] = newRatio;
            this.saveSettings();
            
            console.log(`${tabName} 标签页比例已重置为默认值: ${newRatio}`);
            
        } catch (error) {
            console.error('重置标签页比例失败:', error);
        }
    }
    
    /**
     * 动画过渡比例变化
     * @param {string} tabName - 标签页名称
     * @param {number} fromRatio - 起始比例
     * @param {number} toRatio - 目标比例
     * @param {number} duration - 动画时长（毫秒）
     */
    animateRatioChange(tabName, fromRatio, toRatio, duration) {
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 使用缓动函数
            const easeProgress = this.easeInOutCubic(progress);
            const currentRatio = fromRatio + (toRatio - fromRatio) * easeProgress;
            
            this.applyRatio(tabName, currentRatio);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // 动画完成，触发内容重新布局
                this.triggerContentResize(tabName);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    /**
     * 缓动函数
     * @param {number} t - 进度值 (0-1)
     * @returns {number} - 缓动后的值
     */
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }
    
    /**
     * 显示比例提示
     * @param {HTMLElement} resizeHandle - 调整手柄元素
     * @param {number} ratio - 当前比例
     */
    showRatioTooltip(resizeHandle, ratio) {
        const tooltip = resizeHandle.querySelector('.resize-tooltip');
        if (!tooltip) return;
        
        this.updateRatioTooltip(resizeHandle, ratio);
        tooltip.style.display = 'block';
    }
    
    /**
     * 更新比例提示
     * @param {HTMLElement} resizeHandle - 调整手柄元素
     * @param {number} ratio - 当前比例
     */
    updateRatioTooltip(resizeHandle, ratio) {
        const tooltip = resizeHandle.querySelector('.resize-tooltip .ratio-text');
        if (!tooltip) return;
        
        const upperPercent = Math.round(ratio * 100);
        const lowerPercent = 100 - upperPercent;
        tooltip.textContent = `${upperPercent}% : ${lowerPercent}%`;
    }
    
    /**
     * 隐藏比例提示
     * @param {HTMLElement} resizeHandle - 调整手柄元素
     */
    hideRatioTooltip(resizeHandle) {
        const tooltip = resizeHandle.querySelector('.resize-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }
    
    /**
     * 显示右键上下文菜单
     * @param {MouseEvent} event - 鼠标事件
     * @param {string} tabName - 标签页名称
     */
    showContextMenu(event, tabName) {
        // 创建上下文菜单
        const menu = document.createElement('div');
        menu.className = 'resize-context-menu';
        menu.innerHTML = `
            <div class="context-menu-item" data-action="reset">
                <span class="menu-icon">↺</span>
                <span class="menu-text">重置高度</span>
            </div>
        `;
        
        // 设置菜单位置
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;
        
        // 添加到页面
        document.body.appendChild(menu);
        
        // 绑定菜单项点击事件
        menu.addEventListener('click', (e) => {
            const action = e.target.closest('.context-menu-item')?.getAttribute('data-action');
            if (action === 'reset') {
                this.resetTabRatio(tabName);
            }
            this.hideContextMenu();
        });
        
        // 点击其他地方隐藏菜单
        const hideMenu = (e) => {
            if (!menu.contains(e.target)) {
                this.hideContextMenu();
                document.removeEventListener('click', hideMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', hideMenu);
        }, 0);
    }
    
    /**
     * 隐藏上下文菜单
     */
    hideContextMenu() {
        const menu = document.querySelector('.resize-context-menu');
        if (menu) {
            menu.remove();
        }
    }
    
    /**
     * 处理窗口大小变化
     */
    handleWindowResize() {
        try {
            // 重新应用所有标签页的比例
            Object.keys(this.tabRatios).forEach(tabName => {
                this.applyRatio(tabName, this.tabRatios[tabName]);
            });
            
            // 触发内容重新布局
            if (this.tabManager.getActiveTab()) {
                this.triggerContentResize(this.tabManager.getActiveTab(), false);
            }
            
        } catch (error) {
            console.error('处理窗口大小变化失败:', error);
        }
    }
    
    /**
     * 触发内容重新布局
     * @param {string} tabName - 标签页名称
     */
    triggerContentResize(tabName, dispatchGlobalEvent = true) {
        try {
            // 触发对应标签页内容的重新布局
            switch (tabName) {
                case 'network':
                    if (this.tabManager.networkTabContent) {
                        this.tabManager.networkTabContent.handleResize?.();
                    }
                    break;
                case 'users':
                    if (this.tabManager.usersTabContent) {
                        this.tabManager.usersTabContent.handleResize?.();
                    }
                    break;
                case 'chains':
                    if (this.tabManager.chainsTabContent) {
                        this.tabManager.chainsTabContent.handleResize?.();
                    }
                    break;
            }
            
            // 触发全局resize事件
            if (dispatchGlobalEvent) {
                window.dispatchEvent(new Event('resize'));
            }
            
        } catch (error) {
            console.error('触发内容重新布局失败:', error);
        }
    }
    
    /**
     * 应用初始比例
     */
    applyInitialRatios() {
        try {
            Object.keys(this.tabRatios).forEach(tabName => {
                this.applyRatio(tabName, this.tabRatios[tabName]);
            });
            
            console.log('初始比例已应用');
            
        } catch (error) {
            console.error('应用初始比例失败:', error);
        }
    }
    
    /**
     * 保存设置到本地存储
     */
    saveSettings() {
        try {
            const settings = {
                tabRatios: this.tabRatios,
                version: '1.0',
                timestamp: Date.now()
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(settings));
            
        } catch (error) {
            console.warn('保存调整大小设置失败:', error);
            // 尝试使用会话存储作为回退
            try {
                sessionStorage.setItem(this.storageKey, JSON.stringify(settings));
            } catch (sessionError) {
                console.warn('保存到会话存储也失败:', sessionError);
            }
        }
    }
    
    /**
     * 从本地存储加载设置
     */
    loadSavedSettings() {
        try {
            const stored = localStorage.getItem(this.storageKey) || 
                          sessionStorage.getItem(this.storageKey);
            
            if (stored) {
                const settings = JSON.parse(stored);
                if (settings.version === '1.0' && settings.tabRatios) {
                    // 验证和合并设置
                    Object.keys(settings.tabRatios).forEach(tabName => {
                        if (this.isValidTabName(tabName)) {
                            const ratio = settings.tabRatios[tabName];
                            if (typeof ratio === 'number' && ratio >= this.minRatio && ratio <= this.maxRatio) {
                                this.tabRatios[tabName] = ratio;
                            }
                        }
                    });
                    
                    console.log('调整大小设置已从存储加载:', this.tabRatios);
                    return true;
                }
            }
        } catch (error) {
            console.warn('加载调整大小设置失败:', error);
        }
        
        console.log('使用默认调整大小设置');
        return false;
    }
    
    /*
     * 清除存储的设置
     */
    /* clearSettings() {
        try {
            localStorage.removeItem(this.storageKey);
            sessionStorage.removeItem(this.storageKey);
            console.log('调整大小设置已清除');
        } catch (error) {
            console.error('清除设置失败:', error);
        }
    } */
    
    /*
     * 检查本地存储是否可用
     * @returns {boolean} - 是否可用
     */
    /* isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    } */
    
    /**
     * 验证标签页名称是否有效
     * @param {string} tabName - 标签页名称
     * @returns {boolean} - 是否有效
     */
    isValidTabName(tabName) {
        return ['network', 'users', 'chains', 'msgs'].includes(tabName);
    }
    
    /**
     * 获取标签页比例
     * @param {string} tabName - 标签页名称
     * @returns {number} - 比例值
     */
    getTabRatio(tabName) {
        if (!this.isValidTabName(tabName)) {
            return this.defaultRatio;
        }
        return this.tabRatios[tabName];
    }
    
    /*
     * 设置标签页比例
     * @param {string} tabName - 标签页名称
     * @param {number} ratio - 比例值
     */
    /* setTabRatio(tabName, ratio) {
        if (!this.isValidTabName(tabName)) {
            console.error('无效的标签页名称:', tabName);
            return;
        }
        
        const validatedRatio = this.validateRatio(ratio);
        this.tabRatios[tabName] = validatedRatio;
        this.applyRatio(tabName, validatedRatio);
        this.saveSettings();
    } */
    
    /*
     * 获取所有标签页比例
     * @returns {Object} - 所有标签页比例
     */
    /* getAllTabRatios() {
        return { ...this.tabRatios };
    } */
    
    /**
     * 节流函数
     * @param {Function} func - 要节流的函数
     * @param {number} delay - 延迟时间（毫秒）
     * @returns {Function} - 节流后的函数
     */
    throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        
        return function (...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }
    
    /*
     * 销毁调整大小管理器
     */
    /* destroy() {
        try {
            // 移除事件监听器
            document.removeEventListener('mousedown', this.handleMouseDown);
            document.removeEventListener('mousemove', this.handleMouseMove);
            document.removeEventListener('mouseup', this.handleMouseUp);
            document.removeEventListener('touchstart', this.handleTouchStart);
            document.removeEventListener('touchmove', this.handleTouchMove);
            document.removeEventListener('touchend', this.handleTouchEnd);
            document.removeEventListener('dblclick', this.handleDoubleClick);
            document.removeEventListener('contextmenu', this.handleContextMenu);
            
            // 清理定时器
            if (this.throttleTimer) {
                clearTimeout(this.throttleTimer);
            }
            
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
            }
            
            // 移除调整手柄
            document.querySelectorAll('.resize-handle').forEach(handle => {
                handle.remove();
            });
            
            // 清理状态
            this.dragState = null;
            this.tabRatios = null;
            
            console.log('ResizeManager 已销毁');
            
        } catch (error) {
            console.error('ResizeManager 销毁失败:', error);
        }
    } */
}

// 导出 ResizeManager 类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResizeManager;
}

// ES6 导出
if (typeof window !== 'undefined') {
    window.ResizeManager = ResizeManager;
}