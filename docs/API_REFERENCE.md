# P2P 区块链 Playground API 参考文档

## 概述

本文档提供了 P2P 区块链 Playground 系统的完整 API 参考，包括所有核心类、方法和接口的详细说明。

## 核心模块

### 1. 应用程序入口 (App)

#### 类：App
主应用程序类，负责系统的整体协调和生命周期管理。

```javascript
class App {
    constructor()
    async init()
    start(config)
    pause()
    resume()
    stop()
    updateConfig(key, value)
    simulateAttack(userId)
    getPerformanceMetrics()
    cleanup()
}
```

**方法详情：**

##### `constructor()`
创建应用程序实例。

**返回值：** `App` - 应用程序实例

##### `async init()`
异步初始化应用程序，包括性能优化器和UI管理器。

**返回值：** `Promise<void>`

**异常：** 
- 初始化失败时抛出错误

##### `start(config)`
启动系统模拟。

**参数：**
- `config` (Object) - 系统配置对象
  - `nodeCount` (number) - 节点数量
  - `userCount` (number) - 用户数量
  - `maxConnections` (number) - 最大连接数
  - `failureRate` (number) - 故障率 (0.0-1.0)
  - `paymentRate` (number) - 支付速率 (0.0-1.0)
  - `chainDefinition` (string) - 区块链定义

**返回值：** `void`

##### `pause()`
暂停系统运行。

**返回值：** `void`

##### `resume()`
恢复系统运行。

**返回值：** `void`

##### `stop()`
停止系统并清理资源。

**返回值：** `void`

### 2. 密码学服务 (Crypto)

#### 类：Crypto
提供所有密码学操作的静态方法集合。

```javascript
class Crypto {
    static async genKeyPair()
    static async sign(data, privateKeyBase64)
    static async verify(signatureBase64, data, publicKeyBase64)
    static async sha256(data)
    static async batchVerify(verificationTasks)
    static async batchGenKeyPairs(count)
    static toBase64(buffer)
    static fromBase64(base64String)
    static genVerifyCode(data, dataType, context)
}
```

**方法详情：**

##### `static async genKeyPair()`
生成 ECDSA P-256 密钥对。

**返回值：** `Promise<Object>`
```javascript
{
    publicKey: string,   // Base64 编码的公钥
    privateKey: string   // Base64 编码的私钥
}
```

**异常：**
- 密钥生成失败时抛出 `Error`

##### `static async sign(data, privateKeyBase64)`
使用私钥对数据进行数字签名。

**参数：**
- `data` (string) - 要签名的数据
- `privateKeyBase64` (string) - Base64 编码的私钥

**返回值：** `Promise<string>` - Base64 编码的签名

**异常：**
- 签名失败时抛出 `Error`

##### `static async verify(signatureBase64, data, publicKeyBase64)`
验证数字签名。

**参数：**
- `signatureBase64` (string) - Base64 编码的签名
- `data` (string) - 原始数据
- `publicKeyBase64` (string) - Base64 编码的公钥

**返回值：** `Promise<boolean>` - 验证结果

##### `static async sha256(data)`
计算数据的 SHA-256 哈希值。

**参数：**
- `data` (string) - 要哈希的数据

**返回值：** `Promise<string>` - 十六进制哈希值

##### `static async batchVerify(verificationTasks)`
批量验证多个签名（性能优化）。

**参数：**
- `verificationTasks` (Array) - 验证任务数组
```javascript
[{
    id: string,
    signature: string,
    message: string,
    publicKey: string
}]
```

**返回值：** `Promise<Array>` - 验证结果数组
```javascript
[{
    id: string,
    success: boolean,
    result?: boolean,
    error?: string
}]
```

### 3. 网络节点 (Node)

#### 类：Node
表示 P2P 网络中的单个节点。

```javascript
class Node {
    constructor(id)
    async genKeyPair()
    getPubKey()
    async verifyNodeSig(signature, data, publicKey)
    async connectTo(otherNode)
    disconnect(nodeId)
    receiveMsg(message, fromNodeId)
    forwardMsg(message, excludeNodeId, allNodes)
    broadcast(message, allNodes)
    getConnectionStatus()
    async signData(data)
}
```

**属性：**
- `id` (string) - 节点唯一标识符
- `publicKey` (string) - Base64 编码的公钥
- `privateKey` (string) - Base64 编码的私钥
- `connections` (Set) - 连接的其他节点ID集合
- `messageQueue` (Array) - 消息队列
- `isInitialized` (boolean) - 初始化状态

**方法详情：**

##### `constructor(id)`
创建节点实例。

**参数：**
- `id` (string) - 节点唯一标识符

##### `async genKeyPair()`
为节点生成密钥对。

**返回值：** `Promise<void>`

**异常：**
- 密钥生成失败时抛出 `Error`

##### `async connectTo(otherNode)`
连接到另一个节点。

**参数：**
- `otherNode` (Node) - 目标节点实例

**返回值：** `Promise<boolean>` - 连接是否成功

### 4. 区块链 (BlockChain)

#### 类：BlockChain
表示单个区块链实例。

```javascript
class BlockChain {
    constructor(definition, serialNumber)
    async createRootBlock(definition, serialNumber)
    async createOwnerBlock(ownerPublicKey, ownerPrivateKey)
    addBlock(block)
    getBlock(blockId)
    getLatestBlock()
    getRootBlock()
    getCurrentOwner()
    getValue()
    getId()
    getSerialNumber()
    async validateChain()
    detectFork(newBlock)
    serialize()
    static deserialize(jsonString)
}
```

### 5. 区块 (Block)

#### 类：Block
表示区块链中的单个区块。

```javascript
class Block {
    constructor(data, prevBlockId, creatorId, timestamp)
    async signBlock(privateKey)
    async verifySignature(publicKey)
    verifyTime(curTime, maxDelay)
    getId()
    getData()
    getCreator()
    getTime()
    getPrevBlockId()
    serialize()
    static deserialize(jsonString)
}
```

### 6. 验证引擎 (Validator)

#### 类：Validator
负责所有区块和区块链的验证逻辑。

```javascript
class Validator {
    constructor()
    async verifySig(block)
    async verifyChainIntegrity(blockchain, block)
    async validateLegality(block, blockchain, network)
    async validateReception(block, recvTime)
    async detectDoubleSpend(block, blockchain)
    cleanupExpiredCache()
    clearCache()
}
```

## 用户界面模块

### 1. UI 管理器 (UIManager)

#### 类：UIManager
管理整个用户界面的协调和更新。

```javascript
class UIManager {
    constructor(app)
    initUI()
    updateDisplay()
    handleUserInteraction(event)
    showVerifyCode(data, type)
    cleanup()
}
```

### 2. 控制面板 (CtrlPanel)

#### 类：CtrlPanel
提供系统控制和配置功能。

```javascript
class CtrlPanel {
    constructor(uiManager)
    render()
    updateUserList(users)
    getConfig()
    setConfig(config)
    handleStart()
    handlePause()
    handleStop()
}
```

### 3. 主面板 (MainPanel)

#### 类：MainPanel
显示网络状态和数据。

```javascript
class MainPanel {
    constructor(uiManager)
    render()
    updateUserAssets(userData)
    updateChainOwnership(chainData)
    showUserDetails(userId)
    showChainDetails(chainId)
    startRealTimeUpdate()
    stopRealTimeUpdate()
}
```

### 4. 日志面板 (LogPanel)

#### 类：LogPanel
显示和管理系统操作日志。

```javascript
class LogPanel {
    constructor(uiManager)
    render()
    addLog(type, message, relatedData)
    filterLogs(filter)
    clearLogs()
    exportLogs()
}
```

## 服务模块

### 1. 网络管理器 (NetManager)

#### 类：NetManager
管理 P2P 网络的初始化和维护。

```javascript
class NetManager {
    constructor(nodeCount, userCount, maxConn, failRate)
    async initNetwork()
    async broadcastMessage(msg, sourceId)
    updateNetworkConfig(config)
    getNetworkStatus()
    simulateFailure()
    repairConnections()
}
```

### 2. 区块链管理器 (ChainManager)

#### 类：ChainManager
管理所有区块链的创建和转移。

```javascript
class ChainManager {
    constructor()
    async createBlockchainsFromDefinition(definitionInput, users)
    async transferBlockchain(chainId, fromUserId, toUserId)
    getUserBlockchains(userId)
    getUserTotalAssets(userId)
    getBlockchainStats()
    async validateIntegrity()
    clear()
}
```

### 3. 时间管理器 (Timer)

#### 类：Timer
控制系统的时间流逝和滴答计数。

```javascript
class Timer {
    constructor()
    start()
    pause()
    resume()
    stop()
    setTickInterval(milliseconds)
    getCurrentTick()
    onTick(callback)
    offTick(callback)
}
```

### 4. 日志系统 (Logger)

#### 类：Logger
记录和管理系统操作日志。

```javascript
class Logger {
    constructor()
    log(type, message, relatedData, level)
    getLogs(filter, page, pageSize)
    getLogsByUser(userId)
    getLogsByChain(chainId)
    exportLogs(filter)
    clearLogs()
}
```

## 数据类型定义

### 网络配置 (NetworkConfig)
```javascript
{
    nodeCount: number,        // 节点数量 (3-15)
    userCount: number,        // 用户数量 (5-50)
    maxConnections: number,   // 最大连接数 (2-6)
    failureRate: number,      // 故障率 (0.0-1.0)
    paymentRate: number,      // 支付速率 (0.0-1.0)
    tickInterval: number      // 滴答间隔 (毫秒)
}
```

### 区块链定义 (ChainDefinition)
```javascript
{
    description: string,      // 描述
    ranges: [{               // 序列号范围数组
        start: number,       // 起始序列号
        end: number,         // 结束序列号
        value: number        // 面值
    }],
    definitionHash: string   // 定义文件的 SHA256 哈希
}
```

### 区块数据 (BlockData)
```javascript
{
    // 根区块
    root: {
        definitionHash: string,
        serialNumber: string
    },
    
    // 所有权区块
    ownership: {
        ownerId: string
    },
    
    // 转移区块
    transfer: {
        blockchainId: string,
        previousBlockId: string,
        targetUserId: string,
        timestamp: number
    }
}
```

### 网络消息 (NetworkMessage)
```javascript
{
    type: string,            // 消息类型
    sourceNodeId: string,    // 源节点ID
    data: Object,           // 消息数据
    timestamp: number,      // 时间戳
    signature: string       // 数字签名
}
```

### 日志条目 (LogEntry)
```javascript
{
    id: string,             // 日志ID
    type: string,           // 日志类型
    message: string,        // 消息内容
    timestamp: number,      // 时间戳
    level: string,          // 日志级别
    relatedData: {          // 相关数据
        userId?: string,
        chainId?: string,
        blockId?: string,
        nodeId?: string
    }
}
```

## 错误类型

### CryptoError
密码学操作相关错误。

```javascript
{
    name: 'CryptoError',
    message: string,
    operation: string,      // 失败的操作
    details: Object        // 错误详情
}
```

### NetworkError
网络操作相关错误。

```javascript
{
    name: 'NetworkError',
    message: string,
    nodeId: string,        // 相关节点ID
    connectionId: string   // 连接ID
}
```

### ValidationError
验证相关错误。

```javascript
{
    name: 'ValidationError',
    message: string,
    blockId: string,       // 相关区块ID
    chainId: string,       // 相关区块链ID
    validationType: string // 验证类型
}
```

## 事件系统

### 事件类型

#### 系统事件
- `system:started` - 系统启动
- `system:paused` - 系统暂停
- `system:resumed` - 系统恢复
- `system:stopped` - 系统停止

#### 网络事件
- `network:initialized` - 网络初始化完成
- `network:node_connected` - 节点连接
- `network:node_disconnected` - 节点断开
- `network:message_broadcast` - 消息广播

#### 区块链事件
- `blockchain:created` - 区块链创建
- `blockchain:transferred` - 区块链转移
- `block:added` - 区块添加
- `block:validated` - 区块验证

#### UI 事件
- `ui:user_selected` - 用户选择
- `ui:chain_selected` - 区块链选择
- `ui:log_selected` - 日志选择

### 事件监听

```javascript
// 监听事件
app.on('system:started', (config) => {
    console.log('系统已启动:', config);
});

// 移除监听器
app.off('system:started', handler);

// 一次性监听
app.once('blockchain:created', (chainData) => {
    console.log('首个区块链已创建:', chainData);
});
```

## 性能优化

### 批量操作
系统支持多种批量操作以提升性能：

```javascript
// 批量验证签名
const results = await Crypto.batchVerify(verificationTasks);

// 批量生成密钥对
const keyPairs = await Crypto.batchGenKeyPairs(10);

// 批量创建区块链
const chains = await chainManager.batchCreateChains(definitions, users);
```

### 缓存机制
验证引擎使用智能缓存减少重复计算：

```javascript
// 验证结果会自动缓存
const result1 = await validator.verifySig(block); // 计算
const result2 = await validator.verifySig(block); // 从缓存获取
```

### 异步处理
所有密码学操作都是异步的，支持并发处理：

```javascript
// 并发验证多个区块
const promises = blocks.map(block => validator.verifySig(block));
const results = await Promise.all(promises);
```

## 安全考虑

### 密钥管理
- 私钥仅在内存中存储，不持久化
- 使用 Web Crypto API 生成密码学安全的密钥
- 支持密钥轮换和更新

### 签名验证
- 所有区块都必须包含有效的数字签名
- 使用 ECDSA P-256 算法
- 支持批量验证优化性能

### 网络安全
- 节点连接需要相互验证
- 消息包含发送者签名
- 支持恶意节点检测和隔离

## 扩展性

### 插件系统
系统支持插件扩展：

```javascript
// 注册验证插件
validator.registerPlugin('custom-validation', customValidator);

// 注册网络插件
netManager.registerPlugin('custom-protocol', customProtocol);
```

### 自定义验证器
```javascript
class CustomValidator extends Validator {
    async customValidation(block) {
        // 自定义验证逻辑
        return { isValid: true };
    }
}
```

### 自定义UI组件
```javascript
class CustomPanel extends UIPanel {
    render() {
        // 自定义渲染逻辑
    }
}

uiManager.registerPanel('custom', CustomPanel);
```

## 调试和测试

### 调试模式
```javascript
// 启用调试模式
app.setDebugMode(true);

// 获取调试信息
const debugInfo = app.getDebugInfo();
```

### 测试工具
```javascript
// 创建测试环境
const testEnv = new TestEnvironment();
await testEnv.setup();

// 运行测试场景
await testEnv.runScenario('double-spend-attack');
```

### 性能分析
```javascript
// 获取性能指标
const metrics = app.getPerformanceMetrics();

// 分析瓶颈
const analysis = performanceAnalyzer.analyze(metrics);
```

## 版本兼容性

### API 版本
当前 API 版本：`1.0.0`

### 向后兼容性
- 主版本号变更表示不兼容的 API 修改
- 次版本号变更表示向后兼容的功能添加
- 修订号变更表示向后兼容的问题修复

### 迁移指南
升级到新版本时，请参考相应的迁移指南：
- [v1.0 to v1.1 迁移指南](MIGRATION_1.0_to_1.1.md)
- [v1.1 to v2.0 迁移指南](MIGRATION_1.1_to_2.0.md)

---

本文档持续更新中。如有疑问或建议，请提交 Issue 或 Pull Request。