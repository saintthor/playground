/**
 * VirtualScroll 虚拟滚动组件测试
 * 
 * 测试虚拟滚动的性能和功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VirtualScroll } from '../../src/ui/VirtualScroll.js';

// Mock DOM 环境
const mockContainer = () => {
    const container = document.createElement('div');
    container.style.height = '400px';
    container.style.width = '300px';
    document.body.appendChild(container);
    return container;
};

describe('VirtualScroll', () => {
    let container;
    let virtualScroll;
    
    beforeEach(() => {
        container = mockContainer();
    });
    
    afterEach(() => {
        if (virtualScroll) {
            virtualScroll.destroy();
        }
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
    });

    describe('初始化和基本功能', () => {
        it('应该正确初始化虚拟滚动', () => {
            virtualScroll = new VirtualScroll({
                container,
                itemHeight: 50
            });
            
            expect(virtualScroll.container).toBe(container);
            expect(virtualScroll.itemHeight).toBe(50);
            expect(virtualScroll.viewport).toBeTruthy();
            expect(virtualScroll.content).toBeTruthy();
            expect(virtualScroll.spacerTop).toBeTruthy();
            expect(virtualScroll.spacerBottom).toBeTruthy();
        });

        it('应该抛出错误如果没有提供容器', () => {
            expect(() => {
                new VirtualScroll({});
            }).toThrow('VirtualScroll: container is required');
        });

        it('应该使用默认配置', () => {
            virtualScroll = new VirtualScroll({ container });
            
            expect(virtualScroll.itemHeight).toBe(50);
            expect(virtualScroll.bufferSize).toBe(5);
        });

        it('应该使用自定义配置', () => {
            virtualScroll = new VirtualScroll({
                container,
                itemHeight: 80,
                bufferSize: 10
            });
            
            expect(virtualScroll.itemHeight).toBe(80);
            expect(virtualScroll.bufferSize).toBe(10);
        });
    });

    describe('数据管理', () => {
        beforeEach(() => {
            virtualScroll = new VirtualScroll({
                container,
                itemHeight: 50
            });
        });

        it('应该设置数据', () => {
            const data = [
                { id: 1, text: 'Item 1' },
                { id: 2, text: 'Item 2' },
                { id: 3, text: 'Item 3' }
            ];
            
            virtualScroll.setData(data);
            
            expect(virtualScroll.data).toEqual(data);
            expect(virtualScroll.totalHeight).toBe(data.length * 50);
        });

        it('应该添加数据项', () => {
            const initialData = [
                { id: 1, text: 'Item 1' },
                { id: 2, text: 'Item 2' }
            ];
            
            virtualScroll.setData(initialData);
            
            const newItem = { id: 3, text: 'Item 3' };
            virtualScroll.addItem(newItem);
            
            expect(virtualScroll.data).toHaveLength(3);
            expect(virtualScroll.data[2]).toEqual(newItem);
            expect(virtualScroll.totalHeight).toBe(3 * 50);
        });

        it('应该在指定位置插入数据项', () => {
            const initialData = [
                { id: 1, text: 'Item 1' },
                { id: 3, text: 'Item 3' }
            ];
            
            virtualScroll.setData(initialData);
            
            const newItem = { id: 2, text: 'Item 2' };
            virtualScroll.addItem(newItem, 1);
            
            expect(virtualScroll.data).toHaveLength(3);
            expect(virtualScroll.data[1]).toEqual(newItem);
        });

        it('应该移除数据项', () => {
            const initialData = [
                { id: 1, text: 'Item 1' },
                { id: 2, text: 'Item 2' },
                { id: 3, text: 'Item 3' }
            ];
            
            virtualScroll.setData(initialData);
            virtualScroll.removeItem(1);
            
            expect(virtualScroll.data).toHaveLength(2);
            expect(virtualScroll.data[0].id).toBe(1);
            expect(virtualScroll.data[1].id).toBe(3);
            expect(virtualScroll.totalHeight).toBe(2 * 50);
        });

        it('应该更新数据项', () => {
            const initialData = [
                { id: 1, text: 'Item 1' },
                { id: 2, text: 'Item 2' }
            ];
            
            virtualScroll.setData(initialData);
            
            const updatedItem = { id: 2, text: 'Updated Item 2' };
            virtualScroll.updateItem(1, updatedItem);
            
            expect(virtualScroll.data[1]).toEqual(updatedItem);
        });
    });

    describe('可见范围计算', () => {
        beforeEach(() => {
            virtualScroll = new VirtualScroll({
                container,
                itemHeight: 50,
                bufferSize: 2
            });
            
            // 模拟容器高度
            virtualScroll.containerHeight = 200; // 可以显示4个项目
        });

        it('应该正确计算可见范围', () => {
            const data = new Array(20).fill(null).map((_, i) => ({ id: i, text: `Item ${i}` }));
            virtualScroll.setData(data);
            
            // 滚动到顶部
            virtualScroll.scrollTop = 0;
            const range = virtualScroll.calculateVisibleRange();
            
            expect(range.start).toBe(0); // 缓冲区开始
            expect(range.end).toBe(6); // 4个可见 + 2个缓冲
            expect(range.visibleStart).toBe(0);
            expect(range.visibleEnd).toBe(4);
        });

        it('应该正确计算滚动后的可见范围', () => {
            const data = new Array(20).fill(null).map((_, i) => ({ id: i, text: `Item ${i}` }));
            virtualScroll.setData(data);
            
            // 滚动到中间
            virtualScroll.scrollTop = 250; // 第5个项目开始
            const range = virtualScroll.calculateVisibleRange();
            
            expect(range.start).toBe(3); // 5 - 2 (缓冲区)
            expect(range.end).toBe(11); // 9 + 2 (缓冲区)
            expect(range.visibleStart).toBe(5);
            expect(range.visibleEnd).toBe(9);
        });

        it('应该处理边界情况', () => {
            const data = new Array(3).fill(null).map((_, i) => ({ id: i, text: `Item ${i}` }));
            virtualScroll.setData(data);
            
            virtualScroll.scrollTop = 0;
            const range = virtualScroll.calculateVisibleRange();
            
            expect(range.start).toBe(0);
            expect(range.end).toBe(3); // 不超过数据长度
        });
    });

    describe('渲染性能', () => {
        beforeEach(() => {
            virtualScroll = new VirtualScroll({
                container,
                itemHeight: 50,
                renderItem: (item, index) => {
                    const div = document.createElement('div');
                    div.textContent = item.text;
                    div.className = 'virtual-item';
                    return div;
                }
            });
            
            virtualScroll.containerHeight = 200;
        });

        it('应该只渲染可见项目', () => {
            const data = new Array(100).fill(null).map((_, i) => ({ id: i, text: `Item ${i}` }));
            virtualScroll.setData(data);
            
            // 检查只渲染了可见项目
            const renderedItems = virtualScroll.content.children;
            expect(renderedItems.length).toBeLessThan(data.length);
            expect(renderedItems.length).toBeGreaterThan(0);
        });

        it('应该缓存渲染结果', () => {
            const data = new Array(10).fill(null).map((_, i) => ({ id: i, text: `Item ${i}` }));
            virtualScroll.setData(data);
            
            const initialCacheSize = virtualScroll.renderCache.size;
            
            // 滚动后应该有更多缓存
            virtualScroll.scrollTop = 100;
            virtualScroll.updateVisibleItems();
            
            expect(virtualScroll.renderCache.size).toBeGreaterThanOrEqual(initialCacheSize);
        });

        it('应该清理过期缓存', () => {
            const data = new Array(1000).fill(null).map((_, i) => ({ id: i, text: `Item ${i}` }));
            virtualScroll.setData(data);
            
            // 模拟大量缓存
            for (let i = 0; i < 2500; i++) {
                virtualScroll.renderCache.set(`key-${i}`, document.createElement('div'));
            }
            
            virtualScroll.cleanupCache();
            
            // 缓存应该被清理
            expect(virtualScroll.renderCache.size).toBeLessThan(2500);
        });
    });

    describe('滚动功能', () => {
        beforeEach(() => {
            virtualScroll = new VirtualScroll({
                container,
                itemHeight: 50
            });
            
            const data = new Array(20).fill(null).map((_, i) => ({ id: i, text: `Item ${i}` }));
            virtualScroll.setData(data);
        });

        it('应该滚动到指定索引', () => {
            const scrollToSpy = vi.spyOn(virtualScroll.viewport, 'scrollTo');
            
            virtualScroll.scrollToIndex(5);
            
            expect(scrollToSpy).toHaveBeenCalledWith({
                top: 250, // 5 * 50
                behavior: 'smooth'
            });
        });

        it('应该滚动到顶部', () => {
            const scrollToSpy = vi.spyOn(virtualScroll.viewport, 'scrollTo');
            
            virtualScroll.scrollToTop();
            
            expect(scrollToSpy).toHaveBeenCalledWith({
                top: 0,
                behavior: 'smooth'
            });
        });

        it('应该滚动到底部', () => {
            const scrollToSpy = vi.spyOn(virtualScroll.viewport, 'scrollTo');
            
            virtualScroll.scrollToBottom();
            
            expect(scrollToSpy).toHaveBeenCalledWith({
                top: virtualScroll.totalHeight,
                behavior: 'smooth'
            });
        });

        it('应该处理无效的滚动索引', () => {
            const scrollToSpy = vi.spyOn(virtualScroll.viewport, 'scrollTo');
            
            virtualScroll.scrollToIndex(-1);
            virtualScroll.scrollToIndex(100);
            
            expect(scrollToSpy).not.toHaveBeenCalled();
        });
    });

    describe('事件处理', () => {
        beforeEach(() => {
            virtualScroll = new VirtualScroll({
                container,
                itemHeight: 50
            });
            
            virtualScroll.containerHeight = 200;
        });

        it('应该处理滚动事件', () => {
            const data = new Array(20).fill(null).map((_, i) => ({ id: i, text: `Item ${i}` }));
            virtualScroll.setData(data);
            
            // 模拟滚动事件
            virtualScroll.viewport.scrollTop = 100;
            virtualScroll.handleScroll();
            
            expect(virtualScroll.scrollTop).toBe(100);
            expect(virtualScroll.isScrolling).toBe(true);
        });

        it('应该处理窗口大小变化', () => {
            const originalHeight = virtualScroll.containerHeight;
            
            // 模拟容器大小变化
            Object.defineProperty(virtualScroll.viewport, 'getBoundingClientRect', {
                value: () => ({ height: 300 })
            });
            
            virtualScroll.handleResize();
            
            expect(virtualScroll.containerHeight).toBe(300);
        });
    });

    describe('性能统计', () => {
        beforeEach(() => {
            virtualScroll = new VirtualScroll({
                container,
                itemHeight: 50
            });
        });

        it('应该提供性能统计信息', () => {
            const data = new Array(100).fill(null).map((_, i) => ({ id: i, text: `Item ${i}` }));
            virtualScroll.setData(data);
            
            const stats = virtualScroll.getPerformanceStats();
            
            expect(stats).toHaveProperty('totalItems');
            expect(stats).toHaveProperty('cachedItems');
            expect(stats).toHaveProperty('visibleRange');
            expect(stats).toHaveProperty('containerHeight');
            expect(stats).toHaveProperty('totalHeight');
            expect(stats).toHaveProperty('itemHeight');
            expect(stats).toHaveProperty('isScrolling');
            
            expect(stats.totalItems).toBe(100);
            expect(stats.itemHeight).toBe(50);
            expect(stats.totalHeight).toBe(5000);
        });

        it('应该提供可见信息', () => {
            const data = new Array(20).fill(null).map((_, i) => ({ id: i, text: `Item ${i}` }));
            virtualScroll.setData(data);
            virtualScroll.containerHeight = 200;
            
            const visibleInfo = virtualScroll.getVisibleInfo();
            
            expect(visibleInfo).toHaveProperty('range');
            expect(visibleInfo).toHaveProperty('totalItems');
            expect(visibleInfo).toHaveProperty('visibleItems');
            expect(visibleInfo).toHaveProperty('scrollTop');
            expect(visibleInfo).toHaveProperty('scrollPercentage');
            
            expect(visibleInfo.totalItems).toBe(20);
        });
    });

    describe('大数据量性能测试', () => {
        it('应该高效处理大量数据', () => {
            const itemCount = 10000;
            const data = new Array(itemCount).fill(null).map((_, i) => ({ 
                id: i, 
                text: `Item ${i}`,
                value: Math.random()
            }));
            
            virtualScroll = new VirtualScroll({
                container,
                itemHeight: 50,
                renderItem: (item, index) => {
                    const div = document.createElement('div');
                    div.textContent = `${item.text} - ${item.value.toFixed(3)}`;
                    return div;
                }
            });
            
            const startTime = performance.now();
            virtualScroll.setData(data);
            const endTime = performance.now();
            
            expect(virtualScroll.data).toHaveLength(itemCount);
            expect(virtualScroll.totalHeight).toBe(itemCount * 50);
            
            const setupTime = endTime - startTime;
            console.log(`设置 ${itemCount} 项数据耗时: ${setupTime}ms`);
            
            // 设置大量数据应该很快
            expect(setupTime).toBeLessThan(100);
        });

        it('应该高效处理频繁滚动', () => {
            const itemCount = 5000;
            const data = new Array(itemCount).fill(null).map((_, i) => ({ id: i, text: `Item ${i}` }));
            
            virtualScroll = new VirtualScroll({
                container,
                itemHeight: 50
            });
            
            virtualScroll.setData(data);
            virtualScroll.containerHeight = 400;
            
            const scrollPositions = [0, 1000, 5000, 10000, 50000, 100000, 200000];
            const scrollTimes = [];
            
            scrollPositions.forEach(position => {
                const startTime = performance.now();
                virtualScroll.scrollTop = position;
                virtualScroll.updateVisibleItems();
                const endTime = performance.now();
                
                scrollTimes.push(endTime - startTime);
            });
            
            const avgScrollTime = scrollTimes.reduce((a, b) => a + b, 0) / scrollTimes.length;
            const maxScrollTime = Math.max(...scrollTimes);
            
            console.log(`平均滚动更新时间: ${avgScrollTime}ms`);
            console.log(`最大滚动更新时间: ${maxScrollTime}ms`);
            
            // 滚动更新应该很快
            expect(avgScrollTime).toBeLessThan(10);
            expect(maxScrollTime).toBeLessThan(50);
        });

        it('应该限制内存使用', () => {
            const itemCount = 10000;
            const data = new Array(itemCount).fill(null).map((_, i) => ({ id: i, text: `Item ${i}` }));
            
            virtualScroll = new VirtualScroll({
                container,
                itemHeight: 50
            });
            
            virtualScroll.setData(data);
            virtualScroll.containerHeight = 400;
            
            // 模拟大量滚动以填充缓存
            for (let i = 0; i < 100; i++) {
                virtualScroll.scrollTop = i * 100;
                virtualScroll.updateVisibleItems();
            }
            
            const cacheSize = virtualScroll.renderCache.size;
            const maxExpectedCache = itemCount * 2; // 最大缓存不应超过数据量的2倍
            
            console.log(`缓存大小: ${cacheSize}, 数据量: ${itemCount}`);
            
            expect(cacheSize).toBeLessThan(maxExpectedCache);
        });
    });

    describe('资源清理', () => {
        beforeEach(() => {
            virtualScroll = new VirtualScroll({
                container,
                itemHeight: 50
            });
        });

        it('应该正确清理资源', () => {
            const data = new Array(100).fill(null).map((_, i) => ({ id: i, text: `Item ${i}` }));
            virtualScroll.setData(data);
            
            // 确保有一些缓存和状态
            expect(virtualScroll.renderCache.size).toBeGreaterThan(0);
            expect(virtualScroll.data.length).toBeGreaterThan(0);
            
            virtualScroll.destroy();
            
            // 检查资源是否被清理
            expect(virtualScroll.renderCache.size).toBe(0);
            expect(container.innerHTML).toBe('');
        });

        it('应该移除事件监听器', () => {
            const removeEventListenerSpy = vi.spyOn(virtualScroll.viewport, 'removeEventListener');
            const windowRemoveEventListenerSpy = vi.spyOn(window, 'removeEventListener');
            
            virtualScroll.destroy();
            
            expect(removeEventListenerSpy).toHaveBeenCalled();
            expect(windowRemoveEventListenerSpy).toHaveBeenCalled();
        });
    });
});