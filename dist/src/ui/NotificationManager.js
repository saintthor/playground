/**
 * NotificationManager 类 - 用户通知管理系统
 * 
 * 提供统一的用户通知界面，支持多种通知类型和交互操作
 * 集成错误处理和系统状态反馈
 */

export class NotificationManager {
    /**
     * 通知类型
     */
    static NOTIFICATION_TYPES = {
        INFO: 'info',
        SUCCESS: 'success',
        WARNING: 'warning',
        ERROR: 'error',
        CRITICAL: 'critical'
    };

    /**
     * 通知位置
     */
    static POSITIONS = {
        TOP_RIGHT: 'top-right',
        TOP_LEFT: 'top-left',
        TOP_CENTER: 'top-center',
        BOTTOM_RIGHT: 'bottom-right',
        BOTTOM_LEFT: 'bottom-left',
        BOTTOM_CENTER: 'bottom-center'
    };

    /**
     * 构造函数
     * @param {Object} config - 配置选项
     */
    constructor(config = {}) {
        this.config = {
            position: config.position || NotificationManager.POSITIONS.TOP_RIGHT,
            maxNotifications: config.maxNotifications || 5,
            defaultDuration: config.defaultDuration || 5000,
            enableSound: config.enableSound !== false,
            enableAnimation: config.enableAnimation !== false,
            enablePersistence: config.enablePersistence || false,
            ...config
        };

        // 通知存储
        this.notifications = new Map();
        this.notificationHistory = [];
        this.notificationId = 0;

        // DOM 元素
        this.container = null;
        this.soundEnabled = this.config.enableSound;

        // 事件监听器
        this.listeners = new Map();

        // 初始化
        this.initialize();
    }

    /**
     * 初始化通知系统
     */
    initialize() {
        this.createContainer();
        this.loadPersistedNotifications();
        this.setupKeyboardShortcuts();
        
        console.log('NotificationManager 初始化完成');
    }

    /**
     * 创建通知容器
     */
    createContainer() {
        // 检查是否已存在容器
        let existingContainer = document.getElementById('notification-container');
        if (existingContainer) {
            this.container = existingContainer;
            return;
        }

        // 创建新容器
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = `notification-container ${this.config.position}`;
        
        // 添加样式
        this.addStyles();
        
        // 添加到页面
        document.body.appendChild(this.container);
    }

    /**
     * 添加通知样式
     */
    addStyles() {
        const styleId = 'notification-manager-styles';
        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .notification-container {
                position: fixed;
                z-index: 10000;
                pointer-events: none;
                max-width: 400px;
                width: 100%;
            }

            .notification-container.top-right {
                top: 20px;
                right: 20px;
            }

            .notification-container.top-left {
                top: 20px;
                left: 20px;
            }

            .notification-container.top-center {
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
            }

            .notification-container.bottom-right {
                bottom: 20px;
                right: 20px;
            }

            .notification-container.bottom-left {
                bottom: 20px;
                left: 20px;
            }

            .notification-container.bottom-center {
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
            }

            .notification {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                margin-bottom: 12px;
                padding: 16px;
                pointer-events: auto;
                position: relative;
                transition: all 0.3s ease;
                border-left: 4px solid #007bff;
                max-width: 100%;
                word-wrap: break-word;
            }

            .notification.info {
                border-left-color: #007bff;
            }

            .notification.success {
                border-left-color: #28a745;
            }

            .notification.warning {
                border-left-color: #ffc107;
            }

            .notification.error {
                border-left-color: #dc3545;
            }

            .notification.critical {
                border-left-color: #6f42c1;
                background: #f8f9fa;
                box-shadow: 0 6px 20px rgba(111, 66, 193, 0.3);
            }

            .notification-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }

            .notification-title {
                font-weight: 600;
                font-size: 14px;
                color: #333;
                margin: 0;
            }

            .notification-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #999;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .notification-close:hover {
                color: #666;
            }

            .notification-message {
                font-size: 13px;
                color: #666;
                line-height: 1.4;
                margin-bottom: 12px;
            }

            .notification-actions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }

            .notification-action {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                padding: 6px 12px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .notification-action:hover {
                background: #e9ecef;
                border-color: #adb5bd;
            }

            .notification-action.primary {
                background: #007bff;
                border-color: #007bff;
                color: white;
            }

            .notification-action.primary:hover {
                background: #0056b3;
                border-color: #0056b3;
            }

            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: rgba(0, 123, 255, 0.3);
                transition: width linear;
            }

            .notification-icon {
                width: 16px;
                height: 16px;
                margin-right: 8px;
                flex-shrink: 0;
            }

            .notification-details {
                margin-top: 8px;
                padding: 8px;
                background: #f8f9fa;
                border-radius: 4px;
                font-size: 11px;
                color: #6c757d;
                font-family: monospace;
                max-height: 100px;
                overflow-y: auto;
            }

            .notification-enter {
                opacity: 0;
                transform: translateX(100%);
            }

            .notification-enter-active {
                opacity: 1;
                transform: translateX(0);
            }

            .notification-exit {
                opacity: 1;
                transform: translateX(0);
            }

            .notification-exit-active {
                opacity: 0;
                transform: translateX(100%);
            }

            @media (max-width: 480px) {
                .notification-container {
                    left: 10px !important;
                    right: 10px !important;
                    max-width: none;
                    transform: none !important;
                }

                .notification {
                    margin-bottom: 8px;
                    padding: 12px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * 显示通知
     * @param {Object} options - 通知选项
     * @returns {string} 通知ID
     */
    show(options) {
        const notification = this.createNotification(options);
        
        // 检查最大通知数量
        this.enforceMaxNotifications();
        
        // 添加到存储
        this.notifications.set(notification.id, notification);
        this.notificationHistory.push({ ...notification, timestamp: Date.now() });
        
        // 渲染通知
        this.renderNotification(notification);
        
        // 设置自动关闭
        if (notification.duration > 0) {
            this.scheduleAutoClose(notification.id, notification.duration);
        }
        
        // 播放声音
        if (this.soundEnabled && notification.playSound) {
            this.playNotificationSound(notification.type);
        }
        
        // 持久化
        if (this.config.enablePersistence) {
            this.persistNotifications();
        }
        
        // 触发事件
        this.notifyListeners('notification_shown', notification);
        
        return notification.id;
    }

    /**
     * 创建通知对象
     * @param {Object} options - 通知选项
     * @returns {Object} 通知对象
     */
    createNotification(options) {
        const id = `notification_${++this.notificationId}`;
        
        return {
            id,
            type: options.type || NotificationManager.NOTIFICATION_TYPES.INFO,
            title: options.title || this.getDefaultTitle(options.type),
            message: options.message || '',
            duration: options.duration !== undefined ? options.duration : this.config.defaultDuration,
            actions: options.actions || [],
            details: options.details || null,
            errorId: options.errorId || null,
            persistent: options.persistent || false,
            playSound: options.playSound !== false,
            showProgress: options.showProgress !== false && options.duration > 0,
            createdAt: Date.now()
        };
    }

    /**
     * 获取默认标题
     * @param {string} type - 通知类型
     * @returns {string} 默认标题
     */
    getDefaultTitle(type) {
        const titles = {
            [NotificationManager.NOTIFICATION_TYPES.INFO]: '信息',
            [NotificationManager.NOTIFICATION_TYPES.SUCCESS]: '成功',
            [NotificationManager.NOTIFICATION_TYPES.WARNING]: '警告',
            [NotificationManager.NOTIFICATION_TYPES.ERROR]: '错误',
            [NotificationManager.NOTIFICATION_TYPES.CRITICAL]: '严重错误'
        };
        
        return titles[type] || '通知';
    }

    /**
     * 渲染通知
     * @param {Object} notification - 通知对象
     */
    renderNotification(notification) {
        const element = document.createElement('div');
        element.className = `notification ${notification.type}`;
        element.id = `notification-${notification.id}`;
        
        // 添加进入动画
        if (this.config.enableAnimation) {
            element.classList.add('notification-enter');
            requestAnimationFrame(() => {
                element.classList.remove('notification-enter');
                element.classList.add('notification-enter-active');
            });
        }
        
        // 构建HTML
        element.innerHTML = this.buildNotificationHTML(notification);
        
        // 添加事件监听器
        this.attachNotificationEvents(element, notification);
        
        // 添加到容器
        this.container.appendChild(element);
        
        // 启动进度条动画
        if (notification.showProgress && notification.duration > 0) {
            this.startProgressAnimation(element, notification.duration);
        }
    }

    /**
     * 构建通知HTML
     * @param {Object} notification - 通知对象
     * @returns {string} HTML字符串
     */
    buildNotificationHTML(notification) {
        const icon = this.getNotificationIcon(notification.type);
        const actionsHTML = this.buildActionsHTML(notification.actions);
        const detailsHTML = notification.details ? 
            `<div class="notification-details">${this.escapeHtml(notification.details)}</div>` : '';
        const progressHTML = notification.showProgress ? 
            '<div class="notification-progress"></div>' : '';
        
        return `
            <div class="notification-header">
                <div style="display: flex; align-items: center;">
                    ${icon}
                    <h4 class="notification-title">${this.escapeHtml(notification.title)}</h4>
                </div>
                <button class="notification-close" data-action="close">&times;</button>
            </div>
            <div class="notification-message">${this.escapeHtml(notification.message)}</div>
            ${actionsHTML}
            ${detailsHTML}
            ${progressHTML}
        `;
    }

    /**
     * 获取通知图标
     * @param {string} type - 通知类型
     * @returns {string} 图标HTML
     */
    getNotificationIcon(type) {
        const icons = {
            [NotificationManager.NOTIFICATION_TYPES.INFO]: '&#8505;',
            [NotificationManager.NOTIFICATION_TYPES.SUCCESS]: '&#10004;',
            [NotificationManager.NOTIFICATION_TYPES.WARNING]: '&#9888;',
            [NotificationManager.NOTIFICATION_TYPES.ERROR]: '&#10006;',
            [NotificationManager.NOTIFICATION_TYPES.CRITICAL]: '&#9888;'
        };
        
        const iconChar = icons[type] || '&#8505;';
        return `<span class="notification-icon">${iconChar}</span>`;
    }

    /**
     * 构建操作按钮HTML
     * @param {Array} actions - 操作列表
     * @returns {string} 操作HTML
     */
    buildActionsHTML(actions) {
        if (!actions || actions.length === 0) {
            return '';
        }
        
        const actionsHTML = actions.map(action => {
            const className = action.primary ? 'notification-action primary' : 'notification-action';
            return `<button class="${className}" data-action="${action.action}" data-error-id="${action.errorId || ''}">${this.escapeHtml(action.label)}</button>`;
        }).join('');
        
        return `<div class="notification-actions">${actionsHTML}</div>`;
    }

    /**
     * 附加通知事件监听器
     * @param {HTMLElement} element - 通知元素
     * @param {Object} notification - 通知对象
     */
    attachNotificationEvents(element, notification) {
        // 关闭按钮
        const closeButton = element.querySelector('[data-action="close"]');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.close(notification.id);
            });
        }
        
        // 操作按钮
        const actionButtons = element.querySelectorAll('.notification-action');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const errorId = e.target.dataset.errorId;
                
                this.handleNotificationAction(notification.id, action, errorId);
            });
        });
        
        // 鼠标悬停暂停自动关闭
        element.addEventListener('mouseenter', () => {
            this.pauseAutoClose(notification.id);
        });
        
        element.addEventListener('mouseleave', () => {
            this.resumeAutoClose(notification.id);
        });
    }

    /**
     * 处理通知操作
     * @param {string} notificationId - 通知ID
     * @param {string} action - 操作类型
     * @param {string} errorId - 错误ID
     */
    async handleNotificationAction(notificationId, action, errorId) {
        const notification = this.notifications.get(notificationId);
        if (!notification) return;
        
        // 触发操作事件
        this.notifyListeners('notification_action', {
            notificationId,
            action,
            errorId,
            notification
        });
        
        // 根据操作类型处理
        switch (action) {
            case 'retry':
                this.handleRetryAction(errorId);
                break;
            
            case 'details':
                this.showErrorDetails(errorId);
                break;
            
            case 'ignore':
                this.handleIgnoreAction(errorId);
                break;
            
            case 'report':
                this.handleReportAction(errorId);
                break;
            
            default:
                console.log(`未知操作: ${action}`);
        }
        
        // 关闭通知（除非是持久通知）
        if (!notification.persistent) {
            this.close(notificationId);
        }
    }

    /**
     * 处理重试操作
     * @param {string} errorId - 错误ID
     */
    handleRetryAction(errorId) {
        // 这里应该调用错误处理器的重试方法
        console.log(`重试错误: ${errorId}`);
        
        this.show({
            type: NotificationManager.NOTIFICATION_TYPES.INFO,
            title: '重试中',
            message: '正在重试操作...',
            duration: 3000
        });
    }

    /**
     * 显示错误详情
     * @param {string} errorId - 错误ID
     */
    showErrorDetails(errorId) {
        // 创建详情对话框
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; max-width: 600px; max-height: 80vh; overflow-y: auto;">
                <h3>错误详情</h3>
                <p><strong>错误ID:</strong> ${errorId}</p>
                <p>详细的错误信息和调试数据将在这里显示。</p>
                <button onclick="this.closest('div').remove()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">关闭</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * 处理忽略操作
     * @param {string} errorId - 错误ID
     */
    handleIgnoreAction(errorId) {
        console.log(`忽略错误: ${errorId}`);
        
        this.show({
            type: NotificationManager.NOTIFICATION_TYPES.SUCCESS,
            title: '已忽略',
            message: '错误已被忽略',
            duration: 2000
        });
    }

    /**
     * 处理报告操作
     * @param {string} errorId - 错误ID
     */
    handleReportAction(errorId) {
        console.log(`报告错误: ${errorId}`);
        
        this.show({
            type: NotificationManager.NOTIFICATION_TYPES.INFO,
            title: '感谢反馈',
            message: '错误报告已提交，我们会尽快处理',
            duration: 3000
        });
    }

    /**
     * 关闭通知
     * @param {string} notificationId - 通知ID
     */
    close(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (!notification) return;
        
        const element = document.getElementById(`notification-${notificationId}`);
        if (!element) return;
        
        // 清除自动关闭定时器
        this.clearAutoClose(notificationId);
        
        // 添加退出动画
        if (this.config.enableAnimation) {
            element.classList.add('notification-exit');
            element.classList.add('notification-exit-active');
            
            setTimeout(() => {
                this.removeNotification(notificationId);
            }, 300);
        } else {
            this.removeNotification(notificationId);
        }
        
        // 触发事件
        this.notifyListeners('notification_closed', notification);
    }

    /**
     * 移除通知
     * @param {string} notificationId - 通知ID
     */
    removeNotification(notificationId) {
        // 从存储中移除
        this.notifications.delete(notificationId);
        
        // 从DOM中移除
        const element = document.getElementById(`notification-${notificationId}`);
        if (element) {
            element.remove();
        }
        
        // 更新持久化
        if (this.config.enablePersistence) {
            this.persistNotifications();
        }
    }

    /**
     * 关闭所有通知
     */
    closeAll() {
        const notificationIds = Array.from(this.notifications.keys());
        notificationIds.forEach(id => this.close(id));
    }

    /**
     * 强制执行最大通知数量限制
     */
    enforceMaxNotifications() {
        const notificationIds = Array.from(this.notifications.keys());
        const excess = notificationIds.length - this.config.maxNotifications + 1;
        
        if (excess > 0) {
            // 关闭最旧的通知
            const oldestIds = notificationIds.slice(0, excess);
            oldestIds.forEach(id => this.close(id));
        }
    }

    /**
     * 安排自动关闭
     * @param {string} notificationId - 通知ID
     * @param {number} duration - 持续时间
     */
    scheduleAutoClose(notificationId, duration) {
        const timeoutId = setTimeout(() => {
            this.close(notificationId);
        }, duration);
        
        // 存储定时器ID以便取消
        const notification = this.notifications.get(notificationId);
        if (notification) {
            notification.timeoutId = timeoutId;
        }
    }

    /**
     * 暂停自动关闭
     * @param {string} notificationId - 通知ID
     */
    pauseAutoClose(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (notification && notification.timeoutId) {
            clearTimeout(notification.timeoutId);
            notification.pausedAt = Date.now();
        }
    }

    /**
     * 恢复自动关闭
     * @param {string} notificationId - 通知ID
     */
    resumeAutoClose(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (notification && notification.pausedAt) {
            const elapsed = Date.now() - notification.createdAt;
            const remaining = notification.duration - elapsed;
            
            if (remaining > 0) {
                this.scheduleAutoClose(notificationId, remaining);
            } else {
                this.close(notificationId);
            }
            
            delete notification.pausedAt;
        }
    }

    /**
     * 清除自动关闭定时器
     * @param {string} notificationId - 通知ID
     */
    clearAutoClose(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (notification && notification.timeoutId) {
            clearTimeout(notification.timeoutId);
            delete notification.timeoutId;
        }
    }

    /**
     * 启动进度条动画
     * @param {HTMLElement} element - 通知元素
     * @param {number} duration - 持续时间
     */
    startProgressAnimation(element, duration) {
        const progressBar = element.querySelector('.notification-progress');
        if (!progressBar) return;
        
        progressBar.style.width = '100%';
        progressBar.style.transition = `width ${duration}ms linear`;
        
        requestAnimationFrame(() => {
            progressBar.style.width = '0%';
        });
    }

    /**
     * 播放通知声音
     * @param {string} type - 通知类型
     */
    playNotificationSound(type) {
        if (!this.soundEnabled) return;
        
        try {
            // 使用Web Audio API或简单的音频播放
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // 根据通知类型设置不同的音调
            const frequencies = {
                [NotificationManager.NOTIFICATION_TYPES.INFO]: 800,
                [NotificationManager.NOTIFICATION_TYPES.SUCCESS]: 1000,
                [NotificationManager.NOTIFICATION_TYPES.WARNING]: 600,
                [NotificationManager.NOTIFICATION_TYPES.ERROR]: 400,
                [NotificationManager.NOTIFICATION_TYPES.CRITICAL]: 300
            };
            
            oscillator.frequency.setValueAtTime(frequencies[type] || 800, audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.warn('无法播放通知声音:', error);
        }
    }

    /**
     * 设置键盘快捷键
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Esc 键关闭所有通知
            if (e.key === 'Escape' && e.ctrlKey) {
                this.closeAll();
                e.preventDefault();
            }
        });
    }

    /**
     * 持久化通知
     */
    persistNotifications() {
        if (!this.config.enablePersistence) return;
        
        try {
            const persistentNotifications = Array.from(this.notifications.values())
                .filter(n => n.persistent);
            
            localStorage.setItem('notifications', JSON.stringify(persistentNotifications));
        } catch (error) {
            console.warn('无法持久化通知:', error);
        }
    }

    /**
     * 加载持久化的通知
     */
    loadPersistedNotifications() {
        if (!this.config.enablePersistence) return;
        
        try {
            const stored = localStorage.getItem('notifications');
            if (stored) {
                const notifications = JSON.parse(stored);
                notifications.forEach(notification => {
                    // 重新显示持久通知
                    if (notification.persistent) {
                        this.show({
                            ...notification,
                            duration: 0 // 持久通知不自动关闭
                        });
                    }
                });
            }
        } catch (error) {
            console.warn('无法加载持久化通知:', error);
        }
    }

    /**
     * 切换声音
     */
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        
        this.show({
            type: NotificationManager.NOTIFICATION_TYPES.INFO,
            title: '声音设置',
            message: `通知声音已${this.soundEnabled ? '开启' : '关闭'}`,
            duration: 2000
        });
    }

    /**
     * 获取通知统计
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            active: this.notifications.size,
            total: this.notificationHistory.length,
            byType: this.getStatsByType(),
            soundEnabled: this.soundEnabled
        };
    }

    /**
     * 按类型获取统计
     * @returns {Object} 类型统计
     */
    getStatsByType() {
        const stats = {};
        
        this.notificationHistory.forEach(notification => {
            stats[notification.type] = (stats[notification.type] || 0) + 1;
        });
        
        return stats;
    }

    /**
     * 转义HTML
     * @param {string} text - 要转义的文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 事件监听器管理
     */
    addEventListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    removeEventListener(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            for (const callback of this.listeners.get(event)) {
                try {
                    callback(data);
                } catch (error) {
                    console.error('通知事件监听器执行失败:', error);
                }
            }
        }
    }

    /**
     * 清理资源
     */
    cleanup() {
        this.closeAll();
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        this.listeners.clear();
        this.notificationHistory = [];
        
        console.log('NotificationManager 资源已清理');
    }
}