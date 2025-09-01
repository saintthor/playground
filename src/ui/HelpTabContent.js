/**
 * HelpTabContent - 帮助标签页内容组件
 * 管理帮助标签页的显示和交互
 */
class HelpTabContent {
    constructor(tabManager) {
        this.tabManager = tabManager;
        this.mainPanel = tabManager.mainPanel;
        this.app = tabManager.mainPanel.app;
        
        // 帮助内容初始化状态
        this.isInitialized = false;
        
        console.log('HelpTabContent 初始化完成');
    }
    
    /**
     * 渲染帮助内容
     */
    renderHelpContent() {
        const container = document.getElementById('help-content');
        if (!container) {
            console.error('帮助内容容器未找到');
            return;
        }
        
        if (!this.isInitialized) {
            const helpHTML = this.generateHelpHTML();
            container.innerHTML = helpHTML;
            this.isInitialized = true;
            
            // 添加目录导航事件
            this.setupNavigationEvents();
            
            console.log('帮助内容渲染完成');
        }
    }
    
    /**
     * 生成帮助内容HTML
     * @returns {string} - 帮助内容HTML
     */
    generateHelpHTML() {
        return `
            <div class="help-container">
                <div class="help-sidebar">
                    <h3>目录</h3>
                    <ul class="help-nav">
                        <li><a href="#overview" class="help-nav-link">概述</a></li>
                        <li><a href="#getting-started" class="help-nav-link">快速开始</a></li>
                        <li><a href="#system-controls" class="help-nav-link">系统控制</a></li>
                        <li><a href="#network-settings" class="help-nav-link">网络设置</a></li>
                        <li><a href="#blockchain-definition" class="help-nav-link">区块链定义</a></li>
                        <li><a href="#runtime-controls" class="help-nav-link">运行时控制</a></li>
                        <li><a href="#network-view" class="help-nav-link">网络视图</a></li>
                        <li><a href="#users-view" class="help-nav-link">用户视图</a></li>
                        <li><a href="#blockchain-view" class="help-nav-link">区块链视图</a></li>
                        <li><a href="#logs-panel" class="help-nav-link">日志面板</a></li>
                    </ul>
                </div>
                
                <div class="help-main">
                    <section id="overview" class="help-section">
                        <h2>概述</h2>
                        <p>P2P区块链游乐场是一个教育性的区块链网络模拟器，帮助您理解点对点网络和区块链技术的工作原理。</p>
                        
                        <h3>主要功能</h3>
                        <ul>
                            <li><strong>网络模拟</strong>：模拟P2P网络节点和连接</li>
                            <li><strong>用户管理</strong>：创建虚拟用户并分配到网络节点</li>
                            <li><strong>区块链管理</strong>：定义和管理多种面值的区块链</li>
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
                            <li><strong>观察网络</strong>：在主面板查看网络拓扑和用户活动</li>
                            <li><strong>监控日志</strong>：在右侧日志面板查看系统活动</li>
                        </ol>
                    </section>
                    
                    <section id="system-controls" class="help-section">
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
                    
                    <section id="network-settings" class="help-section">
                        <h2>网络设置</h2>
                        <p>配置P2P网络的基本参数，这些设置在系统启动前可以修改。</p>
                        
                        <div class="help-item">
                            <h4>节点数量</h4>
                            <p>设置网络中的节点总数。节点是网络的基本单元，用户会被分配到不同的节点上。</p>
                            <p><strong>范围：</strong>1-100个节点</p>
                        </div>
                        
                        <div class="help-item">
                            <h4>用户数量</h4>
                            <p>设置系统中的虚拟用户总数。每个用户都会拥有一定数量的区块链资产。</p>
                            <p><strong>范围：</strong>1-1000个用户</p>
                        </div>
                        
                        <div class="help-item">
                            <h4>节点最大连接数</h4>
                            <p>每个节点可以连接的其他节点的最大数量。影响网络的连通性和冗余度。</p>
                            <p><strong>范围：</strong>1-20个连接</p>
                        </div>
                        
                        <div class="help-item">
                            <h4>用户关联节点数</h4>
                            <p>每个用户可以关联的节点数量。用户可以通过多个节点参与网络活动。</p>
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
                        <p>定义系统中使用的区块链类型和面值。区块链定义决定了系统中可用的"货币"类型。</p>
                        
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
                    
                    <section id="runtime-controls" class="help-section">
                        <h2>运行时控制</h2>
                        <p>系统运行时可以调整的参数，用于控制模拟的速度和行为。</p>
                        
                        <div class="help-item">
                            <h4>滴答时间间隔</h4>
                            <p>系统时钟的间隔时间，控制模拟的速度。使用对数刻度，在小值区间提供更精细的控制。</p>
                            <p><strong>范围：</strong>0.01秒-3秒</p>
                            <p><strong>说明：</strong>间隔越小，模拟运行越快；间隔越大，模拟运行越慢。</p>
                        </div>
                        
                        <div class="help-item">
                            <h4>分叉攻击测试</h4>
                            <p>选择一个用户进行分叉攻击测试，观察网络如何处理恶意行为。</p>
                        </div>
                    </section>
                    
                    <section id="network-view" class="help-section">
                        <h2>网络视图</h2>
                        <p>网络标签页显示P2P网络的拓扑结构和实时状态。</p>
                        
                        <div class="help-item">
                            <h4>网络统计</h4>
                            <p>左侧面板显示网络的基本统计信息：</p>
                            <ul>
                                <li><strong>节点：</strong>网络中的节点总数</li>
                                <li><strong>连接：</strong>活跃的网络连接数</li>
                                <li><strong>故障：</strong>当前故障的连接数</li>
                            </ul>
                        </div>
                        
                        <div class="help-item">
                            <h4>网络图</h4>
                            <p>右侧的D3.js可视化图显示网络拓扑：</p>
                            <ul>
                                <li><strong>蓝色圆圈：</strong>网络节点</li>
                                <li><strong>绿色连线：</strong>正常的网络连接</li>
                                <li><strong>红色连线：</strong>故障的网络连接</li>
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
                                <li><strong>区块（蓝色）：</strong>区块链相关操作</li>
                                <li><strong>网络（绿色）：</strong>网络连接和通信</li>
                                <li><strong>安全（红色）：</strong>安全验证和攻击检测</li>
                                <li><strong>警告（黄色）：</strong>系统警告信息</li>
                            </ul>
                        </div>
                        
                        <div class="help-item">
                            <h4>日志功能</h4>
                            <ul>
                                <li><strong>搜索：</strong>在搜索框中输入关键词过滤日志</li>
                                <li><strong>类型过滤：</strong>选择特定类型的日志</li>
                                <li><strong>清除过滤：</strong>重置所有过滤条件</li>
                                <li><strong>相关数据：</strong>点击日志中的相关数据快速跳转</li>
                            </ul>
                        </div>
                    </section>
                </div>
            </div>
        `;
    }
    
    /**
     * 设置导航事件
     */
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
    
    /**
     * 滚动到指定章节
     * @param {string} sectionId - 章节ID
     */
    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
            
            // 高亮当前章节
            this.highlightSection(sectionId);
        }
    }
    
    /**
     * 高亮当前章节
     * @param {string} sectionId - 章节ID
     */
    highlightSection(sectionId) {
        // 移除之前的高亮
        const prevActive = document.querySelector('.help-nav-link.active');
        if (prevActive) {
            prevActive.classList.remove('active');
        }
        
        // 添加新的高亮
        const currentLink = document.querySelector(`[href="#${sectionId}"]`);
        if (currentLink) {
            currentLink.classList.add('active');
        }
    }
    
    /**
     * 显示帮助页面并滚动到指定章节
     * @param {string} sectionId - 章节ID
     */
    showHelpSection(sectionId) {
        // 切换到帮助标签页
        if (this.tabManager) {
            this.tabManager.switchTab('help');
        }
        
        // 确保内容已渲染
        this.renderHelpContent();
        
        // 滚动到指定章节
        setTimeout(() => {
            this.scrollToSection(sectionId);
        }, 100);
    }
    
    /**
     * 语言变更处理
     * @param {string} language - 新的语言代码
     */
    onLanguageChanged(language) {
        console.log('HelpTabContent 处理语言变更:', language);
        
        // 重新渲染帮助内容
        if (this.isInitialized) {
            this.isInitialized = false;
            this.renderHelpContent();
        }
    }
    
    /**
     * 销毁帮助标签页内容
     */
    destroy() {
        try {
            // 清理状态
            this.isInitialized = false;
            
            console.log('HelpTabContent 已销毁');
            
        } catch (error) {
            console.error('HelpTabContent 销毁失败:', error);
        }
    }
}

// 导出 HelpTabContent 类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HelpTabContent;
}

// ES6 导出
if (typeof window !== 'undefined') {
    window.HelpTabContent = HelpTabContent;
}