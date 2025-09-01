class Peer
{
    static All = new Map();
    static Trans = new Map();
    
    constructor( id )
    {
        this.Id = id;
        this.Users = new Map();
        this.LocalBlocks = new Map();
        this.Connections = new Map();
        this.RecvedMsgs = new Set();
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
                        window.LogPanel.AddLog( { dida: currTick, peer: p.Id, block: w[0].Id, content: 'new block trusted.', category: 'peer' } );
                        //console.log( 'Update WaitList', w );
                        w[0].Status = 0;
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
                    window.LogPanel.AddLog( { dida: currTick, peer: p.Id, content: 'message received.', category: 'peer' } );
                    if( await p.Receive( msg, neighborId ))
                    {
                        console.log( p.Id, 'received', msg.Id );
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
                const peer = [...p.constructor.All.values()][Math.floor( Math.random() * p.constructor.All.size )];
                if( p.Id != peer.Id )
                {
                    console.log( 'Connect', p.Id, peer.Id );
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
            window.LogPanel.AddLog( { dida: currTick, peer: this.Id, content: sourceId ? 'start broadcasting.' : 'continue broadcasting.', category: 'peer' } );
        } );
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
        this.RecvedMsgs.add( message.Id );
        
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
            const ConfBlocks = message.blocks.map( btd => new RebuildBlock( btd.Id, btd.Content ));
            if( ConfBlocks.length > 1 && new Set( ConfBlocks.map( b => b.PrevId )).size == 1 )
            {
                const Prev = this.SeekBlock( ConfBlocks[0].PrevId );
                if( Prev && ConfBlocks.every( b => !!b.ChkFollow( Prev.OwnerId )))
                {
                    this.BlackList.add( Prev.OwnerId );
                    window.LogPanel.AddLog( { dida: window.app.Tick, peer: this.Id, user: Prev.OwnerId, content: 'user blacklisted', category: 'user' } );
                }
            }
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
            const WaitTicks = window.app.Tick + window.mainPanel.BaseTicks * ( this.Users.has( block.OwnerId ) ? 4 : 2 );
            this.WaitList.push( [block, WaitTicks] );
        }
        if( block.Index >= 1 && this.Users.has( block.OwnerId ))
        {
            //console.log( 'Receive find owner', block.OwnerId.slice( 0, 9 ), block.RootId.slice( 0, 9 ));
            BlockChain.All.get( block.RootId ).Update( this.Users.get( block.OwnerId ), block );
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
            if( !await block.ChkFollow( Prev.OwnerId ))
            {
                throw "verify failed."
            }
            
            const PrevOwner = Prev.OwnerId;
            if( this.BlackList.has( PrevOwner ))
            {
                throw "previous owner blacklisted."
            }
            const OtherChild = this.GetChild( Prev );
            if( OtherChild )
            {
                this.BlackList.add( PrevOwner );
                this.OnDoubleSpend( PrevOwner, block, OtherChild );
                throw "double spending."
            }
            if( this.BlackList.has( PrevOwner ))
            {
                throw  "sender in blacklist.";
            }
        }
    }
    
    OnDoubleSpend( preOwner, block, block0 )
    {
        const AlarmMsg = { Id: "Alarm" + preOwner, type: "Alarm", blocks: [block.TransData(), block0.TransData()],
                            color: getColor(( r, g, b ) => r + g > b * 2 && r + g + b < 600 && r + g + b > 100 ) };
        this.Broadcast( AlarmMsg, window.app.Tick );
    }

    GetBlock( blockId )
    {
        return this.LocalBlocks.get( blockId );
    };

    FindRoot( blockId )
    {
        for( let block = this.GetBlock( blockId ); block; block = this.GetBlock( blockId ))
        {
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
            //window.blocks = [...this.LocalBlocks.values()];
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

