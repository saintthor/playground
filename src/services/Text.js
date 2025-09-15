/**
 * Text - 多语言文本管理
 * 提供中英文双语支持
 */
class Text {
    constructor()
    {
        this.language = 'en'; // 默认中文
        this.textMap = new Map();
        this.initTextMap();
        window.Text = this;
    }
    
    /**
     * 初始化文本映射
     */
    initTextMap()
    {
        // 应用标题和基础文本
        this.textMap.set('app_title', {
            cn: 'AOB 钞票演示平台',
            en: 'AOB Banknotes Playground'
        });
        
        this.textMap.set('language_switch', {
            cn: '中文/English',
            en: 'English/中文'
        });
        
        // 控制面板
        this.textMap.set('control_panel', {
            cn: '控制面板',
            en: 'Control Panel'
        });
        
        this.textMap.set('system_controls', {
            cn: '系统控制',
            en: 'System Controls'
        });
        
        this.textMap.set('blockchain_definition', {
            cn: '区块链定义',
            en: 'Blockchain Definition'
        });
        
        this.textMap.set('chain_def0', {
            cn: "定义每条区块链为一张钞票，其根区块的数据结构为：H\\nS\\nK。其中：\nH 为本文件 sha256 值（Base64）；K 是初始持有人的公钥（Base64），固定为 ",
            en: 'Define each blockchain as a banknote, with the data structure of its genesis block as: H\\nS\\nK, where: H is the SHA256 hash of this document (Base64); K is the public key of the initial holder (Base64), fixed at '
        });
        
        this.textMap.set('chain_def1', {
            cn: "；S 是序列号，与钞票面值的对应关系如下：",
            en: "; S is the serial number, with the following correspondence to the banknote's denomination:"
        });
        
        this.textMap.set('chain_def2', {
            cn: "格式: 起始序列号-结束序列号 面值",
            en: "serial numbe range and denomination"
        });
        
        this.textMap.set('verify_def', {
            cn: "验证定义",
            en: "verify"
        });
        
        this.textMap.set('validation_pass', {
            cn: "格式正确",
            en: "PASSED"
        });
        
        this.textMap.set('validation_pass0', {
            cn: "共定义",
            en: "altogether"
        });
        
        this.textMap.set('validation_pass1', {
            cn: "个范围，总计",
            en: "ranges and"
        });
        
        this.textMap.set('validation_pass2', {
            cn: "条区块链",
            en: "blockchains"
        });
        
        this.textMap.set('validation_pass3', {
            cn: "定义文件哈希",
            en: "Tthe hash of this defination is"
        });
        
        this.textMap.set('validation_pass4', {
            cn: "此哈希值将加入每条区块链的根区块",
            en: "This hash value will be included in the genesis block of each blockchain."
        });
        
        this.textMap.set('network_settings', {
            cn: '网络设置',
            en: 'Network Settings'
        });
        
        this.textMap.set('verify_data', {
            cn: '验证数据',
            en: 'Verify data'
        });
        
        this.textMap.set('target_val', {
            cn: '目标值',
            en: 'target value'
        });
        
        this.textMap.set('copy_code', {
            cn: '复制代码',
            en: 'Copy code'
        });
        
        this.textMap.set('verify_here', {
            cn: '在此运行',
            en: 'Run here'
        });
        
        this.textMap.set('runtime_ctrl', {
            cn: '运行时控制',
            en: 'Runtime control'
        });
        
        this.textMap.set('tick_interval', {
            cn: '滴答时长',
            en: 'Tick interval'
        });
        
        this.textMap.set('start_system', {
            cn: '启动',
            en: 'Start'
        });
        
        this.textMap.set('pause_system', {
            cn: '暂停',
            en: 'Pause'
        });
        
        this.textMap.set('stop_system', {
            cn: '停止',
            en: 'Stop'
        });
        
        this.textMap.set('reset_system', {
            cn: '重置',
            en: 'Reset'
        });
        
        this.textMap.set('network_config', {
            cn: '网络配置',
            en: 'Network Config'
        });
        
        this.textMap.set('node_count', {
            cn: '节点数量',
            en: 'Node Count'
        });
        
        this.textMap.set('connection_count', {
            cn: '连接数量',
            en: 'Connection Count'
        });
        
        this.textMap.set('failure_rate', {
            cn: '故障率',
            en: 'Failure Rate'
        });
        
        this.textMap.set('user_config', {
            cn: '用户配置',
            en: 'User Config'
        });
        
        this.textMap.set('user_count', {
            cn: '用户数量',
            en: 'User Count'
        });
        
        this.textMap.set('blockchain_config', {
            cn: '区块链配置',
            en: 'Blockchain Config'
        });
        
        this.textMap.set('chain_count', {
            cn: '区块链数量',
            en: 'Chain Count'
        });
        
        this.textMap.set('chain_values', {
            cn: '区块链价值',
            en: 'Chain Values'
        });
        
        this.textMap.set('transfer_config', {
            cn: '转账配置',
            en: 'Transfer Config'
        });
        
        this.textMap.set('auto_transfer', {
            cn: '自动转账',
            en: 'Auto Transfer'
        });
        
        this.textMap.set('transfer_rate', {
            cn: '转账频率',
            en: 'Transfer Rate'
        });
        
        // 控制面板详细配置
        this.textMap.set('max_connections', {
            cn: '节点最小连接数',
            en: 'Min Node Connections'
        });
        
        this.textMap.set('user_node_connections', {
            cn: '用户关联节点数',
            en: 'User Node Connections'
        });
        
        this.textMap.set('failure_rate_percent', {
            cn: '连接故障率 (%)',
            en: 'Connection Failure Rate (%)'
        });
        
        this.textMap.set('current', {
            cn: '当前',
            en: 'Current'
        });
        
        this.textMap.set('view_help', {
            cn: '查看帮助',
            en: 'View Help'
        });
        
        this.textMap.set('help_icon', {
            cn: '?',
            en: '?'
        });
        
        this.textMap.set('start', {
            cn: '开始',
            en: 'Start'
        });
        
        this.textMap.set('pause', {
            cn: '暂停',
            en: 'Pause'
        });
        
        this.textMap.set('resume', {
            cn: '继续',
            en: 'Resume'
        });
        
        this.textMap.set('stop', {
            cn: '停止',
            en: 'Stop'
        });
        
        this.textMap.set('transfer', {
            cn: '发送',
            en: 'Transfer'
        });
        
        this.textMap.set('attack', {
            cn: '攻击',
            en: 'Attack'
        });
        
        // 主面板标签页
        this.textMap.set('network_tab', {
            cn: '网络',
            en: 'Network'
        });
        
        this.textMap.set('users_tab', {
            cn: '用户',
            en: 'Users'
        });
        
        this.textMap.set('chains_tab', {
            cn: '区块链',
            en: 'Blockchains'
        });
        
        this.textMap.set('help_tab', {
            cn: '帮助',
            en: 'Help'
        });
        
        // 日志面板
        this.textMap.set('log_panel', {
            cn: '系统日志',
            en: 'System Logs'
        });
        
        this.textMap.set('all_logs', {
            cn: '所有',
            en: 'All'
        });
        
        this.textMap.set('node_logs', {
            cn: '节点',
            en: 'Peer'
        });
        
        this.textMap.set('user_logs', {
            cn: '用户',
            en: 'User'
        });
        
        this.textMap.set('blockchain_logs', {
            cn: '区块链',
            en: 'Blockchain'
        });
        
        this.textMap.set('export_logs', {
            cn: '导出日志',
            en: 'Export'
        });
        
        // 网络页面
        this.textMap.set('network_stats', {
            cn: '网络统计',
            en: 'Network Stats'
        });
        
        this.textMap.set('total_nodes', {
            cn: '总节点数',
            en: 'Total Nodes'
        });
        
        this.textMap.set('active_connections', {
            cn: '活跃连接',
            en: 'Active Connections'
        });
        
        this.textMap.set('node_details', {
            cn: '节点详情',
            en: 'Node Details'
        });
        
        this.textMap.set('click_node_prompt', {
            cn: '请点击网络图上的节点查看详情',
            en: 'Click on a node in the network graph to view details'
        });
        
        this.textMap.set('click_user', {
            cn: '请点击用户缩略图查看详情',
            en: 'Click on a user in the network graph to view details'
        });
        
        this.textMap.set('click_chain', {
            cn: '请点击区块链缩略图查看详情',
            en: 'Click on a blockchain in the network graph to view details'
        });
        
        this.textMap.set('node_users', {
            cn: '节点用户',
            en: 'Node Users'
        });
        
        this.textMap.set('node_connections', {
            cn: '节点连接',
            en: 'Node Connections'
        });
        
        this.textMap.set('no_users', {
            cn: '该节点暂无用户',
            en: 'No users on this node'
        });
        
        this.textMap.set('no_connections', {
            cn: '该节点暂无连接',
            en: 'No connections for this node'
        });
        
        // 用户页面
        this.textMap.set('user_assets', {
            cn: '用户资产',
            en: 'User Assets'
        });
        
        this.textMap.set('user_details', {
            cn: '用户详情',
            en: 'User Details'
        });
        
        this.textMap.set('select_user_prompt', {
            cn: '请选择用户查看详情',
            en: 'Select a user to view details'
        });
        
        this.textMap.set('total_assets', {
            cn: '总资产',
            en: 'Total Assets'
        });
        
        this.textMap.set('owned_chains', {
            cn: '拥有的区块链',
            en: 'Owned Chains'
        });
        
        // 区块链页面
        this.textMap.set('chain_ownership', {
            cn: '区块链归属',
            en: 'Chain Ownership'
        });
        
        this.textMap.set('chain_details', {
            cn: '区块链详情',
            en: 'Chain Details'
        });
        
        this.textMap.set('select_chain_prompt', {
            cn: '请选择区块链查看详情',
            en: 'Select a chain to view details'
        });
        
        this.textMap.set('chain_value', {
            cn: '价值',
            en: 'Value'
        });
        
        this.textMap.set('chain_owner', {
            cn: '拥有者',
            en: 'Owner'
        });
        
        this.textMap.set('chain_blocks', {
            cn: '区块列表',
            en: 'Block List'
        });
        
        // 系统状态
        this.textMap.set('system_stopped', {
            cn: '系统已停止',
            en: 'System Stopped'
        });
        
        this.textMap.set('system_running', {
            cn: '系统运行中',
            en: 'System Running'
        });
        
        this.textMap.set('system_paused', {
            cn: '系统已暂停',
            en: 'System Paused'
        });
        
        // 日志占位符
        this.textMap.set('no_logs', {
            cn: '暂无日志信息',
            en: 'No log information'
        });
        
        this.textMap.set('no_node_logs', {
            cn: '暂无节点日志',
            en: 'No node logs'
        });
        
        this.textMap.set('no_user_logs', {
            cn: '暂无用户日志',
            en: 'No user logs'
        });
        
        this.textMap.set('no_blockchain_logs', {
            cn: '暂无区块链日志',
            en: 'No blockchain logs'
        });
        
        // 通用文本
        this.textMap.set('assets', {
            cn: '资产',
            en: 'Assets'
        });
        
        this.textMap.set('user', {
            cn: '用户',
            en: 'User'
        });
        
        this.textMap.set('node', {
            cn: '节点',
            en: 'Node'
        });
        
        this.textMap.set('chain', {
            cn: '区块链',
            en: 'Chain'
        });
        
        this.textMap.set('block', {
            cn: '区块',
            en: 'Block'
        });
        
        this.textMap.set('connection', {
            cn: '连接',
            en: 'Connection'
        });
        
        this.textMap.set('latency', {
            cn: '延迟',
            en: 'Latency'
        });
        
        this.textMap.set('ticks', {
            cn: '滴答',
            en: 'Ticks'
        });
        
        this.textMap.set('current', {
            cn: '当前',
            en: 'Current'
        });
        
        this.textMap.set('none', {
            cn: '无',
            en: 'None'
        });
        
        // 用户相关文本
        this.textMap.set('no_owned_chains', {
            cn: '该用户暂无区块链',
            en: 'This user has no chains'
        });
        
        // 区块链相关文本
        this.textMap.set('no_blocks', {
            cn: '该区块链暂无区块',
            en: 'This chain has no blocks'
        });
        
        // 验证相关文本
        this.textMap.set('verifying', {
            cn: '验证中...',
            en: 'Verifying...'
        });
        
        this.textMap.set('verification_result', {
            cn: '验证结果',
            en: 'Verification Result'
        });
        
        this.textMap.set('verification_passed', {
            cn: '验证通过',
            en: 'Verification Passed'
        });
        
        this.textMap.set('verification_failed', {
            cn: '验证失败',
            en: 'Verification Failed'
        });
        
        this.textMap.set('expected', {
            cn: '期望',
            en: 'Expected'
        });
        
        this.textMap.set('actual', {
            cn: '实际',
            en: 'Actual'
        });
        
        this.textMap.set('base64_decode_result', {
            cn: 'Base64解码结果',
            en: 'Base64 Decode Result'
        });
        
        this.textMap.set('select_user', {
            cn: '选择用户',
            en: 'Select User'
        });
        
        // 数据相关文本
        this.textMap.set('no_network_data', {
            cn: '暂无网络数据',
            en: 'No network data'
        });
        
        this.textMap.set('no_user_data', {
            cn: '暂无用户数据',
            en: 'No user data'
        });
        
        this.textMap.set('no_chain_data', {
            cn: '暂无区块链数据',
            en: 'No blockchain data'
        });
        
        this.textMap.set('d3_not_loaded', {
            cn: 'D3.js 未加载',
            en: 'D3.js not loaded'
        });
        
        this.textMap.set('sys_not_started', {
            cn: '系统未启动',
            en: 'System not started'
        });
        
        // 时间单位
        this.textMap.set('milliseconds', {
            cn: '毫秒',
            en: 'ms'
        });
        
        this.textMap.set('seconds', {
            cn: '秒',
            en: 's'
        });
        
        // 网络状态
        this.textMap.set('failures', {
            cn: '故障',
            en: 'Failures'
        });
        
        // 帮助页面文本
        this.textMap.set('help_toc', {
            cn: '目录',
            en: 'Table of Contents'
        });
        
        this.textMap.set('help_overview', {
            cn: '概述',
            en: 'Overview'
        });
        
        this.textMap.set('help_getting_started', {
            cn: '快速开始',
            en: 'Getting Started'
        });
        
        this.textMap.set('help_system_controls', {
            cn: '系统控制',
            en: 'System Controls'
        });
        
        this.textMap.set('help_network_settings', {
            cn: '网络设置',
            en: 'Network Settings'
        });
        
        this.textMap.set('help_blockchain_definition', {
            cn: '区块链定义',
            en: 'Blockchain Definition'
        });
        
        this.textMap.set('help_runtime_controls', {
            cn: '运行时控制',
            en: 'Runtime Controls'
        });
        
        this.textMap.set('help_network_view', {
            cn: '网络视图',
            en: 'Network View'
        });
        
        this.textMap.set('help_users_view', {
            cn: '用户视图',
            en: 'Users View'
        });
        
        this.textMap.set('blist_by_peers', {
            cn: '用户被这些节点拉黑：',
            en: 'Blacklisted by these Peers:'
        });
        
        this.textMap.set('help_blockchain_view', {
            cn: '区块链视图',
            en: 'Blockchain View'
        });
        
        this.textMap.set('help_logs_panel', {
            cn: '日志面板',
            en: 'Logs Panel'
        });
        
        // 帮助页面内容
        this.textMap.set('help_overview_desc', {
            cn: 'P2P区块链游乐场是一个教育性的区块链网络模拟器，帮助您理解点对点网络和区块链技术的工作原理。',
            en: 'P2P Blockchain Playground is an educational blockchain network simulator that helps you understand how peer-to-peer networks and blockchain technology work.'
        });
        
        this.textMap.set('help_main_features', {
            cn: '主要功能',
            en: 'Main Features'
        });
        
        this.textMap.set('help_feature_network_simulation', {
            cn: '网络模拟：模拟P2P网络节点和连接',
            en: 'Network Simulation: Simulate P2P network nodes and connections'
        });
        
        this.textMap.set('help_feature_user_management', {
            cn: '用户管理：创建虚拟用户并分配到网络节点',
            en: 'User Management: Create virtual users and assign them to network nodes'
        });
        
        this.textMap.set('help_feature_blockchain_management', {
            cn: '区块链管理：定义和管理多种面值的区块链',
            en: 'Blockchain Management: Define and manage blockchains with different denominations'
        });
        
        this.textMap.set('help_feature_realtime_monitoring', {
            cn: '实时监控：观察网络活动和交易过程',
            en: 'Real-time Monitoring: Observe network activities and transaction processes'
        });
        
        this.textMap.set('help_feature_interactive_interface', {
            cn: '交互式界面：直观的可视化和控制界面',
            en: 'Interactive Interface: Intuitive visualization and control interface'
        });
        
        this.textMap.set('help_getting_started_step1', {
            cn: '配置网络参数：在左侧控制面板设置节点数量、用户数量等',
            en: 'Configure Network Parameters: Set node count, user count, etc. in the left control panel'
        });
        
        this.textMap.set('help_getting_started_step2', {
            cn: '定义区块链：配置区块链的面值和序列号范围',
            en: 'Define Blockchains: Configure blockchain denominations and sequence number ranges'
        });
        
        this.textMap.set('help_getting_started_step3', {
            cn: '启动系统：点击"开始"按钮启动模拟',
            en: 'Start System: Click the "Start" button to begin simulation'
        });
        
        this.textMap.set('help_getting_started_step4', {
            cn: '观察网络：在主面板查看网络拓扑和用户活动',
            en: 'Observe Network: View network topology and user activities in the main panel'
        });
        
        this.textMap.set('help_getting_started_step5', {
            cn: '监控日志：在右侧日志面板查看系统活动',
            en: 'Monitor Logs: View system activities in the right log panel'
        });
        
        this.textMap.set('help_system_controls_desc', {
            cn: '位于控制面板顶部的系统控制按钮用于管理模拟系统的运行状态。',
            en: 'System control buttons at the top of the control panel are used to manage the simulation system\'s running state.'
        });
        
        this.textMap.set('help_start_button', {
            cn: '开始按钮',
            en: 'Start Button'
        });
        
        this.textMap.set('help_start_button_desc', {
            cn: '启动P2P网络模拟。点击后将根据当前配置创建网络节点、用户和区块链。',
            en: 'Start P2P network simulation. Creates network nodes, users, and blockchains based on current configuration.'
        });
        
        this.textMap.set('help_pause_resume_button', {
            cn: '暂停/继续按钮',
            en: 'Pause/Resume Button'
        });
        
        this.textMap.set('help_pause_resume_button_desc', {
            cn: '暂停或恢复系统运行。暂停时所有网络活动停止，恢复时从暂停点继续。',
            en: 'Pause or resume system operation. All network activities stop when paused, and resume from the pause point when continued.'
        });
        
        this.textMap.set('help_stop_button', {
            cn: '停止按钮',
            en: 'Stop Button'
        });
        
        this.textMap.set('clear_colors', {
            cn: '清除节点颜色',
            en: 'Clear Colors'
        });
        
        this.textMap.set('previous_hash', {
            cn: '前区块哈希',
            en: 'Previous Block Hash'
        });
        
        this.textMap.set('help_stop_button_desc', {
            cn: '完全停止模拟并重置系统状态。停止后可以修改配置重新开始。',
            en: 'Completely stop simulation and reset system state. Configuration can be modified and restarted after stopping.'
        });
        
        this.textMap.set('help_range', {
            cn: '范围：',
            en: 'Range: '
        });
        
        this.textMap.set('help_example', {
            cn: '示例：',
            en: 'Example: '
        });
        
        this.textMap.set('help_description', {
            cn: '说明：',
            en: 'Description: '
        });
        
        // 网络设置描述
        this.textMap.set('help_network_settings_desc', {
            cn: '配置P2P网络的基本参数，这些设置在系统启动前可以修改。',
            en: 'Configure P2P network basic parameters. These settings can be modified before system startup.'
        });
        
        this.textMap.set('help_node_count_desc', {
            cn: '设置网络中的节点总数。节点是网络的基本单元，用户会被分配到不同的节点上。',
            en: 'Set the total number of nodes in the network. Nodes are the basic units of the network, and users will be assigned to different nodes.'
        });
        
        this.textMap.set('help_user_count_desc', {
            cn: '设置系统中的虚拟用户总数。每个用户都会拥有一定数量的区块链资产。',
            en: 'Set the total number of virtual users in the system. Each user will own a certain amount of blockchain assets.'
        });
        
        this.textMap.set('help_max_connections_desc', {
            cn: '每个节点可以连接的其他节点的最大数量。影响网络的连通性和冗余度。',
            en: 'The maximum number of other nodes each node can connect to. Affects network connectivity and redundancy.'
        });
        
        this.textMap.set('help_user_node_associations', {
            cn: '用户关联节点数',
            en: 'User Node Associations'
        });
        
        this.textMap.set('help_user_node_associations_desc', {
            cn: '每个用户可以关联的节点数量。用户可以通过多个节点参与网络活动。',
            en: 'The number of nodes each user can be associated with. Users can participate in network activities through multiple nodes.'
        });
        
        this.textMap.set('help_failure_rate_desc', {
            cn: '网络连接的故障概率。模拟真实网络中的连接不稳定性。',
            en: 'The failure probability of network connections. Simulates connection instability in real networks.'
        });
        
        // 区块链定义相关
        this.textMap.set('help_blockchain_definition_desc', {
            cn: '定义系统中使用的区块链类型和面值。区块链定义决定了系统中可用的"货币"类型。',
            en: 'Define the types and denominations of blockchains used in the system. Blockchain definitions determine the available "currency" types in the system.'
        });
        
        this.textMap.set('help_definition_format', {
            cn: '定义格式',
            en: 'Definition Format'
        });
        
        this.textMap.set('help_definition_format_desc', {
            cn: '每行定义一种面值的区块链，格式为：起始序列号-结束序列号 面值',
            en: 'Each line defines a blockchain denomination in the format: start_sequence-end_sequence denomination'
        });
        
        this.textMap.set('help_definition_format_explanation', {
            cn: '这表示序列号1-100的区块链面值为1，101-200的面值为5，201-220的面值为10。',
            en: 'This means blockchains with sequence numbers 1-100 have denomination 1, 101-200 have denomination 5, and 201-220 have denomination 10.'
        });
        
        this.textMap.set('help_validate_definition', {
            cn: '验证定义',
            en: 'Validate Definition'
        });
        
        this.textMap.set('help_validate_definition_desc', {
            cn: '点击"验证定义"按钮检查区块链定义的格式是否正确，是否存在序列号重叠等问题。',
            en: 'Click the "Validate Definition" button to check if the blockchain definition format is correct and if there are sequence number overlaps.'
        });
        
        // 运行时控制相关
        this.textMap.set('help_runtime_controls_desc', {
            cn: '系统运行时可以调整的参数，用于控制模拟的速度和行为。',
            en: 'Parameters that can be adjusted while the system is running to control simulation speed and behavior.'
        });
        
        this.textMap.set('help_tick_interval', {
            cn: '滴答时间间隔',
            en: 'Tick Time Interval'
        });
        
        this.textMap.set('help_tick_interval_desc', {
            cn: '系统时钟的间隔时间，控制模拟的速度。使用对数刻度，在小值区间提供更精细的控制。',
            en: 'The interval time of the system clock, controlling simulation speed. Uses logarithmic scale for finer control in small value ranges.'
        });
        
        this.textMap.set('help_tick_interval_explanation', {
            cn: '间隔越小，模拟运行越快；间隔越大，模拟运行越慢。',
            en: 'Smaller intervals make simulation run faster; larger intervals make simulation run slower.'
        });
        
        this.textMap.set('help_fork_attack_test', {
            cn: '分叉攻击测试',
            en: 'Fork Attack Test'
        });
        
        this.textMap.set('help_fork_attack_test_desc', {
            cn: '选择一个用户进行分叉攻击测试，观察网络如何处理恶意行为。',
            en: 'Select a user to perform fork attack testing and observe how the network handles malicious behavior.'
        });

        // Chains tab content
        this.textMap.set('chain_data_not_found', {
            cn: '区块链数据未找到',
            en: 'Blockchain data not found'
        });
        this.textMap.set('error_showing_chain_details', {
            cn: '显示区块链详情时发生错误',
            en: 'Error showing chain details'
        });
        this.textMap.set('chain_details_title', {
            cn: '区块链详情',
            en: 'Chain Details'
        });
        this.textMap.set('chain_id_label', {
            cn: 'ID:',
            en: 'ID:'
        });
        this.textMap.set('basic_info', {
            cn: '基本信息',
            en: 'Basic Information'
        });
        this.textMap.set('chain_id_root_hash_label', {
            cn: '区块链ID (根区块哈希):',
            en: 'Chain ID (Root Block Hash):'
        });
        this.textMap.set('owner_public_key_label', {
            cn: '拥有者公钥:',
            en: 'Owner Public Key:'
        });
        this.textMap.set('owner_label', {
            cn: '拥有者:',
            en: 'Owner:'
        });
        this.textMap.set('unknown_user', {
            cn: '未知用户',
            en: 'Unknown User'
        });
        this.textMap.set('view_details_link', {
            cn: '(查看详情)',
            en: '(View Details)'
        });
        this.textMap.set('current_value_label', {
            cn: '当前价值:',
            en: 'Current Value:'
        });
        this.textMap.set('block_count_label', {
            cn: '区块数量:',
            en: 'Block Count:'
        });
        this.textMap.set('root_block_info_title', {
            cn: '根区块信息',
            en: 'Root Block Information'
        });
        this.textMap.set('chain_root_block_id_label', {
            cn: '区块链/根区块 ID:',
            en: 'Chain/Root Block ID:'
        });
        this.textMap.set('unknown', {
            cn: '未知',
            en: 'Unknown'
        });
        this.textMap.set('subsequent_blocks_title', {
            cn: '后续区块',
            en: 'Subsequent Blocks'
        });
        this.textMap.set('root_block', {
            cn: '根区块',
            en: 'Root Block'
        });
        this.textMap.set('payment_block', {
            cn: '支付区块',
            en: 'Payment Block'
        });
        this.textMap.set('no_block_data', {
            cn: '暂无区块数据',
            en: 'No block data available'
        });
        this.textMap.set('click_chain_to_see_details', {
            cn: '请点击区块链缩略图查看详情',
            en: 'Please click a chain thumbnail to see details'
        });
        this.textMap.set('chains_container_not_found', {
            cn: '区块链容器未找到',
            en: 'Chains container not found'
        });
        this.textMap.set('chain_details_container_not_found', {
            cn: '区块链详情容器未找到',
            en: 'Chain details container not found'
        });
        this.textMap.set('not_set', {
            cn: '未设置',
            en: 'Not set'
        });

        // Users tab content
        this.textMap.set('users_container_not_found', {
            cn: '用户容器未找到',
            en: 'Users container not found'
        });
        this.textMap.set('user_details_container_not_found', {
            cn: '用户详情容器未找到',
            en: 'User details container not found'
        });
        this.textMap.set('user_data_not_found', {
            cn: '用户数据未找到',
            en: 'User data not found'
        });
        this.textMap.set('error_showing_user_details', {
            cn: '显示用户详情时发生错误',
            en: 'Error showing user details'
        });
        this.textMap.set('user_details_title', {
            cn: '用户详情 - ID:',
            en: 'User Details - ID:'
        });
        this.textMap.set('public_key_user_id_label', {
            cn: '公钥 (用户ID):',
            en: 'Public Key (User ID):'
        });
        this.textMap.set('total_assets_label', {
            cn: '总资产:',
            en: 'Total Assets:'
        });
        this.textMap.set('owned_chains_count_label', {
            cn: '拥有区块链数:',
            en: 'Owned Chains:'
        });
        this.textMap.set('node_location_label', {
            cn: '所在节点:',
            en: 'Located at Node:'
        });
        this.textMap.set('owned_chains_title', {
            cn: '拥有的区块链:',
            en: 'Owned Blockchains:'
        });
        this.textMap.set('no_chains_owned', {
            cn: '暂无区块链',
            en: 'No blockchains owned'
        });
        this.textMap.set('click_user_to_see_details', {
            cn: '请点击用户缩略图查看详情',
            en: 'Please click a user thumbnail to see details'
        });

        // Network tab content
        this.textMap.set('node_label', {
            cn: '节点',
            en: 'Node'
        });
        this.textMap.set('connections_label', {
            cn: '连接',
            en: 'Connections'
        });
        this.textMap.set('failures_label', {
            cn: '故障',
            en: 'Failures'
        });
        this.textMap.set('no_network_data_to_display', {
            cn: '暂无网络数据',
            en: 'No network data to display'
        });
        this.textMap.set('d3_container_not_found', {
            cn: 'D3网络图容器未找到',
            en: 'D3 network graph container not found'
        });
        this.textMap.set('d3_not_loaded_placeholder', {
            cn: 'D3.js 未加载',
            en: 'D3.js not loaded'
        });
        this.textMap.set('node_details_container_not_found', {
            cn: '节点详情容器未找到',
            en: 'Node details container not found'
        });
        this.textMap.set('no_node_selected', {
            cn: '未选择节点',
            en: 'No node selected'
        });
        this.textMap.set('error_showing_node_details', {
            cn: '显示节点详情时发生错误',
            en: 'Error showing node details'
        });
        this.textMap.set('node_details_title', {
            cn: '节点详情 -',
            en: 'Node Details -'
        });
        this.textMap.set('node_users_title', {
            cn: '节点用户',
            en: 'Node Users'
        });
        this.textMap.set('adjoining_node', {
            cn: '邻接节点',
            en: 'Adjoining Node'
        });
    }
    
    /**
     * 获取文本
     * @param {string} textId - 文本ID
     * @returns {string} 对应语言的文本
     */
    GetText( textId )
    {
        const textEntry = this.textMap.get( textId );
        if( !textEntry )
        {
            console.warn( `Text ID not found: ${textId}` );
            return textId; // 返回ID本身作为fallback
        }
        
        return textEntry[this.language] || textEntry.cn || textId;
    }
    
    /**
     * 设置语言
     * @param {string} lang - 语言代码 ('cn' 或 'en')
     */
    setLanguage( lang )
    {
        if( lang === 'cn' || lang === 'en' )
        {
            this.language = lang;
            this.updateAllTexts();
            //localStorage.setItem( 'app_language', lang );
        }
    }
    
    /**
     * 获取当前语言
     * @returns {string} 当前语言代码
     */
    getLanguage()
    {
        return this.language;
    }
    
    /**
     * 切换语言
     */
    toggleLanguage()
    {
        const newLang = this.language === 'cn' ? 'en' : 'cn';
        this.setLanguage( newLang );
    }
    
    /**
     * 从localStorage加载语言设置
     */
    loadLanguageFromStorage()
    {
        const savedLang = 'en'; //localStorage.getItem( 'app_language' );
        if( savedLang && ( savedLang === 'cn' || savedLang === 'en' ))
        {
            this.language = savedLang;
        }
    }
    
    /**
     * 更新页面上所有带有data-text属性的元素
     */
    updateAllTexts()
    {
        const elements = document.querySelectorAll( '[data-text]' );
        elements.forEach( element =>
        {
            const textId = element.getAttribute( 'data-text' );
            element.textContent = this.GetText( textId );
        });
        
        // 更新语言切换按钮
        const langButton = document.getElementById( 'language-toggle' );
        if( langButton )
        {
            langButton.textContent = this.GetText( 'language_switch' );
        }
        
        // 触发自定义事件，通知其他组件语言已更改
        window.dispatchEvent( new CustomEvent( 'languageChanged', {
            detail: { language: this.language }
        }));
    }
    
    /**
     * 初始化语言系统
     */
    init()
    {
        this.loadLanguageFromStorage();
        
        // 延迟更新文本，确保DOM已加载
        setTimeout( () =>
        {
            this.updateAllTexts();
        }, 100 );
    }
}

// 全局函数，方便其他地方调用
function GetText( textId )
{
    return window.Text ? window.Text.GetText( textId ) : textId;
}