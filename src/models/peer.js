class Peer
{
    static All = new Map();
    
    constructor( id )
    {
        this.Id = id;
        this.Users = new Map();
        this.LocalBlocks = new Map();
        this.Connections = new Map();
        this.Messages = new Map();      //on the way
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
    
    static Update( currTick, connNum )
    {
        console.log( 'Peer.Update', currTick, connNum );
        this.All.values().forEach( p =>
        {
            p.Messages.values().forEach( m =>
            {
                const [msg, neighborId, tick] = m;
                if( tick <= currTick )
                {
                    p.Receive( msg, neighborId );
                    delete p.Messages[msg.Id];
                }
            } );
            
            if( Math.random() < 0.01 )
            {
                const key = [...p.Connections.keys()][Math.floor( Math.random() * p.Connections.size )];
                p.BreakConn( key );
            }
            
            for( let i = connNum - p.Connections.size; i > 0; )
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
        } );
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

    Broadcast( msg, currTick )  //inner & outer
    {
        this.Connections.forEach(( n, t ) => n.AddMessage( msg, n.Id, currTick + t ));
    };

    Receive( message, neighborId )
    {
        if( !this.Connections.has( neighborId ))
        {
            return;
        }
        if( message.type === 'NewBlock' )
        {
        }
    };

    GetBlock( blockId )
    {
        return this.LocalBlocks.get( blockId );
    };

    FindRoot( blockId )
    {
        for( let block = this.LocalBlocks.get( blockId ); block; block = this.LocalBlocks.get( blockId ))
        {
            let [idx, name, prevId] = block.GetContentLns( 0, 2, 4 );
            if( idx == 0 )
            {
                return { Id: blockId, Name: name };
            }
            blockId = prevId;
        }
    };

    async RcvBlock( block )
    {
        //console.log( 'RcvBlock', this.Name, block );
        if( this.LocalBlocks.has( block.Id ))
        {
            if( this.LocalBlocks.get( block.Id ).Content !== block.Content )
            {
                throw "bad block data.";
            }
            return;
        }

        let RecvBlock = new Block( block.Index, 0, 0, block.Id, block.Content );
        if( block.Index == 0 )
        {
            if( !await RecvBlock.ChkRoot())
            {
                throw "verify failed.";
            }
        }
        else
        {
            let Prev = this.LocalBlocks.get( RecvBlock.PrevId );
            if( !Prev )
            {
                throw "previous block not found.";
            }
            if( !await RecvBlock.ChkFollow( Prev.OwnerId ))
            {
                throw "verify failed."
            }
        }

        if( block.Index > 0 )
        {
            let PrevBlock = this.LocalBlocks.get( RecvBlock.PrevId );
            let PrevOwner = PrevBlock.OwnerId;
            if( this.BlackList.some( uid => uid == PrevOwner ))
            {
                if( this.Id != PrevOwner )
                {
                    throw "sender in blacklist.";
                }
                return;
            }
            if( !this.ChkTail( PrevBlock ))
            {
                this.BlackList.push( PrevOwner );
                if( this.Id != PrevOwner )
                {
                    throw "double spending."
                }
                return;
            }
        }

        this.LocalBlocks.set( block.Id, RecvBlock );
        let Root = this.FindRoot( block.Id );
        RecvBlock.ChainId = Root.Id;
        if( RecvBlock.OwnerId === this.Id )
        {
            this.OwnChains.set( Root.Id, Root );
        }
        else
        {
            this.OwnChains.delete( Root.Id );
        }
    };

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

    ChkTail( block )
    {
        return ![...this.LocalBlocks.values()].find( b => b.PrevId == block.Id );
    };
}

