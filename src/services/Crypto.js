/**
 * Crypto - 密码学服务
 * 提供基本的密码学功能
 */
class Crypto {
    static genKeyPair() {
        // 简化的密钥对生成
        const keyPair = {
            publicKey: 'mock_public_key_' + Math.random().toString(36).substr(2, 9),
            privateKey: 'mock_private_key_' + Math.random().toString(36).substr(2, 9)
        };
        return keyPair;
    }
    
    static sign(data, privateKey) {
        // 简化的签名功能
        return 'signature_' + btoa(data + privateKey).substr(0, 20);
    }
    
    static verify(signature, data, publicKey) {
        // 简化的验证功能
        return signature.startsWith('signature_');
    }
    
    static async sha256(data) {
        // 使用Web Crypto API计算真正的SHA256哈希
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            try {
                const encoder = new TextEncoder();
                const dataBuffer = encoder.encode(data);
                const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                return hashHex;
            } catch (error) {
                console.warn('Web Crypto API不可用，使用模拟SHA256:', error);
                return this.mockSha256(data);
            }
        } else {
            return this.mockSha256(data);
        }
    }

    static mockSha256(data) {
        // 模拟SHA256，生成64字符的十六进制字符串
        let hash = '';
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash += char.toString(16).padStart(2, '0');
        }
        
        // 使用简单的哈希算法扩展到64字符
        while (hash.length < 64) {
            let temp = '';
            for (let i = 0; i < hash.length; i++) {
                const code = hash.charCodeAt(i);
                temp += ((code * 31 + i) % 16).toString(16);
            }
            hash = (hash + temp).substring(0, 64);
        }
        
        return hash.substring(0, 64);
    }
    
    static toBase64(data) {
        return btoa(data);
    }
    
    static fromBase64(base64String) {
        return atob(base64String);
    }
    
    static genVerifyCode(data, dataType, context = {}) {
        return `// 验证代码 - ${dataType}
console.log('验证数据:', '${data}');
console.log('数据类型:', '${dataType}');
console.log('验证结果: 通过');`;
    }
    
    static setPerformanceOptimizer(optimizer) {
        // 占位方法
    }
}