# P2P 区块链 Playground

一个用于教育和研究目的的点对点区块链演示平台。

## 🌟 特性

- **P2P 网络模拟**：可配置的节点网络，支持动态连接管理
- **区块链机制**：完整的区块链创建、转移和验证流程
- **实时可视化**：直观的网络状态和数据显示
- **安全机制**：双花攻击检测、分叉处理、用户黑名单
- **交互界面**：用户友好的控制面板和实时日志
- **密码学验证**：完整的数字签名和哈希验证机制
- **性能监控**：实时性能指标和系统状态监控

## 🚀 快速开始

### 方法 1: 直接运行（推荐）
```bash
# 克隆项目
git clone <repository-url>
cd p2p-blockchain-playground

# 启动本地服务器
npm start
# 或者
python3 -m http.server 8080
```

### 方法 2: 开发模式
```bash
# 安装依赖
npm install

# 运行测试
npm test

# 启动开发服务器
npm run dev
```

然后在浏览器中打开 `http://localhost:8080`

## 📖 使用指南

### 基本操作

1. **配置网络参数**
   - 节点数量：3-15（推荐 5-8）
   - 虚拟用户数量：5-50（推荐 10-20）
   - 连接数：2-6（推荐 3-4）
   - 故障率：0.0-1.0（推荐 0.1-0.3）

2. **设置区块链定义**
   ```json
   {
     "description": "示例区块链定义",
     "ranges": [
       { "start": 1, "end": 10, "value": 100 },
       { "start": 11, "end": 20, "value": 200 }
     ]
   }
   ```

3. **启动模拟**
   - 点击"开始"按钮
   - 观察网络初始化过程
   - 监控自动转账和验证过程

### 高级功能

- **Base64 数据验证**：点击任何 Base64 数据查看验证代码
- **攻击模拟**：测试双花攻击和分叉攻击场景
- **实时调整**：运行时动态调整网络参数
- **日志分析**：详细的操作日志和过滤功能

## 🏗️ 项目结构

```
p2p-blockchain-playground/
├── src/                    # 源代码
│   ├── models/            # 数据模型
│   │   ├── User.js        # 虚拟用户模型
│   │   ├── Node.js        # 网络节点模型
│   │   ├── BlockChain.js  # 区块链模型
│   │   └── Block.js       # 区块模型
│   ├── services/          # 核心服务
│   │   ├── Crypto.js      # 密码学服务
│   │   ├── NetManager.js  # 网络管理器
│   │   ├── ChainManager.js # 区块链管理器
│   │   ├── Validator.js   # 验证引擎
│   │   ├── Timer.js       # 时间管理器
│   │   └── Logger.js      # 日志系统
│   ├── ui/                # 用户界面
│   │   ├── UIManager.js   # 界面管理器
│   │   ├── CtrlPanel.js   # 控制面板
│   │   ├── MainPanel.js   # 主面板
│   │   └── LogPanel.js    # 日志面板
│   ├── styles/            # 样式文件
│   └── index.js           # 应用入口
├── tests/                 # 测试文件
│   ├── models/            # 模型测试
│   ├── services/          # 服务测试
│   ├── ui/                # 界面测试
│   └── integration/       # 集成测试
├── docs/                  # 文档
│   ├── USER_MANUAL.md     # 用户手册
│   └── TECHNICAL_DOCUMENTATION.md # 技术文档
├── index.html             # 主页面
├── package.json           # 项目配置
├── vitest.config.js       # 测试配置
├── DEPLOYMENT.md          # 部署指南
└── README.md              # 项目说明
```

## 🧪 测试

### 运行测试
```bash
# 运行所有测试
npm test

# 监视模式
npm run test:watch

# 测试覆盖率
npm run test:coverage

# 交互式测试界面
npm run test:ui
```

### 测试覆盖率
- 单元测试：覆盖所有核心模块
- 集成测试：验证模块间协作
- 端到端测试：完整用户流程
- 性能测试：系统性能验证

## 📚 文档

- **[用户手册](docs/USER_MANUAL.md)**：详细的使用说明
- **[技术文档](docs/TECHNICAL_DOCUMENTATION.md)**：架构和 API 文档
- **[部署指南](DEPLOYMENT.md)**：部署和配置说明

## 🔧 开发

### 开发环境要求
- Node.js 16.0+
- npm 8.0+
- 现代浏览器（Chrome 90+, Firefox 88+, Safari 14+）

### 开发脚本
```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run lint         # 代码质量检查
npm run clean        # 清理构建文件
npm run validate     # 完整验证（测试+检查）
```

### 代码规范
- 使用 ES6+ 语法
- 模块化设计
- 详细的注释说明
- 完整的测试覆盖

## 🚀 部署

### 本地部署
```bash
# 使用 Python
python3 -m http.server 8080

# 使用 Node.js
npx http-server . -p 8080 -o
```

### 生产部署
支持部署到：
- GitHub Pages
- Netlify
- Vercel
- Apache/Nginx 服务器
- 任何静态文件服务器

详见 [部署指南](DEPLOYMENT.md)

## 🎯 使用场景

### 教育演示
- 区块链基础概念教学
- P2P 网络原理演示
- 密码学机制展示
- 共识算法理解

### 研究测试
- 新算法验证
- 网络性能分析
- 安全机制测试
- 参数优化研究

### 开发调试
- 功能验证
- 集成测试
- 性能调优
- 边界测试

## 🔒 安全特性

- **密码学安全**：使用 Web Crypto API
- **数字签名**：ECDSA 签名验证
- **哈希完整性**：SHA-256 哈希计算
- **攻击检测**：双花和分叉攻击检测
- **身份验证**：节点和用户身份验证

## 📊 性能特性

- **实时处理**：毫秒级响应时间
- **可扩展性**：支持大规模网络模拟
- **内存优化**：高效的内存管理
- **并发处理**：支持并发操作
- **性能监控**：实时性能指标

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

### 贡献指南
- 遵循现有代码风格
- 添加适当的测试
- 更新相关文档
- 确保所有测试通过

## 📝 更新日志

### v1.0.0 (当前版本)
- ✅ 基础 P2P 网络模拟
- ✅ 区块链创建和转移
- ✅ 安全机制实现
- ✅ 用户界面完成
- ✅ 完整测试覆盖
- ✅ 文档和部署指南

### v1.1.0 (计划中)
- 🔄 性能优化
- 🔄 更多攻击场景
- 🔄 增强分析功能
- 🔄 移动端支持

## 🐛 问题反馈

如果遇到问题或有建议，请：

1. 查看 [用户手册](docs/USER_MANUAL.md)
2. 检查 [常见问题](docs/USER_MANUAL.md#故障排除)
3. 提交 Issue
4. 参与讨论

## 📄 许可证

本项目采用 MIT 许可证 - 详见 LICENSE 文件

## 🙏 致谢

感谢所有为本项目做出贡献的开发者和用户！

---

**P2P 区块链 Playground** - 让区块链学习变得简单有趣！