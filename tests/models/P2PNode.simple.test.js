import { describe, it, expect } from 'vitest';

describe('P2PNode 简单测试', () => {
    it('应该创建节点实例', () => {
        const node = new P2PNode('test-node');
        expect(node.id).toBe('test-node');
    });
});