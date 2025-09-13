
class BaseBlock
{
    static All = new Map();
    
    Copy()
    {
        return { Id: this.Id, Content: this.Content, Index: this.Index };
    };

    async ChkRoot()
    {
        let hash = await Hash( this.Content, 'SHA-1' );
        return this.Id == ABuff2Base64( hash );
    };

    get PrevId()
    {
        return this.Index === 0 ? '' : this.GetContentLns( 3 )[0];
    };

    get OwnerId()
    {
        return this.GetContentLns( 2 )[0];
    };

    get Tick()
    {
        return this.Index === 0 ? -1 : this.GetContentLns( 1 )[0];
    };

    //get TargetId()
    //{
        //return this.GetContentLns( 4 )[0];
    //};

    GetContentLns( ...idxes )
    {
        this.Lines = this.Lines || this.Content.split( '\n' );
        return idxes.map( idx => this.Lines[idx] );
    };
    
    GetBlockChain()
    {
        if( this.PrevId )
        {
            return [...this.constructor.All.get( this.PrevId ).GetBlockChain(), this.Id];
        }
        return [this.Id];
    };

    async ChkFollow( pubKeyS )
    {
        return await User.Verify( this.Id, this.Content, pubKeyS );
    };

    get Id() { return this.id; };
    set Id( id )
    {
        this.id = this.id || id;
    };
    
    TransData() 
    {
        return { Id: this.Id, Content: this.Content };
    }
    
    TransferTo( targetUser, dida, sender )  // only for the second block
    {
        //console.log( 'TransferTo', targetUser.Id.slice( 0, 9 ), this.Id.slice( 0, 9 ));
        sender = sender || User.All.get( this.OwnerId );
        return new Block( 1, dida, targetUser.Id, this.Id, sender );
        //return sender.CreateBlock( 0, dida, targetUser.Id, this.Id )  //CreateBlock( prevIdx, dida, data, prevId )
    };
}

class RootBlock extends BaseBlock
{
    constructor( content )
    {
        super();
        this.Index = 0;
        this.Status = 0;
        this.Content = content;
        this.Lines = null;
        return ( async () =>
        {
            let hash = await Hash( content, 'SHA-1' )
            this.id = this.Hash = ABuff2Base64( hash );
            this.constructor.All.set( this.id, this );
            //console.log( 'RootBlock', this.Hash, content, hash );
            return this;
        } )();
    };
}

class Block extends BaseBlock
{
    constructor( index, dida, data, prevId, owner )
    {
        super();
        this.Index = index;
        this.id = '';
        this.Status = 0;
        this.Content = [index, dida, data, prevId || ''].join( '\n' );
        this.Lines = null;
        return ( async () =>
        {
            let hash = await Hash( this.Content, 'SHA-1' );
            this.id = this.Hash = await owner.Sign( hash );
            this.constructor.All.set( this.id, this );
            return this;
        } )();
    };
}

class RebuildBlock extends BaseBlock
{
    constructor( id, content )
    {
        super();
        this.id = id;
        this.Status = 0;
        this.Content = content;
        this.Lines = null;
        const FirstLine = this.GetContentLns( 0 );
        this.Index = isNaN( FirstLine ) ? 0 : Number( FirstLine );
        return this
    }
}

class BlockChain
{
    static All = new Map();
    static ValueDef = [];
    
    constructor( defHash, serial, firstOwner )
    {
        this.owner = null;
        this.BlockIds = new Set();
        this.Forks = null;
        this.SetFaceVal( serial );
        //console.log( 'BlockChain constructor', this.FaceVal, defHash, serial, firstOwner );
        return ( async () =>
        {
            this.Root = await new RootBlock( [defHash, serial, firstOwner].join( '\n' ));
            this.constructor.All.set( this.Root.Id, this );
            return this;
        } )();
    };
    
    static InitValueDef( lines )
    {
        this.ValueDef = lines.split( '\n' ).map( ln =>
        {
            const [range, value] = ln.split( ' ' );
            return [range.split( '-' ).map( Number ), Number( value )];
        } );
        //console.log( this.ValueDef );
    };
    
    SetFaceVal( serial )
    {
        for( let [edges, value] of this.constructor.ValueDef )
        {
            if( serial >= edges[0] && serial <= edges[1] )
            {
                this.FaceVal = value;
                return;
            }
        }
        this.FaceVal = 0;
    }
    
    Update( owner, block )
    {
        block.Index > 1 && window.LogPanel.AddLog( { dida: window.app.Tick, blockchain: this.Id, block: block.Id, content: 'blockchain transfer accepted by one peer of ' + owner.Id.slice( 0, 8 ), category: 'blockchain' } );
        if( this.owner )
        {
            this.owner.SetOwnChains( this.Id, false );
        }
        owner.SetOwnChains( block.RootId, true );
        this.owner = owner;
        this.BlockIds.add( block.Id );
    }

    get Id() { return this.Root.Id; }
    
    get Owner() { return this.owner; };
    
    get BlockNum() { return this.BlockIds.size; };
    
    get BlockList() { return [...this.BlockIds].map( id => BaseBlock.All.get( id )).sort( b => b.Index ); };
}
