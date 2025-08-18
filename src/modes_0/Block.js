/**
 * Block 类 - 区块数据结构和基本验证功能
 * 
 * 根据需求 4.3, 5.2, 5.3 实现：
 * - 区块的构造函数、ID 生成、签名和基本验证方法
 * - 区块数据的序列化和反序列化
 */

import { Crypto } from '../services/Crypto.js';

export class Block {
    /**
     * 构造函数
     * @param {Object} data - 区块数据
     * @param {string} prevBlockId - 上一个区块的ID
     * @param {string} creatorId - 创建者ID（公钥）
     * @param {number} timestamp - 时间戳
     */
    constructor(data, prevBlockId = null, creatorId = null, timestamp = null) {
        this.data = data;
        this.prevBlockId = prevBlockId;
        this.creatorId = creatorId;
        this.timestamp = timestamp || Date.now();
        this.signature = null;
        this.id = null;
    }

    /**
     * 生成区块ID
     * 使用区块内容的SHA256哈希作为ID
     */
    async genId() {
        const blockContent = {
            data: this.data,
            prevBlockId: this.prevBlockId,
            creatorId: this.creatorId,
            timestamp: this.timestamp
        };
        
        const contentString = JSON.stringify(blockContent);
        this.id = await Crypto.sha256(contentString);
    }

    /**
     * 签名区块
     * @param {string} privateKey - 私钥
     */
    async signBlock(privateKey) {
        if (!this.id) {
            await this.genId();
        }
        
        // 使用区块ID进行签名
        this.signature = await Crypto.sign(this.id, privateKey);
    }

    /**
     * 验证区块签名
     * @param {string} publicKey - 公钥
     * @returns {boolean} 验证结果
     */
    async verifySig(publicKey = null) {
        if (!this.signature) {
            return false;
        }
        
        // 如果没有提供公钥，使用创建者的公钥
        const keyToUse = publicKey || this.creatorId;
        if (!keyToUse) {
            return false;
        }
        
        return await Crypto.verify(this.signature, this.id, keyToUse);
    }

    /**
     * 验证区块时间
     * @param {number} curTime - 当前时间
     * @param {number} maxDelay - 最大延迟时间
     * @returns {boolean} 时间验证结果
     */
    verifyTime(curTime, maxDelay) {
        const timeDiff = curTime - this.timestamp;
        return timeDiff >= 0 && timeDiff <= maxDelay;
    }

    /**
     * 序列化区块数据
     * @returns {string} JSON字符串
     */
    serialize() {
        return JSON.stringify({
            id: this.id,
            data: this.data,
            prevBlockId: this.prevBlockId,
            creatorId: this.creatorId,
            timestamp: this.timestamp,
            signature: this.signature
        });
    }

    /**
     * 反序列化区块数据
     * @param {string} jsonString - JSON字符串
     * @returns {Block} 区块实例
     */
    static deserialize(jsonString) {
        const blockData = JSON.parse(jsonString);
        
        const block = new Block(
            blockData.data,
            blockData.prevBlockId,
            blockData.creatorId,
            blockData.timestamp
        );
        
        block.id = blockData.id;
        block.signature = blockData.signature;
        
        return block;
    }

    /**
     * 获取区块ID
     * @returns {string} 区块ID
     */
    getId() {
        return this.id;
    }

    /**
     * 获取区块数据
     * @returns {Object} 区块数据
     */
    getData() {
        return this.data;
    }

    /**
     * 获取创建者ID
     * @returns {string} 创建者ID
     */
    getCreator() {
        return this.creatorId;
    }

    /**
     * 获取时间戳
     * @returns {number} 时间戳
     */
    getTime() {
        return this.timestamp;
    }

    /**
     * 获取上一个区块ID
     * @returns {string} 上一个区块ID
     */
    getPrevBlockId() {
        return this.prevBlockId;
    }

    /**
     * 获取签名
     * @returns {string} 签名
     */
    getSignature() {
        return this.signature;
    }

    /**
     * 验证区块的基本完整性
     * @returns {boolean} 验证结果
     */
    async validateBasic() {
        // 检查必要字段
        if (!this.id || !this.data || !this.creatorId || !this.timestamp) {
            return false;
        }

        // 验证ID是否正确
        const expectedId = this.id;
        await this.genId();
        if (this.id !== expectedId) {
            return false;
        }

        // 对于系统区块，跳过签名验证
        if (this.creatorId === 'system') {
            return true;
        }

        // 验证签名
        return await this.verifySig();
    }
}