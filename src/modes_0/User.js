/**
 * User 类 - 虚拟用户
 * 
 * 实现虚拟用户的身份管理、区块链操作和资产管理功能
 * 根据需求 2.1, 2.2, 2.3, 5.1 实现
 */

import { Crypto } from '../services/Crypto.js';
import { Block } from './Block.js';

export class User {
    /**
     * 构造函数
     * @param {string} id - 用户ID
     */
    constructor(id) {
        this.id = id;
        this.publicKey = null;
        this.privateKey = null;
        this.ownedChains = new Set(); // 拥有的区块链ID集合
        this.isInitialized = false;
    }

    /**
     * 生成密钥对
     * @returns {Promise<void>}
     */
    async genKeyPair() {
        try {
            const keyPair = await Crypto.genKeyPair();
            this.publicKey = keyPair.publicKey;
            this.privateKey = keyPair.privateKey;
            this.isInitialized = true;
        } catch (error) {
            console.error(`用户 ${this.id} 密钥生成失败:`, error);
            throw error;
        }
    }

    /**
     * 获取公钥
     * @returns {string} Base64编码的公钥
     */
    getPubKey() {
        if (!this.publicKey) {
            throw new Error(`用户 ${this.id} 尚未初始化密钥对`);
        }
        return this.publicKey;
    }

    /**
     * 创建转移区块
     * @param {string} blockchainId - 区块链ID
     * @param {string} targetUserId - 目标用户公钥
     * @param {string} prevBlockId - 上一个区块ID
     * @returns {Promise<Block>} 转移区块
     */
    async createTransferBlock(blockchainId, targetUserId, prevBlockId) {
        if (!this.isInitialized) {
            throw new Error(`用户 ${this.id} 尚未初始化`);
        }

        const transferData = {
            type: 'transfer',
            blockchainId: blockchainId,
            targetUserId: targetUserId,
            timestamp: Date.now()
        };

        const transferBlock = new Block(transferData, prevBlockId, this.publicKey, Date.now());
        await transferBlock.signBlock(this.privateKey);

        return transferBlock;
    }

    /**
     * 签名数据
     * @param {string} data - 要签名的数据
     * @returns {Promise<string>} 签名结果
     */
    async signData(data) {
        if (!this.privateKey) {
            throw new Error(`用户 ${this.id} 尚未初始化密钥对`);
        }
        return await Crypto.sign(data, this.privateKey);
    }

    /**
     * 添加拥有的区块链
     * @param {string} blockchainId - 区块链ID
     */
    addOwnedChain(blockchainId) {
        this.ownedChains.add(blockchainId);
    }

    /**
     * 移除拥有的区块链
     * @param {string} blockchainId - 区块链ID
     */
    removeOwnedChain(blockchainId) {
        this.ownedChains.delete(blockchainId);
    }

    /**
     * 获取拥有的区块链列表
     * @returns {Array<string>} 区块链ID数组
     */
    getOwnedChains() {
        return Array.from(this.ownedChains);
    }

    /**
     * 检查是否拥有指定区块链
     * @param {string} blockchainId - 区块链ID
     * @returns {boolean} 是否拥有
     */
    ownsChain(blockchainId) {
        return this.ownedChains.has(blockchainId);
    }

    /**
     * 计算总资产价值
     * @param {Map<string, BlockChain>} blockchains - 所有区块链的映射
     * @returns {number} 总资产价值
     */
    getTotalAsset(blockchains) {
        let totalValue = 0;
        for (const chainId of this.ownedChains) {
            const blockchain = blockchains.get(chainId);
            if (blockchain) {
                totalValue += blockchain.getValue();
            }
        }
        return totalValue;
    }

    /**
     * 获取用户状态信息
     * @returns {Object} 用户状态
     */
    getStatus() {
        return {
            id: this.id,
            publicKey: this.publicKey,
            ownedChainsCount: this.ownedChains.size,
            ownedChains: Array.from(this.ownedChains),
            isInitialized: this.isInitialized
        };
    }

    /**
     * 序列化用户数据
     * @returns {string} JSON字符串
     */
    serialize() {
        return JSON.stringify({
            id: this.id,
            publicKey: this.publicKey,
            privateKey: this.privateKey,
            ownedChains: Array.from(this.ownedChains),
            isInitialized: this.isInitialized
        });
    }

    /**
     * 反序列化用户数据
     * @param {string} jsonString - JSON字符串
     * @returns {User} 用户实例
     */
    static deserialize(jsonString) {
        const data = JSON.parse(jsonString);
        
        const user = new User(data.id);
        user.publicKey = data.publicKey;
        user.privateKey = data.privateKey;
        user.ownedChains = new Set(data.ownedChains);
        user.isInitialized = data.isInitialized;
        
        return user;
    }
}