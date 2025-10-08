class TreeBlock
{
    static All = new Map();

    constructor( content, parentId, user, tags )
    {
        this.Content = content;
        this.ParentId = parentId || '';
        this.Owner = user;
        this.Tags = Array.isArray( tags ) ? tags : ( tags ? tags.split( '|' ) : [] );

        return ( async () =>
        {
            const contentHashBuffer = await Hash( this.Content, 'SHA-256' );
            const contentHash = ABuff2Base64( contentHashBuffer );

            this.Metadata =
            {
                timestamp: new Date().toISOString(),
                publisherKey: this.Owner.Id,
                contentHash: contentHash,
                parentId: this.ParentId,
                tags: this.Tags,
            };

            const canonicalJson = this.CanonicalJSON( this.Metadata );
            const dataHash = await Hash( canonicalJson, 'SHA-1' );

            this.Id = await this.Owner.Sign( dataHash );

            this.constructor.All.set( this.Id, this );
            return this;
        } )();
    }

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