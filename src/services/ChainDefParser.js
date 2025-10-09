/**
 * ChainDefParser 类 - 区块链定义解析器
 * 
 * 根据需求 4.1 实现：
 * - 区块链定义文件的解析功能
 * - 序列号范围和面值对应关系的处理
 * - 定义文件的 SHA256 哈希计算
 */

import { Crypto } from './Crypto.js';

export class ChainDefParser {
    /**
     * 解析区块链定义文件
     * @param {string|Object} definitionInput - 定义文件内容（JSON字符串或对象）
     * @returns {Object} 解析后的定义对象
     */
    static async parseDefinition(definitionInput) {
        let definition;
        
        // 如果输入是字符串，尝试解析为JSON
        if (typeof definitionInput === 'string') {
            try {
                definition = JSON.parse(definitionInput);
            } catch (error) {
                throw new Error(`定义文件JSON格式错误: ${error.message}`);
            }
        } else if (typeof definitionInput === 'object' && definitionInput !== null) {
            definition = definitionInput;
        } else {
            throw new Error('定义文件格式无效，必须是JSON字符串或对象');
        }

        // 验证定义文件的基本结构
        this.validateDefinitionStructure(definition);

        // 处理序列号范围和面值对应关系
        const processedRanges = this.processRanges(definition.ranges);

        // 计算定义文件的SHA256哈希
        const definitionHash = await this.calculateDefinitionHash(definition);

        return {
            description: definition.description || '',
            ranges: processedRanges,
            originalDefinition: definition,
            definitionHash: definitionHash
        };
    }

    /**
     * 验证定义文件的基本结构
     * @param {Object} definition - 定义对象
     */
    static validateDefinitionStructure(definition) {
        if (!definition || typeof definition !== 'object') {
            throw new Error('定义文件必须是一个对象');
        }

        if (!definition.ranges || !Array.isArray(definition.ranges)) {
            throw new Error('定义文件必须包含ranges数组');
        }

        if (definition.ranges.length === 0) {
            throw new Error('ranges数组不能为空');
        }

        // 验证每个范围的结构
        for (let i = 0; i < definition.ranges.length; i++) {
            const range = definition.ranges[i];
            
            if (!range || typeof range !== 'object') {
                throw new Error(`范围[${i}]必须是一个对象`);
            }

            if (typeof range.start !== 'number' || !Number.isInteger(range.start)) {
                throw new Error(`范围[${i}]的start必须是整数`);
            }

            if (typeof range.end !== 'number' || !Number.isInteger(range.end)) {
                throw new Error(`范围[${i}]的end必须是整数`);
            }

            if (typeof range.value !== 'number' || range.value <= 0) {
                throw new Error(`范围[${i}]的value必须是正数`);
            }

            if (range.start > range.end) {
                throw new Error(`范围[${i}]的start不能大于end`);
            }

            if (range.start < 0) {
                throw new Error(`范围[${i}]的start不能为负数`);
            }
        }
    }

    /**
     * 处理序列号范围和面值对应关系
     * @param {Array} ranges - 原始范围数组
     * @returns {Array} 处理后的范围数组
     */
    static processRanges(ranges) {
        // 按start值排序
        const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);

        // 检查范围是否有重叠
        for (let i = 0; i < sortedRanges.length - 1; i++) {
            const current = sortedRanges[i];
            const next = sortedRanges[i + 1];
            
            if (current.end >= next.start) {
                throw new Error(`范围重叠: [${current.start}-${current.end}] 与 [${next.start}-${next.end}]`);
            }
        }

        // 返回处理后的范围，包含额外的元数据
        return sortedRanges.map((range, index) => ({
            index: index,
            start: range.start,
            end: range.end,
            value: range.value,
            count: range.end - range.start + 1, // 该范围内的序列号数量
            description: range.description || `范围${index + 1}`
        }));
    }

    /**
     * 计算定义文件的SHA256哈希
     * @param {Object} definition - 定义对象
     * @returns {string} SHA256哈希值
     */
    static async calculateDefinitionHash(definition) {
        // 创建一个标准化的定义对象用于哈希计算
        const normalizedDef = {
            description: definition.description || '',
            ranges: definition.ranges.map(range => ({
                start: range.start,
                end: range.end,
                value: range.value
            }))
        };

        // 将对象转换为JSON字符串（确保键的顺序一致）
        const jsonString = JSON.stringify(normalizedDef, Object.keys(normalizedDef).sort());
        
        return await Crypto.sha256(jsonString);
    }

    /**
     * 根据序列号查找对应的面值
     * @param {number} serialNumber - 序列号
     * @param {Array} ranges - 范围数组
     * @returns {number|null} 对应的面值，如果未找到返回null
     */
    static findValueBySerialNumber(serialNumber, ranges) {
        if (typeof serialNumber !== 'number' || !Number.isInteger(serialNumber)) {
            return null;
        }

        for (const range of ranges) {
            if (serialNumber >= range.start && serialNumber <= range.end) {
                return range.value;
            }
        }

        return null;
    }

    /**
     * 获取定义文件的统计信息
     * @param {Array} ranges - 范围数组
     * @returns {Object} 统计信息
     */
    static getDefinitionStats(ranges) {
        let totalCount = 0;
        let minValue = Infinity;
        let maxValue = -Infinity;
        let minSerial = Infinity;
        let maxSerial = -Infinity;

        for (const range of ranges) {
            totalCount += range.count;
            minValue = Math.min(minValue, range.value);
            maxValue = Math.max(maxValue, range.value);
            minSerial = Math.min(minSerial, range.start);
            maxSerial = Math.max(maxSerial, range.end);
        }

        return {
            totalBlockchains: totalCount,
            rangeCount: ranges.length,
            minValue: minValue === Infinity ? 0 : minValue,
            maxValue: maxValue === -Infinity ? 0 : maxValue,
            minSerialNumber: minSerial === Infinity ? 0 : minSerial,
            maxSerialNumber: maxSerial === -Infinity ? 0 : maxSerial
        };
    }

    /**
     * 生成所有序列号列表
     * @param {Array} ranges - 范围数组
     * @returns {Array} 所有序列号的数组
     */
    static generateAllSerialNumbers(ranges) {
        const serialNumbers = [];
        
        for (const range of ranges) {
            for (let serial = range.start; serial <= range.end; serial++) {
                serialNumbers.push({
                    serialNumber: serial,
                    value: range.value,
                    rangeIndex: range.index
                });
            }
        }

        return serialNumbers;
    }

    /**
     * 验证序列号是否在定义范围内
     * @param {number} serialNumber - 序列号
     * @param {Array} ranges - 范围数组
     * @returns {boolean} 是否有效
     */
    static isValidSerialNumber(serialNumber, ranges) {
        return this.findValueBySerialNumber(serialNumber, ranges) !== null;
    }

    /**
     * 创建默认的区块链定义
     * @returns {Object} 默认定义
     */
    static createDefaultDefinition() {
        return {
            description: "默认区块链定义",
            ranges: [
                { start: 1, end: 100, value: 1 },
                { start: 101, end: 200, value: 5 },
                { start: 201, end: 300, value: 10 }
            ]
        };
    }

    /**
     * 验证定义文件的完整性
     * @param {Object} parsedDefinition - 已解析的定义
     * @param {string} expectedHash - 期望的哈希值
     * @returns {boolean} 验证结果
     */
    static async verifyDefinitionIntegrity(parsedDefinition, expectedHash) {
        if (!parsedDefinition || !parsedDefinition.originalDefinition) {
            return false;
        }

        const calculatedHash = await this.calculateDefinitionHash(parsedDefinition.originalDefinition);
        return calculatedHash === expectedHash;
    }

    /**
     * 导出定义为JSON字符串
     * @param {Object} definition - 定义对象
     * @returns {string} JSON字符串
     */
    static exportDefinition(definition) {
        const exportData = {
            description: definition.description || '',
            ranges: definition.ranges.map(range => ({
                start: range.start,
                end: range.end,
                value: range.value,
                description: range.description
            }))
        };

        return JSON.stringify(exportData, null, 2);
    }
}