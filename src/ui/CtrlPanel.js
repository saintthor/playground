/**
 * CtrlPanel - 控制面板
 * 负责系统控制、网络参数设置、区块链定义编辑等功能
 */
export class CtrlPanel {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.app = uiManager.app;
        this.isInitialized = false;
        
        // 默认配置
        this.defaultConfig = {
            nodeCount: 5,
            userCount: 10,
            maxConnections: 3,
            failureRate: 0.1,
            paymentRate: 0.2,
            tickInterval: 1000,
            chainDefinition: `# 区块链定义示例
# 格式: 序列号范围 面值
1-100 1
101-200 5
201-250 10
251-300 20`
        };
        
        this.currentConfig = { ...this.defaultConfig };
        this.systemState = 'stopped'; // stopped, running, paused
    }

    /**
     * 初始化控制面板
     */
    init() {
        try {
            this.renderControlButtons();
            this.renderNetworkSettings();
            this.renderChainDefinition();
            this.renderRuntimeControls();
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('CtrlPanel 初始化完成');
        } catch (error) {
            console.error('CtrlPanel 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 渲染控制按钮
     */
    renderControlButtons() {
        const controlButtonsContainer = document.querySelector('#system-controls .control-buttons');
        if (!controlButtonsContainer) {
            throw new Error('控制按钮容器未找到');
        }

        controlButtonsContainer.innerHTML = `
            <button id="btn-start" class="btn btn-success" ${this.systemState !== 'stopped' ? 'disabled' : ''}>
                开始
            </button>
            <button id="btn-pause" class="btn btn-warning" ${this.systemState !== 'running' ? 'disabled' : ''}>
                ${this.systemState === 'paused' ? '继续' : '暂停'}
            </button>
            <button id="btn-stop" class="btn btn-danger" ${this.systemState === 'stopped' ? 'disabled' : ''}>
                结束
            </button>
        `;
    }

    /**
     * 渲染网络参数设置
     */
    renderNetworkSettings() {
        const settingsContainer = document.querySelector('#network-settings .settings-form');
        if (!settingsContainer) {
            throw new Error('网络设置容器未找到');
        }

        const isRunning = this.systemState !== 'stopped';
        
        settingsContainer.innerHTML = `
            <div class="form-group">
                <label class="form-label" for="node-count">节点数量</label>
                <input type="number" id="node-count" class="form-control" 
                       value="${this.currentConfig.nodeCount}" 
                       min="2" max="20" ${isRunning ? 'disabled' : ''}>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="user-count">虚拟用户数量</label>
                <input type="number" id="user-count" class="form-control" 
                       value="${this.currentConfig.userCount}" 
                       min="2" max="50" ${isRunning ? 'disabled' : ''}>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="max-connections">最大连接数</label>
                <input type="number" id="max-connections" class="form-control" 
                       value="${this.currentConfig.maxConnections}" 
                       min="1" max="10">
            </div>
            
            <div class="form-group">
                <label class="form-label" for="failure-rate">连接故障率 (%)</label>
                <input type="range" id="failure-rate" class="form-control" 
                       value="${this.currentConfig.failureRate * 100}" 
                       min="0" max="50" step="1">
                <small class="text-muted">当前: ${(this.currentConfig.failureRate * 100).toFixed(0)}%</small>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="payment-rate">支付速率 (%)</label>
                <input type="range" id="payment-rate" class="form-control" 
                       value="${this.currentConfig.paymentRate * 100}" 
                       min="0" max="100" step="5">
                <small class="text-muted">当前: ${(this.currentConfig.paymentRate * 100).toFixed(0)}%</small>
            </div>
        `;
    }

    /**
     * 渲染区块链定义编辑器
     */
    renderChainDefinition() {
        const chainDefContainer = document.querySelector('#chain-definition .chain-def-editor');
        if (!chainDefContainer) {
            throw new Error('区块链定义容器未找到');
        }

        const isRunning = this.systemState !== 'stopped';
        
        chainDefContainer.innerHTML = `
            <div class="form-group">
                <label class="form-label" for="chain-def-text">区块链定义</label>
                <textarea id="chain-def-text" class="form-control" rows="6" 
                          ${isRunning ? 'disabled' : ''}
                          placeholder="输入区块链定义...">${this.currentConfig.chainDefinition}</textarea>
                <small class="text-muted">格式: 序列号范围 面值 (例: 1-100 1)</small>
            </div>
            
            <div class="d-flex gap-2">
                <button id="btn-validate-def" class="btn btn-secondary btn-sm" ${isRunning ? 'disabled' : ''}>
                    验证定义
                </button>
                <button id="btn-reset-def" class="btn btn-secondary btn-sm" ${isRunning ? 'disabled' : ''}>
                    重置为默认
                </button>
            </div>
            
            <div id="def-validation-result" class="mt-2"></div>
        `;
    }

    /**
     * 渲染运行时控制
     */
    renderRuntimeControls() {
        const runtimeContainer = document.querySelector('#runtime-controls .runtime-settings');
        if (!runtimeContainer) {
            throw new Error('运行时控制容器未找到');
        }

        // 计算滑块值（3秒到无限制的映射）
        const tickSliderValue = this.getTickSliderValue(this.currentConfig.tickInterval);
        const tickDisplayText = this.getTickDisplayText(this.currentConfig.tickInterval);

        runtimeContainer.innerHTML = `
            <div class="form-group">
                <label class="form-label" for="tick-interval-slider">滴答时间控制</label>
                <input type="range" id="tick-interval-slider" class="form-control" 
                       value="${tickSliderValue}" 
                       min="0" max="100" step="1">
                <small class="text-muted">当前: ${tickDisplayText}</small>
                <div class="tick-range-labels">
                    <span class="range-label-left">3秒</span>
                    <span class="range-label-right">无限制</span>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">运行时参数调整</label>
                <div class="runtime-params">
                    <div class="param-row">
                        <label class="param-label" for="runtime-max-connections">最大连接数</label>
                        <input type="number" id="runtime-max-connections" class="form-control param-input" 
                               value="${this.currentConfig.maxConnections}" 
                               min="1" max="10" ${this.systemState === 'stopped' ? 'disabled' : ''}>
                    </div>
                    <div class="param-row">
                        <label class="param-label" for="runtime-failure-rate">连接故障率 (%)</label>
                        <input type="range" id="runtime-failure-rate" class="form-control param-slider" 
                               value="${this.currentConfig.failureRate * 100}" 
                               min="0" max="50" step="1" ${this.systemState === 'stopped' ? 'disabled' : ''}>
                        <small class="param-value">${(this.currentConfig.failureRate * 100).toFixed(0)}%</small>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">分叉攻击模拟</label>
                <div class="attack-controls">
                    <select id="attack-user" class="form-control" ${this.systemState !== 'running' ? 'disabled' : ''}>
                        <option value="">选择攻击者</option>
                        <!-- 用户选项将动态添加 -->
                    </select>
                    <select id="attack-target-chain" class="form-control" ${this.systemState !== 'running' ? 'disabled' : ''}>
                        <option value="">选择目标区块链</option>
                        <!-- 区块链选项将动态添加 -->
                    </select>
                    <button id="btn-simulate-attack" class="btn btn-danger btn-sm" ${this.systemState !== 'running' ? 'disabled' : ''}>
                        模拟分叉攻击
                    </button>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">系统状态</label>
                <div class="system-status">
                    <span class="status-indicator status-${this.systemState}"></span>
                    <span class="status-text">${this.getStatusText()}</span>
                    <div class="status-details">
                        <small class="text-muted">滴答数: <span id="current-tick">0</span></small>
                        <small class="text-muted">运行时间: <span id="runtime">0s</span></small>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 控制按钮事件
        document.getElementById('btn-start')?.addEventListener('click', () => this.handleStart());
        document.getElementById('btn-pause')?.addEventListener('click', () => this.handlePause());
        document.getElementById('btn-stop')?.addEventListener('click', () => this.handleStop());

        // 网络参数变化事件
        document.getElementById('node-count')?.addEventListener('change', (e) => {
            this.currentConfig.nodeCount = parseInt(e.target.value);
        });
        
        document.getElementById('user-count')?.addEventListener('change', (e) => {
            this.currentConfig.userCount = parseInt(e.target.value);
        });
        
        document.getElementById('max-connections')?.addEventListener('input', (e) => {
            this.currentConfig.maxConnections = parseInt(e.target.value);
            this.notifyConfigChange('maxConnections', this.currentConfig.maxConnections);
        });
        
        document.getElementById('failure-rate')?.addEventListener('input', (e) => {
            this.currentConfig.failureRate = parseFloat(e.target.value) / 100;
            this.updateRangeDisplay('failure-rate', this.currentConfig.failureRate * 100, '%');
            this.notifyConfigChange('failureRate', this.currentConfig.failureRate);
        });
        
        document.getElementById('payment-rate')?.addEventListener('input', (e) => {
            this.currentConfig.paymentRate = parseFloat(e.target.value) / 100;
            this.updateRangeDisplay('payment-rate', this.currentConfig.paymentRate * 100, '%');
            this.notifyConfigChange('paymentRate', this.currentConfig.paymentRate);
        });

        // 区块链定义事件
        document.getElementById('chain-def-text')?.addEventListener('input', (e) => {
            this.currentConfig.chainDefinition = e.target.value;
        });
        
        document.getElementById('btn-validate-def')?.addEventListener('click', () => this.validateChainDefinition());
        document.getElementById('btn-reset-def')?.addEventListener('click', () => this.resetChainDefinition());

        // 运行时控制事件
        document.getElementById('tick-interval-slider')?.addEventListener('input', (e) => {
            const sliderValue = parseInt(e.target.value);
            const tickInterval = this.getTickIntervalFromSlider(sliderValue);
            this.currentConfig.tickInterval = tickInterval;
            
            const displayText = this.getTickDisplayText(tickInterval);
            this.updateTickSliderDisplay(displayText);
            this.notifyConfigChange('tickInterval', tickInterval);
        });
        
        // 运行时参数调整事件
        document.getElementById('runtime-max-connections')?.addEventListener('input', (e) => {
            this.currentConfig.maxConnections = parseInt(e.target.value);
            this.notifyConfigChange('maxConnections', this.currentConfig.maxConnections);
        });
        
        document.getElementById('runtime-failure-rate')?.addEventListener('input', (e) => {
            this.currentConfig.failureRate = parseFloat(e.target.value) / 100;
            this.updateRuntimeParamDisplay('runtime-failure-rate', this.currentConfig.failureRate * 100, '%');
            this.notifyConfigChange('failureRate', this.currentConfig.failureRate);
        });
        
        document.getElementById('btn-simulate-attack')?.addEventListener('click', () => this.handleSimulateAttack());
    }

    /**
     * 处理开始按钮
     */
    handleStart() {
        try {
            // 验证配置
            this.validateConfiguration();
            
            // 通知应用开始
            if (this.app && this.app.start) {
                this.app.start(this.currentConfig);
            }
            
            this.systemState = 'running';
            this.updateUI();
            
            console.log('系统启动', this.currentConfig);
        } catch (error) {
            console.error('启动失败:', error);
            alert(`启动失败: ${error.message}`);
        }
    }

    /**
     * 处理暂停/继续按钮
     */
    handlePause() {
        try {
            if (this.systemState === 'running') {
                // 暂停
                if (this.app && this.app.pause) {
                    this.app.pause();
                }
                this.systemState = 'paused';
                console.log('系统暂停');
            } else if (this.systemState === 'paused') {
                // 继续
                if (this.app && this.app.resume) {
                    this.app.resume();
                }
                this.systemState = 'running';
                console.log('系统继续');
            }
            
            this.updateUI();
        } catch (error) {
            console.error('暂停/继续操作失败:', error);
            alert(`操作失败: ${error.message}`);
        }
    }

    /**
     * 处理结束按钮
     */
    handleStop() {
        try {
            // 通知应用停止
            if (this.app && this.app.stop) {
                this.app.stop();
            }
            
            this.systemState = 'stopped';
            this.updateUI();
            
            console.log('系统停止');
        } catch (error) {
            console.error('停止失败:', error);
            alert(`停止失败: ${error.message}`);
        }
    }

    /**
     * 处理分叉攻击模拟
     */
    handleSimulateAttack() {
        const attackUserSelect = document.getElementById('attack-user');
        const attackUser = attackUserSelect?.value;
        if (!attackUser) {
            alert('请选择攻击者');
            return;
        }

        try {
            // 通知应用执行攻击
            if (this.app && this.app.simulateAttack) {
                this.app.simulateAttack(attackUser);
            }
            
            console.log('模拟分叉攻击:', attackUser);
        } catch (error) {
            console.error('攻击模拟失败:', error);
            alert(`攻击模拟失败: ${error.message}`);
        }
    }

    /**
     * 验证区块链定义
     */
    validateChainDefinition() {
        const resultContainer = document.getElementById('def-validation-result');
        if (!resultContainer) return;

        try {
            const definition = this.currentConfig.chainDefinition;
            const result = this.parseChainDefinition(definition);
            
            resultContainer.innerHTML = `
                <div class="alert alert-success">
                    <strong>验证成功!</strong><br>
                    共定义 ${result.ranges.length} 个范围，总计 ${result.totalCount} 个区块链
                </div>
            `;
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
        const lines = definition.split('\n').filter(line => 
            line.trim() && !line.trim().startsWith('#')
        );
        
        const ranges = [];
        let totalCount = 0;
        
        for (const line of lines) {
            const match = line.trim().match(/^(\d+)-(\d+)\s+(\d+(?:\.\d+)?)$/);
            if (!match) {
                throw new Error(`无效的定义行: ${line}`);
            }
            
            const start = parseInt(match[1]);
            const end = parseInt(match[2]);
            const value = parseFloat(match[3]);
            
            if (start > end) {
                throw new Error(`无效的范围: ${start}-${end}`);
            }
            
            ranges.push({ start, end, value });
            totalCount += (end - start + 1);
        }
        
        // 检查范围重叠
        ranges.sort((a, b) => a.start - b.start);
        for (let i = 1; i < ranges.length; i++) {
            if (ranges[i].start <= ranges[i-1].end) {
                throw new Error(`范围重叠: ${ranges[i-1].start}-${ranges[i-1].end} 和 ${ranges[i].start}-${ranges[i].end}`);
            }
        }
        
        return { ranges, totalCount };
    }

    /**
     * 重置区块链定义
     */
    resetChainDefinition() {
        this.currentConfig.chainDefinition = this.defaultConfig.chainDefinition;
        const textarea = document.getElementById('chain-def-text');
        if (textarea) {
            textarea.value = this.currentConfig.chainDefinition;
        }
        
        // 清除验证结果
        const resultContainer = document.getElementById('def-validation-result');
        if (resultContainer) {
            resultContainer.innerHTML = '';
        }
    }

    /**
     * 验证配置
     */
    validateConfiguration() {
        // 验证网络参数
        if (this.currentConfig.nodeCount < 2) {
            throw new Error('节点数量至少为2');
        }
        
        if (this.currentConfig.userCount < 2) {
            throw new Error('虚拟用户数量至少为2');
        }
        
        if (this.currentConfig.maxConnections < 1) {
            throw new Error('最大连接数至少为1');
        }
        
        // 验证区块链定义
        this.parseChainDefinition(this.currentConfig.chainDefinition);
    }

    /**
     * 更新滑块显示
     */
    updateRangeDisplay(elementId, value, unit) {
        const element = document.getElementById(elementId);
        if (element) {
            const small = element.parentElement.querySelector('small');
            if (small) {
                small.textContent = `当前: ${Math.round(value)}${unit}`;
            }
        }
    }

    /**
     * 通知配置变化
     */
    notifyConfigChange(key, value) {
        if (this.app && this.app.updateConfig) {
            this.app.updateConfig(key, value);
        }
    }

    /**
     * 获取状态文本
     */
    getStatusText() {
        switch (this.systemState) {
            case 'stopped': return '已停止';
            case 'running': return '运行中';
            case 'paused': return '已暂停';
            default: return '未知状态';
        }
    }

    /**
     * 更新用户选择列表
     */
    updateUserList(users) {
        const attackUserSelect = document.getElementById('attack-user');
        if (!attackUserSelect) return;

        attackUserSelect.innerHTML = '<option value="">选择攻击者</option>';
        
        if (users && users.length > 0) {
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `用户 ${user.id} (${user.publicKey.substring(0, 8)}...)`;
                attackUserSelect.appendChild(option);
            });
        }
    }

    /**
     * 更新整个UI
     */
    updateUI() {
        this.renderControlButtons();
        this.renderNetworkSettings();
        this.renderChainDefinition();
        this.renderRuntimeControls();
        this.setupEventListeners();
    }

    /**
     * 获取当前配置
     */
    getConfig() {
        return { ...this.currentConfig };
    }

    /**
     * 设置系统状态
     */
    setSystemState(state) {
        this.systemState = state;
        this.updateUI();
    }

    /**
     * 获取滑块值（将滴答间隔映射到0-100的滑块值）
     * 3秒(3000ms) -> 0, 无限制(0ms) -> 100
     */
    getTickSliderValue(tickInterval) {
        if (tickInterval <= 0) return 100; // 无限制
        if (tickInterval >= 3000) return 0; // 3秒
        
        // 使用对数映射来提供更好的用户体验
        // 将3000ms到1ms映射到0-100
        const minMs = 1;
        const maxMs = 3000;
        const logMin = Math.log(minMs);
        const logMax = Math.log(maxMs);
        const logValue = Math.log(Math.max(minMs, tickInterval));
        
        // 反转映射：较大的间隔对应较小的滑块值
        return Math.round(100 - ((logValue - logMin) / (logMax - logMin)) * 100);
    }

    /**
     * 从滑块值获取滴答间隔
     * 0 -> 3000ms, 100 -> 0ms (无限制)
     */
    getTickIntervalFromSlider(sliderValue) {
        if (sliderValue >= 100) return 0; // 无限制
        if (sliderValue <= 0) return 3000; // 3秒
        
        // 使用对数映射
        const minMs = 1;
        const maxMs = 3000;
        const logMin = Math.log(minMs);
        const logMax = Math.log(maxMs);
        
        // 反转映射：较大的滑块值对应较小的间隔
        const normalizedValue = (100 - sliderValue) / 100;
        const logValue = logMin + normalizedValue * (logMax - logMin);
        
        return Math.round(Math.exp(logValue));
    }

    /**
     * 获取滴答时间的显示文本
     */
    getTickDisplayText(tickInterval) {
        if (tickInterval <= 0) {
            return '无限制';
        } else if (tickInterval >= 1000) {
            return `${(tickInterval / 1000).toFixed(1)}秒`;
        } else {
            return `${tickInterval}毫秒`;
        }
    }

    /**
     * 更新滴答滑块显示
     */
    updateTickSliderDisplay(displayText) {
        const slider = document.getElementById('tick-interval-slider');
        if (slider) {
            const small = slider.parentElement.querySelector('small');
            if (small) {
                small.textContent = `当前: ${displayText}`;
            }
        }
    }

    /**
     * 更新运行时参数显示
     */
    updateRuntimeParamDisplay(elementId, value, unit) {
        const element = document.getElementById(elementId);
        if (element) {
            const paramValue = element.parentElement.querySelector('.param-value');
            if (paramValue) {
                paramValue.textContent = `${Math.round(value)}${unit}`;
            }
        }
    }

    /**
     * 更新区块链选择列表
     */
    updateChainList(blockchains) {
        const attackChainSelect = document.getElementById('attack-target-chain');
        if (!attackChainSelect) return;

        attackChainSelect.innerHTML = '<option value="">选择目标区块链</option>';
        
        if (blockchains && blockchains.length > 0) {
            blockchains.forEach(chain => {
                const option = document.createElement('option');
                option.value = chain.id;
                option.textContent = `区块链 ${chain.id.substring(0, 8)}... (面值: ${chain.value})`;
                attackChainSelect.appendChild(option);
            });
        }
    }

    /**
     * 更新系统状态显示
     */
    updateSystemStatus(statusData) {
        const currentTickElement = document.getElementById('current-tick');
        const runtimeElement = document.getElementById('runtime');
        
        if (currentTickElement && statusData.currentTick !== undefined) {
            currentTickElement.textContent = statusData.currentTick;
        }
        
        if (runtimeElement && statusData.runtime !== undefined) {
            const runtimeSeconds = Math.floor(statusData.runtime / 1000);
            const minutes = Math.floor(runtimeSeconds / 60);
            const seconds = runtimeSeconds % 60;
            
            if (minutes > 0) {
                runtimeElement.textContent = `${minutes}分${seconds}秒`;
            } else {
                runtimeElement.textContent = `${seconds}秒`;
            }
        }
    }

    /**
     * 处理分叉攻击模拟（增强版）
     */
    handleSimulateAttack() {
        const attackUserSelect = document.getElementById('attack-user');
        const attackChainSelect = document.getElementById('attack-target-chain');
        
        const attackUser = attackUserSelect?.value;
        const targetChain = attackChainSelect?.value;
        
        if (!attackUser) {
            alert('请选择攻击者');
            return;
        }

        try {
            // 通知应用执行攻击
            if (this.app && this.app.simulateAttack) {
                this.app.simulateAttack(attackUser, targetChain);
            }
            
            console.log('模拟分叉攻击:', { attackUser, targetChain });
            
            // 显示攻击确认信息
            const attackInfo = targetChain ? 
                `用户 ${attackUser} 对区块链 ${targetChain.substring(0, 8)}... 发起分叉攻击` :
                `用户 ${attackUser} 发起随机分叉攻击`;
            
            // 可以在这里添加攻击日志或状态更新
            console.log('攻击信息:', attackInfo);
            
        } catch (error) {
            console.error('攻击模拟失败:', error);
            alert(`攻击模拟失败: ${error.message}`);
        }
    }

    /**
     * 启用/禁用运行时控制
     */
    setRuntimeControlsEnabled(enabled) {
        const runtimeControls = [
            'tick-interval-slider',
            'runtime-max-connections', 
            'runtime-failure-rate',
            'attack-user',
            'attack-target-chain',
            'btn-simulate-attack'
        ];
        
        runtimeControls.forEach(controlId => {
            const element = document.getElementById(controlId);
            if (element) {
                element.disabled = !enabled;
            }
        });
    }

    /**
     * 获取运行时控制状态
     */
    getRuntimeControlsState() {
        return {
            tickInterval: this.currentConfig.tickInterval,
            maxConnections: this.currentConfig.maxConnections,
            failureRate: this.currentConfig.failureRate,
            systemState: this.systemState,
            tickSliderValue: this.getTickSliderValue(this.currentConfig.tickInterval),
            tickDisplayText: this.getTickDisplayText(this.currentConfig.tickInterval)
        };
    }

    /**
     * 重置运行时控制到默认值
     */
    resetRuntimeControls() {
        this.currentConfig.tickInterval = this.defaultConfig.tickInterval;
        this.currentConfig.maxConnections = this.defaultConfig.maxConnections;
        this.currentConfig.failureRate = this.defaultConfig.failureRate;
        
        // 重新渲染运行时控制部分
        this.renderRuntimeControls();
        this.setupEventListeners();
        
        console.log('运行时控制已重置为默认值');
    }

    /**
     * 销毁控制面板
     */
    destroy() {
        // 移除事件监听器会在重新渲染时自动处理
        this.isInitialized = false;
        console.log('CtrlPanel 已销毁');
    }
}