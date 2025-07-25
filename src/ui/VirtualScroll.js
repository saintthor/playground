/**
 * VirtualScroll - 虚拟滚动组件
 * 
 * 用于高效渲染大量数据列表，只渲染可见区域的项目
 */

export class VirtualScroll {
    constructor(options = {}) {
        this.container = options.container;
        this.itemHeight = options.itemHeight || 50;
        this.bufferSize = options.bufferSize || 5;
        this.renderItem = options.renderItem || this.defaultRenderItem;
        this.getItemKey = options.getItemKey || ((item, index) => index);
        
        this.data = [];
        this.visibleItems = [];
        this.scrollTop = 0;
        this.containerHeight = 0;
        this.totalHeight = 0;
        
        // DOM 元素
        this.viewport = null;
        this.content = null;
        this.spacerTop = null;
        this.spacerBottom = null;
        
        // 性能优化
        this.isScrolling = false;
        this.scrollTimeout = null;
        this.renderCache = new Map();
        this.lastRenderRange = { start: -1, end: -1 };
        
        this.init();
    }

    /**
     * 初始化虚拟滚动
     */
    init() {
        if (!this.container) {
            throw new Error('VirtualScroll: container is required');
        }
        
        this.createViewport();
        this.bindEvents();
        
        console.log('VirtualScroll 初始化完成');
    }

    /**
     * 创建视口结构
     */
    createViewport() {
        this.container.innerHTML = `
            <div class="virtual-scroll-viewport" style="height: 100%; overflow-y: auto;">
                <div class="virtual-scroll-spacer-top" style="height: 0px;"></div>
                <div class="virtual-scroll-content"></div>
                <div class="virtual-scroll-spacer-bottom" style="height: 0px;"></div>
            </div>
        `;
        
        this.viewport = this.container.querySelector('.virtual-scroll-viewport');
        this.content = this.container.querySelector('.virtual-scroll-content');
        this.spacerTop = this.container.querySelector('.virtual-scroll-spacer-top');
        this.spacerBottom = this.container.querySelector('.virtual-scroll-spacer-bottom');
        
        // 获取容器高度
        this.updateContainerHeight();
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 滚动事件
        this.viewport.addEventListener('scroll', this.handleScroll.bind(this));
        
        // 窗口大小变化事件
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // 观察容器大小变化
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(() => {
                this.handleResize();
            });
            this.resizeObserver.observe(this.container);
        }
    }

    /**
     * 处理滚动事件
     */
    handleScroll() {
        this.scrollTop = this.viewport.scrollTop;
        this.isScrolling = true;
        
        // 清除之前的超时
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        
        // 立即更新可见项目
        this.updateVisibleItems();
        
        // 设置滚动结束标志
        this.scrollTimeout = setTimeout(() => {
            this.isScrolling = false;
        }, 150);
    }

    /**
     * 处理窗口大小变化
     */
    handleResize() {
        this.updateContainerHeight();
        this.updateVisibleItems();
    }

    /**
     * 更新容器高度
     */
    updateContainerHeight() {
        const rect = this.viewport.getBoundingClientRect();
        this.containerHeight = rect.height;
    }

    /**
     * 设置数据
     */
    setData(data) {
        this.data = data || [];
        this.totalHeight = this.data.length * this.itemHeight;
        this.clearCache();
        this.updateVisibleItems();
    }

    /**
     * 添加数据项
     */
    addItem(item, index = -1) {
        if (index === -1) {
            this.data.push(item);
        } else {
            this.data.splice(index, 0, item);
        }
        
        this.totalHeight = this.data.length * this.itemHeight;
        this.updateVisibleItems();
    }

    /**
     * 移除数据项
     */
    removeItem(index) {
        if (index >= 0 && index < this.data.length) {
            this.data.splice(index, 1);
            this.totalHeight = this.data.length * this.itemHeight;
            this.clearCache();
            this.updateVisibleItems();
        }
    }

    /**
     * 更新数据项
     */
    updateItem(index, item) {
        if (index >= 0 && index < this.data.length) {
            this.data[index] = item;
            
            // 清除该项的缓存
            const key = this.getItemKey(item, index);
            this.renderCache.delete(key);
            
            this.updateVisibleItems();
        }
    }

    /**
     * 计算可见项目范围
     */
    calculateVisibleRange() {
        if (this.containerHeight === 0 || this.itemHeight === 0) {
            return { start: 0, end: 0 };
        }
        
        const start = Math.floor(this.scrollTop / this.itemHeight);
        const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
        const end = Math.min(start + visibleCount, this.data.length);
        
        // 添加缓冲区
        const bufferedStart = Math.max(0, start - this.bufferSize);
        const bufferedEnd = Math.min(this.data.length, end + this.bufferSize);
        
        return {
            start: bufferedStart,
            end: bufferedEnd,
            visibleStart: start,
            visibleEnd: end
        };
    }

    /**
     * 更新可见项目
     */
    updateVisibleItems() {
        const range = this.calculateVisibleRange();
        
        // 如果范围没有变化，跳过更新
        if (range.start === this.lastRenderRange.start && 
            range.end === this.lastRenderRange.end) {
            return;
        }
        
        this.lastRenderRange = range;
        
        // 更新间隔器高度
        this.updateSpacers(range);
        
        // 渲染可见项目
        this.renderVisibleItems(range);
    }

    /**
     * 更新间隔器高度
     */
    updateSpacers(range) {
        const topHeight = range.start * this.itemHeight;
        const bottomHeight = (this.data.length - range.end) * this.itemHeight;
        
        this.spacerTop.style.height = `${topHeight}px`;
        this.spacerBottom.style.height = `${bottomHeight}px`;
    }

    /**
     * 渲染可见项目
     */
    renderVisibleItems(range) {
        const fragment = document.createDocumentFragment();
        
        for (let i = range.start; i < range.end; i++) {
            const item = this.data[i];
            const key = this.getItemKey(item, i);
            
            let element = this.renderCache.get(key);
            if (!element) {
                element = this.renderItem(item, i);
                element.setAttribute('data-virtual-index', i);
                element.setAttribute('data-virtual-key', key);
                element.style.height = `${this.itemHeight}px`;
                
                // 缓存渲染结果
                this.renderCache.set(key, element);
            }
            
            fragment.appendChild(element.cloneNode(true));
        }
        
        // 替换内容
        this.content.innerHTML = '';
        this.content.appendChild(fragment);
        
        // 清理过期缓存
        this.cleanupCache();
    }

    /**
     * 默认渲染函数
     */
    defaultRenderItem(item, index) {
        const div = document.createElement('div');
        div.className = 'virtual-scroll-item';
        div.textContent = `Item ${index}: ${JSON.stringify(item)}`;
        return div;
    }

    /**
     * 清理过期缓存
     */
    cleanupCache() {
        // 如果缓存过大，清理一些旧的条目
        if (this.renderCache.size > this.data.length * 2) {
            const keysToDelete = [];
            let count = 0;
            
            for (const key of this.renderCache.keys()) {
                if (count++ > this.data.length) {
                    keysToDelete.push(key);
                }
            }
            
            keysToDelete.forEach(key => this.renderCache.delete(key));
        }
    }

    /**
     * 清除所有缓存
     */
    clearCache() {
        this.renderCache.clear();
        this.lastRenderRange = { start: -1, end: -1 };
    }

    /**
     * 滚动到指定索引
     */
    scrollToIndex(index, behavior = 'smooth') {
        if (index < 0 || index >= this.data.length) {
            return;
        }
        
        const targetScrollTop = index * this.itemHeight;
        this.viewport.scrollTo({
            top: targetScrollTop,
            behavior
        });
    }

    /**
     * 滚动到顶部
     */
    scrollToTop(behavior = 'smooth') {
        this.viewport.scrollTo({
            top: 0,
            behavior
        });
    }

    /**
     * 滚动到底部
     */
    scrollToBottom(behavior = 'smooth') {
        this.viewport.scrollTo({
            top: this.totalHeight,
            behavior
        });
    }

    /**
     * 获取当前可见项目信息
     */
    getVisibleInfo() {
        const range = this.calculateVisibleRange();
        return {
            range,
            totalItems: this.data.length,
            visibleItems: range.end - range.start,
            scrollTop: this.scrollTop,
            scrollPercentage: this.totalHeight > 0 ? (this.scrollTop / (this.totalHeight - this.containerHeight)) * 100 : 0
        };
    }

    /**
     * 设置项目高度
     */
    setItemHeight(height) {
        this.itemHeight = height;
        this.totalHeight = this.data.length * this.itemHeight;
        this.clearCache();
        this.updateVisibleItems();
    }

    /**
     * 刷新显示
     */
    refresh() {
        this.clearCache();
        this.updateContainerHeight();
        this.updateVisibleItems();
    }

    /**
     * 获取性能统计
     */
    getPerformanceStats() {
        return {
            totalItems: this.data.length,
            cachedItems: this.renderCache.size,
            visibleRange: this.lastRenderRange,
            containerHeight: this.containerHeight,
            totalHeight: this.totalHeight,
            itemHeight: this.itemHeight,
            isScrolling: this.isScrolling
        };
    }

    /**
     * 销毁虚拟滚动
     */
    destroy() {
        // 移除事件监听器
        if (this.viewport) {
            this.viewport.removeEventListener('scroll', this.handleScroll);
        }
        
        window.removeEventListener('resize', this.handleResize);
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        // 清理超时
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        
        // 清理缓存
        this.clearCache();
        
        // 清空 DOM
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        console.log('VirtualScroll 已销毁');
    }
}

/**
 * 虚拟滚动工厂函数
 */
export function createVirtualScroll(container, options = {}) {
    return new VirtualScroll({
        container,
        ...options
    });
}