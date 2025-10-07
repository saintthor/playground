/**
 * BlockTree and TreeBlock unit tests.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { TreeBlock } from '../../src/models/blocktree.js';
import { BlockTree } from '../../src/models/blocktree.js';
import { User, Hash, ABuff2Base64, Base642ABuff } from '../../src/models/user.js';
import { Crypto } from '../../src/services/Crypto.js';

// Set up global functions that are expected by the code but not available in jsdom
global.Hash = Hash;
global.ABuff2Base64 = ABuff2Base64;
global.Base642ABuff = Base642ABuff;

describe('BlockTree and TreeBlock', () => {
    let testUser;

    beforeAll(async () => {
        // Create a user for signing blocks
        testUser = await new User();
    });

    describe('TreeBlock', () => {
        it('should create a root TreeBlock correctly', async () => {
            const content = "This is a root message.";
            const rootBlock = await new TreeBlock(content, null, testUser, "news");

            expect(rootBlock).toBeInstanceOf(TreeBlock);
            expect(rootBlock.Content).toBe(content);
            expect(rootBlock.ParentId).toBe('');
            expect(rootBlock.Owner).toBe(testUser);
            expect(rootBlock.Tags).toEqual(["news"]);
            expect(rootBlock.Id).toBeTypeOf('string');
            expect(rootBlock.Id.length).toBeGreaterThan(0);

            // Verify metadata
            const metadata = rootBlock.Metadata;
            expect(metadata.publisherKey).toBe(testUser.Id);
            expect(metadata.parentId).toBe('');
            expect(metadata.tags).toEqual(['news']);

            // Verify content hash
            const contentHashBuffer = await Hash(content, 'SHA-256');
            const contentHash = ABuff2Base64(contentHashBuffer);
            expect(metadata.contentHash).toBe(contentHash);

            // Verify signature
            const canonicalJson = rootBlock.canonicalJSON(metadata);
            const isValidSignature = await User.Verify(rootBlock.Id, canonicalJson, testUser.Id);
            expect(isValidSignature).toBe(true);
        });

        it('should create a reply TreeBlock correctly', async () => {
            const rootBlock = await new TreeBlock("Root message", null, testUser);
            const replyContent = "This is a reply.";
            const replyBlock = await new TreeBlock(replyContent, rootBlock.Id, testUser, ["comment", "tech"]);

            expect(replyBlock).toBeInstanceOf(TreeBlock);
            expect(replyBlock.Content).toBe(replyContent);
            expect(replyBlock.ParentId).toBe(rootBlock.Id);
            expect(replyBlock.Tags).toEqual(["comment", "tech"]);

            // Verify metadata
            const metadata = replyBlock.Metadata;
            expect(metadata.parentId).toBe(rootBlock.Id);

            // Verify signature
            const canonicalJson = replyBlock.canonicalJSON(metadata);
            const isValidSignature = await User.Verify(replyBlock.Id, canonicalJson, testUser.Id);
            expect(isValidSignature).toBe(true);
        });

        it('should produce canonical JSON', async () => {
            const block = await new TreeBlock("test", null, testUser);
            const data1 = { b: 2, a: 1, c: { d: 4, e: 3 } };
            const data2 = { c: { e: 3, d: 4 }, a: 1, b: 2 };

            const json1 = block.canonicalJSON(data1);
            const json2 = block.canonicalJSON(data2);

            expect(json1).toBe(json2);
            expect(json1).toBe('{"a":1,"b":2,"c":{"d":4,"e":3}}');
        });
    });

    describe('BlockTree', () => {
        it('should create a BlockTree with a root block', async () => {
            const rootBlock = await new TreeBlock("The start of a new tree", null, testUser);
            const tree = new BlockTree(rootBlock);

            expect(tree).toBeInstanceOf(BlockTree);
            expect(tree.Root).toBe(rootBlock);
            expect(tree.Id).toBe(rootBlock.Id);
            expect(tree.BlockIds.has(rootBlock.Id)).toBe(true);
            expect(BlockTree.All.get(tree.Id)).toBe(tree);
        });

        it('should throw an error if not initialized with a root block', async () => {
            const replyBlock = await new TreeBlock("A reply", "some-parent-id", testUser);
            expect(() => new BlockTree(replyBlock)).toThrow("BlockTree must be initialized with a valid root TreeBlock that has no parent.");
            expect(() => new BlockTree(null)).toThrow();
        });

        it('should add blocks to the tree', async () => {
            const rootBlock = await new TreeBlock("Root of the discussion", null, testUser);
            const tree = new BlockTree(rootBlock);

            const replyBlock1 = await new TreeBlock("First reply", rootBlock.Id, testUser);
            const replyBlock2 = await new TreeBlock("Second reply", rootBlock.Id, testUser);
            const replyToReply = await new TreeBlock("Reply to first reply", replyBlock1.Id, testUser);

            tree.addBlock(replyBlock1);
            tree.addBlock(replyBlock2);
            tree.addBlock(replyToReply);

            expect(tree.BlockIds.size).toBe(4);
            expect(tree.BlockIds.has(replyBlock1.Id)).toBe(true);
            expect(tree.BlockIds.has(replyBlock2.Id)).toBe(true);
            expect(tree.BlockIds.has(replyToReply.Id)).toBe(true);
        });

        it('should return a list of all blocks in the tree', async () => {
            const rootBlock = await new TreeBlock("Another tree root", null, testUser);
            const tree = new BlockTree(rootBlock);
            const replyBlock = await new TreeBlock("A reply in this tree", rootBlock.Id, testUser);
            tree.addBlock(replyBlock);

            const blockList = tree.BlockList;
            expect(blockList).toHaveLength(2);
            expect(blockList).toContain(rootBlock);
            expect(blockList).toContain(replyBlock);
        });
    });
});