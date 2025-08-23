
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
        if( this.Index > 0 )
        {
            return this.GetContentLns( 4 )[0];
        }
    };

    get OwnerId()
    {
        return this.GetContentLns( 2 )[0];
    };

    get TargetId()
    {
        return this.GetContentLns( 4 )[0];
    };

    GetContentLns( ...idxes )
    {
        let Lines = this.Content.split( '\n' );
        return idxes.map( idx => Lines[idx] );
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
        let hash = await Hash( this.Content, 'SHA-1' )
        return await User.Verify( this.Id, hash, pubKeyS );
    };

    get Id() { return this.id; };
    set Id( id )
    {
        this.id = this.id || id;
    };
    
    TransferTo( targetUser, dida, sender )
    {
        sender = sender || User.All.get( this.OwnerId );
        return new Block( 1, 0, targetUser.Id, this.Id, sender );
        //return sender.CreateBlock( 0, dida, targetUser.Id, this.Id )  //CreateBlock( prevIdx, dida, data, prevId )
    };
}

class RootBlock extends BaseBlock
{
    constructor( content )
    {
        super();
        this.Index = 0;
        this.Content = content;
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
        this.Content = [index, dida, data, prevId || ''].join( '\n' );
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
    constructor( index, id, content )
    {
        super();
        this.Index = index;
        this.id = id;
        this.Content = content;
        return this
    }
}

class BlockChain
{
    static All = new Map();
    
    constructor( defHash, serial, firstOwner )
    {
        console.log( 'BlockChain constructor', defHash, serial, firstOwner );
        return ( async () =>
        {
            this.Root = await new RootBlock( [defHash, serial, firstOwner].join( '\n' ));
            this.constructor.All.set( this.Root.Id, this );
            return this;
        } )();
    };

    get Id() { return this.Root.Id; }
    get Name() { return this.Root.GetContentLns( 2 )[0]; };
}
