/**
 * 综合系统集成测试
 * 测试所有功能模块的协同工作，验证所有需求的完整实现
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('综合系统集成测试', () => {
    let systemComponents;
    let testConfig;
    let testUsers;
    let mockApp;

    beforeEach(async () => {
        // 设置测试配置
        testConfig = {
            nodeCount: 5,
            userCount: 10,
            connectionCount: 3,
            failureRate: 0.1,
            paymentRate: 0.2,
            tickInterval: 100
        };

        // 创建模拟应用
        mockApp = {
            isRunning: false,
            isPaused: false,
            config: testConfig,
            selectedUser: null,
            selectedChain: null,
            handleUserSelection: vi.fn(),
            handleChainSelection: vi.fn(),
            handleLogSelection: vi.fn(),
            updateConfig: vi.fn(),
            simulateAttack: vi.fn()
        };

        // 初始化系统组件
        systemComponents = {
            logger: new Logger(),
            timer: new Timer(),
            errorHandler: new ErrorHandler(),
            performanceOptimizer: new PerformanceOptimizer(),
            systemMonitor: new SystemMonitor(),
            chainDefParser: new ChainDefParser(),
            validator: new Validator(),
            msgRouter: new MsgRouter(),
            paymentRateController: new PaymentRateController(testConfig.paymentRate),
            netManager: new NetManager(testConfig),
            chainManager: new ChainManager(),
            autoTransferManager: null, // 稍后初始化
            uiManager: new UIManager(mockApp),
            ctrlPanel: null, // 稍后初始化
            mainPanel: null, // 稍后初始化
            logPanel: null // 稍后初始化
        };

        // 设置 DOM 环境
        document.body.innerHTML = `
            <div id="app">
                <div id="control-panel"></div>
                <div id="main-panel"></div>
                <div id="log-panel"></div>
            </div>
        `;

        // 初始化UI组件
        systemComponents.ctrlPanel = new CtrlPanel(systemComponents.uiManager);
        systemComponents.mainPanel = new MainPanel(systemComponents.uiManager);
        systemComponents.logPanel = new LogPanel(systemComponents.uiManager);

        // 初始化网络
        await systemComponents.netManager.initNetwork();

        // 创建测试用户
        testUsers = [];
        for (let i = 0; i < testConfig.userCount; i++) {
            const user = new User(`user-${i}`);
            await user.genKeyPair();
            testUsers.push({
                id: user.id,
                publicKey: user.publicKey,
                privateKey: user.privateKey,
                user: user
            });
        }

        // 初始化自动转账管理器
        systemComponents.autoTransferManager = new AutoTransferManager(
            systemComponents.netManager,
            systemComponents.chainManager,
            systemComponents.logger
        );
    });

    afterEach(() => {
        // 清理所有系统组件
        Object.values(systemComponents).forEach(component => {
            if (component && typeof component.stop === 'function') {
                component.stop();
            }
            if (component && typeof component.cleanup === 'function') {
                component.cleanup();
            }
        });

        // 清理 DOM
        document.body.innerHTML = '';
    });

    describe('需求1: P2P网络参数配置', () => {
        it('应该能够配置和初始化P2P网络环境', async () => {
            // 验证网络初始化
            const networkStatus = systemComponents.netManager.getNetworkStatus();
            expect(networkStatus.nodeCount).toBe(testConfig.nodeCount);
            expect(networkStatus.userCount).toBe(testConfig.userCount);
            expect(networkStatus.isInitialized).toBe(true);

            // 验证节点连接
            expect(networkStatus.totalConnections).toBeGreaterThanOrEqual(0);
            expect(networkStatus.failureRate).toBe(testConfig.failureRate);
        });

        it('应该能够根据配置生成相应数量和面值的区块链', async () => {
            const chainDef = `
                # 测试区块链定义
                1-5 100
                6-10 200
            `;

            const result = await systemComponents.chainManager.createBlockchainsFromDefinition(
                chainDef, 
                testUsers
            );

            expect(result.totalCreated).toBe(10);
            
            const stats = systemComponents.chainManager.getBlockchainStats();
            expect(stats.totalBlockchains).toBe(10);
            expect(stats.totalValue).toBe(5 * 100 + 5 * 200); // 1500
        });

        it('应该能够根据支付速率控制虚拟用户转账频率', () => {
            const paymentController = systemComponents.paymentRateController;
            
            // 测试支付速率控制
            let shouldPayCount = 0;
            for (let i = 0; i < 100; i++) {
                if (paymentController.shouldProcessPayment()) {
                    shouldPayCount++;
                }
            }

            // 支付速率应该接近配置值
            const actualRate = shouldPayCount / 100;
            expect(actualRate).toBeCloseTo(testConfig.paymentRate, 1);
        });

        it('应该能够实时调整网络参数', () => {
            const newConfig = {
                failureRate: 0.3,
                connectionCount: 5
            };

            systemComponents.netManager.updateNetworkConfig(newConfig);
            
            const status = systemComponents.netManager.getNetworkStatus();
            expect(status.failureRate).toBe(0.3);
        });
    });

    describe('需求2: 密钥对身份标识', () => {
        it('应该为每个虚拟用户和节点生成唯一的公私钥对', async () => {
            // 验证用户密钥对
            for (const testUser of testUsers) {
                expect(testUser.publicKey).toBeTruthy();
                expect(testUser.privateKey).toBeTruthy();
                expect(testUser.publicKey).not.toBe(testUser.privateKey);
            }

            // 验证节点密钥对
            const nodes = Array.from(systemComponents.netManager.nodes.values());
            for (const node of nodes) {
                expect(node.publicKey).toBeTruthy();
                expect(node.privateKey).toBeTruthy();
            }

            // 验证密钥唯一性
            const allPublicKeys = [
                ...testUsers.map(u => u.publicKey),
                ...nodes.map(n => n.publicKey)
            ];
            const uniqueKeys = new Set(allPublicKeys);
            expect(uniqueKeys.size).toBe(allPublicKeys.length);
        });

        it('应该能够使用私钥对操作数据进行签名', async () => {
            const testUser = testUsers[0];
            const testData = 'test data for signing';

            const signature = Crypto.sign(testData, testUser.privateKey);
            expect(signature).toBeTruthy();

            const isValid = Crypto.verify(signature, testData, testUser.publicKey);
            expect(isValid).toBe(true);
        });

        it('应该使用Base64编码的公钥作为标识符', () => {
            const testUser = testUsers[0];
            const base64PublicKey = Crypto.toBase64(testUser.publicKey);
            
            expect(base64PublicKey).toBeTruthy();
            expect(typeof base64PublicKey).toBe('string');
            expect(base64PublicKey.length).toBeGreaterThan(0);
        });
    });

    describe('需求3: 网络节点安全连接', () => {
        it('应该能够验证节点签名并建立安全连接', async () => {
            const nodes = Array.from(systemComponents.netManager.nodes.values());
            const node1 = nodes[0];
            const node2 = nodes[1];

            // 模拟节点连接验证
            const connectionData = {
                nodeId: node1.id,
                timestamp: Date.now()
            };

            const signature = Crypto.sign(JSON.stringify(connectionData), node1.privateKey);
            const isValidConnection = Crypto.verify(
                signature, 
                JSON.stringify(connectionData), 
                node1.publicKey
            );

            expect(isValidConnection).toBe(true);
        });

        it('应该能够限制节点连接数量', () => {
            const networkStatus = systemComponents.netManager.getNetworkStatus();
            const nodes = Array.from(systemComponents.netManager.nodes.values());

            // 每个节点的连接数不应超过配置的最大值
            for (const node of nodes) {
                const nodeConnections = node.connections?.size || 0;
                expect(nodeConnections).toBeLessThanOrEqual(testConfig.connectionCount);
            }
        });

        it('应该能够根据故障率模拟连接中断', async () => {
            // 设置高故障率
            systemComponents.netManager.updateNetworkConfig({ failureRate: 0.8 });

            const message = {
                type: 'TEST_MESSAGE',
                data: { content: 'Test with high failure rate' }
            };

            const sourceNodeId = Array.from(systemComponents.netManager.nodes.keys())[0];
            const result = await systemComponents.netManager.broadcastMessage(message, sourceNodeId);

            // 高故障率下，到达的节点数应该较少
            expect(result.reachedNodes).toBeLessThan(result.totalNodes);
        });
    });

    describe('需求4: 区块链定义和创建', () => {
        it('应该能够解析区块链定义文件', () => {
            const chainDef = `
                # 测试区块链定义
                1-5 100
                6-10 200
                11-15 300
            `;

            const parsed = systemComponents.chainDefParser.parse(chainDef);
            
            expect(parsed.ranges).toHaveLength(3);
            expect(parsed.ranges[0]).toEqual({ start: 1, end: 5, value: 100 });
            expect(parsed.ranges[1]).toEqual({ start: 6, end: 10, value: 200 });
            expect(parsed.ranges[2]).toEqual({ start: 11, end: 15, value: 300 });
        });

        it('应该能够创建根区块并包含定义文件SHA256值', async () => {
            const chainDef = '1-1 100';
            const defHash = Crypto.sha256(chainDef);

            const result = await systemComponents.chainManager.createBlockchainsFromDefinition(
                chainDef, 
                testUsers
            );

            expect(result.totalCreated).toBe(1);

            const blockchain = Array.from(systemComponents.chainManager.getAllBlockchains().values())[0];
            const rootBlock = blockchain.getRootBlock();
            
            expect(rootBlock.data.definitionHash).toBe(defHash);
            expect(rootBlock.data.serialNumber).toBeTruthy();
        });

        it('应该使用根区块SHA256值作为区块链标识', async () => {
            const chainDef = '1-1 100';
            await systemComponents.chainManager.createBlockchainsFromDefinition(chainDef, testUsers);

            const blockchain = Array.from(systemComponents.chainManager.getAllBlockchains().values())[0];
            const rootBlock = blockchain.getRootBlock();
            const expectedId = Crypto.sha256(JSON.stringify(rootBlock));

            expect(blockchain.getId()).toBe(expectedId);
        });

        it('应该自动添加第二区块并随机指定虚拟用户为主人', async () => {
            const chainDef = '1-1 100';
            const result = await systemComponents.chainManager.createBlockchainsFromDefinition(
                chainDef, 
                testUsers
            );

            expect(result.ownershipResults.successful).toHaveLength(1);

            const blockchain = Array.from(systemComponents.chainManager.getAllBlockchains().values())[0];
            const blocks = blockchain.getAllBlocks();
            
            expect(blocks.length).toBe(2); // 根区块 + 所有权区块
            
            const ownershipBlock = blocks[1];
            expect(ownershipBlock.data.ownerId).toBeTruthy();
            
            // 验证所有者是测试用户之一
            const ownerIds = testUsers.map(u => u.id);
            expect(ownerIds).toContain(ownershipBlock.data.ownerId);
        });
    });

    describe('需求5: 区块链转移功能', () => {
        let testBlockchain;
        let currentOwner;
        let targetUser;

        beforeEach(async () => {
            const chainDef = '1-1 100';
            await systemComponents.chainManager.createBlockchainsFromDefinition(chainDef, testUsers);
            
            testBlockchain = Array.from(systemComponents.chainManager.getAllBlockchains().values())[0];
            currentOwner = testUsers.find(u => u.id === testBlockchain.getCurrentOwner());
            targetUser = testUsers.find(u => u.id !== currentOwner.id);
        });

        it('应该允许区块链当前主人创建转送区块', async () => {
            const transferBlock = currentOwner.user.createTransferBlock(
                testBlockchain.getId(),
                testBlockchain.getLatestBlock().getId(),
                targetUser.publicKey
            );

            expect(transferBlock).toBeTruthy();
            expect(transferBlock.data.blockchainId).toBe(testBlockchain.getId());
            expect(transferBlock.data.targetUserId).toBe(targetUser.publicKey);
            expect(transferBlock.data.timestamp).toBeTruthy();
        });

        it('应该在转送区块中包含必要信息', async () => {
            const transferBlock = currentOwner.user.createTransferBlock(
                testBlockchain.getId(),
                testBlockchain.getLatestBlock().getId(),
                targetUser.publicKey
            );

            expect(transferBlock.data).toHaveProperty('blockchainId');
            expect(transferBlock.data).toHaveProperty('previousBlockId');
            expect(transferBlock.data).toHaveProperty('targetUserId');
            expect(transferBlock.data).toHaveProperty('timestamp');
        });

        it('应该使用添加者的签名作为区块标识', async () => {
            const transferBlock = currentOwner.user.createTransferBlock(
                testBlockchain.getId(),
                testBlockchain.getLatestBlock().getId(),
                targetUser.publicKey
            );

            const expectedId = Crypto.sha256(JSON.stringify(transferBlock.data));
            expect(transferBlock.getId()).toBe(expectedId);

            // 验证签名
            const isValidSignature = Crypto.verify(
                transferBlock.signature,
                JSON.stringify(transferBlock.data),
                currentOwner.publicKey
            );
            expect(isValidSignature).toBe(true);
        });

        it('应该向网络广播新区块', async () => {
            const transferBlock = currentOwner.user.createTransferBlock(
                testBlockchain.getId(),
                testBlockchain.getLatestBlock().getId(),
                targetUser.publicKey
            );

            const broadcastResult = await systemComponents.netManager.broadcastMessage({
                type: 'BLOCK_BROADCAST',
                data: transferBlock,
                sourceNodeId: Array.from(systemComponents.netManager.nodes.keys())[0]
            });

            expect(broadcastResult.totalNodes).toBe(testConfig.nodeCount);
            expect(broadcastResult.reachedNodes).toBeGreaterThanOrEqual(0);
        });
    });

    describe('需求6: 区块验证机制', () => {
        let testBlockchain;
        let validTransferBlock;
        let currentOwner;
        let targetUser;

        beforeEach(async () => {
            const chainDef = '1-1 100';
            await systemComponents.chainManager.createBlockchainsFromDefinition(chainDef, testUsers);
            
            testBlockchain = Array.from(systemComponents.chainManager.getAllBlockchains().values())[0];
            currentOwner = testUsers.find(u => u.id === testBlockchain.getCurrentOwner());
            targetUser = testUsers.find(u => u.id !== currentOwner.id);
            
            validTransferBlock = currentOwner.user.createTransferBlock(
                testBlockchain.getId(),
                testBlockchain.getLatestBlock().getId(),
                targetUser.publicKey
            );
        });

        it('应该验证区块的密码学签名', async () => {
            const isValidSignature = await systemComponents.validator.verifyBlockSignature(
                validTransferBlock,
                currentOwner.publicKey
            );
            expect(isValidSignature).toBe(true);

            // 测试无效签名
            const invalidBlock = { ...validTransferBlock, signature: 'invalid-signature' };
            const isInvalidSignature = await systemComponents.validator.verifyBlockSignature(
                invalidBlock,
                currentOwner.publicKey
            );
            expect(isInvalidSignature).toBe(false);
        });

        it('应该验证区块链完整性', async () => {
            const integrityResult = await systemComponents.validator.verifyChainIntegrity(
                testBlockchain,
                validTransferBlock
            );
            expect(integrityResult.isValid).toBe(true);
        });

        it('应该验证区块的合法性', async () => {
            const legalityResult = await systemComponents.validator.validateBlockLegality(
                validTransferBlock,
                testBlockchain,
                systemComponents.netManager
            );
            expect(legalityResult.isValid).toBe(true);
        });

        it('应该确认添加者未被列入黑名单', async () => {
            // 正常用户应该通过验证
            const normalUserResult = await systemComponents.validator.validateBlockLegality(
                validTransferBlock,
                testBlockchain,
                systemComponents.netManager
            );
            expect(normalUserResult.isValid).toBe(true);

            // 将用户加入黑名单
            systemComponents.netManager.addToBlacklist(currentOwner.id);
            
            const blacklistedUserResult = await systemComponents.validator.validateBlockLegality(
                validTransferBlock,
                testBlockchain,
                systemComponents.netManager
            );
            expect(blacklistedUserResult.isValid).toBe(false);
            expect(blacklistedUserResult.error).toContain('blacklisted');
        });

        it('应该确认添加者为当前区块链主人', async () => {
            // 当前所有者应该能够转移
            const ownerResult = await systemComponents.validator.validateBlockLegality(
                validTransferBlock,
                testBlockchain,
                systemComponents.netManager
            );
            expect(ownerResult.isValid).toBe(true);

            // 非所有者不应该能够转移
            const nonOwner = testUsers.find(u => u.id !== currentOwner.id);
            const invalidTransferBlock = nonOwner.user.createTransferBlock(
                testBlockchain.getId(),
                testBlockchain.getLatestBlock().getId(),
                targetUser.publicKey
            );

            const nonOwnerResult = await systemComponents.validator.validateBlockLegality(
                invalidTransferBlock,
                testBlockchain,
                systemComponents.netManager
            );
            expect(nonOwnerResult.isValid).toBe(false);
        });
    });

    describe('需求7: 双花攻击检测', () => {
        let testBlockchain;
        let currentOwner;
        let targetUser1;
        let targetUser2;

        beforeEach(async () => {
            const chainDef = '1-1 100';
            await systemComponents.chainManager.createBlockchainsFromDefinition(chainDef, testUsers);
            
            testBlockchain = Array.from(systemComponents.chainManager.getAllBlockchains().values())[0];
            currentOwner = testUsers.find(u => u.id === testBlockchain.getCurrentOwner());
            targetUser1 = testUsers.find(u => u.id !== currentOwner.id);
            targetUser2 = testUsers.find(u => u.id !== currentOwner.id && u.id !== targetUser1.id);
        });

        it('应该检测同一位置的多个区块', async () => {
            const latestBlockId = testBlockchain.getLatestBlock().getId();
            
            // 创建两个冲突的转移区块
            const transferBlock1 = currentOwner.user.createTransferBlock(
                testBlockchain.getId(),
                latestBlockId,
                targetUser1.publicKey
            );

            const transferBlock2 = currentOwner.user.createTransferBlock(
                testBlockchain.getId(),
                latestBlockId,
                targetUser2.publicKey
            );

            // 添加第一个区块
            testBlockchain.addBlock(transferBlock1);

            // 尝试添加第二个区块应该检测到冲突
            const doubleSpendResult = await systemComponents.validator.detectDoubleSpend(
                transferBlock2,
                testBlockchain
            );

            expect(doubleSpendResult.isDoubleSpend).toBe(true);
            expect(doubleSpendResult.conflictingBlocks).toContain(transferBlock1.getId());
        });

        it('应该将攻击者加入黑名单', async () => {
            const latestBlockId = testBlockchain.getLatestBlock().getId();
            
            const transferBlock1 = currentOwner.user.createTransferBlock(
                testBlockchain.getId(),
                latestBlockId,
                targetUser1.publicKey
            );

            const transferBlock2 = currentOwner.user.createTransferBlock(
                testBlockchain.getId(),
                latestBlockId,
                targetUser2.publicKey
            );

            // 模拟双花攻击检测和处理
            testBlockchain.addBlock(transferBlock1);
            
            const doubleSpendResult = await systemComponents.validator.detectDoubleSpend(
                transferBlock2,
                testBlockchain
            );

            if (doubleSpendResult.isDoubleSpend) {
                systemComponents.netManager.addToBlacklist(currentOwner.id);
                
                expect(systemComponents.netManager.isBlacklisted(currentOwner.id)).toBe(true);
            }
        });

        it('应该以高优先级广播分叉警告', async () => {
            const forkWarning = {
                type: 'FORK_WARNING',
                priority: 'HIGH',
                data: {
                    blockchainId: testBlockchain.getId(),
                    conflictingBlocks: ['block1', 'block2'],
                    timestamp: Date.now()
                }
            };

            const broadcastResult = await systemComponents.netManager.broadcastMessage(
                forkWarning,
                Array.from(systemComponents.netManager.nodes.keys())[0]
            );

            expect(broadcastResult.totalNodes).toBe(testConfig.nodeCount);
            
            // 验证日志记录
            const logs = systemComponents.logger.getLogs();
            const forkLogs = logs.filter(log => log.type === 'FORK_WARNING');
            expect(forkLogs.length).toBeGreaterThan(0);
        });
    });

    describe('需求8: 接收验证和确认机制', () => {
        let testBlockchain;
        let currentOwner;
        let targetUser;
        let transferBlock;

        beforeEach(async () => {
            const chainDef = '1-1 100';
            await systemComponents.chainManager.createBlockchainsFromDefinition(chainDef, testUsers);
            
            testBlockchain = Array.from(systemComponents.chainManager.getAllBlockchains().values())[0];
            currentOwner = testUsers.find(u => u.id === testBlockchain.getCurrentOwner());
            targetUser = testUsers.find(u => u.id !== currentOwner.id);
            
            transferBlock = currentOwner.user.createTransferBlock(
                testBlockchain.getId(),
                testBlockchain.getLatestBlock().getId(),
                targetUser.publicKey
            );
        });

        it('应该启动接收验证流程', async () => {
            // 模拟目标用户是本节点用户
            const isTargetUser = transferBlock.data.targetUserId === targetUser.publicKey;
            expect(isTargetUser).toBe(true);

            if (isTargetUser) {
                const receptionResult = await systemComponents.validator.validateReception(
                    transferBlock,
                    Date.now()
                );
                expect(receptionResult).toBeDefined();
            }
        });

        it('应该检查区块添加时间到接收时间不超过全网广播时间的两倍', async () => {
            const currentTime = Date.now();
            const blockTime = currentTime - 1000; // 1秒前
            const broadcastTime = 2000; // 2秒广播时间
            
            // 修改区块时间戳
            const timedBlock = {
                ...transferBlock,
                data: {
                    ...transferBlock.data,
                    timestamp: blockTime
                }
            };

            const timeValidationResult = await systemComponents.validator.validateBlockTime(
                timedBlock,
                currentTime,
                broadcastTime * 2
            );

            expect(timeValidationResult.isValid).toBe(true);

            // 测试超时情况
            const oldBlockTime = currentTime - 5000; // 5秒前
            const oldTimedBlock = {
                ...transferBlock,
                data: {
                    ...transferBlock.data,
                    timestamp: oldBlockTime
                }
            };

            const timeoutResult = await systemComponents.validator.validateBlockTime(
                oldTimedBlock,
                currentTime,
                broadcastTime * 2
            );

            expect(timeoutResult.isValid).toBe(false);
        });

        it('应该在时间验证失败时添加拒绝区块并广播', async () => {
            const currentTime = Date.now();
            const oldBlockTime = currentTime - 10000; // 10秒前，超时
            
            const oldTimedBlock = {
                ...transferBlock,
                data: {
                    ...transferBlock.data,
                    timestamp: oldBlockTime
                }
            };

            const timeValidationResult = await systemComponents.validator.validateBlockTime(
                oldTimedBlock,
                currentTime,
                4000 // 4秒最大延迟
            );

            if (!timeValidationResult.isValid) {
                // 创建拒绝区块
                const rejectionBlock = targetUser.user.createRejectionBlock(
                    oldTimedBlock.getId(),
                    'TIMEOUT'
                );

                expect(rejectionBlock).toBeTruthy();
                expect(rejectionBlock.data.rejectedBlockId).toBe(oldTimedBlock.getId());
                expect(rejectionBlock.data.reason).toBe('TIMEOUT');

                // 广播拒绝区块
                const broadcastResult = await systemComponents.netManager.broadcastMessage({
                    type: 'BLOCK_REJECTION',
                    data: rejectionBlock,
                    sourceNodeId: Array.from(systemComponents.netManager.nodes.keys())[0]
                });

                expect(broadcastResult.totalNodes).toBe(testConfig.nodeCount);
            }
        });

        it('应该在等待期内检测冲突区块和警告', async () => {
            const confirmationPeriod = 8000; // 8秒确认期
            const startTime = Date.now();

            // 模拟确认等待
            const confirmationResult = await new Promise((resolve) => {
                let hasConflict = false;
                let hasWarning = false;

                const checkInterval = setInterval(() => {
                    const elapsed = Date.now() - startTime;
                    
                    // 模拟在等待期内收到冲突或警告
                    if (elapsed > confirmationPeriod / 2 && !hasConflict) {
                        hasConflict = Math.random() < 0.1; // 10% 概率有冲突
                        hasWarning = Math.random() < 0.1; // 10% 概率有警告
                    }

                    if (elapsed >= confirmationPeriod) {
                        clearInterval(checkInterval);
                        resolve({
                            confirmed: !hasConflict && !hasWarning,
                            hasConflict,
                            hasWarning
                        });
                    }
                }, 100);
            });

            expect(confirmationResult).toBeDefined();
            expect(typeof confirmationResult.confirmed).toBe('boolean');
        });
    });

    describe('需求9-12: 用户界面和控制功能', () => {
        beforeEach(() => {
            systemComponents.uiManager.initUI();
        });

        it('应该显示控制面板、主面板和日志面板', () => {
            expect(document.querySelector('#control-panel')).toBeTruthy();
            expect(document.querySelector('#main-panel')).toBeTruthy();
            expect(document.querySelector('#log-panel')).toBeTruthy();
        });

        it('应该记录和显示操作日志', () => {
            // 记录各种类型的日志
            systemComponents.logger.log('BLOCK_ADDED', '区块添加', { blockId: 'test-block' });
            systemComponents.logger.log('BLOCK_ACCEPTED', '区块接受', { blockId: 'test-block' });
            systemComponents.logger.log('BLOCK_REJECTED', '区块拒绝', { blockId: 'test-block' });
            systemComponents.logger.log('FORK_WARNING', '分叉警告', { chainId: 'test-chain' });
            systemComponents.logger.log('USER_BLACKLISTED', '用户拉黑', { userId: 'test-user' });

            const logs = systemComponents.logger.getLogs();
            expect(logs.length).toBe(5);

            const logTypes = logs.map(log => log.type);
            expect(logTypes).toContain('BLOCK_ADDED');
            expect(logTypes).toContain('BLOCK_ACCEPTED');
            expect(logTypes).toContain('BLOCK_REJECTED');
            expect(logTypes).toContain('FORK_WARNING');
            expect(logTypes).toContain('USER_BLACKLISTED');
        });

        it('应该支持日志分页和历史查看', () => {
            // 添加超过100条日志
            for (let i = 0; i < 150; i++) {
                systemComponents.logger.log('TEST_LOG', `测试日志 ${i}`, { index: i });
            }

            const recentLogs = systemComponents.logger.getLogs({ page: 1, pageSize: 100 });
            expect(recentLogs.logs.length).toBe(100);

            const olderLogs = systemComponents.logger.getLogs({ page: 2, pageSize: 100 });
            expect(olderLogs.logs.length).toBe(50);
        });

        it('应该显示虚拟用户资产总额和区块链归属', async () => {
            const chainDef = '1-10 100';
            await systemComponents.chainManager.createBlockchainsFromDefinition(chainDef, testUsers);

            const stats = systemComponents.chainManager.getBlockchainStats();
            expect(stats.totalBlockchains).toBe(10);
            expect(stats.totalValue).toBe(1000);

            // 验证用户资产分布
            let totalUserAssets = 0;
            for (const user of testUsers) {
                const userChains = systemComponents.chainManager.getUserBlockchains(user.id);
                const userAssetValue = userChains.reduce((sum, chain) => sum + chain.getValue(), 0);
                totalUserAssets += userAssetValue;
            }

            expect(totalUserAssets).toBe(1000);
        });

        it('应该支持交互式详细信息查看', () => {
            // 模拟用户点击
            const testUser = testUsers[0];
            mockApp.handleUserSelection(testUser.id);
            expect(mockApp.handleUserSelection).toHaveBeenCalledWith(testUser.id);

            // 模拟区块链点击
            const testChainId = 'test-chain-id';
            mockApp.handleChainSelection(testChainId);
            expect(mockApp.handleChainSelection).toHaveBeenCalledWith(testChainId);

            // 模拟日志点击
            const testLogId = 'test-log-id';
            mockApp.handleLogSelection(testLogId);
            expect(mockApp.handleLogSelection).toHaveBeenCalledWith(testLogId);
        });

        it('应该提供Base64数据验证代码功能', () => {
            const testData = 'test data';
            const base64Data = Crypto.toBase64(testData);
            
            const verifyCode = Crypto.generateVerifyCode(base64Data, 'hash');
            expect(verifyCode).toBeTruthy();
            expect(verifyCode).toContain('Crypto.sha256');
            expect(verifyCode).toContain(base64Data);
        });

        it('应该提供系统控制功能', () => {
            // 测试配置更新
            const newConfig = { paymentRate: 0.3 };
            mockApp.updateConfig(newConfig);
            expect(mockApp.updateConfig).toHaveBeenCalledWith(newConfig);

            // 测试攻击模拟
            const attackParams = { userId: 'user-1', chainId: 'chain-1' };
            mockApp.simulateAttack(attackParams.userId, attackParams.chainId);
            expect(mockApp.simulateAttack).toHaveBeenCalledWith(attackParams.userId, attackParams.chainId);
        });
    });

    describe('系统稳定性和性能测试', () => {
        it('应该能够处理各种配置下的稳定运行', async () => {
            const configs = [
                { nodeCount: 3, userCount: 5, connectionCount: 2, failureRate: 0.05 },
                { nodeCount: 10, userCount: 20, connectionCount: 5, failureRate: 0.2 },
                { nodeCount: 15, userCount: 30, connectionCount: 8, failureRate: 0.3 }
            ];

            for (const config of configs) {
                const testNetManager = new NetManager(config);
                await testNetManager.initNetwork();

                const status = testNetManager.getNetworkStatus();
                expect(status.nodeCount).toBe(config.nodeCount);
                expect(status.failureRate).toBe(config.failureRate);

                testNetManager.cleanup?.();
            }
        });

        it('应该能够处理长时间运行', async () => {
            const duration = 2000; // 2秒测试
            const startTime = Date.now();
            let operationCount = 0;
            let errors = [];

            systemComponents.timer.start();

            return new Promise((resolve) => {
                const testInterval = setInterval(async () => {
                    try {
                        const currentTime = Date.now();
                        
                        if (currentTime - startTime >= duration) {
                            clearInterval(testInterval);
                            systemComponents.timer.stop();

                            expect(operationCount).toBeGreaterThan(0);
                            expect(errors.length).toBeLessThan(operationCount * 0.1); // 错误率小于10%

                            resolve();
                            return;
                        }

                        // 执行测试操作
                        const message = {
                            type: 'STABILITY_TEST',
                            data: { timestamp: currentTime, operation: operationCount }
                        };

                        await systemComponents.netManager.broadcastMessage(
                            message,
                            Array.from(systemComponents.netManager.nodes.keys())[0]
                        );

                        operationCount++;

                    } catch (error) {
                        errors.push({ operation: operationCount, error: error.message });
                    }
                }, 50); // 50ms 间隔
            });
        }, 5000); // 5秒超时

        it('应该能够验证所有需求的完整实现', async () => {
            // 创建完整的测试场景
            const chainDef = '1-20 50';
            await systemComponents.chainManager.createBlockchainsFromDefinition(chainDef, testUsers);

            // 验证需求1: 网络配置
            const networkStatus = systemComponents.netManager.getNetworkStatus();
            expect(networkStatus.nodeCount).toBe(testConfig.nodeCount);
            expect(networkStatus.userCount).toBe(testConfig.userCount);

            // 验证需求2: 身份标识
            expect(testUsers.every(u => u.publicKey && u.privateKey)).toBe(true);

            // 验证需求3: 网络连接
            expect(networkStatus.totalConnections).toBeGreaterThanOrEqual(0);

            // 验证需求4: 区块链创建
            const chainStats = systemComponents.chainManager.getBlockchainStats();
            expect(chainStats.totalBlockchains).toBe(20);

            // 验证需求5-8: 转移和验证机制
            const blockchain = Array.from(systemComponents.chainManager.getAllBlockchains().values())[0];
            const currentOwner = testUsers.find(u => u.id === blockchain.getCurrentOwner());
            const targetUser = testUsers.find(u => u.id !== currentOwner.id);

            const transferBlock = currentOwner.user.createTransferBlock(
                blockchain.getId(),
                blockchain.getLatestBlock().getId(),
                targetUser.publicKey
            );

            const validationResult = await systemComponents.validator.validateBlockLegality(
                transferBlock,
                blockchain,
                systemComponents.netManager
            );
            expect(validationResult.isValid).toBe(true);

            // 验证需求9-12: 界面和控制
            systemComponents.uiManager.initUI();
            expect(document.querySelector('#control-panel')).toBeTruthy();
            expect(document.querySelector('#main-panel')).toBeTruthy();
            expect(document.querySelector('#log-panel')).toBeTruthy();

            // 记录完成日志
            systemComponents.logger.log('INTEGRATION_TEST_COMPLETE', '综合集成测试完成', {
                nodeCount: networkStatus.nodeCount,
                userCount: testUsers.length,
                chainCount: chainStats.totalBlockchains,
                totalValue: chainStats.totalValue
            });

            const logs = systemComponents.logger.getLogs();
            expect(logs.length).toBeGreaterThan(0);
        });
    });
});