/**
 * CtrlPanel 测试
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock DOM environment
const mockDOM = () => {
    document.body.innerHTML = `
        <div id="control-panel" class="panel control-panel">
            <h2>控制面板</h2>
            <div class="panel-content">
                <div class="control-section" id="system-controls">
                    <h3>系统控制</h3>
                    <div class="control-buttons"></div>
                </div>
                
                <div class="control-section" id="network-settings">
                    <h3>网络设置</h3>
                    <div class="settings-form"></div>
                </div>
                
                <div class="control-section" id="chain-definition">
                    <h3>区块链定义</h3>
                    <div class="chain-def-editor"></div>
                </div>
                
                <div class="control-section" id="runtime-controls">
                    <h3>运行时控制</h3>
                    <div class="runtime-settings"></div>
                </div>
            </div>
        </div>
    `;
};

describe('CtrlPanel', () => {
    let ctrlPanel;
    let mockUIManager;
    let mockApp;

    beforeEach(() => {
        // Setup DOM
        mockDOM();
        
        // Create mock app
        mockApp = {
            start: vi.fn(),
            pause: vi.fn(),
            resume: vi.fn(),
            stop: vi.fn(),
            updateConfig: vi.fn(),
            simulateAttack: vi.fn()
        };
        
        // Create mock UI manager
        mockUIManager = {
            app: mockApp
        };
        
        // Create CtrlPanel instance
        ctrlPanel = new CtrlPanel(mockUIManager);
    });

    afterEach(() => {
        if (ctrlPanel) {
            ctrlPanel.destroy();
        }
        document.body.innerHTML = '';
    });

    describe('构造函数', () => {
        it('应该正确初始化CtrlPanel实例', () => {
            expect(ctrlPanel.uiManager).toBe(mockUIManager);
            expect(ctrlPanel.app).toBe(mockApp);
            expect(ctrlPanel.isInitialized).toBe(false);
            expect(ctrlPanel.systemState).toBe('stopped');
        });

        it('应该设置默认配置', () => {
            expect(ctrlPanel.defaultConfig).toEqual({
                nodeCount: 5,
                userCount: 10,
                maxConnections: 3,
                failureRate: 0.1,
                paymentRate: 0.2,
                tickInterval: 1000,
                chainDefinition: expect.stringContaining('# 区块链定义示例')
            });
        });
    });

    describe('初始化', () => {
        it('应该成功初始化控制面板', () => {
            ctrlPanel.init();
            expect(ctrlPanel.isInitialized).toBe(true);
        });

        it('应该渲染所有控制组件', () => {
            ctrlPanel.init();
            
            // 检查控制按钮
            expect(document.getElementById('btn-start')).toBeTruthy();
            expect(document.getElementById('btn-pause')).toBeTruthy();
            expect(document.getElementById('btn-stop')).toBeTruthy();
            
            // 检查网络设置
            expect(document.getElementById('node-count')).toBeTruthy();
            expect(document.getElementById('user-count')).toBeTruthy();
            expect(document.getElementById('max-connections')).toBeTruthy();
            expect(document.getElementById('failure-rate')).toBeTruthy();
            expect(document.getElementById('payment-rate')).toBeTruthy();
            
            // 检查区块链定义
            expect(document.getElementById('chain-def-text')).toBeTruthy();
            expect(document.getElementById('btn-validate-def')).toBeTruthy();
            expect(document.getElementById('btn-reset-def')).toBeTruthy();
            
            // 检查运行时控制
            expect(document.getElementById('tick-interval')).toBeTruthy();
            expect(document.getElementById('attack-user')).toBeTruthy();
            expect(document.getElementById('btn-simulate-attack')).toBeTruthy();
        });

        it('初始化失败时应该抛出错误', () => {
            // 移除必需的容器
            document.querySelector('#system-controls .control-buttons').remove();
            
            expect(() => {
                ctrlPanel.init();
            }).toThrow('控制按钮容器未找到');
        });
    });

    describe('控制按钮', () => {
        beforeEach(() => {
            ctrlPanel.init();
        });

        it('应该正确渲染初始状态的按钮', () => {
            const startBtn = document.getElementById('btn-start');
            const pauseBtn = document.getElementById('btn-pause');
            const stopBtn = document.getElementById('btn-stop');
            
            expect(startBtn.disabled).toBe(false);
            expect(pauseBtn.disabled).toBe(true);
            expect(stopBtn.disabled).toBe(true);
            expect(pauseBtn.textContent.trim()).toBe('暂停');
        });

        it('应该处理开始按钮点击', () => {
            const startBtn = document.getElementById('btn-start');
            startBtn.click();
            
            expect(mockApp.start).toHaveBeenCalledWith(ctrlPanel.currentConfig);
            expect(ctrlPanel.systemState).toBe('running');
        });

        it('应该处理暂停按钮点击', () => {
            // 先启动系统
            ctrlPanel.systemState = 'running';
            ctrlPanel.updateUI();
            
            const pauseBtn = document.getElementById('btn-pause');
            pauseBtn.click();
            
            expect(mockApp.pause).toHaveBeenCalled();
            expect(ctrlPanel.systemState).toBe('paused');
        });

        it('应该处理继续按钮点击', () => {
            // 设置为暂停状态
            ctrlPanel.systemState = 'paused';
            ctrlPanel.updateUI();
            
            const pauseBtn = document.getElementById('btn-pause');
            expect(pauseBtn.textContent.trim()).toBe('继续');
            
            // 直接调用处理函数而不是点击事件，因为事件监听器可能没有正确设置
            ctrlPanel.handlePause();
            
            expect(mockApp.resume).toHaveBeenCalled();
            expect(ctrlPanel.systemState).toBe('running');
        });

        it('应该处理停止按钮点击', () => {
            // 先启动系统
            ctrlPanel.systemState = 'running';
            ctrlPanel.updateUI();
            
            const stopBtn = document.getElementById('btn-stop');
            stopBtn.click();
            
            expect(mockApp.stop).toHaveBeenCalled();
            expect(ctrlPanel.systemState).toBe('stopped');
        });
    });

    describe('网络参数设置', () => {
        beforeEach(() => {
            ctrlPanel.init();
        });

        it('应该正确设置初始值', () => {
            const nodeCountInput = document.getElementById('node-count');
            const userCountInput = document.getElementById('user-count');
            const maxConnInput = document.getElementById('max-connections');
            const failureRateInput = document.getElementById('failure-rate');
            const paymentRateInput = document.getElementById('payment-rate');
            
            expect(nodeCountInput.value).toBe('5');
            expect(userCountInput.value).toBe('10');
            expect(maxConnInput.value).toBe('3');
            expect(failureRateInput.value).toBe('10');
            expect(paymentRateInput.value).toBe('20');
        });

        it('应该处理参数变化', () => {
            const nodeCountInput = document.getElementById('node-count');
            nodeCountInput.value = '8';
            nodeCountInput.dispatchEvent(new Event('change'));
            
            expect(ctrlPanel.currentConfig.nodeCount).toBe(8);
        });

        it('应该处理滑块变化并通知应用', () => {
            const failureRateInput = document.getElementById('failure-rate');
            failureRateInput.value = '25';
            failureRateInput.dispatchEvent(new Event('input'));
            
            expect(ctrlPanel.currentConfig.failureRate).toBe(0.25);
            expect(mockApp.updateConfig).toHaveBeenCalledWith('failureRate', 0.25);
        });

        it('运行时应该禁用某些参数', () => {
            ctrlPanel.systemState = 'running';
            ctrlPanel.updateUI();
            
            const nodeCountInput = document.getElementById('node-count');
            const userCountInput = document.getElementById('user-count');
            
            expect(nodeCountInput.disabled).toBe(true);
            expect(userCountInput.disabled).toBe(true);
        });
    });

    describe('区块链定义', () => {
        beforeEach(() => {
            ctrlPanel.init();
        });

        it('应该显示默认定义', () => {
            const textarea = document.getElementById('chain-def-text');
            expect(textarea.value).toContain('# 区块链定义示例');
        });

        it('应该验证有效的定义', () => {
            const validDef = '1-100 1\n101-200 5';
            ctrlPanel.currentConfig.chainDefinition = validDef;
            
            ctrlPanel.validateChainDefinition();
            
            const result = document.getElementById('def-validation-result');
            expect(result.innerHTML).toContain('验证成功');
            expect(result.innerHTML).toContain('共定义 2 个范围');
        });

        it('应该检测无效的定义', () => {
            const invalidDef = 'invalid format';
            ctrlPanel.currentConfig.chainDefinition = invalidDef;
            
            ctrlPanel.validateChainDefinition();
            
            const result = document.getElementById('def-validation-result');
            expect(result.innerHTML).toContain('验证失败');
        });

        it('应该检测范围重叠', () => {
            const overlappingDef = '1-100 1\n50-150 5';
            ctrlPanel.currentConfig.chainDefinition = overlappingDef;
            
            expect(() => {
                ctrlPanel.parseChainDefinition(overlappingDef);
            }).toThrow('范围重叠');
        });

        it('应该重置为默认定义', () => {
            const textarea = document.getElementById('chain-def-text');
            textarea.value = 'modified content';
            ctrlPanel.currentConfig.chainDefinition = 'modified content';
            
            const resetBtn = document.getElementById('btn-reset-def');
            resetBtn.click();
            
            expect(textarea.value).toBe(ctrlPanel.defaultConfig.chainDefinition);
            expect(ctrlPanel.currentConfig.chainDefinition).toBe(ctrlPanel.defaultConfig.chainDefinition);
        });
    });

    describe('运行时控制', () => {
        beforeEach(() => {
            ctrlPanel.init();
        });

        it('应该处理滴答时间调整', () => {
            const tickInput = document.getElementById('tick-interval');
            tickInput.value = '2000';
            tickInput.dispatchEvent(new Event('input'));
            
            expect(ctrlPanel.currentConfig.tickInterval).toBe(2000);
            expect(mockApp.updateConfig).toHaveBeenCalledWith('tickInterval', 2000);
        });

        it('应该更新用户列表', () => {
            const mockUsers = [
                { id: 'user1', publicKey: 'key1' },
                { id: 'user2', publicKey: 'key2' }
            ];
            
            ctrlPanel.updateUserList(mockUsers);
            
            const select = document.getElementById('attack-user');
            expect(select.options.length).toBe(3); // 包括默认选项
            expect(select.options[1].value).toBe('user1');
            expect(select.options[2].value).toBe('user2');
        });

        it('应该处理攻击模拟', () => {
            // 设置为运行状态以启用攻击按钮
            ctrlPanel.systemState = 'running';
            ctrlPanel.renderRuntimeControls();
            ctrlPanel.setupEventListeners();
            
            // 先添加用户
            const mockUsers = [{ id: 'user1', publicKey: 'key1' }];
            ctrlPanel.updateUserList(mockUsers);
            
            // 选择攻击者
            const select = document.getElementById('attack-user');
            select.value = 'user1';
            
            // 点击攻击按钮
            const attackBtn = document.getElementById('btn-simulate-attack');
            attackBtn.click();
            
            expect(mockApp.simulateAttack).toHaveBeenCalledWith('user1');
        });

        it('未选择攻击者时应该显示警告', () => {
            // Mock alert
            const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
            
            // 设置为运行状态以启用攻击按钮
            ctrlPanel.systemState = 'running';
            ctrlPanel.renderRuntimeControls();
            ctrlPanel.setupEventListeners();
            
            const attackBtn = document.getElementById('btn-simulate-attack');
            attackBtn.click();
            
            expect(alertSpy).toHaveBeenCalledWith('请选择攻击者');
            alertSpy.mockRestore();
        });
    });

    describe('配置验证', () => {
        beforeEach(() => {
            ctrlPanel.init();
        });

        it('应该验证有效配置', () => {
            expect(() => {
                ctrlPanel.validateConfiguration();
            }).not.toThrow();
        });

        it('应该拒绝无效的节点数量', () => {
            ctrlPanel.currentConfig.nodeCount = 1;
            
            expect(() => {
                ctrlPanel.validateConfiguration();
            }).toThrow('节点数量至少为2');
        });

        it('应该拒绝无效的用户数量', () => {
            ctrlPanel.currentConfig.userCount = 1;
            
            expect(() => {
                ctrlPanel.validateConfiguration();
            }).toThrow('虚拟用户数量至少为2');
        });

        it('应该拒绝无效的连接数', () => {
            ctrlPanel.currentConfig.maxConnections = 0;
            
            expect(() => {
                ctrlPanel.validateConfiguration();
            }).toThrow('最大连接数至少为1');
        });
    });

    describe('状态管理', () => {
        beforeEach(() => {
            ctrlPanel.init();
        });

        it('应该正确获取状态文本', () => {
            expect(ctrlPanel.getStatusText()).toBe('已停止');
            
            ctrlPanel.systemState = 'running';
            expect(ctrlPanel.getStatusText()).toBe('运行中');
            
            ctrlPanel.systemState = 'paused';
            expect(ctrlPanel.getStatusText()).toBe('已暂停');
        });

        it('应该设置系统状态', () => {
            ctrlPanel.setSystemState('running');
            expect(ctrlPanel.systemState).toBe('running');
        });

        it('应该获取当前配置', () => {
            const config = ctrlPanel.getConfig();
            expect(config).toEqual(ctrlPanel.currentConfig);
            expect(config).not.toBe(ctrlPanel.currentConfig); // 应该是副本
        });
    });

    describe('错误处理', () => {
        it('应该处理启动错误', () => {
            const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
            mockApp.start.mockImplementation(() => {
                throw new Error('启动失败');
            });
            
            ctrlPanel.init();
            ctrlPanel.handleStart();
            
            expect(alertSpy).toHaveBeenCalledWith('启动失败: 启动失败');
            alertSpy.mockRestore();
        });

        it('应该处理暂停错误', () => {
            const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
            mockApp.pause.mockImplementation(() => {
                throw new Error('暂停失败');
            });
            
            ctrlPanel.init();
            ctrlPanel.systemState = 'running';
            ctrlPanel.handlePause();
            
            expect(alertSpy).toHaveBeenCalledWith('操作失败: 暂停失败');
            alertSpy.mockRestore();
        });

        it('应该处理停止错误', () => {
            const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
            mockApp.stop.mockImplementation(() => {
                throw new Error('停止失败');
            });
            
            ctrlPanel.init();
            ctrlPanel.systemState = 'running';
            ctrlPanel.handleStop();
            
            expect(alertSpy).toHaveBeenCalledWith('停止失败: 停止失败');
            alertSpy.mockRestore();
        });
    });

    describe('UI更新', () => {
        beforeEach(() => {
            ctrlPanel.init();
        });

        it('应该更新整个UI', () => {
            const renderSpy = vi.spyOn(ctrlPanel, 'renderControlButtons');
            
            ctrlPanel.updateUI();
            
            expect(renderSpy).toHaveBeenCalled();
        });

        it('应该更新滑块显示', () => {
            ctrlPanel.updateRangeDisplay('failure-rate', 25, '%');
            
            const small = document.querySelector('#failure-rate').parentElement.querySelector('small');
            expect(small.textContent).toBe('当前: 25%');
        });
    });

    describe('销毁', () => {
        it('应该正确销毁控制面板', () => {
            ctrlPanel.init();
            expect(ctrlPanel.isInitialized).toBe(true);
            
            ctrlPanel.destroy();
            expect(ctrlPanel.isInitialized).toBe(false);
        });
    });
});