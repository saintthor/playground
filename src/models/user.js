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
        this.Status = '';
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
        if( s.size === 1 && !this.Status )
        {
            const TransBlock = await this.SendBlockchain( PrevBlocks[0], chain.Id, dida, targetUId );
            const SrcPeerKs = [...this.Peers.keys()];
            window.LogPanel.AddLog( { dida: dida, user: this.Id, blockchain: chain.Id, block: TransBlock.Id, content: 'add transfer block by ' + SrcPeerKs.join( ',' ) + ' to target user' + targetUId.slice( 0, 8 ) + '...', category: 'user' } );
            Peer.StartTransing( TransBlock, dida, SrcPeerKs );
            chain.Transfer( 1 );
            this.Status = 'sending';
            this.Waiting.set(() => this.Status = '', dida + Peer.BroadcastTicks * 4 );
        }
        else
        {
            console.error( s.size > 1 ? 'got multi tails.' : 'no tails.' );
        }
    };
    
    SendMsgMeta( msgBlock )
    {
        const SrcPeerKs = [...this.Peers.keys()];
        window.LogPanel.AddLog( { dida: msgBlock.Tick, user: this.Id, block: msgBlock.Id, content: 'add message meta by ' + SrcPeerKs.join( ',' ), category: 'user' } );
        Peer.StartTransing( msgBlock, msgBlock.Tick, SrcPeerKs, 0 );
        this.Waiting.set(() => this.SendMsgText( msgBlock ), msgBlock.Tick + Peer.BroadcastTicks * 2 );
    }

    SendMsgText( msgBlock )
    {
        const SrcPeerKs = [...this.Peers.keys()];
        window.LogPanel.AddLog( { dida: msgBlock.Tick, user: this.Id, block: msgBlock.Id, content: 'add message text by ' + SrcPeerKs.join( ',' ), category: 'user' } );
        Peer.StartTransing( msgBlock, msgBlock.Tick, SrcPeerKs, 1 );
    }

    async Sign( hash )
    {
        const HashStr = ABuff2Base64( hash );
        const sig = ABuff2Base64( await crypto.subtle.sign( { name: "ECDSA", hash: { name: "SHA-1" }, }, this.PriKey, hash ));
        this.constructor.Cache.set( sig, [this.PubKeyStr, HashStr].join( '\n' ));
        return sig;
    };

    static async Verify( sig, hash, pubKeyS )
    {
        const HashStr = ABuff2Base64( hash );
        if( this.Cache.get( sig ) === [pubKeyS, HashStr].join( '\n' ))
        {
            //console.log( 'Verify Cache shot.', sig, this.Cache.get( sig ));
            return true;
        }
        const pubK = await crypto.subtle.importKey( "raw", Base642ABuff( pubKeyS ),
                                { name: "ECDSA", namedCurve: "P-256", }, false, ["verify"] )
        return await crypto.subtle.verify( { name: "ECDSA", hash: { name: "SHA-1" }, }, pubK, Base642ABuff( sig ), hash );
    };
    
    GetAssets()
    {
        return [...[...this.OwnChains].map( rootId => BlockChain.All.get( rootId ).FaceVal ), 0, 0].reduce(( x, y ) => x + y );
    };

    //async CreateBlock( prevIdx, dida, data, prevId )
    //{
        //let block = await new Block( prevIdx + 1, dida, data, prevId );
        //block.Id = await this.Sign( block.Hash );
        //return block;
    //};
    
    StartWait( blockId, tick )
    {
        this.Waiting.set( blockId, tick );
        this.Status = 'receiving';
    };
    
    static WaitTrusted( tick )
    {
        [...this.All.values()].forEach( u =>
        {
            [...u.Waiting.entries()].forEach(( [k, v] ) =>
            {
                //console.log( 'WaitTrusted', k, v );
                if( typeof k === 'function' && v < tick )
                {
                    k();
                    u.Waiting.delete( k );
                }
                else if( [...u.Peers.values()].map( p => p.LocalBlocks.get( k )).every( b => b && b.Status === 0 ))
                {
                    window.LogPanel.AddLog( { dida: tick, user: u.Id, block: k, content: 'Receiver trusts. Transfer completes.', category: 'user' } );
                    u.Waiting.delete( k );
                    u.Status = '';
                }
                else if( v < tick )
                {
                    u.Waiting.delete( k );
                    u.Status = '';
                }
            } );
        } );
    };
    
    static GetByShort( shortK )
    {
        return [...this.All.entries()].map(( [k, v] ) => k.startsWith( shortK ) ? v : null ).filter( v => v );
    }
}
