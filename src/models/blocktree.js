class BaseTreeBlock
{
    static All = new Map();
    static AllTrees = new Map();

    static async Rebuild( id, json )
    {
        const Meta = JSON.parse( json );
        const hash = await Hash( json, 'SHA-1' );
        if( await User.Verify( id, hash, Meta.pubKey ))
        {
            return new RebTreeBlock( id, Meta );
        }
    }

    FindTree()
    {
        const Node = new Map();
        if( this.Metadata.parentId === "" )
        {
            this.constructor.AllTrees.set( this.Id, Node );
            return Node;
        }
        
        const TreeNode = this.constructor.AllTrees.get( this.Metadata.parentId );
        if( TreeNode )
        {
            TreeNode.set( this.Id, Node );
            return Node;
        }
        
        const Parent = this.constructor.All.get( this.Metadata.parentId );
        if( Parent )
        {
            const TreeNode = Parent.FindTree();
            if( TreeNode )
            {
                TreeNode.set( this.Id, Node );
                return Node;
            }
        }
    }
    
    Copy( step )
    {
        return step === 0 ? { Id: this.Id, Meta: this.Json } : { Id: this.Id, Text: this.Content };
    };

    CanonicalJSON( data )
    {
        if( data === null || typeof data !== 'object' )
        {
            return JSON.stringify( data );
        }

        if( Array.isArray( data ) )
        {
            const arrayItems = data.map( item => this.CanonicalJSON( item ) );
            return `[${arrayItems.join( ',' )}]`;
        }

        const keys = Object.keys( data ).sort();
        const objectItems = keys.map( key =>
        {
            const keyString = JSON.stringify( key );
            const valueString = this.CanonicalJSON( data[key] );
            return `${keyString}:${valueString}`;
        } );
        return `{${objectItems.join( ',' )}}`;
    }
}

class TreeBlock extends BaseTreeBlock
{
    constructor( tick, content, user, tags, parentId )
    {
        super();
        this.Content = content;
        this.ParentId = parentId || '';
        this.Owner = user;
        this.Tick = tick;
        this.Tags = Array.isArray( tags ) ? tags : ( tags ? tags.split( '|' ) : [] ).sort();

        return ( async () =>
        {
            const contentHashBuffer = await Hash( this.Content, 'SHA-256' );
            const contentHash = ABuff2Base64( contentHashBuffer );

            this.Metadata =
            {
                dida: tick,
                pubKey: this.Owner.Id,
                contentHash: contentHash,
                parentId: this.ParentId,
                tags: this.Tags.join( '|' ),
            };

            this.Json = this.CanonicalJSON( this.Metadata );
            const MetaHash = await Hash( this.Json, 'SHA-1' );

            this.Id = await this.Owner.Sign( MetaHash );

            this.constructor.All.set( this.Id, this );
            return this;
        } )();
    }
}
    
class RebTreeBlock extends BaseTreeBlock
{
    constructor( id, meta )
    {
        super();
        this.Id = id;
        this.Metadata = meta;
        this.Content = "";
        this.FindTree();
    }
    
    async SetContent( text )
    {
        if( this.Content === "" )
        {
            const hash = await Hash( text, 'SHA-256' );
            if( ABuff2Base64( hash ) !== this.Metadata.contentHash )
            {
                return false;
            }
            this.Content = text;
        }
        return true;
    }
}

class BlockTree
{
    static All = new Map();

    constructor( rootBlock )
    {
        if( !rootBlock || !rootBlock.Id || rootBlock.ParentId !== '' )
        {
            throw new Error( "BlockTree must be initialized with a valid root TreeBlock that has no parent." );
        }

        this.Root = rootBlock;
        this.BlockIds = new Set( [rootBlock.Id] );

        this.constructor.All.set( this.Id, this );
    }

    AddBlock( block )
    {
        this.BlockIds.add( block.Id );
    }

    get Id()
    {
        return this.Root.Id;
    }

    get BlockList()
    {
        return [ ...this.BlockIds ].map( id => TreeBlock.All.get( id ) );
    }
}