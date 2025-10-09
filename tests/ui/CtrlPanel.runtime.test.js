/**
 * CtrlPanel 运行时控制功能测试
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

describe('CtrlPanel 运行时控制', () => {
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
        ctrlPanel.init();
    });

    afterEach(() => {
        if (ctrlPanel) {
            ctrlPanel.destroy();
        }
        document.body.innerHTML = '';
    });

    describe('运行时参数调整', () => {
        it('应该允许调整最大连接数', () => {
            const maxConnInput = document.getElementById('max-connections');
            
            // 测试初始值
            expect(maxConnInput.value).toBe('3');
            
            // 修改值
            maxConnInput.value = '5';
            maxConnInput.dispatchEvent(new Event('input'));
            
            // 验证配置更新
            expect(ctrlPanel.currentConfig.maxConnections).toBe(5);
            expect(mockApp.updateConfig).toHaveBeenCalledWith('maxConnections', 5);
        });

        it('应该允许调整连接故障率', () => {
            const failureRateInput = document.getElementById('failure-rate');
            
            // 测试初始值
            expect(failureRateInput.value).toBe('10');
            
            // 修改值
            failureRateInput.value = '25';
            failureRateInput.dispatchEvent(new Event('input'));
            
            // 验证配置更新
            expect(ctrlPanel.currentConfig.failureRate).toBe(0.25);
            expect(mockApp.updateConfig).toHaveBeenCalledWith('failureRate', 0.25);
            
            // 验证显示更新
            const displayText = failureRateInput.parentElement.querySelector('small').textContent;
            expect(displayText).toBe('当前: 25%');
        });

        it('应该允许调整支付速率', () => {
            const paymentRateInput = document.getElementById('payment-rate');
            
            // 测试初始值
            expect(paymentRateInput.value).toBe('20');
            
            // 修改值
            paymentRateInput.value = '50';
            paymentRateInput.dispatchEvent(new Event('input'));
            
            // 验证配置更新
            expect(ctrlPanel.currentConfig.paymentRate).toBe(0.5);
            expect(mockApp.updateConfig).toHaveBeenCalledWith('paymentRate', 0.5);
            
            // 验证显示更新
            const displayText = paymentRateInput.parentElement.querySelector('small').textContent;
            expect(displayText).toBe('当前: 50%');
        });

        it('运行时应该允许调整动态参数', () => {
            // 设置为运行状态
            ctrlPanel.systemState = 'running';
            ctrlPanel.updateUI();
            
            // 最大连接数应该可以调整
            const maxConnInput = document.getElementById('max-connections');
            expect(maxConnInput.disabled).toBe(false);
            
            // 故障率应该可以调整
            const failureRateInput = document.getElementById('failure-rate');
            expect(failureRateInput.disabled).toBe(false);
            
            // 支付速率应该可以调整
            const paymentRateInput = document.getElementById('payment-rate');
            expect(paymentRateInput.disabled).toBe(false);
        });

        it('运行时应该禁用静态参数', () => {
            // 设置为运行状态
            ctrlPanel.systemState = 'running';
            ctrlPanel.updateUI();
            
            // 节点数应该被禁用
            const nodeCountInput = document.getElementById('node-count');
            expect(nodeCountInput.disabled).toBe(true);
            
            // 用户数应该被禁用
            const userCountInput = document.getElementById('user-count');
            expect(userCountInput.disabled).toBe(true);
        });
    });

    describe('滴答时间调节', () => {
        it('应该正确设置滴答时间范围', () => {
            const tickInput = document.getElementById('tick-interval');
            
            // 验证范围设置
            expect(tickInput.min).toBe('100');
            expect(tickInput.max).toBe('3000');
            expect(tickInput.step).toBe('100');
            
            // 验证初始值（HTML input默认取min值，这是正常的浏览器行为）
            expect(parseInt(tickInput.value)).toBeGreaterThanOrEqual(100);
            expect(parseInt(tickInput.value)).toBeLessThanOrEqual(3000);
        });

        it('应该处理滴答时间调整', () => {
            const tickInput = document.getElementById('tick-interval');
            
            // 调整到最慢（3秒）
            tickInput.value = '3000';
            tickInput.dispatchEvent(new Event('input'));
            
            expect(ctrlPanel.currentConfig.tickInterval).toBe(3000);
            expect(mockApp.updateConfig).toHaveBeenCalledWith('tickInterval', 3000);
            
            // 验证显示更新
            const displayText = tickInput.parentElement.querySelector('small').textContent;
            expect(displayText).toBe('当前: 3000ms');
        });

        it('应该处理最快滴答时间（无限制）', () => {
            const tickInput = document.getElementById('tick-interval');
            
            // 调整到最快（100ms，接近无限制）
            tickInput.value = '100';
            tickInput.dispatchEvent(new Event('input'));
            
            expect(ctrlPanel.currentConfig.tickInterval).toBe(100);
            expect(mockApp.updateConfig).toHaveBeenCalledWith('tickInterval', 100);
        });

        it('应该实时更新滴答时间显示', () => {
            const tickInput = document.getElementById('tick-interval');
            
            // 测试多个值
            const testValues = [500, 1500, 2500];
            
            testValues.forEach(value => {
                tickInput.value = value.toString();
                tickInput.dispatchEvent(new Event('input'));
                
                const displayText = tickInput.parentElement.querySelector('small').textContent;
                expect(displayText).toBe(`当前: ${value}ms`);
            });
        });

        it('运行时应该允许调整滴答时间', () => {
            // 设置为运行状态
            ctrlPanel.systemState = 'running';
            ctrlPanel.updateUI();
            
            const tickInput = document.getElementById('tick-interval');
            expect(tickInput.disabled).toBe(false);
            
            // 应该能够调整
            tickInput.value = '2000';
            tickInput.dispatchEvent(new Event('input'));
            
            expect(ctrlPanel.currentConfig.tickInterval).toBe(2000);
            expect(mockApp.updateConfig).toHaveBeenCalledWith('tickInterval', 2000);
        });
    });

    describe('分叉攻击模拟控制', () => {
        it('应该正确初始化攻击控制界面', () => {
            const attackUserSelect = document.getElementById('attack-user');
            const attackBtn = document.getElementById('btn-simulate-attack');
            
            expect(attackUserSelect).toBeTruthy();
            expect(attackBtn).toBeTruthy();
            
            // 初始状态应该有默认选项
            expect(attackUserSelect.options.length).toBe(1);
            expect(attackUserSelect.options[0].value).toBe('');
            expect(attackUserSelect.options[0].textContent).toBe('选择攻击者');
        });

        it('停止状态应该禁用攻击控制', () => {
            // 确保是停止状态
            ctrlPanel.systemState = 'stopped';
            ctrlPanel.updateUI();
            
            const attackUserSelect = document.getElementById('attack-user');
            const attackBtn = document.getElementById('btn-simulate-attack');
            
            expect(attackUserSelect.disabled).toBe(true);
            expect(attackBtn.disabled).toBe(true);
        });

        it('运行状态应该启用攻击控制', () => {
            // 设置为运行状态
            ctrlPanel.systemState = 'running';
            ctrlPanel.updateUI();
            
            const attackUserSelect = document.getElementById('attack-user');
            const attackBtn = document.getElementById('btn-simulate-attack');
            
            expect(attackUserSelect.disabled).toBe(false);
            expect(attackBtn.disabled).toBe(false);
        });

        it('应该正确更新用户列表', () => {
            const mockUsers = [
                { id: 'user1', publicKey: 'abcdef1234567890abcdef1234567890abcdef12' },
                { id: 'user2', publicKey: 'fedcba0987654321fedcba0987654321fedcba09' },
                { id: 'user3', publicKey: '1234567890abcdef1234567890abcdef12345678' }
            ];
            
            ctrlPanel.updateUserList(mockUsers);
            
            const attackUserSelect = document.getElementById('attack-user');
            expect(attackUserSelect.options.length).toBe(4); // 包括默认选项
            
            // 验证用户选项
            expect(attackUserSelect.options[1].value).toBe('user1');
            expect(attackUserSelect.options[1].textContent).toBe('用户 user1 (abcdef12...)');
            
            expect(attackUserSelect.options[2].value).toBe('user2');
            expect(attackUserSelect.options[2].textContent).toBe('用户 user2 (fedcba09...)');
            
            expect(attackUserSelect.options[3].value).toBe('user3');
            expect(attackUserSelect.options[3].textContent).toBe('用户 user3 (12345678...)');
        });

        it('应该处理空用户列表', () => {
            ctrlPanel.updateUserList([]);
            
            const attackUserSelect = document.getElementById('attack-user');
            expect(attackUserSelect.options.length).toBe(1); // 只有默认选项
        });

        it('应该处理null用户列表', () => {
            ctrlPanel.updateUserList(null);
            
            const attackUserSelect = document.getElementById('attack-user');
            expect(attackUserSelect.options.length).toBe(1); // 只有默认选项
        });

        it('应该执行攻击模拟', () => {
            // 设置为运行状态
            ctrlPanel.systemState = 'running';
            ctrlPanel.updateUI();
            
            // 添加用户
            const mockUsers = [{ id: 'attacker1', publicKey: 'attackerkey123' }];
            ctrlPanel.updateUserList(mockUsers);
            
            // 选择攻击者
            const attackUserSelect = document.getElementById('attack-user');
            attackUserSelect.value = 'attacker1';
            
            // 执行攻击
            ctrlPanel.handleSimulateAttack();
            
            expect(mockApp.simulateAttack).toHaveBeenCalledWith('attacker1');
        });

        it('未选择攻击者时应该显示警告', () => {
            const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
            
            // 设置为运行状态
            ctrlPanel.systemState = 'running';
            ctrlPanel.updateUI();
            
            // 不选择攻击者直接执行
            ctrlPanel.handleSimulateAttack();
            
            expect(alertSpy).toHaveBeenCalledWith('请选择攻击者');
            expect(mockApp.simulateAttack).not.toHaveBeenCalled();
            
            alertSpy.mockRestore();
        });

        it('攻击模拟失败时应该显示错误', () => {
            const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
            mockApp.simulateAttack.mockImplementation(() => {
                throw new Error('攻击失败');
            });
            
            // 设置为运行状态并添加用户
            ctrlPanel.systemState = 'running';
            ctrlPanel.updateUI();
            ctrlPanel.updateUserList([{ id: 'user1', publicKey: 'key1' }]);
            
            // 选择攻击者并执行
            const attackUserSelect = document.getElementById('attack-user');
            attackUserSelect.value = 'user1';
            ctrlPanel.handleSimulateAttack();
            
            expect(alertSpy).toHaveBeenCalledWith('攻击模拟失败: 攻击失败');
            
            alertSpy.mockRestore();
        });
    });

    describe('系统状态指示器', () => {
        it('应该正确显示停止状态', () => {
            ctrlPanel.systemState = 'stopped';
            ctrlPanel.updateUI();
            
            const statusIndicator = document.querySelector('.status-indicator');
            const statusText = document.querySelector('.status-text');
            
            expect(statusIndicator.classList.contains('status-stopped')).toBe(true);
            expect(statusText.textContent).toBe('已停止');
        });

        it('应该正确显示运行状态', () => {
            ctrlPanel.systemState = 'running';
            ctrlPanel.updateUI();
            
            const statusIndicator = document.querySelector('.status-indicator');
            const statusText = document.querySelector('.status-text');
            
            expect(statusIndicator.classList.contains('status-running')).toBe(true);
            expect(statusText.textContent).toBe('运行中');
        });

        it('应该正确显示暂停状态', () => {
            ctrlPanel.systemState = 'paused';
            ctrlPanel.updateUI();
            
            const statusIndicator = document.querySelector('.status-indicator');
            const statusText = document.querySelector('.status-text');
            
            expect(statusIndicator.classList.contains('status-paused')).toBe(true);
            expect(statusText.textContent).toBe('已暂停');
        });

        it('应该处理未知状态', () => {
            ctrlPanel.systemState = 'unknown';
            
            expect(ctrlPanel.getStatusText()).toBe('未知状态');
        });
    });

    describe('运行时控制集成测试', () => {
        it('应该在系统启动后正确设置运行时控制状态', () => {
            // 模拟系统启动
            ctrlPanel.handleStart();
            
            // 验证状态
            expect(ctrlPanel.systemState).toBe('running');
            
            // 验证运行时控制可用性
            const maxConnInput = document.getElementById('max-connections');
            const failureRateInput = document.getElementById('failure-rate');
            const tickInput = document.getElementById('tick-interval');
            const attackBtn = document.getElementById('btn-simulate-attack');
            
            expect(maxConnInput.disabled).toBe(false);
            expect(failureRateInput.disabled).toBe(false);
            expect(tickInput.disabled).toBe(false);
            expect(attackBtn.disabled).toBe(false);
        });

        it('应该在系统停止后正确重置运行时控制状态', () => {
            // 先启动系统
            ctrlPanel.handleStart();
            expect(ctrlPanel.systemState).toBe('running');
            
            // 然后停止系统
            ctrlPanel.handleStop();
            expect(ctrlPanel.systemState).toBe('stopped');
            
            // 验证攻击控制被禁用
            const attackUserSelect = document.getElementById('attack-user');
            const attackBtn = document.getElementById('btn-simulate-attack');
            
            expect(attackUserSelect.disabled).toBe(true);
            expect(attackBtn.disabled).toBe(true);
        });

        it('应该在暂停状态下保持运行时控制可用', () => {
            // 启动并暂停系统
            ctrlPanel.handleStart();
            ctrlPanel.handlePause();
            
            expect(ctrlPanel.systemState).toBe('paused');
            
            // 运行时控制应该仍然可用
            const maxConnInput = document.getElementById('max-connections');
            const failureRateInput = document.getElementById('failure-rate');
            const tickInput = document.getElementById('tick-interval');
            
            expect(maxConnInput.disabled).toBe(false);
            expect(failureRateInput.disabled).toBe(false);
            expect(tickInput.disabled).toBe(false);
        });

        it('应该正确处理配置变化通知', () => {
            const configChanges = [
                { element: 'max-connections', value: 5, configKey: 'maxConnections', expectedValue: 5 },
                { element: 'failure-rate', value: 30, configKey: 'failureRate', expectedValue: 0.3 },
                { element: 'payment-rate', value: 75, configKey: 'paymentRate', expectedValue: 0.75 },
                { element: 'tick-interval', value: 2000, configKey: 'tickInterval', expectedValue: 2000 }
            ];
            
            configChanges.forEach(({ element, value, configKey, expectedValue }) => {
                const input = document.getElementById(element);
                input.value = value.toString();
                input.dispatchEvent(new Event('input'));
                
                expect(mockApp.updateConfig).toHaveBeenCalledWith(configKey, expectedValue);
            });
        });
    });
});