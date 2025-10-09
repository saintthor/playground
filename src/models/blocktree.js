/**
 * @fileoverview 定义了区块树数据结构，用于表示带层级关系的消息。
 * @version 1.0.0
 */

/**
 * 表示一个消息区块。
 */
class MessageBlock
{
    /**
     * @param {string} content 消息内容
     * @param {string} creatorPubKey 发布者公钥
     * @param {string} prevId 上级消息的ID
     * @param {string[]} tags 标签
     */
    constructor( content, creatorPubKey, prevId = null, tags = [] )
    {
        const timestamp = Date.now();
        this.id = MessageBlock.calculateId( content, creatorPubKey, prevId, tags, timestamp );
        this.content = content;
        this.timestamp = timestamp;
        this.creatorPubKey = creatorPubKey;
        this.prevId = prevId;
        this.tags = tags;
    }

    /**
     * 计算区块的唯一ID。
     * @param {string} content
     * @param {string} creatorPubKey
     * @param {string} prevId
     * @param {string[]} tags
     * @param {number} timestamp
     * @returns {string}
     */
    static calculateId( content, creatorPubKey, prevId, tags, timestamp )
    {
        const Data = {
            content,
            creatorPubKey,
            prevId,
            tags,
            timestamp
        };
        return `msg_block_${Crypto.hash(JSON.stringify(Data))}`;
    }
}

/**
 * 表示一个消息区块树。
 */
class BlockTree
{
    constructor()
    {
        this.nodes = new Map(); // 存储所有区块节点
        this.rootId = null; // 根节点ID
    }

    /**
     * 添加一个新区块到树中。
     * @param {MessageBlock} block
     */
    addBlock( block )
    {
        if ( !this.rootId )
        {
            this.rootId = block.id;
        }
        this.nodes.set( block.id, block );
    }

    /**
     * 获取指定ID的区块。
     * @param {string} id
     * @returns {MessageBlock|undefined}
     */
    getBlock( id )
    {
        return this.nodes.get( id );
    }

    /**
     * 获取所有区块。
     * @returns {Map<string, MessageBlock>}
     */
    getAllBlocks()
    {
        return this.nodes;
    }

    /**
     * 获取区块树的树形结构。
     * @returns {object}
     */
    getTreeStructure()
    {
        const ChildrenMap = new Map();
        this.nodes.forEach( node =>
        {
            if ( node.prevId )
            {
                if ( !ChildrenMap.has( node.prevId ) )
                {
                    ChildrenMap.set( node.prevId, [] );
                }
                ChildrenMap.get( node.prevId ).push( node.id );
            }
        } );

        const BuildTree = ( nodeId ) =>
        {
            const Node = this.nodes.get( nodeId );
            const Children = ChildrenMap.get( nodeId ) || [];
            return {
                ...Node,
                children: Children.map( BuildTree )
            };
        };

        return this.rootId ? BuildTree( this.rootId ) : null;
    }
}