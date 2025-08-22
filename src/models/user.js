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

class User
{
    static All = new Map();
    
    constructor()
    {
        this.OwnChains = new Map();
        this.LocalBlocks = new Map();       //move to Peer?
        this.BlackList = [];
        this.Peers = new Map();
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
    
    AddPeer( peer )
    {
        const l = this.Peers.size;
        this.Peers.set( peer.Id, peer );
        peer.AddUser( this );
        return this.Peers.size - l;
    };
    
    RecvBlockchain( block )
    {
        const Chain = block.GetBlockChain();
        this.OwnChains.set( Chain[0], Chain );
    };

    async Sign( s, pswd )
    {
        let ua8 = Base642ABuff( s );
        return ABuff2Base64( await crypto.subtle.sign( { name: "ECDSA", hash: { name: "SHA-1" }, }, this.PriKey, ua8 ));
    };

    static async Verify( sig, data, pubKeyS )
    {
        //console.log( 'Verify', this, sig, data, pubKeyS );
        let pubK = await crypto.subtle.importKey( "raw", Base642ABuff( pubKeyS ),
                                { name: "ECDSA", namedCurve: "P-256", }, false, ["verify"] )
        return crypto.subtle.verify( { name: "ECDSA", hash: { name: "SHA-1" }, }, pubK, Base642ABuff( sig ), data );
    };

    static async Import( pswd, encrypted )    //import a key pair to create a user.
    {
        let h512 = await Hash( pswd, 'SHA-512', HASH_TIMES );
        let CBCKey = await crypto.subtle.importKey( 'raw', h512.slice( 0, 32 ), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey'] )
                        .then( k => crypto.subtle.deriveKey( { "name": 'PBKDF2', "salt": h512.slice( 32, 48 ),
                                    "iterations": CBC_ITERATIONS, "hash": 'SHA-256' }, k,
                                    { "name": 'AES-CBC', "length": 256 }, true, ["encrypt", "decrypt"] ))
        let Buffer = await crypto.subtle.decrypt( { name: 'AES-CBC', iv: h512.slice( 48, 64 ) }, CBCKey, Base642ABuff( encrypted ));
        let Keys = JSON.parse( UA2Str( new Uint8Array( Buffer )));

        return await new User( Keys );
    };

    async Export( pswd )    //export the key pair.
    {
        let h512 = await Hash( pswd, 'SHA-512', HASH_TIMES );
        let CBCKey = await crypto.subtle.importKey( 'raw', h512.slice( 0, 32 ), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey'] )
                        .then( k => crypto.subtle.deriveKey( { "name": 'PBKDF2', "salt": h512.slice( 32, 48 ),
                                    "iterations": CBC_ITERATIONS, "hash": 'SHA-256' }, k,
                                    { "name": 'AES-CBC', "length": 256 }, true, ["encrypt", "decrypt"] ))
        let ExPrivKey = await crypto.subtle.exportKey( "jwk", this.PriKey );
        let Buffer = new TextEncoder( 'utf8' ).encode( JSON.stringify( { 'private': ExPrivKey, 'public': this.PubKeyStr } ));

        return ABuff2Base64( await crypto.subtle.encrypt( { name: 'AES-CBC', iv: h512.slice( 48, 64 ) }, CBCKey, Buffer ));
    };

    async CreateBlock( prevIdx, dida, data, prevId )
    {
        let block = await new Block( prevIdx + 1, dida, data, prevId );
        block.Id = await this.Sign( block.Hash );
        return block;
    };
}
