/**
 * BlockChain 类 - 区块链管理和验证
 * 
 * 根据需求 4.1, 4.2, 4.3, 4.4 实现：
 * - 根区块和所有权区块的创建
 * - 区块链的区块添加、查询和验证功能
 * - 分叉检测的基础逻辑
 */

import { Block } from './Block.js';
import { Crypto } from '../services/Crypto.js';

export class BlockChain {
    /**
     * 构造函数
     * @param {Object} definition - 区块链定义
     * @param {string} serialNumber - 序列号
     */
    constructor(definition, serialNumber) {
        this.definition = definition;
        this.serialNumber = serialNumber;
        this.blocks = new Map(); // blockId -> Block
        this.blockOrder = []; // 按添加顺序存储区块ID
        this.id = null;
        this.currentOwner = null;
        this.value = this.calculateValue();
        this.rootBlock = null;
        this.ownerBlock = null;
        
        // 创建根区块
        this.createRootBlock();
    }

    /**
     * 计算区块链价值
     * @returns {number} 区块链价值
     */
    calculateValue() {
        if (!this.definition || !this.definition.ranges) {
            return 0;
        }

        const serialNum = parseInt(this.serialNumber);
        for (const range of this.definition.ranges) {
            if (serialNum >= range.start && serialNum <= range.end) {
                return range.value;
            }
        }
        return 0;
    }

    /**
     * 创建根区块
     */
    async createRootBlock() {
        const rootData = {
            type: 'root',
            definitionHash: await Crypto.sha256(JSON.stringify(this.definition)),
            serialNumber: this.serialNumber
        };

        this.rootBlock = new Block(rootData, null, 'system', Date.now());
        await this.rootBlock.genId();
        // 系统区块使用特殊签名，不需要真实的密钥对
        this.rootBlock.signature = 'system-signature';
        
        this.id = this.rootBlock.getId();
        this.addBlock(this.rootBlock);
    }

    /**
     * 创建所有权区块
     * @param {string} ownerId - 所有者ID（公钥）
     * @param {string} privateKey - 所有者私钥
     * @returns {Block} 所有权区块
     */
    async createOwnerBlock(ownerId, privateKey) {
        if (!this.rootBlock) {
            throw new Error('根区块不存在，无法创建所有权区块');
        }

        const ownerData = {
            type: 'ownership',
            ownerId: ownerId
        };

        const prevBlockId = this.getLatestBlock().getId();
        this.ownerBlock = new Block(ownerData, prevBlockId, ownerId, Date.now());
        await this.ownerBlock.signBlock(privateKey);
        
        this.currentOwner = ownerId;
        this.addBlock(this.ownerBlock);
        
        return this.ownerBlock;
    }

    /**
     * 添加区块到区块链
     * @param {Block} block - 要添加的区块
     * @returns {boolean} 添加是否成功
     */
    addBlock(block) {
        if (!block || !block.getId()) {
            return false;
        }

        // 检查区块是否已存在
        if (this.blocks.has(block.getId())) {
            return false;
        }

        // 验证区块的基本完整性
        if (!block.validateBasic()) {
            return false;
        }

        // 验证区块链的连续性（除了根区块）
        if (this.blockOrder.length > 0) {
            const latestBlock = this.getLatestBlock();
            if (block.getPrevBlockId() !== latestBlock.getId()) {
                return false;
            }
        }

        // 添加区块
        this.blocks.set(block.getId(), block);
        this.blockOrder.push(block.getId());

        // 更新当前所有者（如果是转移区块）
        const blockData = block.getData();
        if (blockData.type === 'transfer') {
            this.currentOwner = blockData.targetUserId;
        } else if (blockData.type === 'ownership') {
            this.currentOwner = blockData.ownerId;
        }

        return true;
    }

    /**
     * 获取指定ID的区块
     * @param {string} blockId - 区块ID
     * @returns {Block|null} 区块实例或null
     */
    getBlock(blockId) {
        return this.blocks.get(blockId) || null;
    }

    /**
     * 获取最新区块
     * @returns {Block|null} 最新区块或null
     */
    getLatestBlock() {
        if (this.blockOrder.length === 0) {
            return null;
        }
        
        const latestBlockId = this.blockOrder[this.blockOrder.length - 1];
        return this.blocks.get(latestBlockId);
    }

    /**
     * 获取所有区块
     * @returns {Block[]} 按顺序排列的区块数组
     */
    getAllBlocks() {
        return this.blockOrder.map(blockId => this.blocks.get(blockId));
    }

    /**
     * 验证整个区块链的完整性
     * @returns {boolean} 验证结果
     */
    async validateChain() {
        if (this.blockOrder.length === 0) {
            return false;
        }

        // 验证根区块
        const rootBlock = this.blocks.get(this.blockOrder[0]);
        if (!rootBlock || rootBlock.getData().type !== 'root') {
            return false;
        }

        // 验证区块链的连续性
        for (let i = 1; i < this.blockOrder.length; i++) {
            const currentBlock = this.blocks.get(this.blockOrder[i]);
            const prevBlock = this.blocks.get(this.blockOrder[i - 1]);
            
            if (!currentBlock || !prevBlock) {
                return false;
            }

            // 验证前一个区块ID的引用
            if (currentBlock.getPrevBlockId() !== prevBlock.getId()) {
                return false;
            }

            // 验证区块的基本完整性
            if (!await currentBlock.validateBasic()) {
                return false;
            }
        }

        return true;
    }

    /**
     * 检测分叉
     * @param {Block} newBlock - 新区块
     * @returns {Object} 分叉检测结果
     */
    detectFork(newBlock) {
        const result = {
            isFork: false,
            conflictBlock: null,
            reason: null
        };

        if (!newBlock) {
            return result;
        }

        const newBlockData = newBlock.getData();
        const newBlockPrevId = newBlock.getPrevBlockId();

        // 检查是否是对同一位置的不同区块
        for (const existingBlockId of this.blockOrder) {
            const existingBlock = this.blocks.get(existingBlockId);
            const existingBlockData = existingBlock.getData();

            // 如果前一个区块ID相同但区块ID不同，则是分叉
            if (existingBlock.getPrevBlockId() === newBlockPrevId && 
                existingBlock.getId() !== newBlock.getId()) {
                result.isFork = true;
                result.conflictBlock = existingBlock;
                result.reason = 'POSITION_CONFLICT';
                break;
            }

            // 检查双花攻击（同一用户尝试转移同一区块链给不同目标）
            if (newBlockData.type === 'transfer' && 
                existingBlockData.type === 'transfer' &&
                newBlockData.blockchainId === existingBlockData.blockchainId &&
                newBlock.getCreator() === existingBlock.getCreator() &&
                newBlockData.targetUserId !== existingBlockData.targetUserId) {
                result.isFork = true;
                result.conflictBlock = existingBlock;
                result.reason = 'DOUBLE_SPEND';
                break;
            }
        }

        return result;
    }

    /**
     * 获取区块链ID
     * @returns {string} 区块链ID
     */
    getId() {
        return this.id;
    }

    /**
     * 获取当前所有者
     * @returns {string} 当前所有者ID
     */
    getCurrentOwner() {
        return this.currentOwner;
    }

    /**
     * 获取区块链价值
     * @returns {number} 区块链价值
     */
    getValue() {
        return this.value;
    }

    /**
     * 获取区块链定义
     * @returns {Object} 区块链定义
     */
    getDefinition() {
        return this.definition;
    }

    /**
     * 获取序列号
     * @returns {string} 序列号
     */
    getSerialNumber() {
        return this.serialNumber;
    }

    /**
     * 获取根区块
     * @returns {Block} 根区块
     */
    getRootBlock() {
        return this.rootBlock;
    }

    /**
     * 获取所有权区块
     * @returns {Block} 所有权区块
     */
    getOwnerBlock() {
        return this.ownerBlock;
    }

    /**
     * 获取区块数量
     * @returns {number} 区块数量
     */
    getBlockCount() {
        return this.blockOrder.length;
    }

    /**
     * 检查是否包含指定区块
     * @param {string} blockId - 区块ID
     * @returns {boolean} 是否包含
     */
    hasBlock(blockId) {
        return this.blocks.has(blockId);
    }

    /**
     * 获取区块链的历史记录
     * @returns {Array} 历史记录数组
     */
    getHistory() {
        return this.blockOrder.map(blockId => {
            const block = this.blocks.get(blockId);
            const blockData = block.getData();
            
            return {
                blockId: block.getId(),
                type: blockData.type,
                creator: block.getCreator(),
                timestamp: block.getTime(),
                data: blockData
            };
        });
    }

    /**
     * 序列化区块链
     * @returns {string} JSON字符串
     */
    serialize() {
        const serializedBlocks = {};
        for (const [blockId, block] of this.blocks) {
            serializedBlocks[blockId] = block.serialize();
        }

        return JSON.stringify({
            id: this.id,
            definition: this.definition,
            serialNumber: this.serialNumber,
            currentOwner: this.currentOwner,
            value: this.value,
            blockOrder: this.blockOrder,
            blocks: serializedBlocks
        });
    }

    /**
     * 反序列化区块链
     * @param {string} jsonString - JSON字符串
     * @returns {BlockChain} 区块链实例
     */
    static deserialize(jsonString) {
        const data = JSON.parse(jsonString);
        
        const blockchain = new BlockChain(data.definition, data.serialNumber);
        blockchain.id = data.id;
        blockchain.currentOwner = data.currentOwner;
        blockchain.value = data.value;
        blockchain.blockOrder = data.blockOrder;
        blockchain.blocks.clear();

        // 反序列化所有区块
        for (const [blockId, blockJson] of Object.entries(data.blocks)) {
            const block = Block.deserialize(blockJson);
            blockchain.blocks.set(blockId, block);
            
            // 设置特殊区块引用
            const blockData = block.getData();
            if (blockData.type === 'root') {
                blockchain.rootBlock = block;
            } else if (blockData.type === 'ownership') {
                blockchain.ownerBlock = block;
            }
        }

        return blockchain;
    }
}