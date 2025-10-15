/**
 * MsgTabContent - Messages Tab Content Component
 * Manages the display and interaction of the messages tab.
 */
class MsgTabContent
{
    constructor( tabManager )
    {
        this.tabManager = tabManager;
        this.mainPanel = tabManager.mainPanel;
        this.app = tabManager.mainPanel.app;

        this.selectedMsgTree = null;
        this.selectedBlock = null;
        this.msgsGridInitialized = false;

        console.log( 'MsgTabContent initialized' );
    }

    /**
     * Renders the messages grid.
     * @param {Map} msgData - The message data (Map of BlockTree objects).
     */
    renderMsgsGrid( msgData )
    {
        const container = document.getElementById( 'msgs-container' );
        if( !container )
        {
            console.error( GetText( 'msgs_container_not_found' ) );
            return;
        }

        if( !msgData || msgData.size === 0 )
        {
            container.innerHTML = `<p class="text-muted" data-text="no_messages_found">${GetText( "no_messages_found" )}</p>`;
            this.msgsGridInitialized = false;
        }
        else
        {
            this.AllMsgTrees = msgData;
            let msgsGrid = container.querySelector( '.msgs-grid' );
            if( !msgsGrid )
            {
                msgsGrid = document.createElement( 'div' );
                msgsGrid.className = 'msgs-grid';
                container.innerHTML = '';
                container.appendChild( msgsGrid );
            }

            for( const treeId of msgData.keys())
            {
                let msgCard = msgsGrid.querySelector( `[data-msg-id="${treeId}"]` );

                if( !msgCard )
                {
                    msgCard = document.createElement( 'div' );
                    msgCard.className = 'msg-card';
                    msgCard.setAttribute( 'data-msg-id', treeId );

                    const msgIdPreview = this.generateIdPreview( treeId );
                    msgCard.innerHTML = `<span class="msg-id-preview">${ msgIdPreview }</span>`;
                    msgsGrid.appendChild( msgCard );

                    msgCard.addEventListener( 'click', () =>
                    {
                        this.handleMsgTreeClick( treeId );
                    });
                }
            }

            const existingCards = msgsGrid.querySelectorAll( '.msg-card' );
            existingCards.forEach( card =>
            {
                const msgId = card.getAttribute( 'data-msg-id' );
                if( !msgData.has( msgId ) )
                {
                    card.remove();
                }
            });
            this.msgsGridInitialized = true;
        }

        if( this.tabManager && this.tabManager.resizeManager )
        {
            setTimeout( () =>
            {
                this.tabManager.resizeManager.applyRatio( 'msgs', this.tabManager.resizeManager.getTabRatio( 'msgs' ) );
            }, 0 );
        }
    }

    /**
     * Handles a message tree click event.
     * @param {string} treeId - The ID of the clicked message tree.
     */
    handleMsgTreeClick( treeId )
    {
        try
        {
            this.updateMsgTreeSelection( treeId );
            this.showMsgDetails( treeId );
            this.tabManager.handleStateChange( 'msgs', { selectedMsg: treeId } );
            console.log( 'Message tree click handled:', treeId );
        }
        catch( error )
        {
            console.error( 'Failed to handle message tree click:', error );
        }
    }

    /**
     * Updates the message tree selection.
     * @param {string} treeId - The ID of the selected message tree.
     */
    updateMsgTreeSelection( treeId )
    {
        const msgsContainer = document.getElementById( 'msgs-container' );
        if( !msgsContainer ) return;

        const previousSelected = msgsContainer.querySelectorAll( '.msg-card.selected' );
        previousSelected.forEach( card =>
        {
            card.classList.remove( 'selected' );
        });

        const selectedCard = msgsContainer.querySelector( `[data-msg-id="${treeId}"]` );
        if( selectedCard )
        {
            selectedCard.classList.add( 'selected' );
        }

        this.selectedMsgTree = treeId;
    }

    /**
     * Shows the message details.
     * @param {string} treeId - The ID of the message tree.
     */
    showMsgDetails( treeId )
    {
        const detailsContainer = document.getElementById( 'msg-details-container' );
        if( !detailsContainer )
        {
            console.error( GetText( 'msg_details_container_not_found' ) );
            return;
        }

        try
        {
            const treeData = this.AllMsgTrees.get( treeId );

            if( !treeData )
            {
                detailsContainer.innerHTML = `<p class="text-muted" data-text="msg_data_not_found">${GetText('msg_data_not_found')}</p>`;
                return;
            }
            
            const Layers = [[treeId, 0]].concat( this.GetTreeLayer( treeData, 0 ));
            console.log( Layers );
            
            detailsContainer.innerHTML = Layers.map( l => this.GenMsgHtml( ...l )).join( '' );
            return;


            const detailsHTML = this.generateMsgDetailsHTML( treeData );
            detailsContainer.innerHTML = detailsHTML;
            detailsContainer.classList.add( 'has-content' );

            this.renderBlockTree( treeData );

            // Select the root block by default
            const rootBlockElement = detailsContainer.querySelector( `.block-node[data-block-id="${treeData.Root.Id}"]` );
            if( rootBlockElement )
            {
                this.handleBlockClick( treeData.Root.Id, rootBlockElement );
            }
        }
        catch( error )
        {
            console.error( 'Failed to show message details:', error );
            detailsContainer.innerHTML = `<p class="text-danger" data-text="error_showing_msg_details">${GetText('error_showing_msg_details')}</p>`;
        }
    }
    
    GenMsgHtml( msgId, layer )
    {
        const MsgData = TreeBlock.All.get( msgId );
        
        return `<div class="msgline" style="margin-left:${ layer * 40 }px">
                    <div class="msg-id"><span data-text="ID">${ GetText( 'ID' ) }</span><span class="base64">${ msgId }</span></div>
                    <div class="msg-content"><span data-text="content">${ GetText( 'content' ) }</span><span>${ MsgData.Content }</span></div>
                    <div class="msg-dida"><span data-text="dida">${ GetText( 'dida' ) }</span><span>${ MsgData.Metadata.dida }</span></div>
                    <div class="msg-author"><span data-text="author">${ GetText( 'author' ) }</span><span class="base64">${ MsgData.Metadata.pubKey }</span></div>
                    <div class="msg-hash"><span data-text="content_hash">${ GetText( 'content_hash' ) }</span><span class="base64">${ MsgData.Metadata.contentHash }</span></div>
                    <div class="msg-parent"><span data-text="parent_msg">${ GetText( 'parent_msg' ) }</span><span class="base64">${ MsgData.Metadata.parentId }</span></div>
                    <div class="msg-tag"><span data-text="tags">${ GetText( 'tags' ) }</span><span>${ MsgData.Metadata.tags }</span></div>
                </div>`
    }

    /**
     * Generates the HTML for the message details view.
     * @param {BlockTree} treeData - The data for the message tree.
     * @returns {string} - The HTML for the message details.
     */
    generateMsgDetailsHTML( treeData )
    {
        return `
            <div class="msg-details-layout">
                <div class="msg-tree-view" id="msg-tree-view-container">
                    <h6 data-text="message_tree">${GetText( 'message_tree' )}</h6>
                    <div class="tree-container"></div>
                </div>
                <div class="msg-block-details" id="msg-block-details-container">
                    <p class="text-muted" data-text="click_block_to_see_details">${GetText( 'click_block_to_see_details' )}</p>
                </div>
            </div>
        `;
    }

    GetTreeLayer( tree, layer )
    {
        if( tree.size === 0 )
        {
            return [];
        }
        return [...tree.entries()].map(( [k, subTree] ) => [[k, layer + 1]].concat( this.GetTreeLayer( subTree, layer + 1 ))).reduce(( x, y ) => x.concat( y ));
    }
    
    /**
     * Renders the block tree structure in the left panel.
     * @param {BlockTree} treeData - The message tree data.
     */
    renderBlockTree( treeData )
    {
        const container = document.getElementById( 'msg-tree-view-container' ).querySelector( '.tree-container' );
        if( !container ) return;
        
        const blockMap = new Map( treeData.BlockList.map( block => [block.Id, block] ));
        const childrenMap = new Map();

        treeData.BlockList.forEach( block =>
        {
            if( block.ParentId && blockMap.has( block.ParentId ) )
            {
                if( !childrenMap.has( block.ParentId ) )
                {
                    childrenMap.set( block.ParentId, [] );
                }
                childrenMap.get( block.ParentId ).push( block );
            }
        });

        const buildTreeHtml = ( block ) =>
        {
            const children = childrenMap.get( block.Id ) || [];
            let childrenHtml = '';
            if( children.length > 0 )
            {
                childrenHtml = `<ul>${children.map( buildTreeHtml ).join( '' )}</ul>`;
            }
            return `
                <li>
                    <div class="block-node" data-block-id="${block.Id}">
                        <span class="block-node-id" title="${block.Id}">${this.truncateHash( block.Id )}</span>
                    </div>
                    ${childrenHtml}
                </li>
            `;
        };

        container.innerHTML = `<ul>${buildTreeHtml( treeData.Root )}</ul>`;

        // Add click listeners
        container.querySelectorAll( '.block-node' ).forEach( node =>
        {
            node.addEventListener( 'click', ( e ) =>
            {
                e.stopPropagation();
                const blockId = node.getAttribute( 'data-block-id' );
                this.handleBlockClick( blockId, node );
            });
        });
    }

    /**
     * Handles a click on a block node in the tree view.
     * @param {string} blockId - The ID of the clicked block.
     * @param {HTMLElement} nodeElement - The clicked DOM element.
     */
    handleBlockClick( blockId, nodeElement )
    {
        this.selectedBlock = blockId;

        // Update selection style
        const treeContainer = document.getElementById( 'msg-tree-view-container' );
        treeContainer.querySelectorAll( '.block-node.selected' ).forEach( n => n.classList.remove( 'selected' ) );
        nodeElement.classList.add( 'selected' );

        const blockData = TreeBlock.All.get( blockId );
        if( blockData )
        {
            this.showBlockDetails( blockData );
        }
    }

    /**
     * Shows the details for a specific block.
     * @param {TreeBlock} blockData - The data for the block.
     */
    showBlockDetails( blockData )
    {
        const container = document.getElementById( 'msg-block-details-container' );
        if( !container ) return;

        const detailsHTML = `
            <div class="block-details">
                <h6 data-text="block_details">${GetText( 'block_details' )}</h6>
                <div class="detail-info-grid">
                    <div class="detail-info-item full-width">
                        <span class="detail-info-label" data-text="block_id">${GetText( 'block_id' )}:</span>
                        <span class="detail-info-value crypto-hash" title="${blockData.Id}">${blockData.Id}</span>
                    </div>
                    <div class="detail-info-item full-width">
                        <span class="detail-info-label" data-text="parent_id">${GetText( 'parent_id' )}:</span>
                        <span class="detail-info-value crypto-hash" title="${blockData.ParentId || 'None'}">${blockData.ParentId || 'None'}</span>
                    </div>
                    <div class="detail-info-item">
                        <span class="detail-info-label" data-text="publisher">${GetText( 'publisher' )}:</span>
                        <span class="detail-info-value crypto-key" title="${blockData.Metadata.publisherKey}">${this.truncateKey( blockData.Metadata.publisherKey )}</span>
                    </div>
                    <div class="detail-info-item">
                        <span class="detail-info-label" data-text="timestamp">${GetText( 'timestamp' )}:</span>
                        <span class="detail-info-value">${new Date( blockData.Metadata.timestamp ).toLocaleString()}</span>
                    </div>
                    <div class="detail-info-item full-width">
                        <span class="detail-info-label" data-text="tags">${GetText( 'tags' )}:</span>
                        <span class="detail-info-value">${blockData.Metadata.tags.join( ', ' ) || 'None'}</span>
                    </div>
                    <div class="detail-info-item full-width">
                        <span class="detail-info-label" data-text="content">${GetText( 'content' )}:</span>
                        <div class="block-content-value">${blockData.Content}</div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = detailsHTML;
    }

    /**
     * Generates a preview of the message ID.
     * @param {string} msgId - The ID of the message.
     * @returns {string} - The first 6 characters of the message ID.
     */
    generateIdPreview( msgId )
    {
        if( !msgId || msgId === GetText( 'not_set' ) || msgId === GetText( 'unknown' ) ) return GetText( 'unknown' );
        if( msgId.length < 6 ) return msgId;
        return msgId.substring( 0, 6 );
    }

    /**
     * Truncates a key for display.
     * @param {string} key - The key.
     * @returns {string} - The truncated key.
     */
    truncateKey( key )
    {
        if( !key || key === GetText( 'not_set' ) || key === GetText( 'unknown' ) ) return key;
        if( key.length <= 20 ) return key;
        return key.substring( 0, 10 ) + '...' + key.substring( key.length - 10 );
    }

    /**
     * Truncates a hash for display.
     * @param {string} hash - The hash.
     * @returns {string} - The truncated hash.
     */
    truncateHash( hash )
    {
        if( !hash || hash === GetText( 'unknown' ) ) return hash;
        if( hash.length <= 16 ) return hash;
        return hash.substring( 0, 8 ) + '...' + hash.substring( hash.length - 8 );
    }

    /**
     * Destroys the messages tab content.
     */
    destroy()
    {
        try
        {
            this.selectedMsgTree = null;
            this.selectedBlock = null;
            this.msgsGridInitialized = false;
            console.log( 'MsgTabContent destroyed' );
        }
        catch( error )
        {
            console.error( 'MsgTabContent destruction failed:', error );
        }
    }
}

if( typeof module !== 'undefined' && module.exports )
{
    module.exports = MsgTabContent;
}

if( typeof window !== 'undefined' )
{
    window.MsgTabContent = MsgTabContent;
}