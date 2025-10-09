/**
 * ChainDefParser 单元测试
 * 
 * 测试区块链定义解析器的各项功能
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('ChainDefParser', () => {
    let validDefinition;
    let validDefinitionString;

    beforeEach(() => {
        validDefinition = {
            description: "测试区块链定义",
            ranges: [
                { start: 1, end: 100, value: 1 },
                { start: 101, end: 200, value: 5 },
                { start: 201, end: 300, value: 10 }
            ]
        };
        
        validDefinitionString = JSON.stringify(validDefinition);
    });

    describe('parseDefinition', () => {
        it('应该成功解析有效的定义对象', async () => {
            const result = await ChainDefParser.parseDefinition(validDefinition);
            
            expect(result).toHaveProperty('description', '测试区块链定义');
            expect(result).toHaveProperty('ranges');
            expect(result).toHaveProperty('originalDefinition');
            expect(result).toHaveProperty('definitionHash');
            expect(result.ranges).toHaveLength(3);
        });

        it('应该成功解析有效的定义JSON字符串', async () => {
            const result = await ChainDefParser.parseDefinition(validDefinitionString);
            
            expect(result).toHaveProperty('description', '测试区块链定义');
            expect(result.ranges).toHaveLength(3);
        });

        it('应该为范围添加额外的元数据', async () => {
            const result = await ChainDefParser.parseDefinition(validDefinition);
            
            const firstRange = result.ranges[0];
            expect(firstRange).toHaveProperty('index', 0);
            expect(firstRange).toHaveProperty('count', 100);
            expect(firstRange).toHaveProperty('description');
        });

        it('应该按start值对范围进行排序', async () => {
            const unorderedDefinition = {
                description: "无序定义",
                ranges: [
                    { start: 201, end: 300, value: 10 },
                    { start: 1, end: 100, value: 1 },
                    { start: 101, end: 200, value: 5 }
                ]
            };

            const result = await ChainDefParser.parseDefinition(unorderedDefinition);
            
            expect(result.ranges[0].start).toBe(1);
            expect(result.ranges[1].start).toBe(101);
            expect(result.ranges[2].start).toBe(201);
        });

        it('应该拒绝无效的JSON字符串', async () => {
            const invalidJson = '{ invalid json }';
            
            await expect(ChainDefParser.parseDefinition(invalidJson))
                .rejects.toThrow('定义文件JSON格式错误');
        });

        it('应该拒绝null或undefined输入', async () => {
            await expect(ChainDefParser.parseDefinition(null))
                .rejects.toThrow('定义文件格式无效');
            
            await expect(ChainDefParser.parseDefinition(undefined))
                .rejects.toThrow('定义文件格式无效');
        });
    });

    describe('validateDefinitionStructure', () => {
        it('应该验证有效的定义结构', () => {
            expect(() => {
                ChainDefParser.validateDefinitionStructure(validDefinition);
            }).not.toThrow();
        });

        it('应该拒绝缺少ranges的定义', () => {
            const invalidDef = { description: "测试" };
            
            expect(() => {
                ChainDefParser.validateDefinitionStructure(invalidDef);
            }).toThrow('定义文件必须包含ranges数组');
        });

        it('应该拒绝空的ranges数组', () => {
            const invalidDef = { ranges: [] };
            
            expect(() => {
                ChainDefParser.validateDefinitionStructure(invalidDef);
            }).toThrow('ranges数组不能为空');
        });

        it('应该拒绝无效的范围对象', () => {
            const invalidDef = {
                ranges: [
                    { start: "1", end: 100, value: 1 } // start应该是数字
                ]
            };
            
            expect(() => {
                ChainDefParser.validateDefinitionStructure(invalidDef);
            }).toThrow('范围[0]的start必须是整数');
        });

        it('应该拒绝start大于end的范围', () => {
            const invalidDef = {
                ranges: [
                    { start: 100, end: 50, value: 1 }
                ]
            };
            
            expect(() => {
                ChainDefParser.validateDefinitionStructure(invalidDef);
            }).toThrow('范围[0]的start不能大于end');
        });

        it('应该拒绝负数的start值', () => {
            const invalidDef = {
                ranges: [
                    { start: -1, end: 100, value: 1 }
                ]
            };
            
            expect(() => {
                ChainDefParser.validateDefinitionStructure(invalidDef);
            }).toThrow('范围[0]的start不能为负数');
        });

        it('应该拒绝非正数的value值', () => {
            const invalidDef = {
                ranges: [
                    { start: 1, end: 100, value: 0 }
                ]
            };
            
            expect(() => {
                ChainDefParser.validateDefinitionStructure(invalidDef);
            }).toThrow('范围[0]的value必须是正数');
        });
    });

    describe('processRanges', () => {
        it('应该检测范围重叠', () => {
            const overlappingRanges = [
                { start: 1, end: 100, value: 1 },
                { start: 50, end: 150, value: 5 } // 与第一个范围重叠
            ];
            
            expect(() => {
                ChainDefParser.processRanges(overlappingRanges);
            }).toThrow('范围重叠');
        });

        it('应该允许相邻但不重叠的范围', () => {
            const adjacentRanges = [
                { start: 1, end: 100, value: 1 },
                { start: 101, end: 200, value: 5 }
            ];
            
            expect(() => {
                ChainDefParser.processRanges(adjacentRanges);
            }).not.toThrow();
        });

        it('应该计算每个范围的数量', () => {
            const ranges = [
                { start: 1, end: 100, value: 1 }
            ];
            
            const result = ChainDefParser.processRanges(ranges);
            expect(result[0].count).toBe(100);
        });
    });

    describe('calculateDefinitionHash', () => {
        it('应该为相同的定义生成相同的哈希', async () => {
            const hash1 = await ChainDefParser.calculateDefinitionHash(validDefinition);
            const hash2 = await ChainDefParser.calculateDefinitionHash(validDefinition);
            
            expect(hash1).toBe(hash2);
        });

        it('应该为不同的定义生成不同的哈希', async () => {
            const definition2 = {
                ...validDefinition,
                description: "不同的描述"
            };
            
            const hash1 = await ChainDefParser.calculateDefinitionHash(validDefinition);
            const hash2 = await ChainDefParser.calculateDefinitionHash(definition2);
            
            expect(hash1).not.toBe(hash2);
        });

        it('应该生成64字符的十六进制哈希', async () => {
            const hash = await ChainDefParser.calculateDefinitionHash(validDefinition);
            
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });
    });

    describe('findValueBySerialNumber', () => {
        let ranges;

        beforeEach(async () => {
            const parsed = await ChainDefParser.parseDefinition(validDefinition);
            ranges = parsed.ranges;
        });

        it('应该找到有效序列号的面值', () => {
            expect(ChainDefParser.findValueBySerialNumber(50, ranges)).toBe(1);
            expect(ChainDefParser.findValueBySerialNumber(150, ranges)).toBe(5);
            expect(ChainDefParser.findValueBySerialNumber(250, ranges)).toBe(10);
        });

        it('应该为边界值返回正确的面值', () => {
            expect(ChainDefParser.findValueBySerialNumber(1, ranges)).toBe(1);
            expect(ChainDefParser.findValueBySerialNumber(100, ranges)).toBe(1);
            expect(ChainDefParser.findValueBySerialNumber(101, ranges)).toBe(5);
            expect(ChainDefParser.findValueBySerialNumber(200, ranges)).toBe(5);
        });

        it('应该为无效序列号返回null', () => {
            expect(ChainDefParser.findValueBySerialNumber(0, ranges)).toBeNull();
            expect(ChainDefParser.findValueBySerialNumber(301, ranges)).toBeNull();
            expect(ChainDefParser.findValueBySerialNumber(-1, ranges)).toBeNull();
        });

        it('应该为非整数输入返回null', () => {
            expect(ChainDefParser.findValueBySerialNumber(1.5, ranges)).toBeNull();
            expect(ChainDefParser.findValueBySerialNumber("1", ranges)).toBeNull();
            expect(ChainDefParser.findValueBySerialNumber(null, ranges)).toBeNull();
        });
    });

    describe('getDefinitionStats', () => {
        it('应该计算正确的统计信息', async () => {
            const parsed = await ChainDefParser.parseDefinition(validDefinition);
            const stats = ChainDefParser.getDefinitionStats(parsed.ranges);
            
            expect(stats.totalBlockchains).toBe(300);
            expect(stats.rangeCount).toBe(3);
            expect(stats.minValue).toBe(1);
            expect(stats.maxValue).toBe(10);
            expect(stats.minSerialNumber).toBe(1);
            expect(stats.maxSerialNumber).toBe(300);
        });

        it('应该处理空范围数组', () => {
            const stats = ChainDefParser.getDefinitionStats([]);
            
            expect(stats.totalBlockchains).toBe(0);
            expect(stats.rangeCount).toBe(0);
            expect(stats.minValue).toBe(0);
            expect(stats.maxValue).toBe(0);
        });
    });

    describe('generateAllSerialNumbers', () => {
        it('应该生成所有序列号', async () => {
            const smallDefinition = {
                ranges: [
                    { start: 1, end: 3, value: 1 },
                    { start: 5, end: 6, value: 5 }
                ]
            };
            
            const parsed = await ChainDefParser.parseDefinition(smallDefinition);
            const serialNumbers = ChainDefParser.generateAllSerialNumbers(parsed.ranges);
            
            expect(serialNumbers).toHaveLength(5);
            expect(serialNumbers[0]).toEqual({ serialNumber: 1, value: 1, rangeIndex: 0 });
            expect(serialNumbers[3]).toEqual({ serialNumber: 5, value: 5, rangeIndex: 1 });
        });
    });

    describe('isValidSerialNumber', () => {
        let ranges;

        beforeEach(async () => {
            const parsed = await ChainDefParser.parseDefinition(validDefinition);
            ranges = parsed.ranges;
        });

        it('应该验证有效的序列号', () => {
            expect(ChainDefParser.isValidSerialNumber(50, ranges)).toBe(true);
            expect(ChainDefParser.isValidSerialNumber(150, ranges)).toBe(true);
            expect(ChainDefParser.isValidSerialNumber(250, ranges)).toBe(true);
        });

        it('应该拒绝无效的序列号', () => {
            expect(ChainDefParser.isValidSerialNumber(0, ranges)).toBe(false);
            expect(ChainDefParser.isValidSerialNumber(301, ranges)).toBe(false);
        });
    });

    describe('createDefaultDefinition', () => {
        it('应该创建有效的默认定义', async () => {
            const defaultDef = ChainDefParser.createDefaultDefinition();
            
            expect(() => {
                ChainDefParser.validateDefinitionStructure(defaultDef);
            }).not.toThrow();
            
            expect(defaultDef.ranges).toHaveLength(3);
        });
    });

    describe('verifyDefinitionIntegrity', () => {
        it('应该验证正确的哈希', async () => {
            const parsed = await ChainDefParser.parseDefinition(validDefinition);
            const isValid = await ChainDefParser.verifyDefinitionIntegrity(
                parsed, 
                parsed.definitionHash
            );
            
            expect(isValid).toBe(true);
        });

        it('应该拒绝错误的哈希', async () => {
            const parsed = await ChainDefParser.parseDefinition(validDefinition);
            const isValid = await ChainDefParser.verifyDefinitionIntegrity(
                parsed, 
                'wrong-hash'
            );
            
            expect(isValid).toBe(false);
        });

        it('应该处理无效的输入', async () => {
            const isValid = await ChainDefParser.verifyDefinitionIntegrity(null, 'hash');
            expect(isValid).toBe(false);
        });
    });

    describe('exportDefinition', () => {
        it('应该导出有效的JSON字符串', async () => {
            const parsed = await ChainDefParser.parseDefinition(validDefinition);
            const exported = ChainDefParser.exportDefinition(parsed);
            
            expect(() => JSON.parse(exported)).not.toThrow();
            
            const reimported = JSON.parse(exported);
            expect(reimported.description).toBe(validDefinition.description);
            expect(reimported.ranges).toHaveLength(3);
        });
    });

    describe('集成测试', () => {
        it('应该完整处理复杂的定义文件', async () => {
            const complexDefinition = {
                description: "复杂的区块链定义",
                ranges: [
                    { start: 1, end: 50, value: 1, description: "低面值" },
                    { start: 51, end: 100, value: 5, description: "中面值" },
                    { start: 101, end: 150, value: 10, description: "高面值" },
                    { start: 200, end: 250, value: 50, description: "超高面值" }
                ]
            };

            const parsed = await ChainDefParser.parseDefinition(complexDefinition);
            
            // 验证解析结果
            expect(parsed.ranges).toHaveLength(4);
            expect(parsed.definitionHash).toMatch(/^[a-f0-9]{64}$/);
            
            // 验证统计信息
            const stats = ChainDefParser.getDefinitionStats(parsed.ranges);
            expect(stats.totalBlockchains).toBe(201); // 50+50+50+51
            expect(stats.maxValue).toBe(50);
            
            // 验证序列号查找
            expect(ChainDefParser.findValueBySerialNumber(25, parsed.ranges)).toBe(1);
            expect(ChainDefParser.findValueBySerialNumber(75, parsed.ranges)).toBe(5);
            expect(ChainDefParser.findValueBySerialNumber(125, parsed.ranges)).toBe(10);
            expect(ChainDefParser.findValueBySerialNumber(225, parsed.ranges)).toBe(50);
            
            // 验证无效序列号
            expect(ChainDefParser.findValueBySerialNumber(175, parsed.ranges)).toBeNull();
            
            // 验证完整性
            const isValid = await ChainDefParser.verifyDefinitionIntegrity(
                parsed, 
                parsed.definitionHash
            );
            expect(isValid).toBe(true);
        });
    });
});