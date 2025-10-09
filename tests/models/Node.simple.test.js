import { describe, it, expect } from 'vitest';
import { Node } from '../../src/models/Node.js';

describe('Node 简单测试', () => {
    it('应该创建节点实例', () => {
        const node = new Node('test-node');
        expect(node.id).toBe('test-node');
    });
});