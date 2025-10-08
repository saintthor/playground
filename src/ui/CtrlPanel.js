/**
 * CtrlPanel - Control Panel
 * Responsible for system control, parameter settings, and blockchain definition management.
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
            this.InitDefHash();
            this.isInitialized = true;
            console.log('CtrlPanel initialized');
        } catch (error) {
            console.error('CtrlPanel initialization failed:', error);
        }
    }

    async InitDefHash() {
        const DefStr = GetText('chain_def0') + this.app.SysUser.Id + GetText('chain_def1');
        const hexHash = await Crypto.sha256( DefStr + this.currentConfig.chainDefinition );
        const hashBytes = new Uint8Array( hexHash.match( /.{1,2}/g ).map( byte => parseInt( byte, 16 )));
        this.app.ChainDefHash = btoa( String.fromCharCode.apply( null, hashBytes ));
        this.app.TreeDefHash = ABuff2Base64( await Hash( GetText( 'tree_def' ), 'SHA-256' ));
    }

    render() {
        const controlPanel = document.getElementById('control-panel');
        if (!controlPanel) return;

        const systemControls = controlPanel.querySelector('#system-controls .control-buttons');
        const networkSettings = controlPanel.querySelector('#network-settings .settings-form');
        const chainDefinition = controlPanel.querySelector('#chain-definition .chain-def-editor');
        const treeDefinition = controlPanel.querySelector('#tree-definition .tree-def');
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

        if( treeDefinition )
        {
            this.renderTreeDef( treeDefinition );
        }
        
        if (runtimeControls) {
            this.renderRuntimeControls(runtimeControls);
        }
    }

    renderSystemControls(container) {
        container.innerHTML = `
            <button class="btn btn-success" id="start-btn" data-text="start_system">${GetText('start_system')}</button>
            <button class="btn btn-warning" id="pause-btn" disabled data-text="pause_system">${GetText('pause_system')}</button>
            <button class="btn btn-danger" id="stop-btn" disabled data-text="stop_system">${GetText('stop_system')}</button>
            <div class="system-controls-header">
                <button class="help-icon" data-help="systemctrls" title="${GetText('view_help')}">${GetText('help_icon')}</button>
            </div>
        `;
    }

    renderNetworkSettings(container) {
        container.innerHTML = `
            <div class="form-group inline-input">
                <label class="form-label">
                    <span data-text="node_count">${GetText('node_count')}</span>
                </label>
                <input type="number" class="form-control" id="node-count" value="${this.currentConfig.nodeCount}" min="1" max="100">
                <button class="help-icon" data-help="networksettings" title="${GetText('view_help')}">${GetText('help_icon')}</button>
            </div>
            
            <div class="form-group inline-input">
                <label class="form-label">
                    <span data-text="user_count">${GetText('user_count')}</span>
                </label>
                <input type="number" class="form-control" id="user-count" value="${this.currentConfig.userCount}" min="1" max="1000">
                <button class="help-icon" data-help="networksettings" title="${GetText('view_help')}">${GetText('help_icon')}</button>
            </div>
            
            <div class="form-group inline-input">
                <label class="form-label">
                    <span data-text="max_connections">${GetText('max_connections')}</span>
                </label>
                <input type="number" class="form-control" id="max-connections" value="${this.currentConfig.maxConnections}" min="1" max="20">
                <button class="help-icon" data-help="networksettings" title="${GetText('view_help')}">${GetText('help_icon')}</button>
            </div>
            
            <div class="form-group inline-input">
                <label class="form-label">
                    <span data-text="user_node_connections">${GetText('user_node_connections')}</span>
                </label>
                <input type="number" class="form-control" id="userNodeNum" value="${this.currentConfig.userNodeNum}" min="1" max="5">
                <button class="help-icon" data-help="networksettings" title="${GetText('view_help')}">${GetText('help_icon')}</button>
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    <span data-text="failure_rate_percent">${GetText('failure_rate_percent')}</span>
                    <button class="help-icon" data-help="networksettings" title="${GetText('view_help')}">${GetText('help_icon')}</button>
                </label>
                <input type="range" class="form-control" id="failure-rate" value="${this.currentConfig.failureRate * 100}" min="0" max="50">
                <small class="text-muted" data-text-template="current_percent">${GetText('current')}: ${(this.currentConfig.failureRate * 100).toFixed(1)}%</small>
            </div>
        `;
    }

    renderChainDefinition(container) {
        const DefStr = GetText('chain_def0') + this.app.SysUser.Id + GetText('chain_def1');
        container.innerHTML = `
            <div class="form-group">
                <div style="font-size: smaller;">${DefStr.replace( '\n', '<br>' )}</div>
                <textarea class="form-control" id="chain-definition" rows="6">${this.currentConfig.chainDefinition}</textarea>
                <small class="text-muted">${GetText('chain_def2')}</small>
            </div>
            
            <div class="form-group">
                <button class="btn btn-primary" id="validate-definition">${GetText('verify_def')}</button>
                <button class="help-icon" data-help="blockchain-definition" title="help">?</button>
            </div>
            
            <div id="def-validation-result"></div>
        `;
    }

    renderTreeDef( container )
    {
        const DefStr = GetText( 'tree_def' );
        ( async () =>
        {
            const HashStr = ABuff2Base64( await Hash( DefStr, 'SHA-256' ));
            this.app.TreeDefHash = HashStr;
            container.innerHTML = `
                <div class="form-group">
                    <div style="font-size: smaller;">${ DefStr }</div>
                </div>
                <div id="tree-def-hash">
                    <b><div data-text="tree_def_hash">${ GetText( 'tree_def_hash' )}</div></b>
                    <div>${ HashStr }</div>
                </div>
            `;
        } )();
    }

    renderRuntimeControls(container) {
        const defaultLogValue = this.timeToLogScale(1000);

        container.innerHTML = `
            <div class="form-group">
                <label class="form-label">
                    ${GetText('tick_interval')}
                    <button class="help-icon" data-help="runtimectrls" title="help">?</button>
                </label>
                <input type="range" class="form-control" id="tick-interval" value="${defaultLogValue}" min="0" max="100" step="1">
                <small class="text-muted">${GetText('current')}: 1.0 ${GetText('seconds')}</small>
            </div>
        `;
    }

    setupEventListeners() {
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const stopBtn = document.getElementById('stop-btn');

        if (startBtn) startBtn.addEventListener('click', () => this.handleStart());
        if (pauseBtn) pauseBtn.addEventListener('click', () => this.handlePause());
        if (stopBtn) stopBtn.addEventListener('click', () => this.handleStop());

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

        const chainDefinition = document.getElementById('chain-definition');
        const validateBtn = document.getElementById('validate-definition');

        if (chainDefinition) chainDefinition.addEventListener('change', (e) => this.updateConfig('chainDefinition', e.target.value));
        if (validateBtn) validateBtn.addEventListener('click', () => this.validateChainDefinition());

        const tickInterval = document.getElementById('tick-interval');
        const triggerAttack = document.getElementById('trigger-attack');

        if (tickInterval) tickInterval.addEventListener('input', (e) => this.updateTickInterval(e.target.value));
        if (triggerAttack) triggerAttack.addEventListener('click', () => this.triggerAttack());

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
        console.log('Starting system');
        if (this.app && this.app.start) {
            this.app.start(this.currentConfig);
        }

        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const stopBtn = document.getElementById('stop-btn');

        if (startBtn) startBtn.disabled = true;
        if (pauseBtn) pauseBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = false;

        this.hideConfigurationSections();

        this.minimizeControlPanel();
        
        this.expandLogPanel();
    }

    handlePause() {
        console.log('Pausing/resuming system');
        const pauseBtn = document.getElementById('pause-btn');

        if (this.app && this.app.isPaused !== undefined) {
            if (this.app.isPaused) {
                if (this.app.resume) {
                    this.app.resume();
                }
                if (pauseBtn) {
                    pauseBtn.textContent = GetText('pause_system');
                    pauseBtn.setAttribute('data-text', 'pause_system');
                    pauseBtn.className = 'btn btn-warning';
                }
            } else {
                if (this.app.pause) {
                    this.app.pause();
                }
                if (pauseBtn) {
                    pauseBtn.textContent = GetText('resume');
                    pauseBtn.setAttribute('data-text', 'resume');
                    pauseBtn.className = 'btn btn-success';
                }
            }
        }
    }

    handleStop() {
        console.log('Stopping system');
        if (this.app && this.app.stop) {
            this.app.stop();
        }

        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const stopBtn = document.getElementById('stop-btn');

        if (startBtn) startBtn.disabled = false;
        if (pauseBtn) pauseBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = true;

        this.showConfigurationSections();
    }

    updateConfig(key, value) {
        this.currentConfig[key] = value;
        console.log('Configuration updated:', key, value);
    }

    updateFailureRate(value) {
        const rate = parseFloat(value) / 100;
        this.currentConfig.failureRate = rate;

        const small = document.querySelector('#failure-rate + small');
        if (small) {
            small.textContent = `${GetText('current')}: ${value}%`;
        }
    }

    updatePaymentRate(value) {
        const rate = parseFloat(value) / 100;
        this.currentConfig.paymentRate = rate;

        const small = document.querySelector('#payment-rate + small');
        if (small) {
            small.textContent = `${GetText('current')}: ${value}%`;
        }
    }

    /**
     * Shows help information.
     * @param {string} section - The help section ID.
     */
    showHelp(section) {
        try {
            if (this.app && this.app.uiManager && this.app.uiManager.panels &&
                this.app.uiManager.panels.main && this.app.uiManager.panels.main.tabManager &&
                this.app.uiManager.panels.main.tabManager.helpTabContent) {

                const helpTabContent = this.app.uiManager.panels.main.tabManager.helpTabContent;
                helpTabContent.showHelpSection(section);

                console.log('Showing help section:', section);
            } else {
                console.warn('Cannot access help system');
            }
        } catch (error) {
            console.error('Failed to show help:', error);
        }
    }

    /**
     * Hides configuration sections.
     */
    hideConfigurationSections()
    {
        ['network-settings', 'chain-definition', 'tree-definition'].forEach( domId =>
        {
            const dom = document.getElementById( domId );
            dom && ( dom.style.display = 'none' );
        } );

        console.log('Configuration sections hidden');
    }

    /**
     * Shows configuration sections.
     */
    showConfigurationSections()
    {
        ['network-settings', 'chain-definition', 'tree-definition'].forEach( domId =>
        {
            const dom = document.getElementById( domId );
            dom && ( dom.style.display = '' );
        } );

        console.log('Configuration sections shown');
    }

    /**
     * Converts a logarithmic scale value to actual time in milliseconds.
     * @param {number} logValue - The logarithmic scale value (0-100).
     * @returns {number} - The actual time in milliseconds.
     */
    logScaleToTime(logValue) {
        const minTime = 10;
        const maxTime = 3000;

        const ratio = Math.pow(maxTime / minTime, logValue / 100);
        return Math.round(minTime * ratio);
    }

    /**
     * Converts actual time in milliseconds to a logarithmic scale value.
     * @param {number} timeMs - The actual time in milliseconds.
     * @returns {number} - The logarithmic scale value (0-100).
     */
    timeToLogScale(timeMs) {
        const minTime = 10;
        const maxTime = 3000;

        const clampedTime = Math.max(minTime, Math.min(maxTime, timeMs));

        const logValue = 100 * Math.log(clampedTime / minTime) / Math.log(maxTime / minTime);
        return Math.round(logValue);
    }

    updateTickInterval(logValue) {
        const actualTime = this.logScaleToTime(parseInt(logValue));
        this.currentConfig.tickInterval = actualTime;

        const small = document.querySelector('#tick-interval + small');
        if (small) {
            if (actualTime < 1000) {
                small.textContent = `${GetText('current')}: ${actualTime}${GetText('milliseconds')}`;
            } else {
                small.textContent = `${GetText('current')}: ${(actualTime / 1000).toFixed(2)}${GetText('seconds')}`;
            }
        }

        if (this.app && this.app.updateTickInterval) {
            this.app.updateTickInterval(actualTime);
        }
    }

    triggerAttack() {
        const attackUser = document.getElementById('attack-user');
        if (!attackUser || !attackUser.value) {
            alert('Please select a user to attack');
            return;
        }

        console.log('Triggering fork attack:', attackUser.value);
        if (this.app && this.app.triggerAttack) {
            this.app.triggerAttack(attackUser.value);
        }
    }

    /**
     * Validates the blockchain definition.
     */
    async validateChainDefinition() {
        const resultContainer = document.getElementById('def-validation-result');
        if (!resultContainer) return;

        try {
            const definition = this.currentConfig.chainDefinition;
            const result = this.parseChainDefinition(definition);

            this.app.BlockChainNum = result.totalCount;

            let definitionHash;
            const DefStr = GetText('chain_def0') + this.app.SysUser.Id + GetText('chain_def1');
            const hexHash = await Crypto.sha256(DefStr + definition);
            const hashBytes = new Uint8Array(hexHash.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            definitionHash = btoa(String.fromCharCode.apply(null, hashBytes));

            this.updateValidationResult(result, definitionHash);
        } catch (error) {
            resultContainer.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Validation failed:</strong> ${error.message}
                </div>
            `;
        }
    }

    /**
     * Parses the blockchain definition.
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
                throw new Error(`Invalid definition format: ${trimmed}`);
            }

            const start = parseInt(match[1]);
            const end = parseInt(match[2]);
            const value = parseInt(match[3]);

            if (start > end) {
                throw new Error(`Start serial cannot be greater than end serial: ${trimmed}`);
            }

            const count = end - start + 1;
            ranges.push({ start, end, value, count });
            totalCount += count;
        }

        return { ranges, totalCount };
    }

    /**
     * Updates the validation result display.
     */
    updateValidationResult(result, definitionHash) {
        const resultContainer = document.getElementById('def-validation-result');
        if (!resultContainer) return;
        this.app.ChainDefHash = definitionHash;
        resultContainer.innerHTML = `
            <div class="alert alert-success">
                <strong>${GetText('validation_pass')}</strong><br>
                ${GetText('validation_pass0')} ${result.ranges.length} ${GetText('validation_pass1')} ${result.totalCount} ${GetText('validation_pass2')}<br>
                <strong>${GetText('validation_pass3')}:</strong> <code class="definition-hash base64-data" data-type="hash" data-full-value="${definitionHash}">${definitionHash}</code><br>
                <small class="text-muted">${GetText('validation_pass4')}</small>
            </div>
        `;

        this.setupHashHoverEvents();
    }

    /**
     * Sets up hash hover events.
     */
    setupHashHoverEvents() {
        const hashElements = document.querySelectorAll('.base64-data[data-type="hash"]');
        hashElements.forEach(element => {
            let hoverTimer = null;
            let floatingDiv = null;

            element.addEventListener('mouseenter', (e) => {
                if (hoverTimer) {
                    clearTimeout(hoverTimer);
                }

                hoverTimer = setTimeout(() => {
                    floatingDiv = this.showFloatingVerifyDiv(e.target);
                }, 1000);
            });

            element.addEventListener('mouseleave', (e) => {
                if (hoverTimer) {
                    clearTimeout(hoverTimer);
                    hoverTimer = null;
                }

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
     * Shows the floating verification div.
     */
    showFloatingVerifyDiv(element) {
        const fullValue = element.getAttribute('data-full-value');
        const dataType = element.getAttribute('data-type');

        if (!fullValue) return null;

        const floatingDiv = document.createElement('div');
        floatingDiv.className = 'hash-floating-verify';
        floatingDiv.innerHTML = `
            <div class="floating-verify-header">
                <span class="verify-type">${GetText('verify_data')}</span>
                <button class="floating-verify-close">&times;</button>
            </div>
            <div class="floating-verify-content">
                <div class="hash-display">
                    <label>${GetText('target_val')}:</label>
                    <code class="full-hash">${fullValue}</code>
                </div>
                <div class="verify-actions">
                    <button class="btn btn-sm btn-primary floating-copy-btn">${GetText('copy_code')}</button>
                    <button class="btn btn-sm btn-secondary floating-run-btn">${GetText('verify_here')}</button>
                </div>
                <div class="verify-result" id="floating-verify-result"></div>
                <div class="verify-code-preview">
                    <pre><code>${this.generateVerifyCode(fullValue, dataType)}</code></pre>
                </div>
            </div>
        `;

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

        setTimeout(() => {
            floatingDiv.style.opacity = '1';
            floatingDiv.style.transform = 'translateY(0)';
        }, 10);

        this.setupFloatingVerifyEvents(floatingDiv, fullValue, dataType);

        this.adjustFloatingPosition(floatingDiv);

        return floatingDiv;
    }

    /**
     * Hides the floating verification div.
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
     * Sets up floating verification events.
     */
    setupFloatingVerifyEvents(floatingDiv, fullValue, dataType) {
        const closeBtn = floatingDiv.querySelector('.floating-verify-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideFloatingVerifyDiv(floatingDiv);
            });
        }

        const copyBtn = floatingDiv.querySelector('.floating-copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const code = this.generateVerifyCode(fullValue, dataType);
                this.copyTextToClipboard(code, 'Verification code copied to clipboard');
            });
        }

        const runBtn = floatingDiv.querySelector('.floating-run-btn');
        if (runBtn) {
            runBtn.addEventListener('click', () => {
                this.runFloatingVerification(floatingDiv, fullValue, dataType);
            });
        }

        floatingDiv.addEventListener('mouseleave', () => {
            setTimeout(() => {
                if (!floatingDiv.matches(':hover')) {
                    this.hideFloatingVerifyDiv(floatingDiv);
                }
            }, 500);
        });
    }

    /**
     * Adjusts the floating div's position.
     */
    adjustFloatingPosition(floatingDiv) {
        const rect = floatingDiv.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (rect.right > viewportWidth - 20) {
            const newLeft = viewportWidth - rect.width - 20;
            floatingDiv.style.left = Math.max(20, newLeft) + 'px';
        }

        if (rect.bottom > viewportHeight - 20) {
            const newTop = viewportHeight - rect.height - 20;
            floatingDiv.style.top = Math.max(20, newTop) + 'px';
        }
    }

    /**
     * Generates verification code.
     */
    generateVerifyCode(value, type) {
        const DefStr = GetText('chain_def0') + this.app.SysUser.Id + GetText('chain_def1');
        if (type === 'hash') {
            return `
originalData = \`${DefStr.replace( /\\n/g, '\\\\n' ) + this.currentConfig.chainDefinition}\`;
expectedHash = "${value}";

(async function() {
    try {
        const hexHash = await Crypto.sha256(originalData);
        const hashBytes = new Uint8Array(hexHash.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const actualHash = btoa(String.fromCharCode.apply(null, hashBytes));
        
        console.log('Original:', originalData);
        console.log('Expected (base64):', expectedHash);
        console.log('Actual (base64):', actualHash);
        console.log('Result:', actualHash === expectedHash ? '✓ Passed' : '✗ Failed');
    } catch (error) {
        console.error('error:', error);
    }
})();`;
        }

        return `
const base64Value = "${value}";
const decoded = atob(base64Value);
console.log('Base64:', base64Value);
console.log('Result:', decoded);`;
    }

    /**
     * Minimizes the control panel.
     */
    minimizeControlPanel() {
        const controlPanel = document.getElementById('control-panel');
        if (controlPanel) {
            controlPanel.classList.add('minimized');
        }
    }

    /**
     * Expands the log panel.
     */
    expandLogPanel() {
        const logPanel = document.getElementById('log-panel');
        if (logPanel) {
            logPanel.classList.remove('minimized');
        }
    }

    /*
     * Copies text to the clipboard.
     */
    /* copyToClipboard() {
        const codeElement = document.getElementById('verify-code');
        if (!codeElement) return;

        const code = codeElement.textContent;
        this.copyTextToClipboard(code, 'Verification code copied to clipboard');
    } */

    /*
     * Copies console code to the clipboard.
     */
    /* copyConsoleCode() {
        const consoleCodeElement = document.querySelector('.console-code code');
        if (!consoleCodeElement) return;

        const code = consoleCodeElement.textContent;
        this.copyTextToClipboard(code, 'Console code copied to clipboard');
    } */

    /**
     * Generic copy text to clipboard method.
     */
    copyTextToClipboard(text, successMessage) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                this.showCopyFeedback(successMessage, 'success');
            }).catch(err => {
                console.error('Failed to copy:', err);
                this.fallbackCopyTextToClipboard(text, successMessage);
            });
        } else {
            this.fallbackCopyTextToClipboard(text, successMessage);
        }
    }

    /**
     * Fallback copy method.
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
                this.showCopyFeedback('Failed to copy, please copy manually', 'error');
            }
        } catch (err) {
            console.error('Failed to copy:', err);
            this.showCopyFeedback('Failed to copy, please copy manually', 'error');
        } finally {
            document.body.removeChild(textArea);
        }
    }

    /**
     * Shows copy feedback.
     */
    showCopyFeedback(message, type) {
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
     * Handles language changes.
     * @param {string} language - The new language code.
     */
    onLanguageChanged(language) {
        console.log('CtrlPanel handling language change:', language);

        if (this.isInitialized) {
            this.render();
            this.setupEventListeners();
        }
    }

    /**
     * Runs floating verification.
     */
    async runFloatingVerification(floatingDiv, fullValue, dataType) {
        const resultElement = floatingDiv.querySelector('#floating-verify-result');
        if (!resultElement) return;
        resultElement.innerHTML = `<div class="alert alert-info">${GetText('verifying')}</div>`;

        try {
            if (dataType === 'hash') {
                const DefStr = GetText('chain_def0') + this.app.SysUser.Id + GetText('chain_def1');
                const originalData = DefStr + this.currentConfig.chainDefinition;
                const expectedHash = fullValue;

                const hexHash = await Crypto.sha256(originalData);
                const hashBytes = new Uint8Array(hexHash.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
                const actualHash = btoa(String.fromCharCode.apply(null, hashBytes));

                const isValid = actualHash === expectedHash;

                resultElement.innerHTML = `
                    <div class="alert alert-${isValid ? 'success' : 'danger'}">
                        <strong>${GetText('verification_result')}:</strong> ${isValid ? '✓ ' + GetText('verification_passed') : '✗ ' + GetText('verification_failed')}<br>
                        <small>${GetText('expected')}: ${expectedHash}</small><br>
                        <small>${GetText('actual')}: ${actualHash}</small>
                    </div>
                `;
            } else {
                const decoded = atob(fullValue);
                resultElement.innerHTML = `
                    <div class="alert alert-success">
                        <strong>${GetText('base64_decode_result')}:</strong><br>
                        <code>${decoded}</code>
                    </div>
                `;
            }
        } catch (error) {
            resultElement.innerHTML = `
                <div class="alert alert-danger">
                    <strong>${GetText('verification_failed')}:</strong> ${error.message}
                </div>
            `;
        }
    }

    /**
     * Updates the user list.
     */
    updateUserList(users) {
        const attackUser = document.getElementById('attack-user');
        if (!attackUser || !users) return;

        attackUser.innerHTML = `<option value="">${GetText('select_user')}</option>`;

        try {
            if (users instanceof Map) {
                for (const [userId, user] of users) {
                    const option = document.createElement('option');
                    option.value = userId;
                    option.textContent = `${userId} (${GetText('assets')}: ${user.totalAssets || 0})`;
                    attackUser.appendChild(option);
                }
            } else if (Array.isArray(users)) {
                users.forEach((user, index) => {
                    const option = document.createElement('option');
                    option.value = user.id || `user${index}`;
                    option.textContent = `${user.id || `user${index}`} (${GetText('assets')}: ${user.totalAssets || 0})`;
                    attackUser.appendChild(option);
                });
            } else if (typeof users === 'object') {
                Object.entries(users).forEach(([userId, user]) => {
                    const option = document.createElement('option');
                    option.value = userId;
                    option.textContent = `${userId} (${GetText('assets')}: ${user.totalAssets || 0})`;
                    attackUser.appendChild(option);
                });
            } else {
                console.warn('updateUserList: users parameter has incorrect format', users);
            }
        } catch (error) {
            console.error('Failed to update user list:', error);
        }
    }
}
