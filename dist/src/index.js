/**
 * P2P 区块链 Playground 应用程序入口点
 * 
 * 这是整个应用程序的主入口文件，负责：
 * - 初始化和协调各个核心模块
 * - 管理应用程序的生命周期（启动、暂停、停止）
 * - 处理用户交互和系统配置
 * - 提供模拟数据生成和管理功能
 * 
 * @author P2P Blockchain Playground Team
 * @version 1.0.0
 * @since 2024
 */
import { UIManager } from './ui/UIManager.js';
import { PerformanceOptimizer } from './services/PerformanceOptimizer.js';
import { Crypto } from './services/Crypto.js';

/**
 * 主应用程序类
 * 
 * 负责整个 P2P 区块链 Playground 系统的协调和管理。
 * 这个类是系统的核心控制器，管理所有子系统的生命周期，
 * 处理用户交互，并提供统一的 API 接口。
 * 
 * 主要功能：
 * - 系统初始化和资源管理
 * - 用户界面协调
 * - 性能优化管理
 * - 模拟数据生成和管理
 * - 配置管理和状态控制
 * 
 * @class App
 */
class App {
    /**
     * 创建应用程序实例
     * 
     * 初始化所有必要的属性和状态管理器。
     * 注意：构造函数只进行基本的属性初始化，
     * 实际的系统初始化需要调用 init() 方法。
     * 
     * @constructor
     */
    constructor() {
        /** @type {UIManager} 用户界面管理器 */
        this.uiManager = new UIManager(this);
        
        /** @type {boolean} 系统运行状态 */
        this.isRunning = false;
        
        /** @type {boolean} 系统暂停状态 */
        this.isPaused = false;
        
        /** @type {PerformanceOptimizer} 性能优化器实例 */
        this.performanceOptimizer = null;
        
        /** @type {Object} 系统配置对象 */
        this.config = {
            nodeCount: 5,
            userCount: 10,
            maxConnections: 3,
            failureRate: 0.1,
            paymentRate: 0.2,
            tickInterval: 1000
        };
        
        /** @type {Map<string, Function>} 事件监听器映射 */
        this.eventListeners = new Map();
        
        /** @type {number} 应用启动时间戳 */
        this.startTime = null;
        
        /** @type {Object} 性能指标收集器 */
        this.performanceMetrics = {
            startTime: null,
            operationCounts: new Map(),
            errorCounts: new Map(),
            memoryUsage: []
        };
        
        /** @type {boolean} 系统暂停状态 */
        this.isPaused = false;
        
        /** @type {Object|null} 系统配置对象 */
        this.config = null;
        
        /** @type {PerformanceOptimizer|null} 性能优化器实例 */
        this.performanceOptimizer = null;
        
        /** @type {Map<string, Object>} 模拟用户数据存储 */
        this.mockUsers = new Map();
        
        /** @type {Map<string, Object>} 模拟区块链数据存储 */
        this.mockChains = new Map();
        
        /** @type {string|null} 当前选中的用户ID */
        this.selectedUser = null;
        
        /** @type {string|null} 当前选中的区块链ID */
        this.selectedChain = null;
    }

    /**
     * 异步初始化应用程序
     * 
     * 执行应用程序的完整初始化流程，包括：
     * - 性能优化器初始化
     * - 用户界面初始化
     * - 各个子系统的准备工作
     * 
     * 这个方法必须在使用应用程序的其他功能之前调用。
     * 
     * @async
     * @returns {Promise<void>} 初始化完成的 Promise
     * @throws {Error} 当初始化过程中发生错误时抛出
     */
    async init() {
        console.log('初始化 P2P 区块链 Playground');
        
        // 初始化性能优化器
        await this.initPerformanceOptimizer();
        
        // 初始化用户界面
        this.uiManager.initUI();
    }

    /**
     * 初始化性能优化器
     * 
     * 尝试创建和配置性能优化器实例。如果初始化失败，
     * 系统将回退到默认实现，不会影响核心功能。
     * 
     * 性能优化器提供以下功能：
     * - Web Worker 池管理
     * - 批量密码学操作优化
     * - 内存使用监控
     * - 渲染性能优化
     * 
     * @async
     * @private
     * @returns {Promise<void>} 初始化完成的 Promise
     */
    async initPerformanceOptimizer() {
        try {
            this.performanceOptimizer = new PerformanceOptimizer();
            await this.performanceOptimizer.init();
            
            // 设置 Crypto 服务使用性能优化器
            Crypto.setPerformanceOptimizer(this.performanceOptimizer);
            
            console.log('性能优化器初始化完成');
        } catch (error) {
            console.warn('性能优化器初始化失败，将使用默认实现:', error);
            this.performanceOptimizer = null;
        }
    }

    /**
     * 启动系统模拟
     * 
     * 根据提供的配置启动整个 P2P 区块链网络模拟。
     * 这包括生成模拟数据、初始化网络状态、启动实时更新等。
     * 
     * @param {Object} config - 系统配置对象
     * @param {number} config.nodeCount - 网络节点数量 (3-15)
     * @param {number} config.userCount - 虚拟用户数量 (5-50)
     * @param {number} config.maxConnections - 每个节点的最大连接数 (2-6)
     * @param {number} config.failureRate - 网络连接故障率 (0.0-1.0)
     * @param {number} config.paymentRate - 自动转账频率 (0.0-1.0)
     * @param {string} config.chainDefinition - 区块链定义字符串
     * @throws {Error} 当配置无效或启动失败时抛出
     */
    start(config) {
        console.log('启动系统:', config);
        this.config = config;
        this.isRunning = true;
        this.isPaused = false;
        
        // 生成模拟数据
        this.generateMockData(config);
        
        // 更新用户列表（模拟数据）
        const mockUsers = [];
        for (let i = 1; i <= config.userCount; i++) {
            mockUsers.push({
                id: `user${i}`,
                publicKey: `mockPublicKey${i}${'0'.repeat(40)}`
            });
        }
        
        if (this.uiManager.panels.control) {
            this.uiManager.panels.control.updateUserList(mockUsers);
        }
        
        // 启动主面板实时更新
        if (this.uiManager.panels.main) {
            this.uiManager.panels.main.startRealTimeUpdate();
        }
    }

    /**
     * 暂停系统运行
     * 
     * 暂停当前正在运行的模拟，但保持所有状态和数据。
     * 可以通过调用 resume() 方法恢复运行。
     * 
     * @returns {void}
     */
    pause() {
        console.log('暂停系统');
        this.isPaused = true;
    }

    /**
     * 恢复系统运行
     * 
     * 从暂停状态恢复系统运行，继续之前的模拟过程。
     * 只有在系统处于暂停状态时才有效。
     * 
     * @returns {void}
     */
    resume() {
        console.log('恢复系统');
        this.isPaused = false;
    }

    /**
     * 停止系统运行
     * 
     * 完全停止系统运行并清理所有运行时状态。
     * 这将：
     * - 停止所有实时更新
     * - 清空模拟数据
     * - 重置选择状态
     * - 清除配置信息
     * 
     * @returns {void}
     */
    stop() {
        console.log('停止系统');
        this.isRunning = false;
        this.isPaused = false;
        this.config = null;
        
        // 停止主面板实时更新
        if (this.uiManager.panels.main) {
            this.uiManager.panels.main.stopRealTimeUpdate();
        }
        
        // 清空模拟数据
        this.mockUsers.clear();
        this.mockChains.clear();
        this.selectedUser = null;
        this.selectedChain = null;
    }

    /**
     * 获取系统性能指标
     * 
     * 返回当前系统的性能监控数据，包括：
     * - 性能优化器可用性
     * - 内存使用情况
     * - 处理性能统计
     * - 渲染性能数据
     * 
     * @returns {Object} 性能指标对象
     * @returns {boolean} returns.optimizerAvailable - 性能优化器是否可用
     * @returns {string} [returns.message] - 状态消息（当优化器不可用时）
     * @returns {Object} [returns.memory] - 内存使用统计
     * @returns {Object} [returns.crypto] - 密码学操作性能统计
     * @returns {Object} [returns.rendering] - 渲染性能统计
     */
    getPerformanceMetrics() {
        if (!this.performanceOptimizer) {
            return {
                optimizerAvailable: false,
                message: '性能优化器未初始化'
            };
        }

        return {
            optimizerAvailable: true,
            ...this.performanceOptimizer.getMetrics()
        };
    }

    /**
     * 清理应用程序资源
     * 
     * 执行完整的资源清理流程，包括：
     * - 停止所有运行中的进程
     * - 清理性能优化器
     * - 重置服务状态
     * - 释放内存资源
     * 
     * 这个方法通常在应用程序关闭时调用，
     * 确保所有资源得到正确释放。
     * 
     * @returns {void}
     */
    cleanup() {
        console.log('清理应用资源');
        
        // 停止系统
        this.stop();
        
        // 清理性能优化器
        if (this.performanceOptimizer) {
            this.performanceOptimizer.cleanup();
            this.performanceOptimizer = null;
        }
        
        // 重置 Crypto 服务
        Crypto.setPerformanceOptimizer(null);
        
        console.log('应用资源清理完成');
    }

    /**
     * 动态更新系统配置
     * 
     * 在系统运行时更新指定的配置参数。
     * 只有在系统已启动且配置对象存在时才会生效。
     * 
     * @param {string} key - 配置参数名称
     * @param {*} value - 新的配置值
     * @returns {void}
     * @example
     * app.updateConfig('failureRate', 0.3);
     * app.updateConfig('paymentRate', 0.5);
     */
    updateConfig(key, value) {
        console.log('更新配置:', key, value);
        if (this.config) {
            this.config[key] = value;
        }
    }

    /**
     * 模拟分叉攻击
     * 
     * 触发指定用户的分叉攻击模拟，用于测试系统的安全机制。
     * 这是一个教育和测试功能，用于演示区块链网络如何处理恶意行为。
     * 
     * @param {string} userId - 执行攻击的用户ID
     * @returns {void}
     * @todo 实现实际的攻击模拟逻辑
     */
    simulateAttack(userId) {
        console.log('模拟分叉攻击:', userId);
        // 这里将来会实现实际的攻击模拟逻辑
    }

    /**
     * 处理用户选择事件
     * 
     * 当用户在界面中选择某个虚拟用户时调用。
     * 这是一个占位方法，实际的处理逻辑在重载版本中实现。
     * 
     * @param {string} userId - 被选择的用户ID
     * @returns {void}
     * @deprecated 使用重载版本的 handleUserSelection 方法
     */
    handleUserSelection(userId) {
        console.log('应用处理用户选择:', userId);
    }

    /**
     * 处理区块链选择事件
     * 
     * 当用户在界面中选择某个区块链时调用。
     * 这是一个占位方法，实际的处理逻辑在重载版本中实现。
     * 
     * @param {string} chainId - 被选择的区块链ID
     * @returns {void}
     * @deprecated 使用重载版本的 handleChainSelection 方法
     */
    handleChainSelection(chainId) {
        console.log('应用处理区块链选择:', chainId);
    }

    /**
     * 处理日志选择事件
     * 
     * 当用户在界面中选择某条日志时调用。
     * 可以用于显示相关的详细信息或执行相关操作。
     * 
     * @param {string} logId - 被选择的日志ID
     * @returns {void}
     */
    handleLogSelection(logId) {
        console.log('应用处理日志选择:', logId);
    }

    /**
     * 生成模拟数据
     * 
     * 根据系统配置生成完整的模拟数据集，包括：
     * - 虚拟用户数据（密钥对、资产统计）
     * - 区块链数据（根据定义文件创建）
     * - 区块数据（根区块和所有权区块）
     * - 所有权关系（随机分配区块链给用户）
     * 
     * @private
     * @param {Object} config - 系统配置对象
     * @param {number} config.userCount - 要创建的用户数量
     * @param {string} config.chainDefinition - 区块链定义字符串
     * @returns {void}
     */
    generateMockData(config) {
        this.mockUsers.clear();
        this.mockChains.clear();

        // 生成模拟用户数据
        for (let i = 1; i <= config.userCount; i++) {
            const userId = `user${i}`;
            const publicKey = `mockPublicKey${i}${'0'.repeat(40)}`;
            
            this.mockUsers.set(userId, {
                id: userId,
                publicKey: publicKey,
                totalAssets: Math.floor(Math.random() * 500) + 100,
                chainCount: Math.floor(Math.random() * 10) + 1,
                ownedChains: []
            });
        }

        // 生成模拟区块链数据
        const chainDefinition = this.parseChainDefinition(config.chainDefinition);
        let chainCounter = 1;
        
        for (const range of chainDefinition.ranges) {
            for (let serial = range.start; serial <= range.end; serial++) {
                const chainId = `chain${chainCounter++}`;
                const randomUserId = `user${Math.floor(Math.random() * config.userCount) + 1}`;
                const randomUser = this.mockUsers.get(randomUserId);
                
                const chainData = {
                    chainId: chainId,
                    ownerId: randomUser.publicKey,
                    ownerUserId: randomUserId,
                    value: range.value,
                    serialNumber: serial.toString(),
                    blocks: [
                        {
                            blockId: `${chainId}_root`,
                            type: 'root',
                            creator: 'system',
                            timestamp: Date.now() - Math.random() * 86400000
                        },
                        {
                            blockId: `${chainId}_owner`,
                            type: 'ownership',
                            creator: randomUser.publicKey,
                            timestamp: Date.now() - Math.random() * 43200000
                        }
                    ]
                };

                this.mockChains.set(chainId, chainData);
                
                // 更新用户的拥有区块链列表
                randomUser.ownedChains.push({
                    chainId: chainId,
                    serialNumber: serial.toString(),
                    value: range.value
                });
            }
        }

        // 重新计算用户资产
        for (const [userId, user] of this.mockUsers) {
            user.totalAssets = user.ownedChains.reduce((total, chain) => total + chain.value, 0);
            user.chainCount = user.ownedChains.length;
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
        
        for (const line of lines) {
            const match = line.trim().match(/^(\d+)-(\d+)\s+(\d+(?:\.\d+)?)$/);
            if (match) {
                const start = parseInt(match[1]);
                const end = parseInt(match[2]);
                const value = parseFloat(match[3]);
                ranges.push({ start, end, value });
            }
        }
        
        return { ranges };
    }

    /**
     * 获取主面板数据
     */
    getMainPanelData() {
        if (!this.isRunning) {
            return {
                userData: new Map(),
                chainData: new Map(),
                networkData: {
                    totalUsers: 0,
                    totalChains: 0,
                    totalValue: 0,
                    activeConnections: 0
                }
            };
        }

        // 计算网络统计数据
        const totalChains = this.mockChains.size;
        const totalValue = Array.from(this.mockChains.values())
            .reduce((sum, chain) => sum + chain.value, 0);
        const activeConnections = this.config ? 
            Math.floor(this.config.nodeCount * this.config.maxConnections * (1 - this.config.failureRate)) : 0;

        return {
            userData: new Map(this.mockUsers),
            chainData: new Map(this.mockChains),
            networkData: {
                totalUsers: this.mockUsers.size,
                totalChains: totalChains,
                totalValue: totalValue,
                activeConnections: activeConnections
            }
        };
    }

    /**
     * 处理用户选择（更新版本）
     */
    handleUserSelection(userId) {
        console.log('应用处理用户选择:', userId);
        this.selectedUser = userId;
        this.selectedChain = null;
        
        // 可以在这里添加日志过滤逻辑
        if (this.uiManager.panels.log) {
            // 过滤显示与该用户相关的日志
            // this.uiManager.panels.log.filterByUser(userId);
        }
    }

    /**
     * 处理区块链选择（更新版本）
     */
    handleChainSelection(chainId) {
        console.log('应用处理区块链选择:', chainId);
        this.selectedChain = chainId;
        this.selectedUser = null;
        
        // 可以在这里添加日志过滤逻辑
        if (this.uiManager.panels.log) {
            // 过滤显示与该区块链相关的日志
            // this.uiManager.panels.log.filterByChain(chainId);
        }
    }
}

// 创建并初始化应用
const app = new App();

// 异步初始化应用
(async () => {
    try {
        await app.init();
        console.log('应用初始化完成');
    } catch (error) {
        console.error('应用初始化失败:', error);
    }
})();

// 导出应用实例供测试使用
window.app = app;

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    app.cleanup();
});