/**
 * @fileoverview MsgTabContent - Messages Tab Content Component
 * Manages the display and interaction of the messages tab.
 * @version 1.0.0
 */
class MsgTabContent
{
    /**
     * @param {TabManager} tabManager The tab manager instance.
     */
    constructor( tabManager )
    {
        this.tabManager = tabManager;
        this.mainPanel = tabManager.mainPanel;
        this.app = tabManager.mainPanel.app;

        this.selectedTreeId = null;
        this.selectedBlockId = null;
        this.msgTrees = new Map();

        console.log( 'MsgTabContent initialized' );
    }

    /**
     * Renders the list of message block trees.
     * @param {Map<string, BlockTree>} msgTreesData The message block trees data.
     */
    renderMsgTrees( msgTreesData )
    {
        const Container = document.getElementById( 'messages-container' );
        if ( !Container )
        {
            console.error( 'Messages container not found' );
            return;
        }

        if ( !msgTreesData || msgTreesData.size === 0 )
        {
            Container.innerHTML = `<p class="text-muted" data-text="no_messages">${GetText( "no_messages" )}</p>`;
            return;
        }

        this.msgTrees = msgTreesData;
        let Grid = Container.querySelector( '.msg-grid' );
        if ( !Grid )
        {
            Grid = document.createElement( 'div' );
            Grid.className = 'msg-grid';
            Container.innerHTML = '';
            Container.appendChild( Grid );
        }

        this.msgTrees.forEach( ( tree, treeId ) =>
        {
            let Card = Grid.querySelector( `[data-tree-id="${treeId}"]` );
            if ( !Card )
            {
                Card = document.createElement( 'div' );
                Card.className = 'msg-card';
                Card.setAttribute( 'data-tree-id', treeId );
                const RootBlock = tree.getBlock( tree.rootId );
                Card.innerHTML = `<span class="msg-id-preview">${this.truncateHash( RootBlock.id )}</span><span class="msg-content-preview">${RootBlock.content.substring( 0, 20 )}...</span>`;
                Grid.appendChild( Card );

                Card.addEventListener( 'click', () =>
                {
                    this.handleMsgTreeClick( treeId );
                } );
            }
        } );
    }

    /**
     * Handles a message tree click event.
     * @param {string} treeId The ID of the clicked message tree.
     */
    handleMsgTreeClick( treeId )
    {
        this.selectedTreeId = treeId;
        this.selectedBlockId = null;
        this.updateTreeSelection( treeId );
        this.showTreeDetails( treeId );
    }

    /**
     * Updates the message tree selection in the UI.
     * @param {string} treeId The ID of the selected message tree.
     */
    updateTreeSelection( treeId )
    {
        const Container = document.getElementById( 'messages-container' );
        if ( !Container ) return;

        const PreviousSelected = Container.querySelectorAll( '.msg-card.selected' );
        PreviousSelected.forEach( card =>
        {
            card.classList.remove( 'selected' );
        } );

        const SelectedCard = Container.querySelector( `[data-tree-id="${treeId}"]` );
        if ( SelectedCard )
        {
            SelectedCard.classList.add( 'selected' );
        }
    }

    /**
     * Shows the details of a message tree, which includes the tree structure.
     * @param {string} treeId The ID of the message tree.
     */
    showTreeDetails( treeId )
    {
        const DetailsContainer = document.getElementById( 'message-details-container' );
        if ( !DetailsContainer )
        {
            console.error( 'Message details container not found' );
            return;
        }

        const Tree = this.msgTrees.get( treeId );
        if ( !Tree )
        {
            DetailsContainer.innerHTML = `<p class="text-muted" data-text="message_tree_not_found">${GetText( "message_tree_not_found" )}</p>`;
            return;
        }

        const TreeStructure = Tree.getTreeStructure();
        DetailsContainer.innerHTML = `
            <div class="message-details-wrapper">
                <div class="message-tree-view"></div>
                <div class="message-block-details">
                    <p class="text-muted" data-text="click_block_to_see_details">${GetText( "click_block_to_see_details" )}</p>
                </div>
            </div>
        `;

        const TreeViewContainer = DetailsContainer.querySelector( '.message-tree-view' );
        this.renderTreeStructure( TreeViewContainer, TreeStructure );
    }

    /**
     * Renders the block tree structure in a container.
     * @param {HTMLElement} container The container element.
     * @param {object} node The current node in the tree structure.
     */
    renderTreeStructure( container, node )
    {
        if ( !node ) return;

        const NodeElement = document.createElement( 'div' );
        NodeElement.className = 'tree-node';
        NodeElement.setAttribute( 'data-block-id', node.id );
        NodeElement.innerHTML = `<span class="tree-node-content">${this.truncateHash( node.id )} - ${node.content.substring( 0, 15 )}</span>`;
        container.appendChild( NodeElement );

        NodeElement.addEventListener( 'click', ( event ) =>
        {
            event.stopPropagation();
            this.handleBlockClick( node.id );
        } );

        if ( node.children && node.children.length > 0 )
        {
            const ChildrenContainer = document.createElement( 'div' );
            ChildrenContainer.className = 'tree-node-children';
            container.appendChild( ChildrenContainer );
            node.children.forEach( childNode =>
            {
                this.renderTreeStructure( ChildrenContainer, childNode );
            } );
        }
    }

    /**
     * Handles a block click event from the tree view.
     * @param {string} blockId The ID of the clicked block.
     */
    handleBlockClick( blockId )
    {
        this.selectedBlockId = blockId;
        this.updateBlockSelection( blockId );
        this.showBlockDetails( blockId );
    }

    /**
     * Updates the block selection in the UI.
     * @param {string} blockId The ID of the selected block.
     */
    updateBlockSelection( blockId )
    {
        const TreeView = document.querySelector( '.message-tree-view' );
        if ( !TreeView ) return;

        const PreviousSelected = TreeView.querySelectorAll( '.tree-node.selected' );
        PreviousSelected.forEach( node =>
        {
            node.classList.remove( 'selected' );
        } );

        const SelectedNode = TreeView.querySelector( `[data-block-id="${blockId}"]` );
        if ( SelectedNode )
        {
            SelectedNode.classList.add( 'selected' );
        }
    }

    /**
     * Shows the details of a specific block.
     * @param {string} blockId The ID of the block.
     */
    showBlockDetails( blockId )
    {
        const BlockDetailsContainer = document.querySelector( '.message-block-details' );
        if ( !BlockDetailsContainer )
        {
            console.error( 'Message block details container not found' );
            return;
        }

        const Tree = this.msgTrees.get( this.selectedTreeId );
        const Block = Tree ? Tree.getBlock( blockId ) : null;

        if ( !Block )
        {
            BlockDetailsContainer.innerHTML = `<p class="text-muted" data-text="block_not_found">${GetText( "block_not_found" )}</p>`;
            return;
        }

        BlockDetailsContainer.innerHTML = this.generateBlockDetailsHTML( Block );
    }

    /**
     * Generates the HTML for the block details.
     * @param {Block} block The block data.
     * @returns {string} The HTML for the block details.
     */
    generateBlockDetailsHTML( block )
    {
        return `
            <div class="block-details">
                <h6 data-text="block_details_title">${GetText( 'block_details_title' )}</h6>
                <div class="detail-info-grid">
                    <div class="detail-info-item">
                        <span class="detail-info-label" data-text="block_id_label">${GetText( 'block_id_label' )}</span>
                        <span class="detail-info-value crypto-hash" title="${block.id}">${this.truncateHash( block.id )}</span>
                    </div>
                    <div class="detail-info-item">
                        <span class="detail-info-label" data-text="content_label">${GetText( 'content_label' )}</span>
                        <span class="detail-info-value">${block.content}</span>
                    </div>
                    <div class="detail-info-item">
                        <span class="detail-info-label" data-text="creator_pub_key_label">${GetText( 'creator_pub_key_label' )}</span>
                        <span class="detail-info-value crypto-key" title="${block.creatorPubKey}">${this.truncateKey( block.creatorPubKey )}</span>
                    </div>
                    <div class="detail-info-item">
                        <span class="detail-info-label" data-text="timestamp_label">${GetText( 'timestamp_label' )}</span>
                        <span class="detail-info-value">${new Date( block.timestamp ).toLocaleString()}</span>
                    </div>
                    <div class="detail-info-item">
                        <span class="detail-info-label" data-text="prev_id_label">${GetText( 'prev_id_label' )}</span>
                        <span class="detail-info-value crypto-hash" title="${block.prevId || ''}">${this.truncateHash( block.prevId || '' )}</span>
                    </div>
                    <div class="detail-info-item">
                        <span class="detail-info-label" data-text="tags_label">${GetText( 'tags_label' )}</span>
                        <span class="detail-info-value">${block.tags.join( ', ' )}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Truncates a key for display.
     * @param {string} key The key.
     * @returns {string} The truncated key.
     */
    truncateKey( key )
    {
        if ( !key || key.length <= 20 ) return key;
        return key.substring( 0, 10 ) + '...' + key.substring( key.length - 10 );
    }

    /**
     * Truncates a hash for display.
     * @param {string} hash The hash.
     * @returns {string} The truncated hash.
     */
    truncateHash( hash )
    {
        if ( !hash || hash.length <= 16 ) return hash;
        return hash.substring( 0, 8 ) + '...' + hash.substring( hash.length - 8 );
    }

    /**
     * Destroys the component.
     */
    destroy()
    {
        this.selectedTreeId = null;
        this.selectedBlockId = null;
        console.log( 'MsgTabContent destroyed' );
    }
}

if ( typeof module !== 'undefined' && module.exports )
{
    module.exports = MsgTabContent;
}

if ( typeof window !== 'undefined' )
{
    window.MsgTabContent = MsgTabContent;
}