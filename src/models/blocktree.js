// Inspired by src/models/blockchain.js
import { Hash, ABuff2Base64 } from './user.js';

class TreeBlock {
    static All = new Map();

    /**
     * @param {string} content - The message content.
     * @param {string} parentId - The ID of the parent message.
     * @param {User} user - The user creating the message.
     * @param {string[]|string} tags - Tags for the message.
     */
    constructor(content, parentId, user, tags = []) {
        this.Content = content;
        this.ParentId = parentId || '';
        this.Owner = user;
        this.Tags = Array.isArray(tags) ? tags : (tags ? tags.split('|') : []);

        return (async () => {
            const contentHashBuffer = await Hash(this.Content, 'SHA-256');
            const contentHash = ABuff2Base64(contentHashBuffer);

            this.Metadata = {
                timestamp: new Date().toISOString(),
                publisherKey: this.Owner.Id,
                contentHash: contentHash,
                parentId: this.ParentId,
                tags: this.Tags,
            };

            const canonicalJson = this.canonicalJSON(this.Metadata);

            // The ID is the signature of the SHA-1 hash of the canonical metadata JSON string.
            // This is consistent with how other blocks in the system are signed.
            const dataHash = await Hash(canonicalJson, 'SHA-1');
            this.Id = await this.Owner.Sign(dataHash);

            this.constructor.All.set(this.Id, this);
            return this;
        })();
    }

    /**
     * Creates a canonical JSON string from data by recursively sorting keys.
     * @param {*} data - The data to stringify.
     * @returns {string} - The canonical JSON string.
     */
    canonicalJSON(data) {
        if (data === null || typeof data !== 'object') {
            return JSON.stringify(data);
        }

        if (Array.isArray(data)) {
            const arrayItems = data.map(item => this.canonicalJSON(item));
            return `[${arrayItems.join(',')}]`;
        }

        const keys = Object.keys(data).sort();
        const objectItems = keys.map(key => {
            const keyString = JSON.stringify(key);
            const valueString = this.canonicalJSON(data[key]);
            return `${keyString}:${valueString}`;
        });
        return `{${objectItems.join(',')}}`;
    }
}

class BlockTree {
    static All = new Map(); // Maps root block ID to BlockTree instance

    /**
     * @param {TreeBlock} rootBlock - The root message of the tree.
     */
    constructor(rootBlock) {
        if (!rootBlock || !rootBlock.Id || rootBlock.ParentId !== '') {
            throw new Error("BlockTree must be initialized with a valid root TreeBlock that has no parent.");
        }

        this.Root = rootBlock;
        this.BlockIds = new Set([rootBlock.Id]);

        this.constructor.All.set(this.Id, this);
    }

    /**
     * Adds a block to the tree.
     * @param {TreeBlock} block
     */
    addBlock(block) {
        // For now, we just add the ID. More complex validation could be added here,
        // for example, checking if the block's parent is in the tree.
        this.BlockIds.add(block.Id);
    }

    get Id() {
        return this.Root.Id;
    }

    get BlockList() {
        return [...this.BlockIds].map(id => TreeBlock.All.get(id));
    }
}

export { TreeBlock, BlockTree };