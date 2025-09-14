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
    static Cache = new Map();
    
    constructor()
    {
        this.OwnChains = new Set();
        this.Peers = new Map();
        this.Waiting = new Map();
        this.ChainNum = 0;
        this.LastSend = null;
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
    
    async DoubleSpend( dida )
    {
        if( !this.LastSend )
        {
            console.log( 'transfer once before attacking.' );
            return;
        }
        const [prevBlock, rootId, _, lastUId] = this.LastSend;
        const TargetUid = new Set( [...this.constructor.All.keys()].filter( k => k != this.Id && k != lastUId )).RandVal();
        const TransBlock = await this.SendBlockchain( prevBlock, rootId, dida, TargetUid );
        const SrcPeerKs = Peer.GetOther( 1, [...this.Peers.keys()] );
        window.LogPanel.AddLog( { dida: dida, user: this.Id, blockchain: rootId, block: TransBlock.Id, content: 'Double Spend by ' + SrcPeerKs.join( ',' ) + ' to target user' + TargetUid.slice( 0, 8 ) + '...', category: 'user' } );
        Peer.StartTransing( TransBlock, dida, SrcPeerKs );
    }
    
    SendBlockchain( prevBlock, rootId, dida, targetUId )
    {
        this.LastSend = [prevBlock, rootId, dida, targetUId];
        const NewBlockPrms = new Block( prevBlock.Index + 1, dida, targetUId, prevBlock.Id, this );
        this.SetOwnChains( rootId, false );
        return NewBlockPrms;
    };
    
    async Transfer( dida, chain, targetUId )
    {
        console.log( 'User.Transfer', dida, chain.Id, targetUId );
        const PrevBlocks = [...this.Peers.values()].map( p => p.FindTail( chain.Id )).filter( b => b && b.Status === 0 );
        const s = new Set( PrevBlocks.map( b => b.Id ));
        if( s.size === 1 )
        {
            const TransBlock = await this.SendBlockchain( PrevBlocks[0], chain.Id, dida, targetUId );
            const SrcPeerKs = [...this.Peers.keys()];
            window.LogPanel.AddLog( { dida: dida, user: this.Id, blockchain: chain.Id, block: TransBlock.Id, content: 'add transfer block by ' + SrcPeerKs.join( ',' ) + ' to target user' + targetUId.slice( 0, 8 ) + '...', category: 'user' } );
            Peer.StartTransing( TransBlock, dida, SrcPeerKs );
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
        const ua8 = s instanceof String ? Base642ABuff( s ) : s;
        const sig = ABuff2Base64( await crypto.subtle.sign( { name: "ECDSA", hash: { name: "SHA-1" }, }, this.PriKey, ua8 ));
        this.constructor.Cache.set( sig, [this.PubKeyStr, s].join( '\n' ));
        //console.log( 'Verify Cache set.', sig, this.constructor.Cache.get( sig ));
        return sig;
    };

    static async Verify( sig, s, pubKeyS )
    {
        //console.log( 'Verify', this, sig, data, pubKeyS );
        if( this.Cache.get( sig ) === [pubKeyS, s].join( '\n' ))
        {
            //console.log( 'Verify Cache shot.', sig, this.Cache.get( sig ));
            return true;
        }
        const hash = await Hash( s, 'SHA-1' );
        const pubK = await crypto.subtle.importKey( "raw", Base642ABuff( pubKeyS ),
                                { name: "ECDSA", namedCurve: "P-256", }, false, ["verify"] )
        const Rslt = crypto.subtle.verify( { name: "ECDSA", hash: { name: "SHA-1" }, }, pubK, Base642ABuff( sig ), hash );
        if( Rslt )
        {
            //console.log( 'Verify Cache set.' );
            this.Cache.set( sig, [pubKeyS, s].join( '\n' ));
        }
        return Rslt;
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
    
    StartWait( blockId, tick )
    {
        this.Waiting.set( blockId, tick );
    };
    
    static WaitTrusted( tick )
    {
        [...this.All.values()].forEach( u =>
        {
            [...u.Waiting.entries()].forEach(( [k, v] ) =>
            {
                //console.log( 'WaitTrusted', k, v );
                if( [...u.Peers.values()].map( p => p.LocalBlocks.get( k )).every( b => b && b.Status === 0 ))
                {
                    window.LogPanel.AddLog( { dida: tick, user: u.Id, block: k, content: 'Receiver trusts. Transfer completes.', category: 'user' } );
                    u.Waiting.delete( k );
                }
                else if( v < tick )
                {
                    u.Waiting.delete( k );
                }
            } );
        } );
    };
}
