/**
 * AccessibilityManager 类 - 可访问性管理系统
 * 
 * 提供完整的键盘导航、屏幕阅读器支持和可访问性功能
 * 确保系统符合 WCAG 2.1 AA 标准
 */

export class AccessibilityManager {
    /**
     * 焦点管理模式
     */
    static FOCUS_MODES = {
        NORMAL: 'normal',       // 正常模式
        MODAL: 'modal',         // 模态框模式
        MENU: 'menu',           // 菜单模式
        GRID: 'grid'            // 网格模式
    };

    /**
     * 键盘快捷键
     */
    static SHORTCUTS = {
        HELP: 'F1',
        SEARCH: 'Ctrl+F',
        CLOSE: 'Escape',
        SUBMIT: 'Enter',
        CANCEL: 'Escape',
        NEXT_TAB: 'Ctrl+Tab',
        PREV_TAB: 'Ctrl+Shift+Tab',
        TOGGLE_PANEL: 'Ctrl+P',
        ZOOM_IN: 'Ctrl+=',
        ZOOM_OUT: 'Ctrl+-',
        RESET_ZOOM: 'Ctrl+0'
    };

    /**
     * ARIA 角色和属性
     */
    static ARIA = {
        ROLES: {
            BUTTON: 'button',
            LINK: 'link',
            MENU: 'menu',
            MENUITEM: 'menuitem',
            TAB: 'tab',
            TABPANEL: 'tabpanel',
            DIALOG: 'dialog',
            ALERT: 'alert',
            STATUS: 'status',
            GRID: 'grid',
            GRIDCELL: 'gridcell',
            TREE: 'tree',
            TREEITEM: 'treeitem'
        },
        PROPERTIES: {
            LABEL: 'aria-label',
            LABELLEDBY: 'aria-labelledby',
            DESCRIBEDBY: 'aria-describedby',
            EXPANDED: 'aria-expanded',
            SELECTED: 'aria-selected',
            CHECKED: 'aria-checked',
            DISABLED: 'aria-disabled',
            HIDDEN: 'aria-hidden',
            LIVE: 'aria-live',
            ATOMIC: 'aria-atomic',
            RELEVANT: 'aria-relevant'
        }
    };

    /**
     * 构造函数
     * @param {Object} config - 配置选项
     */
    constructor(config = {}) {
        this.config = {
            enableKeyboardNavigation: config.enableKeyboardNavigation !== false,
            enableScreenReader: config.enableScreenReader !== false,
            enableHighContrast: config.enableHighContrast || false,
            enableReducedMotion: config.enableReducedMotion || false,
            focusIndicatorStyle: config.focusIndicatorStyle || 'outline',
            announceChanges: config.announceChanges !== false,
            ...config
        };

        // 焦点管理
        this.focusMode = AccessibilityManager.FOCUS_MODES.NORMAL;
        this.focusHistory = [];
        this.focusTraps = new Map();
        this.currentFocusTrap = null;

        // 键盘导航
        this.keyboardHandlers = new Map();
        this.shortcuts = new Map();

        // 屏幕阅读器
        this.liveRegions = new Map();
        this.announcements = [];

        // 用户偏好
        this.userPreferences = {
            reducedMotion: false,
            highContrast: false,
            fontSize: 'normal',
            colorScheme: 'auto'
        };

        // 初始化
        this.initialize();
    }

    /**
     * 初始化可访问性系统
     */
    initialize() {
        this.detectUserPreferences();
        this.setupKeyboardNavigation();
        this.setupScreenReader();
        this.setupFocusManagement();
        this.setupLiveRegions();
        this.applyAccessibilityStyles();
        
        console.log('AccessibilityManager 初始化完成');
    }

    /**
     * 检测用户偏好
     */
    detectUserPreferences() {
        // 检测减少动画偏好
        if (window.matchMedia) {
            const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            this.userPreferences.reducedMotion = reducedMotionQuery.matches;
            
            reducedMotionQuery.addEventListener('change', (e) => {
                this.userPreferences.reducedMotion = e.matches;
                this.applyReducedMotion(e.matches);
            });

            // 检测高对比度偏好
            const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
            this.userPreferences.highContrast = highContrastQuery.matches;
            
            highContrastQuery.addEventListener('change', (e) => {
                this.userPreferences.highContrast = e.matches;
                this.applyHighContrast(e.matches);
            });

            // 检测颜色方案偏好
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.userPreferences.colorScheme = darkModeQuery.matches ? 'dark' : 'light';
            
            darkModeQuery.addEventListener('change', (e) => {
                this.userPreferences.colorScheme = e.matches ? 'dark' : 'light';
                this.applyColorScheme(e.matches ? 'dark' : 'light');
            });
        }

        // 从本地存储加载用户设置
        this.loadUserSettings();
    }

    /**
     * 设置键盘导航
     */
    setupKeyboardNavigation() {
        if (!this.config.enableKeyboardNavigation) return;

        // 全局键盘事件监听
        document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
        document.addEventListener('keyup', this.handleGlobalKeyup.bind(this));

        // 注册默认快捷键
        this.registerShortcut(AccessibilityManager.SHORTCUTS.HELP, () => {
            this.showHelp();
        });

        this.registerShortcut(AccessibilityManager.SHORTCUTS.CLOSE, () => {
            this.handleEscape();
        });

        this.registerShortcut(AccessibilityManager.SHORTCUTS.TOGGLE_PANEL, () => {
            this.togglePanel();
        });

        // Tab 键导航
        this.setupTabNavigation();
    }

    /**
     * 设置 Tab 键导航
     */
    setupTabNavigation() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                this.handleTabNavigation(e);
            }
        });
    }

    /**
     * 处理 Tab 键导航
     * @param {KeyboardEvent} e - 键盘事件
     */
    handleTabNavigation(e) {
        // 如果有焦点陷阱，限制在陷阱内导航
        if (this.currentFocusTrap) {
            this.handleFocusTrap(e);
            return;
        }

        // 正常 Tab 导航
        const focusableElements = this.getFocusableElements();
        const currentIndex = focusableElements.indexOf(document.activeElement);
        
        if (e.shiftKey) {
            // Shift+Tab - 向前导航
            const prevIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
            focusableElements[prevIndex]?.focus();
            e.preventDefault();
        } else {
            // Tab - 向后导航
            const nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
            focusableElements[nextIndex]?.focus();
            e.preventDefault();
        }
    }

    /**
     * 获取可聚焦元素
     * @param {HTMLElement} container - 容器元素
     * @returns {Array} 可聚焦元素数组
     */
    getFocusableElements(container = document) {
        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ].join(', ');

        const elements = Array.from(container.querySelectorAll(focusableSelectors));
        
        // 过滤掉隐藏元素
        return elements.filter(element => {
            return element.offsetWidth > 0 && 
                   element.offsetHeight > 0 && 
                   !element.hasAttribute('aria-hidden');
        });
    }

    /**
     * 设置屏幕阅读器支持
     */
    setupScreenReader() {
        if (!this.config.enableScreenReader) return;

        // 创建屏幕阅读器专用样式
        this.addScreenReaderStyles();
        
        // 设置页面语言
        if (!document.documentElement.lang) {
            document.documentElement.lang = 'zh-CN';
        }
    }

    /**
     * 设置焦点管理
     */
    setupFocusManagement() {
        // 监听焦点变化
        document.addEventListener('focusin', (e) => {
            this.onFocusChange(e.target);
        });

        document.addEventListener('focusout', (e) => {
            this.onFocusLost(e.target);
        });

        // 确保页面加载时有初始焦点
        window.addEventListener('load', () => {
            this.setInitialFocus();
        });
    }

    /**
     * 设置实时区域
     */
    setupLiveRegions() {
        // 创建全局公告区域
        this.createLiveRegion('announcements', 'polite');
        this.createLiveRegion('alerts', 'assertive');
        this.createLiveRegion('status', 'polite');
    }

    /**
     * 创建实时区域
     * @param {string} id - 区域ID
     * @param {string} politeness - 礼貌级别 ('polite' | 'assertive' | 'off')
     */
    createLiveRegion(id, politeness = 'polite') {
        let region = document.getElementById(`live-region-${id}`);
        
        if (!region) {
            region = document.createElement('div');
            region.id = `live-region-${id}`;
            region.setAttribute('aria-live', politeness);
            region.setAttribute('aria-atomic', 'true');
            region.className = 'sr-only';
            document.body.appendChild(region);
        }

        this.liveRegions.set(id, region);
        return region;
    }

    /**
     * 公告消息给屏幕阅读器
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 ('announcement' | 'alert' | 'status')
     * @param {number} delay - 延迟时间（毫秒）
     */
    announce(message, type = 'announcement', delay = 100) {
        if (!this.config.announceChanges) return;

        const regionId = type === 'alert' ? 'alerts' : 
                        type === 'status' ? 'status' : 'announcements';
        
        const region = this.liveRegions.get(regionId);
        if (!region) return;

        // 延迟公告以确保屏幕阅读器能够捕获
        setTimeout(() => {
            region.textContent = message;
            
            // 记录公告历史
            this.announcements.push({
                message,
                type,
                timestamp: Date.now()
            });

            // 限制历史记录大小
            if (this.announcements.length > 100) {
                this.announcements.shift();
            }

            // 清除消息以便下次公告
            setTimeout(() => {
                region.textContent = '';
            }, 1000);
        }, delay);
    }

    /**
     * 注册键盘快捷键
     * @param {string} shortcut - 快捷键组合
     * @param {Function} handler - 处理函数
     * @param {Object} options - 选项
     */
    registerShortcut(shortcut, handler, options = {}) {
        const key = this.normalizeShortcut(shortcut);
        this.shortcuts.set(key, {
            handler,
            description: options.description || '',
            global: options.global !== false
        });
    }

    /**
     * 标准化快捷键字符串
     * @param {string} shortcut - 快捷键字符串
     * @returns {string} 标准化的快捷键
     */
    normalizeShortcut(shortcut) {
        return shortcut.toLowerCase()
            .replace(/\s+/g, '')
            .replace('ctrl', 'control')
            .replace('cmd', 'meta');
    }

    /**
     * 处理全局按键事件
     * @param {KeyboardEvent} e - 键盘事件
     */
    handleGlobalKeydown(e) {
        const shortcut = this.getShortcutFromEvent(e);
        const shortcutInfo = this.shortcuts.get(shortcut);
        
        if (shortcutInfo && shortcutInfo.global) {
            e.preventDefault();
            shortcutInfo.handler(e);
        }

        // 处理方向键导航
        this.handleArrowNavigation(e);
    }

    /**
     * 处理全局按键释放事件
     * @param {KeyboardEvent} e - 键盘事件
     */
    handleGlobalKeyup(e) {
        // 可以在这里处理需要在按键释放时触发的功能
    }

    /**
     * 从键盘事件获取快捷键字符串
     * @param {KeyboardEvent} e - 键盘事件
     * @returns {string} 快捷键字符串
     */
    getShortcutFromEvent(e) {
        const parts = [];
        
        if (e.ctrlKey) parts.push('control');
        if (e.altKey) parts.push('alt');
        if (e.shiftKey) parts.push('shift');
        if (e.metaKey) parts.push('meta');
        
        parts.push(e.key.toLowerCase());
        
        return parts.join('+');
    }

    /**
     * 处理方向键导航
     * @param {KeyboardEvent} e - 键盘事件
     */
    handleArrowNavigation(e) {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            return;
        }

        const activeElement = document.activeElement;
        if (!activeElement) return;

        // 检查是否在特殊容器中（如网格、菜单等）
        const gridContainer = activeElement.closest('[role="grid"]');
        if (gridContainer) {
            this.handleGridNavigation(e, gridContainer);
            return;
        }

        const menuContainer = activeElement.closest('[role="menu"]');
        if (menuContainer) {
            this.handleMenuNavigation(e, menuContainer);
            return;
        }
    }

    /**
     * 处理网格导航
     * @param {KeyboardEvent} e - 键盘事件
     * @param {HTMLElement} grid - 网格容器
     */
    handleGridNavigation(e, grid) {
        const cells = Array.from(grid.querySelectorAll('[role="gridcell"]'));
        const currentIndex = cells.indexOf(document.activeElement);
        
        if (currentIndex === -1) return;

        const columns = parseInt(grid.getAttribute('aria-colcount')) || 
                       Math.max(...cells.map(cell => parseInt(cell.getAttribute('aria-colindex')) || 1));
        
        let newIndex;
        
        switch (e.key) {
            case 'ArrowRight':
                newIndex = currentIndex + 1;
                break;
            case 'ArrowLeft':
                newIndex = currentIndex - 1;
                break;
            case 'ArrowDown':
                newIndex = currentIndex + columns;
                break;
            case 'ArrowUp':
                newIndex = currentIndex - columns;
                break;
        }

        if (newIndex >= 0 && newIndex < cells.length) {
            cells[newIndex].focus();
            e.preventDefault();
        }
    }

    /**
     * 处理菜单导航
     * @param {KeyboardEvent} e - 键盘事件
     * @param {HTMLElement} menu - 菜单容器
     */
    handleMenuNavigation(e, menu) {
        const items = Array.from(menu.querySelectorAll('[role="menuitem"]'));
        const currentIndex = items.indexOf(document.activeElement);
        
        if (currentIndex === -1) return;

        let newIndex;
        
        switch (e.key) {
            case 'ArrowDown':
                newIndex = currentIndex + 1;
                if (newIndex >= items.length) newIndex = 0;
                break;
            case 'ArrowUp':
                newIndex = currentIndex - 1;
                if (newIndex < 0) newIndex = items.length - 1;
                break;
            default:
                return;
        }

        items[newIndex].focus();
        e.preventDefault();
    }

    /**
     * 创建焦点陷阱
     * @param {HTMLElement} container - 容器元素
     * @param {Object} options - 选项
     * @returns {string} 陷阱ID
     */
    createFocusTrap(container, options = {}) {
        const trapId = `trap_${Date.now()}`;
        
        const trap = {
            id: trapId,
            container,
            focusableElements: this.getFocusableElements(container),
            previousFocus: document.activeElement,
            options: {
                returnFocus: options.returnFocus !== false,
                initialFocus: options.initialFocus,
                ...options
            }
        };

        this.focusTraps.set(trapId, trap);
        this.activateFocusTrap(trapId);
        
        return trapId;
    }

    /**
     * 激活焦点陷阱
     * @param {string} trapId - 陷阱ID
     */
    activateFocusTrap(trapId) {
        const trap = this.focusTraps.get(trapId);
        if (!trap) return;

        this.currentFocusTrap = trap;
        
        // 设置初始焦点
        const initialFocus = trap.options.initialFocus || trap.focusableElements[0];
        if (initialFocus) {
            initialFocus.focus();
        }

        // 添加 ARIA 属性
        trap.container.setAttribute('aria-modal', 'true');
    }

    /**
     * 处理焦点陷阱内的导航
     * @param {KeyboardEvent} e - 键盘事件
     */
    handleFocusTrap(e) {
        const trap = this.currentFocusTrap;
        if (!trap) return;

        const focusableElements = trap.focusableElements;
        const currentIndex = focusableElements.indexOf(document.activeElement);
        
        if (e.shiftKey) {
            // Shift+Tab - 向前
            const prevIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
            focusableElements[prevIndex]?.focus();
        } else {
            // Tab - 向后
            const nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
            focusableElements[nextIndex]?.focus();
        }
        
        e.preventDefault();
    }

    /**
     * 释放焦点陷阱
     * @param {string} trapId - 陷阱ID
     */
    releaseFocusTrap(trapId) {
        const trap = this.focusTraps.get(trapId);
        if (!trap) return;

        // 恢复焦点
        if (trap.options.returnFocus && trap.previousFocus) {
            trap.previousFocus.focus();
        }

        // 移除 ARIA 属性
        trap.container.removeAttribute('aria-modal');

        // 清理
        this.focusTraps.delete(trapId);
        if (this.currentFocusTrap === trap) {
            this.currentFocusTrap = null;
        }
    }

    /**
     * 设置初始焦点
     */
    setInitialFocus() {
        // 查找主要内容区域
        const main = document.querySelector('main, [role="main"]');
        const firstFocusable = main ? 
            this.getFocusableElements(main)[0] : 
            this.getFocusableElements()[0];
        
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }

    /**
     * 焦点变化处理
     * @param {HTMLElement} element - 获得焦点的元素
     */
    onFocusChange(element) {
        // 记录焦点历史
        this.focusHistory.push({
            element,
            timestamp: Date.now()
        });

        // 限制历史记录大小
        if (this.focusHistory.length > 50) {
            this.focusHistory.shift();
        }

        // 公告焦点变化（如果需要）
        this.announceFocusChange(element);
    }

    /**
     * 焦点丢失处理
     * @param {HTMLElement} element - 失去焦点的元素
     */
    onFocusLost(element) {
        // 可以在这里处理焦点丢失的逻辑
    }

    /**
     * 公告焦点变化
     * @param {HTMLElement} element - 元素
     */
    announceFocusChange(element) {
        const label = this.getElementLabel(element);
        const role = element.getAttribute('role') || element.tagName.toLowerCase();
        
        if (label) {
            this.announce(`${label}, ${role}`, 'status');
        }
    }

    /**
     * 获取元素标签
     * @param {HTMLElement} element - 元素
     * @returns {string} 标签文本
     */
    getElementLabel(element) {
        // 按优先级查找标签
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;

        const ariaLabelledBy = element.getAttribute('aria-labelledby');
        if (ariaLabelledBy) {
            const labelElement = document.getElementById(ariaLabelledBy);
            if (labelElement) return labelElement.textContent.trim();
        }

        const title = element.getAttribute('title');
        if (title) return title;

        return element.textContent?.trim() || '';
    }

    /**
     * 应用可访问性样式
     */
    applyAccessibilityStyles() {
        this.addAccessibilityCSS();
        this.applyReducedMotion(this.userPreferences.reducedMotion);
        this.applyHighContrast(this.userPreferences.highContrast);
        this.applyColorScheme(this.userPreferences.colorScheme);
    }

    /**
     * 添加可访问性 CSS
     */
    addAccessibilityCSS() {
        const styleId = 'accessibility-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* 屏幕阅读器专用类 */
            .sr-only {
                position: absolute !important;
                width: 1px !important;
                height: 1px !important;
                padding: 0 !important;
                margin: -1px !important;
                overflow: hidden !important;
                clip: rect(0, 0, 0, 0) !important;
                white-space: nowrap !important;
                border: 0 !important;
            }

            /* 焦点指示器 */
            *:focus {
                outline: 2px solid #007bff !important;
                outline-offset: 2px !important;
            }

            /* 高对比度模式 */
            .high-contrast {
                filter: contrast(150%);
            }

            .high-contrast * {
                background-color: white !important;
                color: black !important;
                border-color: black !important;
            }

            .high-contrast a {
                color: blue !important;
            }

            .high-contrast a:visited {
                color: purple !important;
            }

            /* 减少动画 */
            .reduced-motion * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
            }

            /* 跳转链接 */
            .skip-link {
                position: absolute;
                top: -40px;
                left: 6px;
                background: #000;
                color: #fff;
                padding: 8px;
                text-decoration: none;
                z-index: 10000;
            }

            .skip-link:focus {
                top: 6px;
            }

            /* 键盘导航提示 */
            .keyboard-help {
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px;
                border-radius: 4px;
                font-size: 12px;
                z-index: 10001;
                display: none;
            }

            .keyboard-help.show {
                display: block;
            }

            /* 大字体支持 */
            .large-font {
                font-size: 1.2em !important;
            }

            .extra-large-font {
                font-size: 1.5em !important;
            }

            /* 暗色主题 */
            .dark-theme {
                background-color: #1a1a1a !important;
                color: #ffffff !important;
            }

            .dark-theme input,
            .dark-theme textarea,
            .dark-theme select {
                background-color: #333333 !important;
                color: #ffffff !important;
                border-color: #555555 !important;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * 添加屏幕阅读器样式
     */
    addScreenReaderStyles() {
        // 添加跳转链接
        this.addSkipLinks();
        
        // 添加地标
        this.addLandmarks();
    }

    /**
     * 添加跳转链接
     */
    addSkipLinks() {
        const skipLinks = document.createElement('div');
        skipLinks.innerHTML = `
            <a href="#main-content" class="skip-link">跳转到主要内容</a>
            <a href="#navigation" class="skip-link">跳转到导航</a>
        `;
        
        document.body.insertBefore(skipLinks, document.body.firstChild);
    }

    /**
     * 添加地标
     */
    addLandmarks() {
        // 确保主要区域有正确的角色
        const main = document.querySelector('main');
        if (main && !main.hasAttribute('role')) {
            main.setAttribute('role', 'main');
            main.id = main.id || 'main-content';
        }

        // 添加导航地标
        const nav = document.querySelector('nav');
        if (nav && !nav.hasAttribute('role')) {
            nav.setAttribute('role', 'navigation');
            nav.id = nav.id || 'navigation';
        }
    }

    /**
     * 应用减少动画设置
     * @param {boolean} enabled - 是否启用
     */
    applyReducedMotion(enabled) {
        if (enabled) {
            document.body.classList.add('reduced-motion');
        } else {
            document.body.classList.remove('reduced-motion');
        }
    }

    /**
     * 应用高对比度设置
     * @param {boolean} enabled - 是否启用
     */
    applyHighContrast(enabled) {
        if (enabled) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }
    }

    /**
     * 应用颜色方案
     * @param {string} scheme - 颜色方案 ('light' | 'dark' | 'auto')
     */
    applyColorScheme(scheme) {
        document.body.classList.remove('dark-theme', 'light-theme');
        
        if (scheme === 'dark') {
            document.body.classList.add('dark-theme');
        } else if (scheme === 'light') {
            document.body.classList.add('light-theme');
        }
    }

    /**
     * 设置字体大小
     * @param {string} size - 字体大小 ('normal' | 'large' | 'extra-large')
     */
    setFontSize(size) {
        document.body.classList.remove('large-font', 'extra-large-font');
        
        if (size === 'large') {
            document.body.classList.add('large-font');
        } else if (size === 'extra-large') {
            document.body.classList.add('extra-large-font');
        }
        
        this.userPreferences.fontSize = size;
        this.saveUserSettings();
    }

    /**
     * 显示帮助信息
     */
    showHelp() {
        const helpContent = this.generateHelpContent();
        this.showModal('键盘快捷键帮助', helpContent);
    }

    /**
     * 生成帮助内容
     * @returns {string} 帮助内容 HTML
     */
    generateHelpContent() {
        const shortcuts = Array.from(this.shortcuts.entries())
            .map(([key, info]) => `
                <tr>
                    <td><kbd>${key}</kbd></td>
                    <td>${info.description || '无描述'}</td>
                </tr>
            `).join('');

        return `
            <div>
                <h3>键盘快捷键</h3>
                <table>
                    <thead>
                        <tr>
                            <th>快捷键</th>
                            <th>功能</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${shortcuts}
                    </tbody>
                </table>
                
                <h3>导航说明</h3>
                <ul>
                    <li>使用 Tab 键在可聚焦元素间导航</li>
                    <li>使用 Shift+Tab 反向导航</li>
                    <li>使用方向键在网格和菜单中导航</li>
                    <li>使用 Enter 键激活按钮和链接</li>
                    <li>使用 Escape 键关闭对话框和菜单</li>
                </ul>
            </div>
        `;
    }

    /**
     * 显示模态框
     * @param {string} title - 标题
     * @param {string} content - 内容
     */
    showModal(title, content) {
        const modal = document.createElement('div');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'modal-title');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        modal.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; max-width: 600px; max-height: 80vh; overflow-y: auto;">
                <h2 id="modal-title">${title}</h2>
                ${content}
                <button id="modal-close" style="margin-top: 20px; padding: 8px 16px;">关闭</button>
            </div>
        `;

        document.body.appendChild(modal);

        // 创建焦点陷阱
        const trapId = this.createFocusTrap(modal, {
            initialFocus: modal.querySelector('#modal-close')
        });

        // 关闭按钮事件
        modal.querySelector('#modal-close').addEventListener('click', () => {
            this.releaseFocusTrap(trapId);
            modal.remove();
        });

        // ESC 键关闭
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.releaseFocusTrap(trapId);
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        this.announce(`${title} 对话框已打开`, 'alert');
    }

    /**
     * 处理 Escape 键
     */
    handleEscape() {
        // 关闭当前模态框或菜单
        const modal = document.querySelector('[role="dialog"][aria-modal="true"]');
        if (modal) {
            const closeButton = modal.querySelector('button');
            if (closeButton) {
                closeButton.click();
            }
            return;
        }

        // 关闭菜单
        const openMenu = document.querySelector('[role="menu"][aria-expanded="true"]');
        if (openMenu) {
            openMenu.setAttribute('aria-expanded', 'false');
            return;
        }
    }

    /**
     * 切换面板
     */
    togglePanel() {
        // 这里应该实现具体的面板切换逻辑
        this.announce('面板已切换', 'status');
    }

    /**
     * 保存用户设置
     */
    saveUserSettings() {
        try {
            localStorage.setItem('accessibility-preferences', JSON.stringify(this.userPreferences));
        } catch (error) {
            console.warn('无法保存用户设置:', error);
        }
    }

    /**
     * 加载用户设置
     */
    loadUserSettings() {
        try {
            const saved = localStorage.getItem('accessibility-preferences');
            if (saved) {
                const preferences = JSON.parse(saved);
                this.userPreferences = { ...this.userPreferences, ...preferences };
                
                // 应用保存的设置
                this.applyReducedMotion(this.userPreferences.reducedMotion);
                this.applyHighContrast(this.userPreferences.highContrast);
                this.applyColorScheme(this.userPreferences.colorScheme);
                this.setFontSize(this.userPreferences.fontSize);
            }
        } catch (error) {
            console.warn('无法加载用户设置:', error);
        }
    }

    /**
     * 获取可访问性状态报告
     * @returns {Object} 状态报告
     */
    getAccessibilityReport() {
        return {
            focusMode: this.focusMode,
            activeFocusTrap: this.currentFocusTrap?.id || null,
            userPreferences: this.userPreferences,
            shortcuts: this.shortcuts.size,
            liveRegions: this.liveRegions.size,
            announcements: this.announcements.length,
            focusHistory: this.focusHistory.length
        };
    }

    /**
     * 清理资源
     */
    cleanup() {
        // 释放所有焦点陷阱
        for (const trapId of this.focusTraps.keys()) {
            this.releaseFocusTrap(trapId);
        }

        // 清理事件监听器
        document.removeEventListener('keydown', this.handleGlobalKeydown);
        document.removeEventListener('keyup', this.handleGlobalKeyup);

        // 清理实时区域
        for (const region of this.liveRegions.values()) {
            if (region.parentNode) {
                region.parentNode.removeChild(region);
            }
        }

        // 清理数据
        this.focusHistory = [];
        this.announcements = [];
        this.shortcuts.clear();
        this.liveRegions.clear();
        this.focusTraps.clear();

        console.log('AccessibilityManager 资源已清理');
    }
}