const HASH_TIMES = 9999;
const CBC_ITERATIONS = 60000;

function ABuff2Base64( ab )
{
    return btoa( String.fromCharCode( ...new Uint8Array( ab )));
}

function Base642ABuff( b64 )
{
    let s = atob( b64 );
    let ua8 = new Uint8Array( s.length );
    s.split( '' ).forEach(( c, i ) => ua8[i] = c.charCodeAt( 0 ));
    return ua8;
}

function UA2Str( ua )
{
    let Rslt = '';
    let len = ua.length;

    for( let i = 0; i < len; i++ )
    {
        let char = ua[i]
        let high = char >> 4;
        if( high < 8 )
        {
            Rslt += String.fromCharCode( char );
        }
        else if( high === 12 || high === 13 )
        {
            let char2 = ua[++i] & 0x3F;
            Rslt += String.fromCharCode((( char & 0x1F ) << 6 ) | char2 );
        }
        else if( high === 14 )
        {
            let char2 = ua[++i] & 0x3F;
            let char3 = ua[++i] & 0x3F;
            Rslt += String.fromCharCode((( char & 0x0F ) << 12 ) | ( char2 << 6 ) | char3 );
        }
    }
    return Rslt;
}

async function Hash( raw, hashName, times )
{
    times = times || 1
    let ua = typeof raw === 'string' ? new TextEncoder( 'utf8' ).encode( raw ) : raw;
    for( ; times-- > 0; )
    {
        ua = await crypto.subtle.digest( { name: hashName }, ua );
    }
    return ua
}

Map.prototype.RandVal = Set.prototype.RandVal = function()
{
    const idx = Math.floor( Math.random() * this.size );
    return [...this.values()][idx];
}

class User
{
    static All = new Map();
    
    constructor()
    {
        this.OwnChains = new Set();
        this.Peers = new Map();
        this.ChainNum = 0;
        return ( async () =>
        {
            let key = await crypto.subtle.generateKey( { name: "ECDSA", namedCurve: "P-256", }, true, ["sign", "verify"] );
            let raw = await crypto.subtle.exportKey( "raw", key.publicKey );
            this.PubKey = key.publicKey;
            this.PriKey = key.privateKey;
            this.PubKeyStr = ABuff2Base64( raw );
            this.constructor.All.set( this.PubKeyStr, this );
            return this;
        } )();
    };

    get Id() { return this.PubKeyStr; };
    
    get RandChain() { return BlockChain.All.get( this.OwnChains.RandVal()); };
    
    AddPeer( peer )
    {
        const l = this.Peers.size;
        this.Peers.set( peer.Id, peer );
        peer.AddUser( this );
        return this.Peers.size - l;
    };
    
    SetOwnChains( rootId, isAdd )
    {
        isAdd ? this.OwnChains.add( rootId ) : this.OwnChains.delete( rootId );
        this.ChainNum = this.OwnChains.size;
        //console.log( 'SetOwnChains', this.Id.slice( 0, 9 ), this.ChainNum );
    };
    
    SendBlockchain( prevBlock, rootId, dida, targetUId )
    {
        const NewBlockPrms = new Block( prevBlock.Index + 1, dida, targetUId, prevBlock.Id, this );
        this.SetOwnChains( rootId, false );
        return NewBlockPrms;
    };
    
    async Transfer( dida, chain, targetUId )
    {
        console.log( 'User.Transfer', dida, chain.Id, targetUId );
        const PrevBlocks = [...this.Peers.values()].map( p => p.FindTail( chain.Id )).filter( b => b );
        const s = new Set( PrevBlocks.map( b => b.Id ));
        if( s.size === 1 )
        {
            const TransBlock = await this.SendBlockchain( PrevBlocks[0], chain.Id, dida, targetUId );
            window.LogPanel.AddLog( { dida: dida, user: this.Id, blockchain: chain.Id, block: TransBlock.Id, content: 'add transfer block to target user' + targetUId.slice( 0, 8 ) + '...', category: 'user' } );
            [...this.Peers.values()].forEach( p => p.Broadcast( { Id: "NewBlock" + TransBlock.Id,
                                    color: getColor(( r, g, b ) => r + g > b * 2 && r + g + b < 600 && r + g + b > 100 ),
                                    type: "NewBlock", block: TransBlock.TransData() }, dida ));
        }
        else
        {
            console.error( s.size > 1 ? 'got multi tails.' : 'no tails.' );
        }
    };
    
    //RecvBlockchain( block )
    //{
        //const ChainIds = block.GetBlockChain(); //[root, block...]
        ////console.log( 'RecvBlockchain', ChainIds, block.Id );
        //this.OwnChains.set( ChainIds[0], ChainIds );
    //};

    async Sign( s, pswd )
    {
        let ua8 = s instanceof String ? Base642ABuff( s ) : s;
        return ABuff2Base64( await crypto.subtle.sign( { name: "ECDSA", hash: { name: "SHA-1" }, }, this.PriKey, ua8 ));
    };

    static async Verify( sig, data, pubKeyS )
    {
        //console.log( 'Verify', this, sig, data, pubKeyS );
        let pubK = await crypto.subtle.importKey( "raw", Base642ABuff( pubKeyS ),
                                { name: "ECDSA", namedCurve: "P-256", }, false, ["verify"] )
        return crypto.subtle.verify( { name: "ECDSA", hash: { name: "SHA-1" }, }, pubK, Base642ABuff( sig ), data );
    };
    
    GetAssets()
    {
        return [...[...this.OwnChains].map( rootId => BlockChain.All.get( rootId ).FaceVal ), 0, 0].reduce(( x, y ) => x + y );
    };

    async CreateBlock( prevIdx, dida, data, prevId )
    {
        let block = await new Block( prevIdx + 1, dida, data, prevId );
        block.Id = await this.Sign( block.Hash );
        return block;
    };
}
