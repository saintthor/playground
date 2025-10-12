class TreeBlock
{
    static All = new Map();

    constructor( tick, content, user, tags, parentId )
    {
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

            this.canonicalJson = this.CanonicalJSON( this.Metadata );
            const dataHash = await Hash( this.canonicalJson, 'SHA-1' );

            this.Id = await this.Owner.Sign( dataHash );

            this.constructor.All.set( this.Id, this );
            return this;
        } )();
    }
    
    Copy()
    {
        return { Id: this.Id, Meta: this.canonicalJson };
    };

    static async Rebuild( id, json )
    {
        const Meta = JSON.parse( json );
        const hash = await Hash( json, 'SHA-1' );
        const rslt = await User.Verify( id, hash, Meta.pubKey );
        //console.log( 'Rebuild', rslt, id, Meta.pubKey, json );
        return rslt;
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