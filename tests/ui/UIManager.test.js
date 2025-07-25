/**
 * UIManager 测试
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIManager } from '../../src/ui/UIManager.js';

// Mock DOM environment
const mockDOM = () => {
    // Create basic DOM structure
    document.body.innerHTML = `
        <div id="app">
            <main class="app-main">
                <section id="control-panel" class="panel control-panel">
                    <h2>控制面板</h2>
                    <div class="panel-content"></div>
                </section>
                
                <section id="main-panel" class="panel main-panel">
                    <h2>网络状态</h2>
                    <div class="panel-content"></div>
                </section>
                
                <section id="log-panel" class="panel log-panel">
                    <h2>操作日志</h2>
                    <div class="panel-content"></div>
                </section>
            </main>
        </div>
    `;
};

describe('UIManager', () => {
    let uiManager;
    let mockApp;

    beforeEach(() => {
        // Setup DOM
        mockDOM();
        
        // Create mock app
        mockApp = {
            handleUserSelection: vi.fn(),
            handleChainSelection: vi.fn(),
            handleLogSelection: vi.fn()
        };
        
        // Create UIManager instance
        uiManager = new UIManager(mockApp);
    });

    afterEach(() => {
        if (uiManager) {
            uiManager.destroy();
        }
        document.body.innerHTML = '';
    });

    describe('构造函数', () => {
        it('应该正确初始化UIManager实例', () => {
            expect(uiManager.app).toBe(mockApp);
            expect(uiManager.panels).toEqual({
                control: null,
                main: null,
                log: null
            });
            expect(uiManager.isInitialized).toBe(false);
        });
    });

    describe('initUI', () => {
        it('应该成功初始化UI', () => {
            uiManager.initUI();
            expect(uiManager.isInitialized).toBe(true);
        });

        it('应该验证必要的DOM元素存在', () => {
            // Remove required element
            document.getElementById('control-panel').remove();
            
            expect(() => {
                uiManager.initUI();
            }).toThrow('必需的DOM元素未找到: control-panel');
        });

        it('应该设置面板结构', () => {
            uiManager.initUI();
            
            // Check control panel structure
            const controlContent = document.querySelector('#control-panel .panel-content');
            expect(controlContent.querySelector('#system-controls')).toBeTruthy();
            expect(controlContent.querySelector('#network-settings')).toBeTruthy();
            expect(controlContent.querySelector('#chain-definition')).toBeTruthy();
            expect(controlContent.querySelector('#runtime-controls')).toBeTruthy();
            
            // Check main panel structure
            const mainContent = document.querySelector('#main-panel .panel-content');
            expect(mainContent.querySelector('#user-assets')).toBeTruthy();
            expect(mainContent.querySelector('#chain-ownership')).toBeTruthy();
            expect(mainContent.querySelector('#network-status')).toBeTruthy();
            
            // Check log panel structure
            const logContent = document.querySelector('#log-panel .panel-content');
            expect(logContent.querySelector('.log-controls')).toBeTruthy();
            expect(logContent.querySelector('.log-display')).toBeTruthy();
        });
    });

    describe('面板结构设置', () => {
        beforeEach(() => {
            uiManager.initUI();
        });

        it('应该正确设置控制面板结构', () => {
            const controlContent = document.querySelector('#control-panel .panel-content');
            
            // Check sections exist
            expect(controlContent.querySelector('#system-controls h3').textContent).toBe('系统控制');
            expect(controlContent.querySelector('#network-settings h3').textContent).toBe('网络设置');
            expect(controlContent.querySelector('#chain-definition h3').textContent).toBe('区块链定义');
            expect(controlContent.querySelector('#runtime-controls h3').textContent).toBe('运行时控制');
        });

        it('应该正确设置主面板结构', () => {
            const mainContent = document.querySelector('#main-panel .panel-content');
            
            // Check sections exist
            expect(mainContent.querySelector('#user-assets h3').textContent).toBe('用户资产');
            expect(mainContent.querySelector('#chain-ownership h3').textContent).toBe('区块链归属');
            expect(mainContent.querySelector('#network-status h3').textContent).toBe('网络状态');
            
            // Check initial state
            expect(mainContent.querySelector('.assets-display').textContent.trim()).toBe('系统未启动或无用户数据');
        });

        it('应该正确设置日志面板结构', () => {
            const logContent = document.querySelector('#log-panel .panel-content');
            
            // Check log controls
            const logFilter = logContent.querySelector('#log-filter');
            expect(logFilter).toBeTruthy();
            expect(logFilter.options.length).toBe(4);
            
            // Check pagination
            expect(logContent.querySelector('#log-prev')).toBeTruthy();
            expect(logContent.querySelector('#log-next')).toBeTruthy();
            expect(logContent.querySelector('#log-page-info').textContent).toBe('第 1 页');
            
            // Check initial state
            expect(logContent.querySelector('#log-entries').textContent.trim()).toBe('暂无日志记录');
        });
    });

    describe('事件处理', () => {
        beforeEach(() => {
            uiManager.initUI();
        });

        it('应该处理用户点击事件', () => {
            const testUserId = 'user123';
            uiManager.handleUserClick(testUserId);
            
            expect(mockApp.handleUserSelection).toHaveBeenCalledWith(testUserId);
        });

        it('应该处理区块链点击事件', () => {
            const testChainId = 'chain456';
            uiManager.handleChainClick(testChainId);
            
            expect(mockApp.handleChainSelection).toHaveBeenCalledWith(testChainId);
        });

        it('应该处理日志点击事件', () => {
            const testLogId = 'log789';
            uiManager.handleLogClick(testLogId);
            
            expect(mockApp.handleLogSelection).toHaveBeenCalledWith(testLogId);
        });

        it('应该处理全局点击事件', () => {
            // Create element with user data
            const userElement = document.createElement('div');
            userElement.dataset.userId = 'user123';
            document.body.appendChild(userElement);
            
            // Simulate click
            const clickEvent = new MouseEvent('click', { bubbles: true });
            Object.defineProperty(clickEvent, 'target', { value: userElement });
            
            uiManager._handleGlobalClick(clickEvent);
            
            expect(mockApp.handleUserSelection).toHaveBeenCalledWith('user123');
        });
    });

    describe('Base64 数据处理', () => {
        beforeEach(() => {
            uiManager.initUI();
        });

        it('应该显示Base64 tooltip', () => {
            // Create element with base64 data
            const base64Element = document.createElement('span');
            base64Element.className = 'base64-data';
            base64Element.dataset.fullData = 'SGVsbG8gV29ybGQ=';
            document.body.appendChild(base64Element);
            
            uiManager.showBase64Tooltip(base64Element);
            
            const tooltip = document.getElementById('base64-tooltip');
            expect(tooltip).toBeTruthy();
            expect(tooltip.textContent).toBe('SGVsbG8gV29ybGQ=');
            expect(tooltip.style.display).toBe('block');
        });

        it('应该隐藏Base64 tooltip', () => {
            // First show tooltip
            const base64Element = document.createElement('span');
            base64Element.dataset.fullData = 'SGVsbG8gV29ybGQ=';
            uiManager.showBase64Tooltip(base64Element);
            
            // Then hide it
            uiManager.hideBase64Tooltip();
            
            const tooltip = document.getElementById('base64-tooltip');
            expect(tooltip.style.display).toBe('none');
        });
    });

    describe('面板更新方法', () => {
        beforeEach(() => {
            uiManager.initUI();
        });

        it('应该提供控制面板更新方法', () => {
            const consoleSpy = vi.spyOn(console, 'log');
            const testData = { status: 'running' };
            
            uiManager.updateControlPanel(testData);
            
            expect(consoleSpy).toHaveBeenCalledWith('更新控制面板:', testData);
        });

        it('应该提供主面板更新方法', () => {
            const testData = { users: [], chains: [] };
            
            // Mock the main panel
            const mockMainPanel = {
                updateAllData: vi.fn(),
                destroy: vi.fn()
            };
            uiManager.panels.main = mockMainPanel;
            
            uiManager.updateMainPanel(testData);
            
            expect(mockMainPanel.updateAllData).toHaveBeenCalledWith(testData);
        });

        it('应该提供日志面板更新方法', () => {
            const consoleSpy = vi.spyOn(console, 'log');
            const testLogs = [{ id: 1, message: 'test log' }];
            
            uiManager.updateLogPanel(testLogs);
            
            expect(consoleSpy).toHaveBeenCalledWith('更新日志面板:', testLogs);
        });

        it('未初始化时应该警告', () => {
            const uninitializedManager = new UIManager(mockApp);
            const consoleSpy = vi.spyOn(console, 'warn');
            
            uninitializedManager.updateControlPanel({});
            
            expect(consoleSpy).toHaveBeenCalledWith('UI未初始化，无法更新控制面板');
        });
    });

    describe('工具方法', () => {
        beforeEach(() => {
            uiManager.initUI();
        });

        it('应该获取面板元素', () => {
            const controlPanel = uiManager.getPanelElement('control');
            expect(controlPanel.id).toBe('control-panel');
            
            const mainPanel = uiManager.getPanelElement('main');
            expect(mainPanel.id).toBe('main-panel');
            
            const logPanel = uiManager.getPanelElement('log');
            expect(logPanel.id).toBe('log-panel');
        });

        it('应该获取面板内容元素', () => {
            const controlContent = uiManager.getPanelContentElement('control');
            expect(controlContent.classList.contains('panel-content')).toBe(true);
            
            const mainContent = uiManager.getPanelContentElement('main');
            expect(mainContent.classList.contains('panel-content')).toBe(true);
            
            const logContent = uiManager.getPanelContentElement('log');
            expect(logContent.classList.contains('panel-content')).toBe(true);
        });

        it('不存在的面板应该返回null', () => {
            const nonExistentPanel = uiManager.getPanelElement('nonexistent');
            expect(nonExistentPanel).toBeNull();
            
            const nonExistentContent = uiManager.getPanelContentElement('nonexistent');
            expect(nonExistentContent).toBeNull();
        });
    });

    describe('销毁', () => {
        it('应该正确销毁UIManager', () => {
            uiManager.initUI();
            
            // Add tooltip to test cleanup
            const base64Element = document.createElement('span');
            base64Element.dataset.fullData = 'test';
            uiManager.showBase64Tooltip(base64Element);
            
            expect(uiManager.isInitialized).toBe(true);
            expect(document.getElementById('base64-tooltip')).toBeTruthy();
            
            uiManager.destroy();
            
            expect(uiManager.isInitialized).toBe(false);
            expect(document.getElementById('base64-tooltip')).toBeFalsy();
        });
    });

    describe('错误处理', () => {
        it('应该处理初始化错误', () => {
            // Remove all required elements
            document.body.innerHTML = '';
            
            expect(() => {
                uiManager.initUI();
            }).toThrow('必需的DOM元素未找到');
        });

        it('应该处理面板内容容器缺失', () => {
            // Remove panel content
            document.querySelector('#control-panel .panel-content').remove();
            
            expect(() => {
                uiManager.initUI();
            }).toThrow('面板内容容器未找到: control');
        });
    });
});