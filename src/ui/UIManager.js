/**
 * UIManager - User Interface Manager
 * Responsible for managing the entire application's user interface, coordinating the display and interaction of various panels.
 */
class UIManager {
    constructor(app) {
        this.app = app;
        this.panels = {
            control: null,
            main: null,
            log: null
        };
        this.isInitialized = false;
    }

    /**
     * Initializes the user interface.
     */
    initUI() {
        try {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this._doInit());
            } else {
                this._doInit();
            }
        } catch (error) {
            console.error('UI initialization failed:', error);
            throw new Error(`UI initialization failed: ${error.message}`);
        }
    }

    /**
     * Performs the actual initialization work.
     * @private
     */
    _doInit() {
        this._validateDOMElements();
        
        this._initializePanels();
        
        this._setupGlobalEventListeners();
        
        this.isInitialized = true;
        
        console.log('UIManager initialized');
    }

    /**
     * Validates that the necessary DOM elements exist.
     * @private
     */
    _validateDOMElements() {
        const requiredElements = [
            'control-panel',
            'main-panel', 
            'log-panel'
        ];

        for (const elementId of requiredElements) {
            const element = document.getElementById(elementId);
            if (!element) {
                throw new Error(`Required DOM element not found: ${elementId}`);
            }
        }
    }

    /**
     * Initializes the various panels.
     * @private
     */
    _initializePanels() {
        const controlPanelElement = document.getElementById('control-panel');
        const mainPanelElement = document.getElementById('main-panel');
        const logPanelElement = document.getElementById('log-panel');

        this._setupPanelStructure(controlPanelElement, 'control');
        this._setupPanelStructure(mainPanelElement, 'main');
        this._setupPanelStructure(logPanelElement, 'log');

        this.panels.control = new CtrlPanel(this);
        this.panels.control.init();

        this.panels.main = new MainPanel(this);
        this.panels.main.init();
        
        window.mainPanel = this.panels.main;

        this.panels.log = new LogPanel(this);
        this.panels.log.init();
        
        this.app.logPanel = this.panels.log;

        console.log('Panel structure initialized');
    }

    /**
     * Sets up the basic structure of a panel.
     * @private
     */
    _setupPanelStructure(panelElement, panelType) {
        const contentElement = panelElement.querySelector('.panel-content');
        if (!contentElement) {
            throw new Error(`Panel content container not found: ${panelType}`);
        }

        switch (panelType) {
            case 'control':
                this._setupControlPanelStructure(contentElement);
                break;
            case 'main':
                this._setupMainPanelStructure(contentElement);
                break;
            case 'log':
                this._setupLogPanelStructure(contentElement);
                break;
        }
    }

    /**
     * Sets up the control panel structure.
     * @private
     */
    _setupControlPanelStructure(contentElement) {
        contentElement.innerHTML = `
            <div class="control-section" id="system-controls">
                <h3 data-text="system_controls">${GetText('system_controls')}</h3>
                <div class="control-buttons">
                </div>
            </div>
            
            <div class="control-section" id="network-settings">
                <h3 data-text="network_settings">${GetText('network_settings')}</h3>
                <div class="settings-form">
                </div>
            </div>
            
            <div class="control-section" id="chain-definition">
                <h3 data-text="blockchain_definition">${GetText('blockchain_definition')}</h3>
                <div class="chain-def-editor">
                </div>
            </div>
            
            <div class="control-section" id="tree-definition">
                <h3 data-text="blocktree_definition">${GetText('blocktree_definition')}</h3>
                <div class="tree-def">
                </div>
            </div>
            
            <div class="control-section" id="runtime-controls">
                <h3>${GetText('runtime_ctrl')}</h3>
                <div class="runtime-settings">
                </div>
            </div>
        `;
    }

    /**
     * Sets up the main panel structure.
     * @private
     */
    _setupMainPanelStructure(contentElement) { return;
        contentElement.innerHTML = `
            <div class="main-section" id="user-assets">
                <h3>User Assets</h3>
                <div class="assets-display">
                    <p class="text-muted">${GetText('sys_not_started')}</p>
                </div>
            </div>
            
            <div class="main-section" id="chain-ownership">
                <h3>Blockchain Ownership</h3>
                <div class="ownership-display">
                    <p class="text-muted">${GetText('sys_not_started')}</p>
                </div>
            </div>
            
            <div class="main-section" id="network-status">
                <h3>Network Status</h3>
                <div class="network-display">
                    <p class="text-muted">${GetText('sys_not_started')}</p>
                </div>
            </div>
        `;
    }

    /**
     * Sets up the log panel structure.
     * @private
     */
    _setupLogPanelStructure(contentElement) {
        contentElement.innerHTML = '';
    }

    /**
     * Sets up global event listeners.
     * @private
     */
    _setupGlobalEventListeners() {
        window.addEventListener('resize', this._handleWindowResize.bind(this));
        
        document.addEventListener('click', this._handleGlobalClick.bind(this));
    }

    /**
     * Handles window resize events.
     * @private
     */
    _handleWindowResize() {
        console.log('Window resized, readjusting layout');
    }

    /**
     * Handles global click events.
     * @private
     */
    _handleGlobalClick(event) {
        const target = event.target;
        
        if (target.dataset.userId) {
            this.handleUserClick(target.dataset.userId, target);
        } else if (target.dataset.chainId) {
            this.handleChainClick(target.dataset.chainId, target);
        } else if (target.dataset.logId) {
            this.handleLogClick(target.dataset.logId, target);
        }
    }

    /**
     * Handles user click events.
     */
    handleUserClick(userId, element) {
        console.log('User click event:', userId);
        if (this.app && this.app.handleUserSelection) {
            this.app.handleUserSelection(userId);
        }
    }

    /*
     * Handles blockchain click events.
     */
    /* handleChainClick(chainId, element) {
        console.log('Blockchain click event:', chainId);
        if (this.app && this.app.handleChainSelection) {
            this.app.handleChainSelection(chainId);
        }
    } */

    /**
     * Handles log click events.
     */
    handleLogClick(logId, logEntry) {
        console.log('Log click event:', logId, logEntry);
        
        if (this.panels.log) {
            this.panels.log.handleLogClick(logId, { target: null });
        }
        
        if (this.app && this.app.handleLogSelection) {
            this.app.handleLogSelection(logId, logEntry);
        }
    }

    /**
     * Updates the main panel.
     */
    updateMainPanel(data) {
        if (!this.isInitialized) {
            console.warn('UI not initialized, cannot update main panel');
            return;
        }
        
        if (this.panels.main) {
            this.panels.main.updateAllData(data);
        }
    }
    
    /**
     * Handles language changes.
     * @param {string} language - The new language code.
     */
    onLanguageChanged( language )
    {
        console.log( 'UIManager handling language change:', language );
        
        if( this.panels.control && this.panels.control.onLanguageChanged )
        {
            this.panels.control.onLanguageChanged( language );
        }
        
        if( this.panels.main && this.panels.main.onLanguageChanged )
        {
            this.panels.main.onLanguageChanged( language );
        }
        
        if( this.panels.log && this.panels.log.onLanguageChanged )
        {
            this.panels.log.onLanguageChanged( language );
        }
    }
}