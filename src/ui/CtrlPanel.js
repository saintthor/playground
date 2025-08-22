/**
 * CtrlPanel - 控制面板
 * 负责系统控制、参数设置和区块链定义管理
 */
class CtrlPanel {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.app = uiManager.app;
        this.isInitialized = false;
        this.currentConfig = {
            nodeCount: 30,
            userCount: 30,
            maxConnections: 5,
            userNodeNum: 3,
            failureRate: 0.1,
            paymentRate: 0.05,
            tickInterval: 1000,
            DefStr: "定义每条区块链为一张钞票，其根区块的数据结构为：H\\nS\\nK。其中：\nH 为本文件 sha256 值（Base64）；K 是初始持有人的公钥（Base64），固定为 " + this.app.SysUser.Id + "；S 是序列号，与钞票面值的对应关系如下：",
            chainDefinition: `1-100 1
101-200 5
201-300 10
301-400 20
401-500 50`
        };
    }
    
    init() {
        try {
            this.render();
            this.setupEventListeners();
            this.isInitialized = true;
            console.log('CtrlPanel 初始化完成');
        } catch (error) {
            console.error('CtrlPanel 初始化失败:', error);
        }
    }
    
    render() {
        const controlPanel = document.getElementById('control-panel');
        if (!controlPanel) return;
        
        const systemControls = controlPanel.querySelector('#system-controls .control-buttons');
        const networkSettings = controlPanel.querySelector('#network-settings .settings-form');
        const chainDefinition = controlPanel.querySelector('#chain-definition .chain-def-editor');
        const runtimeControls = controlPanel.querySelector('#runtime-controls .runtime-settings');
        
        if (systemControls) {
            this.renderSystemControls(systemControls);
        }
        
        if (networkSettings) {
            this.renderNetworkSettings(networkSettings);
        }
        
        if (chainDefinition) {
            this.renderChainDefinition(chainDefinition);
        }
        
        if (runtimeControls) {
            this.renderRuntimeControls(runtimeControls);
        }
    }
    
    renderSystemControls(container) {
        container.innerHTML = `
            <div class="system-controls-header">
                <span>系统控制</span>
                <button class="help-icon" data-help="system-controls" title="查看帮助">?</button>
            </div>
            <button class="btn btn-success" id="start-btn">开始</button>
            <button class="btn btn-warning" id="pause-btn" disabled>暂停</button>
            <button class="btn btn-danger" id="stop-btn" disabled>停止</button>
        `;
    }
    
    renderNetworkSettings(container) {
        container.innerHTML = `
            <div class="form-group inline-input">
                <label class="form-label">
                    节点数量
                    <button class="help-icon" data-help="network-settings" title="查看帮助">?</button>
                </label>
                <input type="number" class="form-control" id="node-count" value="${this.currentConfig.nodeCount}" min="1" max="100">
            </div>
            
            <div class="form-group inline-input">
                <label class="form-label">
                    用户数量
                    <button class="help-icon" data-help="network-settings" title="查看帮助">?</button>
                </label>
                <input type="number" class="form-control" id="user-count" value="${this.currentConfig.userCount}" min="1" max="1000">
            </div>
            
            <div class="form-group inline-input">
                <label class="form-label">
                    节点最大连接数
                    <button class="help-icon" data-help="network-settings" title="查看帮助">?</button>
                </label>
                <input type="number" class="form-control" id="max-connections" value="${this.currentConfig.maxConnections}" min="1" max="20">
            </div>
            
            <div class="form-group inline-input">
                <label class="form-label">
                    用户关联节点数
                    <button class="help-icon" data-help="network-settings" title="查看帮助">?</button>
                </label>
                <input type="number" class="form-control" id="userNodeNum" value="${this.currentConfig.userNodeNum}" min="1" max="5">
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    连接故障率 (%)
                    <button class="help-icon" data-help="network-settings" title="查看帮助">?</button>
                </label>
                <input type="range" class="form-control" id="failure-rate" value="${this.currentConfig.failureRate * 100}" min="0" max="50">
                <small class="text-muted">当前: ${(this.currentConfig.failureRate * 100).toFixed(1)}%</small>
            </div>
        `;
    }
    
    renderChainDefinition(container) {
        container.innerHTML = `
            <div class="form-group">
                <label class="form-label">
                    区块链定义
                    <button class="help-icon" data-help="blockchain-definition" title="查看帮助">?</button>
                </label>
                <div style="font-size: smaller;">${this.currentConfig.DefStr.replace( '\n', '<br>' )}</div>
                <textarea class="form-control" id="chain-definition" rows="6">${this.currentConfig.chainDefinition}</textarea>
                <small class="text-muted">格式: 起始序列号-结束序列号 面值</small>
            </div>
            
            <div class="form-group">
                <button class="btn btn-primary" id="validate-definition">验证定义</button>
            </div>
            
            <div id="def-validation-result"></div>
        `;
    }
    
    renderRuntimeControls(container) {
        // 计算默认值的对数位置 (1000ms = 1.0s)
        const defaultLogValue = this.timeToLogScale(1000);
        
        container.innerHTML = `
            <div class="form-group">
                <label class="form-label">
                    滴答时间间隔
                    <button class="help-icon" data-help="runtime-controls" title="查看帮助">?</button>
                </label>
                <input type="range" class="form-control" id="tick-interval" value="${defaultLogValue}" min="0" max="100" step="1">
                <small class="text-muted">当前: 1.0秒</small>
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    分叉攻击测试
                    <button class="help-icon" data-help="runtime-controls" title="查看帮助">?</button>
                </label>
                <div class="d-flex gap-2">
                    <select class="form-control" id="attack-user">
                        <option value="">选择用户</option>
                    </select>
                    <button class="btn btn-warning btn-sm" id="trigger-attack">触发攻击</button>
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        // 系统控制按钮
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const stopBtn = document.getElementById('stop-btn');
        
        if (startBtn) startBtn.addEventListener('click', () => this.handleStart());
        if (pauseBtn) pauseBtn.addEventListener('click', () => this.handlePause());
        if (stopBtn) stopBtn.addEventListener('click', () => this.handleStop());
        
        // 网络设置
        const nodeCount = document.getElementById('node-count');
        const userCount = document.getElementById('user-count');
        const maxConnections = document.getElementById('max-connections');
        const userNodeNum = document.getElementById('userNodeNum');
        const failureRate = document.getElementById('failure-rate');
        const paymentRate = document.getElementById('payment-rate');
        
        if (nodeCount) nodeCount.addEventListener('change', (e) => this.updateConfig('nodeCount', parseInt(e.target.value)));
        if (userCount) userCount.addEventListener('change', (e) => this.updateConfig('userCount', parseInt(e.target.value)));
        if (maxConnections) maxConnections.addEventListener('change', (e) => this.updateConfig('maxConnections', parseInt(e.target.value)));
        if (userNodeNum) userNodeNum.addEventListener('change', (e) => this.updateConfig('userNodeNum', parseInt(e.target.value)));
        if (failureRate) failureRate.addEventListener('input', (e) => this.updateFailureRate(e.target.value));
        if (paymentRate) paymentRate.addEventListener('input', (e) => this.updatePaymentRate(e.target.value));
        
        // 区块链定义
        const chainDefinition = document.getElementById('chain-definition');
        const validateBtn = document.getElementById('validate-definition');
        
        if (chainDefinition) chainDefinition.addEventListener('change', (e) => this.updateConfig('chainDefinition', e.target.value));
        if (validateBtn) validateBtn.addEventListener('click', () => this.validateChainDefinition());
        
        // 运行时控制
        const tickInterval = document.getElementById('tick-interval');
        const triggerAttack = document.getElementById('trigger-attack');
        
        if (tickInterval) tickInterval.addEventListener('input', (e) => this.updateTickInterval(e.target.value));
        if (triggerAttack) triggerAttack.addEventListener('click', () => this.triggerAttack());
        
        // 帮助图标事件
        const helpIcons = document.querySelectorAll('.help-icon');
        helpIcons.forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.preventDefault();
                const helpSection = icon.getAttribute('data-help');
                this.showHelp(helpSection);
            });
        });
    }
    
    handleStart() {
        console.log('启动系统');
        if (this.app && this.app.start) {
            this.app.start(this.currentConfig);
        }
        
        // 更新按钮状态
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const stopBtn = document.getElementById('stop-btn');
        
        if (startBtn) startBtn.disabled = true;
        if (pauseBtn) pauseBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = false;
        
        // 隐藏网络设置和区块链定义部分
        this.hideConfigurationSections();
        
        // 自动隐藏控制面板
        this.minimizeControlPanel();
    }
    
    handlePause() {
        console.log('暂停/继续系统');
        const pauseBtn = document.getElementById('pause-btn');
        
        if (this.app && this.app.isPaused !== undefined) {
            if (this.app.isPaused) {
                // 当前是暂停状态，点击后恢复
                if (this.app.resume) {
                    this.app.resume();
                }
                if (pauseBtn) {
                    pauseBtn.textContent = '暂停';
                    pauseBtn.className = 'btn btn-warning';
                }
            } else {
                // 当前是运行状态，点击后暂停
                if (this.app.pause) {
                    this.app.pause();
                }
                if (pauseBtn) {
                    pauseBtn.textContent = '继续';
                    pauseBtn.className = 'btn btn-success';
                }
            }
        }
    }
    
    handleStop() {
        console.log('停止系统');
        if (this.app && this.app.stop) {
            this.app.stop();
        }
        
        // 更新按钮状态
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const stopBtn = document.getElementById('stop-btn');
        
        if (startBtn) startBtn.disabled = false;
        if (pauseBtn) pauseBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = true;
        
        // 显示网络设置和区块链定义部分
        this.showConfigurationSections();
    }
    
    updateConfig(key, value) {
        this.currentConfig[key] = value;
        console.log('配置更新:', key, value);
    }
    
    updateFailureRate(value) {
        const rate = parseFloat(value) / 100;
        this.currentConfig.failureRate = rate;
        
        const small = document.querySelector('#failure-rate + small');
        if (small) {
            small.textContent = `当前: ${value}%`;
        }
    }
    
    updatePaymentRate(value) {
        const rate = parseFloat(value) / 100;
        this.currentConfig.paymentRate = rate;
        
        const small = document.querySelector('#payment-rate + small');
        if (small) {
            small.textContent = `当前: ${value}%`;
        }
    }
    
    /**
     * 显示帮助信息
     * @param {string} section - 帮助章节ID
     */
    showHelp(section) {
        try {
            // 通过UIManager获取TabManager
            if (this.app && this.app.uiManager && this.app.uiManager.panels && 
                this.app.uiManager.panels.main && this.app.uiManager.panels.main.tabManager &&
                this.app.uiManager.panels.main.tabManager.helpTabContent) {
                
                const helpTabContent = this.app.uiManager.panels.main.tabManager.helpTabContent;
                helpTabContent.showHelpSection(section);
                
                console.log('显示帮助章节:', section);
            } else {
                console.warn('无法访问帮助系统');
            }
        } catch (error) {
            console.error('显示帮助失败:', error);
        }
    }
    
    /**
     * 隐藏配置部分（网络设置和区块链定义）
     */
    hideConfigurationSections() {
        const networkSettings = document.getElementById('network-settings');
        const chainDefinition = document.getElementById('chain-definition');
        
        if (networkSettings) {
            networkSettings.style.display = 'none';
        }
        
        if (chainDefinition) {
            chainDefinition.style.display = 'none';
        }
        
        console.log('配置部分已隐藏');
    }
    
    /**
     * 显示配置部分（网络设置和区块链定义）
     */
    showConfigurationSections() {
        const networkSettings = document.getElementById('network-settings');
        const chainDefinition = document.getElementById('chain-definition');
        
        if (networkSettings) {
            networkSettings.style.display = 'block';
        }
        
        if (chainDefinition) {
            chainDefinition.style.display = 'block';
        }
        
        console.log('配置部分已显示');
    }
    
    /**
     * 将对数刻度值转换为实际时间（毫秒）
     * @param {number} logValue - 对数刻度值 (0-100)
     * @returns {number} - 实际时间（毫秒）
     */
    logScaleToTime(logValue) {
        // 对数范围：0.01s (10ms) 到 3s (3000ms)
        const minTime = 10;   // 0.01s
        const maxTime = 3000; // 3s
        
        // 使用对数插值：time = minTime * (maxTime/minTime)^(logValue/100)
        const ratio = Math.pow(maxTime / minTime, logValue / 100);
        return Math.round(minTime * ratio);
    }
    
    /**
     * 将实际时间（毫秒）转换为对数刻度值
     * @param {number} timeMs - 实际时间（毫秒）
     * @returns {number} - 对数刻度值 (0-100)
     */
    timeToLogScale(timeMs) {
        const minTime = 10;   // 0.01s
        const maxTime = 3000; // 3s
        
        // 限制范围
        const clampedTime = Math.max(minTime, Math.min(maxTime, timeMs));
        
        // 反向对数计算：logValue = 100 * log(time/minTime) / log(maxTime/minTime)
        const logValue = 100 * Math.log(clampedTime / minTime) / Math.log(maxTime / minTime);
        return Math.round(logValue);
    }
    
    updateTickInterval(logValue) {
        // 将对数刻度值转换为实际时间
        const actualTime = this.logScaleToTime(parseInt(logValue));
        this.currentConfig.tickInterval = actualTime;
        
        const small = document.querySelector('#tick-interval + small');
        if (small) {
            if (actualTime < 1000) {
                small.textContent = `当前: ${actualTime}毫秒`;
            } else {
                small.textContent = `当前: ${(actualTime / 1000).toFixed(2)}秒`;
            }
        }
        
        // 如果系统正在运行，更新定时器间隔
        if (this.app && this.app.updateTickInterval) {
            this.app.updateTickInterval(actualTime);
        }
    }
    
    triggerAttack() {
        const attackUser = document.getElementById('attack-user');
        if (!attackUser || !attackUser.value) {
            alert('请选择要攻击的用户');
            return;
        }
        
        console.log('触发分叉攻击:', attackUser.value);
        if (this.app && this.app.triggerAttack) {
            this.app.triggerAttack(attackUser.value);
        }
    }
    
    /**
     * 验证区块链定义
     */
    async validateChainDefinition() {
        const resultContainer = document.getElementById('def-validation-result');
        if (!resultContainer) return;

        try {
            const definition = this.currentConfig.chainDefinition;
            const result = this.parseChainDefinition(definition);
            
            this.app.BlockChainNum = result.totalCount;
            
            // 计算定义文件的SHA256哈希值并转换为base64格式
            let definitionHash;
            //try {
                // 使用Crypto服务计算SHA256哈希
                const hexHash = await Crypto.sha256(this.currentConfig.DefStr + definition);
                // 将十六进制哈希转换为base64格式
                const hashBytes = new Uint8Array(hexHash.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
                definitionHash = btoa(String.fromCharCode.apply(null, hashBytes));
            //} catch (cryptoError) {
                //console.error('哈希计算失败:', cryptoError);
                //// 使用模拟SHA256哈希并转换为base64
                //const hexHash = Crypto.mockSha256(definition);
                //const hashBytes = new Uint8Array(hexHash.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
                //definitionHash = btoa(String.fromCharCode.apply(null, hashBytes));
            //}
            
            this.updateValidationResult(result, definitionHash);
        } catch (error) {
            resultContainer.innerHTML = `
                <div class="alert alert-danger">
                    <strong>验证失败:</strong> ${error.message}
                </div>
            `;
        }
    }
    
    /**
     * 解析区块链定义
     */
    parseChainDefinition(definition) {
        const lines = definition.trim().split('\n');
        const ranges = [];
        let totalCount = 0;
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            
            const match = trimmed.match(/^(\d+)-(\d+)\s+(\d+)$/);
            if (!match) {
                throw new Error(`无效的定义格式: ${trimmed}`);
            }
            
            const start = parseInt(match[1]);
            const end = parseInt(match[2]);
            const value = parseInt(match[3]);
            
            if (start > end) {
                throw new Error(`起始序列号不能大于结束序列号: ${trimmed}`);
            }
            
            const count = end - start + 1;
            ranges.push({ start, end, value, count });
            totalCount += count;
        }
        
        return { ranges, totalCount };
    }
    
    /**
     * 更新验证结果显示
     */
    updateValidationResult(result, definitionHash) {
        const resultContainer = document.getElementById('def-validation-result');
        if (!resultContainer) return;
        this.app.DefHash = definitionHash;
        resultContainer.innerHTML = `
            <div class="alert alert-success">
                <strong>定义格式正确!</strong><br>
                共定义 ${result.ranges.length} 个范围，总计 ${result.totalCount} 个区块链<br>
                <strong>定义文件哈希:</strong> <code class="definition-hash base64-data" data-type="hash" data-full-value="${definitionHash}">${definitionHash}</code><br>
                <small class="text-muted">此哈希值将加入每条区块链的根区块</small>
            </div>
        `;
        
        // 添加哈希值的鼠标指向事件
        this.setupHashHoverEvents();
    }
    
    /**
     * 设置哈希值的鼠标指向事件
     */
    setupHashHoverEvents() {
        const hashElements = document.querySelectorAll('.base64-data[data-type="hash"]');
        hashElements.forEach(element => {
            let hoverTimer = null;
            let floatingDiv = null;
            
            element.addEventListener('mouseenter', (e) => {
                // 清除之前的定时器
                if (hoverTimer) {
                    clearTimeout(hoverTimer);
                }
                
                // 设置1秒后显示浮动窗口
                hoverTimer = setTimeout(() => {
                    floatingDiv = this.showFloatingVerifyDiv(e.target);
                }, 1000);
            });
            
            element.addEventListener('mouseleave', (e) => {
                // 清除定时器
                if (hoverTimer) {
                    clearTimeout(hoverTimer);
                    hoverTimer = null;
                }
                
                // 延迟隐藏浮动窗口，给用户时间移动到浮动窗口上
                setTimeout(() => {
                    if (floatingDiv && !floatingDiv.matches(':hover')) {
                        this.hideFloatingVerifyDiv(floatingDiv);
                        floatingDiv = null;
                    }
                }, 200);
            });
        });
    }
    
    /**
     * 显示浮动验证窗口
     */
    showFloatingVerifyDiv(element) {
        const fullValue = element.getAttribute('data-full-value');
        const dataType = element.getAttribute('data-type');
        
        if (!fullValue) return null;
        
        // 创建浮动窗口
        const floatingDiv = document.createElement('div');
        floatingDiv.className = 'hash-floating-verify';
        floatingDiv.innerHTML = `
            <div class="floating-verify-header">
                <span class="verify-type">${dataType === 'hash' ? 'SHA256 哈希' : 'Base64 数据'}</span>
                <button class="floating-verify-close">&times;</button>
            </div>
            <div class="floating-verify-content">
                <div class="hash-display">
                    <label>完整值:</label>
                    <code class="full-hash">${fullValue}</code>
                </div>
                <div class="verify-actions">
                    <button class="btn btn-sm btn-primary floating-copy-btn">复制验证代码</button>
                    <button class="btn btn-sm btn-secondary floating-run-btn">运行验证</button>
                </div>
                <div class="verify-result" id="floating-verify-result"></div>
                <div class="verify-code-preview">
                    <pre><code>${this.generateVerifyCode(fullValue, dataType)}</code></pre>
                </div>
            </div>
        `;
        
        // 定位浮动窗口
        const rect = element.getBoundingClientRect();
        floatingDiv.style.cssText = `
            position: fixed;
            top: ${rect.bottom + 10}px;
            left: ${rect.left}px;
            z-index: 10000;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-width: 500px;
            min-width: 300px;
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(floatingDiv);
        
        // 动画显示
        setTimeout(() => {
            floatingDiv.style.opacity = '1';
            floatingDiv.style.transform = 'translateY(0)';
        }, 10);
        
        // 添加事件监听器
        this.setupFloatingVerifyEvents(floatingDiv, fullValue, dataType);
        
        // 调整位置以确保在视窗内
        this.adjustFloatingPosition(floatingDiv);
        
        return floatingDiv;
    }
    
    /**
     * 隐藏浮动验证窗口
     */
    hideFloatingVerifyDiv(floatingDiv) {
        if (!floatingDiv || !floatingDiv.parentNode) return;
        
        floatingDiv.style.opacity = '0';
        floatingDiv.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            if (floatingDiv.parentNode) {
                document.body.removeChild(floatingDiv);
            }
        }, 300);
    }
    
    /**
     * 设置浮动验证窗口事件
     */
    setupFloatingVerifyEvents(floatingDiv, fullValue, dataType) {
        // 关闭按钮
        const closeBtn = floatingDiv.querySelector('.floating-verify-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideFloatingVerifyDiv(floatingDiv);
            });
        }
        
        // 复制按钮
        const copyBtn = floatingDiv.querySelector('.floating-copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const code = this.generateVerifyCode(fullValue, dataType);
                this.copyTextToClipboard(code, '验证代码已复制到剪贴板');
            });
        }
        
        // 运行按钮
        const runBtn = floatingDiv.querySelector('.floating-run-btn');
        if (runBtn) {
            runBtn.addEventListener('click', () => {
                this.runFloatingVerification(floatingDiv, fullValue, dataType);
            });
        }
        
        // 鼠标离开事件
        floatingDiv.addEventListener('mouseleave', () => {
            setTimeout(() => {
                if (!floatingDiv.matches(':hover')) {
                    this.hideFloatingVerifyDiv(floatingDiv);
                }
            }, 500);
        });
    }
    
    /**
     * 调整浮动窗口位置
     */
    adjustFloatingPosition(floatingDiv) {
        const rect = floatingDiv.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // 如果超出右边界，向左调整
        if (rect.right > viewportWidth - 20) {
            const newLeft = viewportWidth - rect.width - 20;
            floatingDiv.style.left = Math.max(20, newLeft) + 'px';
        }
        
        // 如果超出下边界，向上调整
        if (rect.bottom > viewportHeight - 20) {
            const newTop = viewportHeight - rect.height - 20;
            floatingDiv.style.top = Math.max(20, newTop) + 'px';
        }
    }
    
    /**
     * 生成验证代码
     */
    generateVerifyCode(value, type) {
        if (type === 'hash') {
            return `// 验证 SHA256 哈希值
const originalData = \`${this.currentConfig.DefStr.replace( '\\n', '\\\\n' ).replace( '\n', '\\n' ) + this.currentConfig.chainDefinition}\`;
const expectedHash = "${value}";

// 计算哈希值 (异步函数)
(async function() {
    try {
        const hexHash = await Crypto.sha256(originalData);
        // 将十六进制哈希转换为base64格式
        const hashBytes = new Uint8Array(hexHash.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const actualHash = btoa(String.fromCharCode.apply(null, hashBytes));
        
        // 验证结果
        console.log('原始数据:', originalData);
        console.log('期望哈希 (base64):', expectedHash);
        console.log('实际哈希 (base64):', actualHash);
        console.log('验证结果:', actualHash === expectedHash ? '✓ 验证通过' : '✗ 验证失败');
    } catch (error) {
        console.error('验证失败:', error);
    }
})();`;
        }
        
        return `// 验证 Base64 数据
const base64Value = "${value}";
const decoded = atob(base64Value);
console.log('Base64 值:', base64Value);
console.log('解码结果:', decoded);`;
    }
    
    /**
     * 最小化控制面板
     */
    minimizeControlPanel() {
        const controlPanel = document.getElementById('control-panel');
        if (controlPanel) {
            controlPanel.classList.add('minimized');
        }
    }

    /**
     * 复制验证代码到剪贴板
     */
    copyToClipboard() {
        const codeElement = document.getElementById('verify-code');
        if (!codeElement) return;
        
        const code = codeElement.textContent;
        this.copyTextToClipboard(code, '验证代码已复制到剪贴板');
    }

    /**
     * 复制控制台代码到剪贴板
     */
    copyConsoleCode() {
        const consoleCodeElement = document.querySelector('.console-code code');
        if (!consoleCodeElement) return;
        
        const code = consoleCodeElement.textContent;
        this.copyTextToClipboard(code, '控制台代码已复制到剪贴板');
    }

    /**
     * 通用复制文本到剪贴板方法
     */
    copyTextToClipboard(text, successMessage) {
        if (navigator.clipboard && window.isSecureContext) {
            // 使用现代 Clipboard API
            navigator.clipboard.writeText(text).then(() => {
                this.showCopyFeedback(successMessage, 'success');
            }).catch(err => {
                console.error('复制失败:', err);
                this.fallbackCopyTextToClipboard(text, successMessage);
            });
        } else {
            // 回退到传统方法
            this.fallbackCopyTextToClipboard(text, successMessage);
        }
    }

    /**
     * 回退复制方法
     */
    fallbackCopyTextToClipboard(text, successMessage) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                this.showCopyFeedback(successMessage, 'success');
            } else {
                this.showCopyFeedback('复制失败，请手动复制', 'error');
            }
        } catch (err) {
            console.error('复制失败:', err);
            this.showCopyFeedback('复制失败，请手动复制', 'error');
        } finally {
            document.body.removeChild(textArea);
        }
    }

    /**
     * 显示复制反馈
     */
    showCopyFeedback(message, type) {
        // 创建反馈提示
        const feedback = document.createElement('div');
        feedback.className = `copy-feedback ${type}`;
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            border-radius: 4px;
            color: white;
            font-size: 14px;
            z-index: 10000;
            transition: all 0.3s ease;
            ${type === 'success' ? 'background: #28a745;' : 'background: #dc3545;'}
        `;
        
        document.body.appendChild(feedback);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.style.opacity = '0';
                feedback.style.transform = 'translateY(-20px)';
                setTimeout(() => {
                    document.body.removeChild(feedback);
                }, 300);
            }
        }, 3000);
    }
    
    /**
     * 运行浮动验证
     */
    async runFloatingVerification(floatingDiv, fullValue, dataType) {
        const resultElement = floatingDiv.querySelector('#floating-verify-result');
        if (!resultElement) return;
        
        resultElement.innerHTML = '<div class="alert alert-info">验证中...</div>';
        
        try {
            if (dataType === 'hash') {
                // 验证哈希值
                const originalData = this.currentConfig.DefStr + this.currentConfig.chainDefinition;
                const expectedHash = fullValue;
                
                const hexHash = await Crypto.sha256(originalData);
                const hashBytes = new Uint8Array(hexHash.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
                const actualHash = btoa(String.fromCharCode.apply(null, hashBytes));
                
                const isValid = actualHash === expectedHash;
                
                resultElement.innerHTML = `
                    <div class="alert alert-${isValid ? 'success' : 'danger'}">
                        <strong>验证结果:</strong> ${isValid ? '✓ 验证通过' : '✗ 验证失败'}<br>
                        <small>期望: ${expectedHash}</small><br>
                        <small>实际: ${actualHash}</small>
                    </div>
                `;
            } else {
                // 验证Base64数据
                const decoded = atob(fullValue);
                resultElement.innerHTML = `
                    <div class="alert alert-success">
                        <strong>Base64解码结果:</strong><br>
                        <code>${decoded}</code>
                    </div>
                `;
            }
        } catch (error) {
            resultElement.innerHTML = `
                <div class="alert alert-danger">
                    <strong>验证失败:</strong> ${error.message}
                </div>
            `;
        }
    }

    /**
     * 更新用户选择列表
     */
    updateUserList(users) {
        const attackUser = document.getElementById('attack-user');
        if (!attackUser || !users) return;
        
        attackUser.innerHTML = '<option value="">选择用户</option>';
        
        try {
            // 检查 users 是否是 Map 对象
            if (users instanceof Map) {
                for (const [userId, user] of users) {
                    const option = document.createElement('option');
                    option.value = userId;
                    option.textContent = `${userId} (资产: ${user.totalAssets || 0})`;
                    attackUser.appendChild(option);
                }
            } else if (Array.isArray(users)) {
                // 如果是数组
                users.forEach((user, index) => {
                    const option = document.createElement('option');
                    option.value = user.id || `user${index}`;
                    option.textContent = `${user.id || `user${index}`} (资产: ${user.totalAssets || 0})`;
                    attackUser.appendChild(option);
                });
            } else if (typeof users === 'object') {
                // 如果是普通对象
                Object.entries(users).forEach(([userId, user]) => {
                    const option = document.createElement('option');
                    option.value = userId;
                    option.textContent = `${userId} (资产: ${user.totalAssets || 0})`;
                    attackUser.appendChild(option);
                });
            } else {
                console.warn('updateUserList: users 参数格式不正确', users);
            }
        } catch (error) {
            console.error('更新用户列表失败:', error);
        }
    }
}