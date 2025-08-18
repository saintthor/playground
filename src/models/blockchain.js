
class Block
{
    constructor( index, data, prevId, id, content )
    {
        this.Index = index;
        if( id )    // for rebuild
        {
            this.id = id;
            this.Content = content;
            return this;
        }
        let TimeStr = new Date().Format();
        this.id = '';
        this.Content = [index, TimeStr, data, prevId || ''].join( '\n' );
        return ( async () =>
        {
            let hash = await Hash( this.Content, 'SHA-1' )
            this.Hash = ABuff2Base64( hash );
            if( this.Index === 0 )
            {
                this.id = this.Hash;
            }
            return this;
        } )();
    };

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
        return this.GetContentLns( 3 )[0];
    };

    GetContentLns( ...idxes )
    {
        let Lines = this.Content.split( '\n' );
        return idxes.map( idx => Lines[idx] );
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
}

class BlockChain
{
    constructor( name, firstOwner )
    {
        return ( async () =>
        {
            this.FirstBlock = await new Block( 0, [name, firstOwner].join( '\n' ));
            return this;
        } )();
    };

    get Id() { return this.FirstBlock.Id; }
    get Name() { return this.FirstBlock.GetContentLns( 2 )[0]; };
}
