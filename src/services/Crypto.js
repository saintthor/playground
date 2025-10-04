/**
 * Crypto - 密码学服务
 * 提供真实的密码学功能，基于Web Crypto API和ECDSA
 */
class Crypto {
    // 签名验证缓存：signature -> {publicKey, data, isValid, timestamp}
    static Cache = new Map();
    
    // 缓存统计
    static cacheHits = 0;
    static cacheMisses = 0;
    
    /*
     * 生成真实的ECDSA密钥对
     * @returns {Promise<Object>} 包含publicKey和privateKey的对象
     */
    /* static async genKeyPair( )
    {
        try
        {
            // 记录性能指标
            if( this.performanceOptimizer )
            {
                this.performanceOptimizer.recordCryptoOperation();
            }
            
            // 使用Web Crypto API生成ECDSA P-256密钥对
            const keyPair = await crypto.subtle.generateKey(
                {
                    name: "ECDSA",
                    namedCurve: "P-256"
                },
                true, // 可导出
                ["sign", "verify"]
            );
            
            // 导出公钥和私钥为JWK格式
            const publicKeyJwk = await crypto.subtle.exportKey( "jwk", keyPair.publicKey );
            const privateKeyJwk = await crypto.subtle.exportKey( "jwk", keyPair.privateKey );
            
            // 转换为Base64格式便于存储和传输
            const publicKeyBase64 = btoa( JSON.stringify( publicKeyJwk ) );
            const privateKeyBase64 = btoa( JSON.stringify( privateKeyJwk ) );
            
            return {
                publicKey: publicKeyBase64,
                privateKey: privateKeyBase64,
                // 保留原始CryptoKey对象用于签名验证
                _publicKeyCrypto: keyPair.publicKey,
                _privateKeyCrypto: keyPair.privateKey
            };
        }
        catch( error )
        {
            console.error( '密钥对生成失败:', error );
            throw new Error( '无法生成密钥对: ' + error.message );
        }
    } */
    
    /**
     * 使用ECDSA私钥对数据进行数字签名
     * @param {string} data - 要签名的数据
     * @param {string} privateKey - Base64编码的私钥
     * @returns {Promise<string>} Base64编码的签名
     */
    static async sign( data, privateKey )
    {
        try
        {
            // 记录性能指标
            if( this.performanceOptimizer )
            {
                this.performanceOptimizer.recordCryptoOperation();
            }
            
            let privateKeyCrypto;
            
            // 如果传入的是CryptoKey对象，直接使用
            if( privateKey && typeof privateKey === 'object' && privateKey._privateKeyCrypto )
            {
                privateKeyCrypto = privateKey._privateKeyCrypto;
            }
            else
            {
                // 从Base64字符串导入私钥
                const privateKeyJwk = JSON.parse( atob( privateKey ) );
                privateKeyCrypto = await crypto.subtle.importKey(
                    "jwk",
                    privateKeyJwk,
                    {
                        name: "ECDSA",
                        namedCurve: "P-256"
                    },
                    false,
                    ["sign"]
                );
            }
            
            // 对数据进行签名
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode( data );
            
            const signature = await crypto.subtle.sign(
                {
                    name: "ECDSA",
                    hash: { name: "SHA-256" }
                },
                privateKeyCrypto,
                dataBuffer
            );
            
            // 转换为Base64格式
            const signatureArray = Array.from( new Uint8Array( signature ) );
            const signatureBase64 = btoa( String.fromCharCode.apply( null, signatureArray ) );
            
            // 将签名结果加入缓存
            const publicKeyStr = typeof privateKey === 'object' && privateKey.publicKey ? 
                privateKey.publicKey : 'unknown';
            this.Cache.set( signatureBase64, {
                publicKey: publicKeyStr,
                data: data,
                isValid: true,
                timestamp: Date.now()
            });
            
            // 限制缓存大小，防止内存泄漏
            if( this.Cache.size > 10000 )
            {
                const oldestKey = this.Cache.keys().next().value;
                this.Cache.delete( oldestKey );
            }
            
            return signatureBase64;
        }
        catch( error )
        {
            console.error( '签名失败:', error );
            throw new Error( '签名失败: ' + error.message );
        }
    }
    
    /**
     * 使用ECDSA公钥验证数字签名
     * @param {string} signature - Base64编码的签名
     * @param {string} data - 原始数据
     * @param {string} publicKey - Base64编码的公钥
     * @returns {Promise<boolean>} 验证结果
     */
    static async verify( signature, data, publicKey )
    {
        try
        {
            // 记录性能指标
            if( this.performanceOptimizer )
            {
                this.performanceOptimizer.recordCryptoOperation();
            }
            
            // 首先检查缓存
            const cached = this.Cache.get( signature );
            if( cached )
            {
                // 验证缓存的数据和公钥是否匹配
                const publicKeyStr = typeof publicKey === 'object' && publicKey.publicKey ? 
                    publicKey.publicKey : publicKey;
                
                if( cached.data === data && cached.publicKey === publicKeyStr )
                {
                    this.cacheHits++;
                    console.debug( '签名验证缓存命中' );
                    return cached.isValid;
                }
            }
            
            // 缓存未命中
            this.cacheMisses++;
            
            // 记录性能指标
            if( this.performanceOptimizer )
            {
                this.performanceOptimizer.recordCryptoOperation();
            }
            
            let publicKeyCrypto;
            
            // 如果传入的是CryptoKey对象，直接使用
            if( publicKey && typeof publicKey === 'object' && publicKey._publicKeyCrypto )
            {
                publicKeyCrypto = publicKey._publicKeyCrypto;
            }
            else
            {
                // 从Base64字符串导入公钥
                const publicKeyJwk = JSON.parse( atob( publicKey ) );
                publicKeyCrypto = await crypto.subtle.importKey(
                    "jwk",
                    publicKeyJwk,
                    {
                        name: "ECDSA",
                        namedCurve: "P-256"
                    },
                    false,
                    ["verify"]
                );
            }
            
            // 将Base64签名转换为ArrayBuffer
            const signatureBytes = atob( signature );
            const signatureArray = new Uint8Array( signatureBytes.length );
            for( let i = 0; i < signatureBytes.length; i++ )
            {
                signatureArray[i] = signatureBytes.charCodeAt( i );
            }
            
            // 验证签名
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode( data );
            
            const isValid = await crypto.subtle.verify(
                {
                    name: "ECDSA",
                    hash: { name: "SHA-256" }
                },
                publicKeyCrypto,
                signatureArray,
                dataBuffer
            );
            
            // 将验证结果加入缓存
            const publicKeyStr = typeof publicKey === 'object' && publicKey.publicKey ? 
                publicKey.publicKey : publicKey;
            this.Cache.set( signature, {
                publicKey: publicKeyStr,
                data: data,
                isValid: isValid,
                timestamp: Date.now()
            });
            
            // 限制缓存大小，防止内存泄漏
            if( this.Cache.size > 10000 )
            {
                const oldestKey = this.Cache.keys().next().value;
                this.Cache.delete( oldestKey );
            }
            
            console.debug( '签名验证完成，结果已缓存' );
            return isValid;
        }
        catch( error )
        {
            console.error( '签名验证失败:', error );
            return false;
        }
    }
    
    /**
     * 计算SHA-256哈希值
     * @param {string} data - 要哈希的数据
     * @returns {Promise<string>} 十六进制格式的哈希值
     */
    static async sha256( data )
    {
        try
        {
            // 记录性能指标
            if( this.performanceOptimizer )
            {
                this.performanceOptimizer.recordCryptoOperation();
            }
            
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode( data );
            const hashBuffer = await crypto.subtle.digest( 'SHA-256', dataBuffer );
            const hashArray = Array.from( new Uint8Array( hashBuffer ) );
            const hashHex = hashArray.map( b => b.toString( 16 ).padStart( 2, '0' ) ).join( '' );
            return hashHex;
        }
        catch( error )
        {
            console.error( 'SHA-256计算失败:', error );
            throw new Error( '哈希计算失败: ' + error.message );
        }
    }
    
    /*
     * 将字符串转换为Base64编码
     * @param {string} data - 原始字符串
     * @returns {string} Base64编码的字符串
     */
    /* static toBase64( data )
    {
        try
        {
            return btoa( encodeURIComponent( data ).replace( /%([0-9A-F]{2})/g, function( match, p1 ) {
                return String.fromCharCode( '0x' + p1 );
            }));
        }
        catch( error )
        {
            console.error( 'Base64编码失败:', error );
            throw new Error( 'Base64编码失败: ' + error.message );
        }
    } */
    
    /*
     * 将Base64编码转换为字符串
     * @param {string} base64String - Base64编码的字符串
     * @returns {string} 原始字符串
     */
    /* static fromBase64( base64String )
    {
        try
        {
            return decodeURIComponent( Array.prototype.map.call( atob( base64String ), function( c ) {
                return '%' + ('00' + c.charCodeAt( 0 ).toString( 16 )).slice( -2 );
            }).join( '' ));
        }
        catch( error )
        {
            console.error( 'Base64解码失败:', error );
            throw new Error( 'Base64解码失败: ' + error.message );
        }
    } */
    
    /*
     * 生成验证代码
     * @param {string} data - 数据
     * @param {string} dataType - 数据类型
     * @param {Object} context - 上下文信息
     * @returns {string} 验证代码
     */
    /* static genVerifyCode( data, dataType, context = {} )
    {
        return `// 密码学验证代码 - ${dataType}
// 数据: ${data.substring( 0, 50 )}${data.length > 50 ? '...' : ''}
// 类型: ${dataType}
// 使用真实的ECDSA签名和SHA-256哈希
console.log( '验证数据类型:', '${dataType}' );
console.log( '数据长度:', ${data.length} );
console.log( '使用真实密码学算法验证' );`;
    } */
    
    /**
     * 设置性能优化器
     * @param {Object} optimizer - 性能优化器实例
     */
    static setPerformanceOptimizer( optimizer )
    {
        this.performanceOptimizer = optimizer;
        console.log( '密码学服务已连接性能优化器' );
    }
    
    /*
     * 检查Web Crypto API是否可用
     * @returns {boolean} 是否支持Web Crypto API
     */
    /* static isWebCryptoSupported( )
    {
        return typeof crypto !== 'undefined' && 
               typeof crypto.subtle !== 'undefined' &&
               typeof crypto.subtle.generateKey === 'function';
    } */
    
    /*
     * 生成安全随机数
     * @param {number} length - 随机数长度（字节）
     * @returns {Uint8Array} 随机数组
     */
    /* static getRandomBytes( length )
    {
        if( typeof crypto !== 'undefined' && crypto.getRandomValues )
        {
            return crypto.getRandomValues( new Uint8Array( length ) );
        }
        else
        {
            throw new Error( '安全随机数生成不可用' );
        }
    } */
    
    /*
     * 生成随机十六进制字符串
     * @param {number} length - 字符串长度
     * @returns {string} 十六进制随机字符串
     */
    /* static getRandomHex( length )
    {
        const bytes = this.getRandomBytes( Math.ceil( length / 2 ) );
        const hex = Array.from( bytes )
            .map( b => b.toString( 16 ).padStart( 2, '0' ) )
            .join( '' );
        return hex.substring( 0, length );
    } */
    
    /*
     * 获取缓存统计信息
     * @returns {Object} 缓存统计
     */
    /* static getCacheStats( )
    {
        return {
            size: this.Cache.size,
            maxSize: 10000,
            hitRate: this.cacheHits / ( this.cacheHits + this.cacheMisses ) || 0,
            hits: this.cacheHits || 0,
            misses: this.cacheMisses || 0
        };
    } */
    
    /*
     * 清理过期的缓存条目
     * @param {number} maxAge - 最大缓存时间（毫秒），默认1小时
     */
    /* static cleanupCache( maxAge = 3600000 )
    {
        const now = Date.now();
        const toDelete = [];
        
        for( const [signature, entry] of this.Cache )
        {
            if( now - entry.timestamp > maxAge )
            {
                toDelete.push( signature );
            }
        }
        
        toDelete.forEach( signature => this.Cache.delete( signature ) );
        
        if( toDelete.length > 0 )
        {
            console.debug( `清理了 ${toDelete.length} 个过期缓存条目` );
        }
    } */
    
    /*
     * 清空所有缓存
     */
    /* static clearCache( )
    {
        const size = this.Cache.size;
        this.Cache.clear();
        this.cacheHits = 0;
        this.cacheMisses = 0;
        console.debug( `清空了 ${size} 个缓存条目` );
    } */
}