
class HelpTabContent {
    constructor(tabManager) {
        this.tabManager = tabManager;
        this.mainPanel = tabManager.mainPanel;
        this.app = tabManager.mainPanel.app;
        
        this.isInitialized = false;
    }
    
    renderHelpContent( lang ) {
        const container = document.getElementById('help-content');
        if (!container) {
            console.error('Help content container not found');
            return;
        }
        lang = lang || window.Text.language;
        console.log( 'renderHelpContent', lang );
        if (!this.isInitialized) {
            const helpHTML = lang == 'en' ? this.genEnHelpHTML() : this.generateHelpHTML();
            container.innerHTML = helpHTML;
            this.isInitialized = true;
            
            this.setupNavigationEvents();
        }
    }
    
    /**
     * Generate English help content HTML
     * @returns {string} - English help content HTML
     */
    genEnHelpHTML() {
        return `
            <div class="help-container">
                <div class="help-sidebar">
                    <h3>Table of Contents</h3>
                    <ul class="help-nav">
                        <li><a href="#overview" class="help-nav-link">Overview</a></li>
                        <li><a href="#getting-started" class="help-nav-link">Getting Started</a></li>
                        <li><a href="#systemctrls" class="help-nav-link">System Controls</a></li>
                        <li><a href="#networksettings" class="help-nav-link">Network Settings</a></li>
                        <li><a href="#blockchain-definition" class="help-nav-link">Blockchain Definition</a></li>
                        <li><a href="#runtimectrls" class="help-nav-link">Runtime Controls</a></li>
                        <li><a href="#network-view" class="help-nav-link">Network View</a></li>
                        <li><a href="#users-view" class="help-nav-link">Users View</a></li>
                        <li><a href="#blockchain-view" class="help-nav-link">Blockchain View</a></li>
                        <li><a href="#logs-panel" class="help-nav-link">Logs Panel</a></li>
                    </ul>
                </div>
                
                <div class="help-main">
                    <section id="overview" class="help-section">
                        <h2>Overview</h2>
                        <p>AOB Playground is an educational blockchain network simulator that helps you understand how cryptocurrencies built on advanced blockchain technology work.</p>
                        <p><a href="https://mostdecentralized.free.bg/" target="_blank">Atomic Ownership Blockchains</a>, (AOB) is a new generation of blockchain technology that surpasses Bitcoin in decentralization and security, and outperforms consortium chains in performance and capacity.</p>
                        <p>The basic principle of AOB is to have multiple public domain private blockchains transfer between users, efficiently recording the ownership transfer history of each blockchain. When used as currency, each blockchain is treated as a banknote, functioning similarly to paper money, determining users' asset amounts through the ownership of each banknote.</p>
                        <h3>Main Features</h3>
                        <ul>
                            <li><strong>Network Simulation</strong>: Simulate decentralized network nodes and connections</li>
                            <li><strong>User Management</strong>: Create virtual users and assign them to network nodes</li>
                            <li><strong>Blockchain Management</strong>: Define and manage blockchain banknotes of various denominations</li>
                            <li><strong>Real-time Monitoring</strong>: Observe network activity and transaction processes</li>
                            <li><strong>Interactive Interface</strong>: Intuitive visualization and control interface</li>
                        </ul>
                    </section>
                    
                    <section id="getting-started" class="help-section">
                        <h2>Getting Started</h2>
                        <ol>
                            <li><strong>Configure Network Parameters</strong>: Set the number of nodes, users, etc. in the left control panel</li>
                            <li><strong>Define Blockchains</strong>: Configure blockchain denominations and serial number ranges</li>
                            <li><strong>Start System</strong>: Click the "Start" button to launch the simulation</li>
                            <li><strong>Transfer</strong>: Click the send button at the top of the main panel to show the process of a blockchain being transferred to another user.</li>
                            <li><strong>Attack</strong>: Click the attack button at the top of the main panel to perform a double-spending attack on the previous transfer.</li>
                            <li><strong>Monitor Logs</strong>: View system activity logs in the right log panel</li>
                        </ol>
                    </section>
                    
                    <section id="systemctrls" class="help-section">
                        <h2>System Controls</h2>
                        <p>The system control buttons at the top of the control panel are used to manage the running state of the simulation system.</p>
                        
                        <div class="help-item">
                            <h4>Start Button</h4>
                            <p>Launch the P2P network simulation. After clicking, network nodes, users, and blockchains will be created according to the current configuration.</p>
                        </div>
                        
                        <div class="help-item">
                            <h4>Pause/Resume Button</h4>
                            <p>Pause or resume system operation. When paused, all network activity stops; when resumed, it continues from the pause point.</p>
                        </div>
                        
                        <div class="help-item">
                            <h4>Stop Button</h4>
                            <p>Completely stop the simulation and reset the system state. After stopping, you can modify the configuration and restart.</p>
                        </div>
                    </section>
                    
                    <section id="networksettings" class="help-section">
                        <h2>Network Settings</h2>
                        <p>Configure basic parameters of the P2P network. These settings can be modified before system startup.</p>
                        
                        <div class="help-item">
                            <h4>Number of Nodes</h4>
                            <p>Set the total number of nodes in the network. Connections between nodes have different delays, set to random values between 1-5 ticks.</p>
                            <p><strong>Range:</strong> 10-100 nodes</p>
                        </div>
                        
                        <div class="help-item">
                            <h4>Number of Users</h4>
                            <p>Set the total number of virtual users in the system. Each user can correspond to multiple nodes, and each node can have multiple users.</p>
                            <p><strong>Range:</strong> 10-100 users</p>
                        </div>
                        
                        <div class="help-item">
                            <h4>Minimum Node Connections</h4>
                            <p>The minimum number of other nodes each node connects to. Too few will affect network connectivity.</p>
                            <p><strong>Range:</strong> 2-20 connections</p>
                        </div>
                        
                        <div class="help-item">
                            <h4>User Associated Nodes</h4>
                            <p>The number of nodes each user can associate with. Users can participate in network activities through multiple nodes to enhance security.</p>
                            <p><strong>Range:</strong> 1-5 nodes</p>
                        </div>
                        
                        <div class="help-item">
                            <h4>Connection Failure Rate</h4>
                            <p>The probability of network connection failure. Simulates connection instability in real networks.</p>
                            <p><strong>Range:</strong> 0%-50%</p>
                        </div>
                    </section>
                    
                    <section id="blockchain-definition" class="help-section">
                        <h2>Blockchain Definition</h2>
                        <p>Define the blockchain types and denominations used in the system. Players can set the correspondence between each blockchain's serial number and denomination.</p>
                        
                        <div class="help-item">
                            <h4>Definition Format</h4>
                            <p>Each line defines a blockchain of one denomination, format: <code>start_serial-end_serial denomination</code></p>
                            <p><strong>Example:</strong></p>
                            <pre>1-100 1
101-200 5
201-220 10</pre>
                            <p>This means blockchains with serial numbers 1-100 have denomination 1, 101-200 have denomination 5, and 201-220 have denomination 10.</p>
                        </div>
                        
                        <div class="help-item">
                            <h4>Validate Definition</h4>
                            <p>Click the "Validate Definition" button to check if the blockchain definition format is correct and if there are issues like overlapping serial numbers.</p>
                        </div>
                    </section>
                    
                    <section id="runtimectrls" class="help-section">
                        <h2>Runtime Controls</h2>
                        <p>Parameters that can be adjusted while the system is running, used to control simulation speed and behavior.</p>
                        
                        <div class="help-item">
                            <h4>Tick Time Interval</h4>
                            <p>The system runs with ticks as the basic time unit. You can set the time length corresponding to one tick to adjust the duration of the display process.</p>
                            <p><strong>Range:</strong> 0.01 seconds - 3 seconds</p>
                        </div>
                        
                    </section>
                    
                    <section id="network-view" class="help-section">
                        <h2>Network View</h2>
                        <p>The Network tab displays the topology and real-time status of the decentralized network.</p>
                        
                        <div class="help-item">
                            <h4>Network Graph</h4>
                            <p>The D3.js visualization graph on the right shows the network topology:</p>
                            <ul>
                                <li><strong>Blue circles:</strong> Network nodes</li>
                                <li><strong>Other colored circles:</strong> Nodes that received broadcast messages, each message has a different color.</li>
                                <li><strong>Lines:</strong> Network connections</li>
                                <li><strong>Yellow highlight:</strong> Selected node</li>
                            </ul>
                        </div>
                        
                        <div class="help-item">
                            <h4>Node Details</h4>
                            <p>Click on a node in the network graph to view detailed information:</p>
                            <ul>
                                <li>List of users on the node</li>
                                <li>Connection status of the node</li>
                                <li>Connection delay information</li>
                            </ul>
                        </div>
                    </section>
                    
                    <section id="users-view" class="help-section">
                        <h2>Users View</h2>
                        <p>The Users tab displays the status and asset information of all virtual users in the system.</p>
                        
                        <div class="help-item">
                            <h4>User Grid</h4>
                            <p>The upper area displays all users in a grid format:</p>
                            <ul>
                                <li><strong>User ID:</strong> Unique identifier of the user</li>
                                <li><strong>Total Assets:</strong> Total value of blockchains owned by the user</li>
                                <li><strong>Transfer Status:</strong> Yellow border indicates transfer in progress</li>
                            </ul>
                        </div>
                        
                        <div class="help-item">
                            <h4>User Details</h4>
                            <p>Click on a user to view detailed information:</p>
                            <ul>
                                <li>User's public key information</li>
                                <li>Associated network nodes</li>
                                <li>List of owned blockchains</li>
                                <li>Asset statistics</li>
                            </ul>
                        </div>
                    </section>
                    
                    <section id="blockchain-view" class="help-section">
                        <h2>Blockchain View</h2>
                        <p>The Blockchain tab displays the status and detailed information of all blockchains in the system.</p>
                        
                        <div class="help-item">
                            <h4>Blockchain Grid</h4>
                            <p>The upper area displays summary information of all blockchains:</p>
                            <ul>
                                <li><strong>Chain ID Preview:</strong> First 6 characters of the blockchain ID</li>
                                <li><strong>Transfer Status:</strong> Yellow border indicates transfer in progress</li>
                            </ul>
                        </div>
                        
                        <div class="help-item">
                            <h4>Blockchain Details</h4>
                            <p>Click on a blockchain to view detailed information:</p>
                            <ul>
                                <li>Complete ID and display number of the blockchain</li>
                                <li>Current owner information</li>
                                <li>Denomination of the blockchain</li>
                                <li>All blocks contained</li>
                                <li>Related system logs</li>
                            </ul>
                        </div>
                    </section>
                    
                    <section id="logs-panel" class="help-section">
                        <h2>Logs Panel</h2>
                        <p>The log panel on the right displays all activity records during system operation.</p>
                        
                        <div class="help-item">
                            <h4>Log Types</h4>
                            <ul>
                                <li><strong>All</strong></li>
                                <li><strong>Nodes</strong></li>
                                <li><strong>Users</strong></li>
                                <li><strong>Blockchains</strong></li>
                            </ul>
                        </div>
                    </section>
                </div>
            </div>
        `;
    }
    
    generateHelpHTML() {
        return `
            <div class="help-container">
                <div class="help-sidebar">
                    <h3>目录</h3>
                    <ul class="help-nav">
                        <li><a href="#overview" class="help-nav-link">概述</a></li>
                        <li><a href="#getting-started" class="help-nav-link">快速开始</a></li>
                        <li><a href="#systemctrls" class="help-nav-link">系统控制</a></li>
                        <li><a href="#networksettings" class="help-nav-link">网络设置</a></li>
                        <li><a href="#blockchain-definition" class="help-nav-link">区块链定义</a></li>
                        <li><a href="#runtimectrls" class="help-nav-link">运行时控制</a></li>
                        <li><a href="#network-view" class="help-nav-link">网络视图</a></li>
                        <li><a href="#users-view" class="help-nav-link">用户视图</a></li>
                        <li><a href="#blockchain-view" class="help-nav-link">区块链视图</a></li>
                        <li><a href="#logs-panel" class="help-nav-link">日志面板</a></li>
                    </ul>
                </div>
                
                <div class="help-main">
                    <section id="overview" class="help-section">
                        <h2>概述</h2>
                        <p>AOB 游乐场是一个教育性的区块链网络模拟器，帮助您理解基于先进区块链技术构建的加密货币的工作原理。</p>
                        <p>原子物权链（<a href="https://mostdecentralized.free.bg/" target="_blank">Atomic Ownership Blockchains</a>，AOB）是新一代区块链技术，在去中心化与安全方面优于比特币，性能容量方面优于联盟链。</p>
                        <p>AOB 的基本原理是令多条公域私有链在用户之间互相转送，高效地记载每条链的归属转移历史。用作货币时，将每一条链视为一张钞票，功能与纸钞票相似，通过每张钞票的归属确定用户的资产数额。</p>
                        <h3>主要功能</h3>
                        <ul>
                            <li><strong>网络模拟</strong>：模拟去中心网络节点和连接</li>
                            <li><strong>用户管理</strong>：创建虚拟用户并分配到网络节点</li>
                            <li><strong>区块链管理</strong>：定义和管理多种面值的区块链钞票</li>
                            <li><strong>实时监控</strong>：观察网络活动和交易过程</li>
                            <li><strong>交互式界面</strong>：直观的可视化和控制界面</li>
                        </ul>
                    </section>
                    
                    <section id="getting-started" class="help-section">
                        <h2>快速开始</h2>
                        <ol>
                            <li><strong>配置网络参数</strong>：在左侧控制面板设置节点数量、用户数量等</li>
                            <li><strong>定义区块链</strong>：配置区块链的面值和序列号范围</li>
                            <li><strong>启动系统</strong>：点击"开始"按钮启动模拟</li>
                            <li><strong>转送</strong>：在主面板上方点发送按钮，可展现一条区块链被转送给另一用户的过程。</li>
                            <li><strong>攻击</strong>：在主面板上方点攻击按钮，可对前一次转送实施双花攻击。</li>
                            <li><strong>监控日志</strong>：在右侧日志面板查看系统活动日志</li>
                        </ol>
                    </section>
                    
                    <section id="systemctrls" class="help-section">
                        <h2>系统控制</h2>
                        <p>位于控制面板顶部的系统控制按钮用于管理模拟系统的运行状态。</p>
                        
                        <div class="help-item">
                            <h4>开始按钮</h4>
                            <p>启动P2P网络模拟。点击后将根据当前配置创建网络节点、用户和区块链。</p>
                        </div>
                        
                        <div class="help-item">
                            <h4>暂停/继续按钮</h4>
                            <p>暂停或恢复系统运行。暂停时所有网络活动停止，恢复时从暂停点继续。</p>
                        </div>
                        
                        <div class="help-item">
                            <h4>停止按钮</h4>
                            <p>完全停止模拟并重置系统状态。停止后可以修改配置重新开始。</p>
                        </div>
                    </section>
                    
                    <section id="networksettings" class="help-section">
                        <h2>网络设置</h2>
                        <p>配置P2P网络的基本参数，这些设置在系统启动前可以修改。</p>
                        
                        <div class="help-item">
                            <h4>节点数量</h4>
                            <p>设置网络中的节点总数。节点之间的连接有不同的时延，设为 1~5 滴答之间的随机值。</p>
                            <p><strong>范围：</strong>10-100个节点</p>
                        </div>
                        
                        <div class="help-item">
                            <h4>用户数量</h4>
                            <p>设置系统中的虚拟用户总数。每个用户可对应多个节点，每个节点上可以有多个用户。</p>
                            <p><strong>范围：</strong>10-100个用户</p>
                        </div>
                        
                        <div class="help-item">
                            <h4>节点最小连接数</h4>
                            <p>每个节点连接的其他节点的最小数量。过小将影响网络的连通性。</p>
                            <p><strong>范围：</strong>2-20个连接</p>
                        </div>
                        
                        <div class="help-item">
                            <h4>用户关联节点数</h4>
                            <p>每个用户可以关联的节点数量。用户可以通过多个节点参与网络活动以提升安全性。</p>
                            <p><strong>范围：</strong>1-5个节点</p>
                        </div>
                        
                        <div class="help-item">
                            <h4>连接故障率</h4>
                            <p>网络连接的故障概率。模拟真实网络中的连接不稳定性。</p>
                            <p><strong>范围：</strong>0%-50%</p>
                        </div>
                    </section>
                    
                    <section id="blockchain-definition" class="help-section">
                        <h2>区块链定义</h2>
                        <p>定义系统中使用的区块链类型和面值。玩家可设定每条区块链的序列号与面值之间的对应关系。</p>
                        
                        <div class="help-item">
                            <h4>定义格式</h4>
                            <p>每行定义一种面值的区块链，格式为：<code>起始序列号-结束序列号 面值</code></p>
                            <p><strong>示例：</strong></p>
                            <pre>1-100 1
101-200 5
201-220 10</pre>
                            <p>这表示序列号1-100的区块链面值为1，101-200的面值为5，201-220的面值为10。</p>
                        </div>
                        
                        <div class="help-item">
                            <h4>验证定义</h4>
                            <p>点击"验证定义"按钮检查区块链定义的格式是否正确，是否存在序列号重叠等问题。</p>
                        </div>
                    </section>
                    
                    <section id="runtimectrls" class="help-section">
                        <h2>运行时控制</h2>
                        <p>系统运行时可以调整的参数，用于控制模拟的速度和行为。</p>
                        
                        <div class="help-item">
                            <h4>滴答时间间隔</h4>
                            <p>系统运行以滴答为基本时间单位。可设置一个滴答对应的时间长度，以调节显示过程的时长。</p>
                            <p><strong>范围：</strong>0.01秒-3秒</p>
                        </div>
                        
                    </section>
                    
                    <section id="network-view" class="help-section">
                        <h2>网络视图</h2>
                        <p>网络标签页显示去中心网络的拓扑结构和实时状态。</p>
                        
                        <div class="help-item">
                            <h4>网络图</h4>
                            <p>右侧的D3.js可视化图显示网络拓扑：</p>
                            <ul>
                                <li><strong>蓝色圆圈：</strong>网络节点</li>
                                <li><strong>其它颜色圆圈：</strong>收到广播消息的节点，每条消息有不同颜色。</li>
                                <li><strong>连线：</strong>网络连接</li>
                                <li><strong>黄色高亮：</strong>选中的节点</li>
                            </ul>
                        </div>
                        
                        <div class="help-item">
                            <h4>节点详情</h4>
                            <p>点击网络图中的节点可以查看详细信息：</p>
                            <ul>
                                <li>节点上的用户列表</li>
                                <li>节点的连接状态</li>
                                <li>连接延迟信息</li>
                            </ul>
                        </div>
                    </section>
                    
                    <section id="users-view" class="help-section">
                        <h2>用户视图</h2>
                        <p>用户标签页显示系统中所有虚拟用户的状态和资产信息。</p>
                        
                        <div class="help-item">
                            <h4>用户网格</h4>
                            <p>上方区域以网格形式显示所有用户：</p>
                            <ul>
                                <li><strong>用户ID：</strong>用户的唯一标识</li>
                                <li><strong>资产总值：</strong>用户拥有的区块链总价值</li>
                                <li><strong>转移状态：</strong>黄色边框表示正在进行转移</li>
                            </ul>
                        </div>
                        
                        <div class="help-item">
                            <h4>用户详情</h4>
                            <p>点击用户可以查看详细信息：</p>
                            <ul>
                                <li>用户的公钥信息</li>
                                <li>关联的网络节点</li>
                                <li>拥有的区块链列表</li>
                                <li>资产统计信息</li>
                            </ul>
                        </div>
                    </section>
                    
                    <section id="blockchain-view" class="help-section">
                        <h2>区块链视图</h2>
                        <p>区块链标签页显示系统中所有区块链的状态和详细信息。</p>
                        
                        <div class="help-item">
                            <h4>区块链网格</h4>
                            <p>上方区域显示所有区块链的缩略信息：</p>
                            <ul>
                                <li><strong>链ID预览：</strong>区块链ID的前6个字符</li>
                                <li><strong>转移状态：</strong>黄色边框表示正在转移</li>
                            </ul>
                        </div>
                        
                        <div class="help-item">
                            <h4>区块链详情</h4>
                            <p>点击区块链可以查看详细信息：</p>
                            <ul>
                                <li>区块链的完整ID和显示编号</li>
                                <li>当前拥有者信息</li>
                                <li>区块链的面值</li>
                                <li>包含的所有区块</li>
                                <li>相关的系统日志</li>
                            </ul>
                        </div>
                    </section>
                    
                    <section id="logs-panel" class="help-section">
                        <h2>日志面板</h2>
                        <p>右侧的日志面板显示系统运行时的所有活动记录。</p>
                        
                        <div class="help-item">
                            <h4>日志类型</h4>
                            <ul>
                                <li><strong>全部</strong></li>
                                <li><strong>节点</strong></li>
                                <li><strong>用户</strong></li>
                                <li><strong>区块链</strong></li>
                            </ul>
                        </div>
                    </section>
                </div>
            </div>
        `;
    }
    
    setupNavigationEvents() {
        const navLinks = document.querySelectorAll('.help-nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                this.scrollToSection(targetId);
            });
        });
    }
    
    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
            
            this.highlightSection(sectionId);
        }
    }
    
    highlightSection(sectionId) {
        const prevActive = document.querySelector('.help-nav-link.active');
        if (prevActive) {
            prevActive.classList.remove('active');
        }
        
        const currentLink = document.querySelector(`[href="#${sectionId}"]`);
        if (currentLink) {
            currentLink.classList.add('active');
        }
    }
    
    showHelpSection(sectionId) {
        if (this.tabManager) {
            this.tabManager.switchTab('help');
        }
        
        this.renderHelpContent();
        
        setTimeout(() => {
            this.scrollToSection(sectionId);
        }, 100);
    }
    
    onLanguageChanged(language) {
        if (this.isInitialized) {
            this.isInitialized = false;
            this.renderHelpContent(language);
        }
    }
    
    destroy() {
            this.isInitialized = false;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = HelpTabContent;
}

if (typeof window !== 'undefined') {
    window.HelpTabContent = HelpTabContent;
}