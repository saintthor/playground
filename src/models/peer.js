class Peer
{
    static All = new Map();
    static Trans = new Map();
    static BroadcastTicks = 15;
    
    constructor( id )
    {
        this.Id = id;
        this.Users = new Map();
        this.LocalBlocks = new Map();
        this.Connections = new Map();
        this.RecvedMsgs = new Map();
        this.BlackList = new Set();
        this.Messages = new Map();      //on the way
        this.WaitList = [];
        this.constructor.All.set( this.Id, this );
    };

    AddUser( u )
    {
        this.Users.set( u.Id, u );
    };

    DelUser( userId )
    {
        if( this.Users.has( userId ))
        {
            this.Users.get( userId ).Peers.delete( this.Id );
            this.Users.delete( userId );
        }
    };

    //AddNeighbors( ...neighbors )
    //{
        //neighbors.filter( n => n.Id != this.Id ).forEach( n => this.Neighbors.set( n.Id, n ));
    //};
    
    Connect( neighbor, tick )
    {
        this.Connections.set( neighbor.Id, [neighbor, tick] );
    };
    
    AddMessage( msg, neighborId, tick )
    {
        if( this.Connections.has( neighborId ) && !this.Messages.has( msg.Id ))
        {
            this.Messages.set( msg.Id, [msg, neighborId, tick] );
        }
    };
    
    static ResetBrcTicks( minConns )
    {
        this.BroadcastTicks = Math.floor( Math.log( this.All.size ) / Math.log( minConns ) * 4 ) + 5;
    };
    
    static ChkBlackList( userId )
    {
        return [...this.All.values()].map( p => p.BlackList.has( userId ) ? p.Id : -1 ).filter( Id => Id > 0 );
    };
    
    static async Update( currTick, minConnNum, breakRate = 0.1 )
    {
        //console.log( 'Peer.Update', currTick, minConnNum );
        const Reached = [], Trusted = [];
        
        for( let p of this.All.values())
        {
            if( p.WaitList.length > 0 )
            {
                p.WaitList = p.WaitList.filter( w =>
                {
                    if( w[1] <= currTick )
                    {
                        if( w[0].Status > 0 )
                        {
                            window.LogPanel.AddLog( { dida: currTick, peer: p.Id, block: w[0].Id, content: 'new block trusted.', category: 'peer' } );
                            w[0].Status = 0;
                        }
                        //console.log( 'Update WaitList', p.Id, w );
                        Trusted.push( p.Id );
                        return false;
                    }
                    return true;
                } );
            }
            
            for( let m of p.Messages.values())
            {
                const [msg, neighborId, tick] = m;
                if( tick <= currTick )
                {
                    window.LogPanel.AddLog( { dida: currTick, peer: p.Id, content: msg.Id.slice( 0, 11 ) + ' message received.', category: 'peer' } );
                    msg.SaveAt = currTick;
                    if( await p.Receive( msg, neighborId ))
                    {
                        //console.log( p.Id, 'received', msg.Id );
                        Reached.push( [p.Id, msg.color] );
                        p.Broadcast( msg, currTick, neighborId );
                    }
                    p.Messages.delete( msg.Id );
                }
            };
            
            const ConnNum = p.Connections.size
            if( Math.random() < 0.002 * breakRate * ConnNum )
            {
                const key = [...p.Connections.keys()][Math.floor( Math.random() * ConnNum )];
                p.BreakConn( key );
            }
            
            for( let i = minConnNum - p.Connections.size; i > 0; )
            {
                const peer = p.constructor.All.RandVal();
                if( p.Id != peer.Id )
                {
                    //console.log( 'Connect', p.Id, peer.Id );
                    const Tick = Math.floor( Math.random() * 5 + 1 );
                    p.Connect( peer, Tick );
                    peer.Connect( p, Tick );
                    i--;
                }
            }
        };
        
        if( Reached.length + Trusted.length > 0 )
        {
            window.app.NetWorkPanal.UpdateTrans( Reached, Trusted );
        }
    };
    
    BreakConn( k )
    {
        //console.log( 'Peer.BreakConn', this.Id, k );
        if( this.Connections.has( k ))
        {
            const Remote = this.Connections.get( k )[0];
            this.Connections.delete( k );
            Remote.BreakConn( this.Id );
        }
    }

    Broadcast( msg, currTick, sourceId )  //inner & outer
    {
        [...this.Connections.values()].filter( c => c[0].Id != sourceId ).forEach(( [n, t] ) =>
        {
        //console.log( 'Broadcast', this.Id, n.Id, currTick + t );
            n.AddMessage( msg, this.Id, currTick + t );
            window.LogPanel.AddLog( { dida: currTick, peer: this.Id, content: ( sourceId ? 'start broadcasting.' : 'continue broadcasting.' ) + msg.Id.slice( 0, 16 ), category: 'peer' } );
        } );
        
        sourceId || window.app.NetWorkPanal.ShowMessage( msg );
    };

    async Receive( message, neighborId )
    {
        if( neighborId && !this.Connections.has( neighborId ))
        {
            return false;
        }
        if( this.RecvedMsgs.has( message.Id ))
        {
            return false;
        }
        
        this.RecvedMsgs.set( message.Id, message );
        
        if( message.type === 'NewBlock' )
        {
            const CurrBlock = new RebuildBlock( message.block.Id, message.block.Content );
            if( this.LocalBlocks.has( CurrBlock.Id ))
            {
                return false;
            }
            try
            {
                await this.Verify( CurrBlock );
            }
            catch( e )
            {
                console.log( e, this.Id );
                window.LogPanel.AddLog( { dida: window.app.Tick, peer: this.Id, content: 'Verify failed: ' + e, category: 'peer' } );
                return false;
            }
            
            this.AcceptBlockchain( CurrBlock );
        }
        else if( message.type === "Alarm" )
        {
            const [b1, b0] = message.blocks.map( btd => new RebuildBlock( btd.Id, btd.Content ));
            if( b1.PrevId === b0.PrevId )
            {
                const Prev = this.SeekBlock( b1.PrevId );
                if( Prev && [b1, b0].every( async b => !!( await b.ChkFollow( Prev.OwnerId ))))
                {
                    this.BlackList.add( Prev.OwnerId );
                    b1.Status = b0.Status = -1;
                    this.LocalBlocks.set( b1.Id, b1 );
                    this.WaitList = this.WaitList.filter(( [b, t] ) => b.Id != b0.Id && b.Id != b1.Id );
                    const ExistB0 = this.LocalBlocks.get( b0.Id )
                    if( ExistB0?.Status > 0 )
                    {
                        ExistB0.Status *= -1;
                    }
                    else if( ExistB0 == null )
                    {
                        this.LocalBlocks.set( b0.Id, b0 );
                    }
                    window.LogPanel.AddLog( { dida: window.app.Tick, peer: this.Id, user: Prev.OwnerId, content: 'user blacklisted', category: 'user' } );
                }
            }
        }
        else if( message.type === "Article" )
        {
        }
        return true;
    };
    
    SeekBlock( blockId )
    {
        let block = this.LocalBlocks.get( blockId );
        if( !block )
        {
            block = BaseBlock.All.get( blockId );  //from other peers?
            this.LocalBlocks.set( blockId, block );
        }
        return block;
    }
    
    AcceptBlockchain( block )
    {
        this.LocalBlocks.set( block.Id, block );
        block.RootId = this.FindRoot( block.Id );
        if( block.Index > 1 )
        {
            window.LogPanel.AddLog( { dida: window.app.Tick, peer: this.Id, block: block.Id, content: 'new block veryfied.', category: 'peer' } );
            block.Status = 1;
            const WaitTicks = window.app.Tick + this.constructor.BroadcastTicks * ( this.Users.has( block.OwnerId ) ? 4 : 2 );
            this.WaitList.push( [block, WaitTicks] );
        }
        if( block.Index >= 1 && this.Users.has( block.OwnerId ))
        {
            //console.log( 'Receive find owner', block.OwnerId.slice( 0, 9 ), block.RootId.slice( 0, 9 ));
            const Receiver = this.Users.get( block.OwnerId )
            BlockChain.All.get( block.RootId ).Update( Receiver, block );
            
            if( block.Index > 1 )
            {
                Receiver.StartWait( block.Id, window.app.Tick + 200 );
            }
        }
    }
    
    async Verify( block )
    {
        //console.log( this.LocalBlocks.has( block.Id ), block.Id );
        if( block.Index == 0 )
        {
            if( !await block.ChkRoot())
            {
                throw "verify failed.";
            }
        }
        else
        {
            const Prev = this.SeekBlock( block.PrevId );
            if( !Prev )
            {
                throw "previous block not found.";
            }
            if( Prev.Status < 0 )
            {
                this.LocalBlocks.set( block.Id, block );
                block.Status = Prev.Status;
                block.RootId = this.FindRoot( block.Id );
                throw "previous block invalid.";
            }
            if( !await block.ChkFollow( Prev.OwnerId ))
            {
                throw "verify failed."
            }
            
            const PrevOwner = Prev.OwnerId;
            if( this.BlackList.has( PrevOwner ))
            {
                throw "sender in blacklist."
            }
            const OtherChild = this.GetChild( Prev );
            if( OtherChild )
            {
                this.BlackList.add( PrevOwner );
                this.OnDoubleSpend( PrevOwner, block, OtherChild );
                throw "double spending."
            }
        }
    }
    
    OnDoubleSpend( preOwner, block, block0 )
    {
        const AlarmMsg = { Id: "Alarm" + preOwner.slice( 0, 13 ) + block.Id.slice( 0, 13 ), from: this.Id,
                            type: "Alarm", blocks: [block.TransData(), block0.TransData()],
                            color: getColor(( r, g, b ) => r + g > b * 2 && r + g + b < 600 && r + g + b > 100 ) };
        this.Broadcast( AlarmMsg, window.app.Tick );
        this.WaitList = this.WaitList.filter(( [b, t] ) => b.Id != block.Id && b.Id != block0.Id );
    }
    
    static GetOther( n, exceptKs )
    {
        const ValidKeys = new Set( this.All.keys()).difference( new Set( exceptKs ));
        const Rslt = [];
        console.log( 'GetOther', n, ValidKeys.size );
        for( n = n <= ValidKeys.size ? n : ValidKeys.size; n-- > 0; )
        {
            const k = ValidKeys.RandVal();
            ValidKeys.delete( k );
            Rslt.push( k );
        }
        return Rslt;        
    }

    static StartTransing( block, dida, srcPeerKs )
    {
        const TransMsg = { Id: "NewBlock" + block.Id, type: "NewBlock", block: block.TransData(),
                            color: getColor(( r, g, b ) => r + g > b * 2 && r + g + b < 600 && r + g + b > 100 ) };
        srcPeerKs.forEach( k =>
        {
            const peer = this.All.get( k );
            peer.AcceptBlockchain( block );
            peer.Broadcast( TransMsg, dida )
        } );
        
        window.app.NetWorkPanal.UpdateTrans( srcPeerKs.map( k => [k, TransMsg.color] ), [] );
    }
    
    GetBlock( blockId )
    {
        return this.LocalBlocks.get( blockId );
    };

    FindRoot( blockId )
    {
        for( let block = this.GetBlock( blockId ); block; block = this.GetBlock( blockId ))
        {
            if( block.RootId )
            {
                return block.RootId;
            }
            let [idx, prevId] = block.GetContentLns( 0, 3 );
            if( isNaN( idx ))
            {
                return blockId;
            }
            blockId = prevId;
        }
    };
    
    FindTail( rootId )
    {
        const Blocks = [...this.LocalBlocks.values()].filter( b => b.RootId === rootId && b.Status === 0 ).sort(( x, y ) => y.Index - x.Index );
        if( Blocks.length < 1 )
        {
            console.error( 'no blocks for root', rootId, this.LocalBlocks.size );
            return;
        }
        
        if( Blocks[0].Index < Blocks.length - 1 )
        {
            console.error( 'can not choose.', rootId, Blocks.map( b => b.Index ));
            return;
        }
        return Blocks[0];
    };

    //async RcvBlock( block )
    //{
        ////console.log( 'RcvBlock', this.Name, block );
        //if( this.LocalBlocks.has( block.Id ))
        //{
            //if( this.LocalBlocks.get( block.Id ).Content !== block.Content )
            //{
                //throw "bad block data.";
            //}
            //return;
        //}

        //let RecvBlock = new Block( block.Index, 0, 0, block.Id, block.Content );
        //if( block.Index == 0 )
        //{
            //if( !await RecvBlock.ChkRoot())
            //{
                //throw "verify failed.";
            //}
        //}
        //else
        //{
            //let Prev = this.LocalBlocks.get( RecvBlock.PrevId );
            //if( !Prev )
            //{
                //throw "previous block not found.";
            //}
            //if( !await RecvBlock.ChkFollow( Prev.OwnerId ))
            //{
                //throw "verify failed."
            //}
        //}

        //if( block.Index > 0 )
        //{
            //let PrevBlock = this.LocalBlocks.get( RecvBlock.PrevId );
            //let PrevOwner = PrevBlock.OwnerId;
            //if( this.BlackList.some( uid => uid == PrevOwner ))
            //{
                //if( this.Id != PrevOwner )
                //{
                    //throw "sender in blacklist.";
                //}
                //return;
            //}
            //if( !this.ChkTail( PrevBlock ))
            //{
                //this.BlackList.push( PrevOwner );
                //if( this.Id != PrevOwner )
                //{
                    //throw "double spending."
                //}
                //return;
            //}
        //}

        //this.LocalBlocks.set( block.Id, RecvBlock );
        //let Root = this.FindRoot( block.Id );
        //RecvBlock.ChainId = Root.Id;
        //if( RecvBlock.OwnerId === this.Id )
        //{
            //this.OwnChains.set( Root.Id, Root );
        //}
        //else
        //{
            //this.OwnChains.delete( Root.Id );
        //}
    //};

    GetChainBranch( chainid )
    {
        let Branch = [];
        let Queue = [this.LocalBlocks.get( chainid )];
        let Index = 0;
        let InChains = [];
        [...this.LocalBlocks.values()].filter( b => b.ChainId == chainid ).forEach( b => InChains.push( b ));
        //逐层添加区块，以后加分叉
        console.log( InChains );
        while( Queue.length > 0 )
        {
            let CurBlock = Queue.splice( 0, 1 )[0];
            //console.log( Queue.length, CurBlock );
            if( !CurBlock )
            {
                break;
            }
            Branch.push( CurBlock );
            InChains.filter( b => b.Index == CurBlock.Index + 1 && b.PrevId == CurBlock.Id ).forEach( f => Queue.push( f ));
        }
        return Branch;
    };

    GetChild( block )
    {
        return [...this.LocalBlocks.values()].find( b => b.PrevId == block.Id );  // find not return an index.
    };
}

