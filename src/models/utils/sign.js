/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/5/10
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 * 这个模块负责签名算法接入。
 */
const crypto = require('crypto');
const secp256k1 = require('secp256k1');

/**
 * 由于secp256k1这个库所传入的参数格式都要求Uint8Array格式，所以要转一转。
 * @param signatureStr hex 加密后的结果，是一个hex字符串
 * @return signData Uint8Array 转换成Uint8Array格式
 */
function encodeSignatureToUint(signatureStr) {
    let signData = new Uint8Array(64);
    signatureStr = Buffer.from(signatureStr, 'hex');
    for(var i=0;i<signatureStr.length;i++) {
        signData[i] = signatureStr[i].toString(10);
    }
    return signData;
}

/**
 * 生成secp256k1的公密钥对，统一使用hex
 * @return privateKey hex 密钥
 * @return publicKey  hex 公钥
 */
exports.genKeys = function(){
    let ecdh = crypto.createECDH('secp256k1');
    ecdh.generateKeys();
    return {
        privateKey : ecdh.getPrivateKey('hex'),
        publicKey : ecdh.getPublicKey('hex'),
    }
}

/**
 * 通过secp256k1的密钥，生成公钥
 * @param privateKey hex 密钥
 * @return publicKey hex 公钥
 */
exports.getPublicKey = function(privateKey) {
    privateKey = Buffer.from(privateKey, 'hex');
    let ecdh = crypto.createECDH('secp256k1');
    ecdh.setPrivateKey(privateKey);
    let publicKey = ecdh.getPublicKey('hex');
    return publicKey;
}

/**
 * 利用密钥对一个字符串进行签名
 * @param msg String 需要签名的输入字符串
 * @param privateKey hex 密钥
 * @return sign.signature hex 签名结果
 * @return sign.recid Number 恢复字段
 * 利用密钥对msg进行签名
 */
exports.sign = function(msg, privateKey) {
    msg = crypto.createHash('sha256').update(msg).digest();
    privateKey = Buffer.from(privateKey, 'hex');
    let sign = secp256k1.ecdsaSign(msg, privateKey);
    let signature = '';
    for(var i=0;i<sign.signature.length;i++) {
        let str = sign.signature[i].toString(16);
        if(str.length == 1) {
            str = '0' + str
        }
        signature += str;
    }
    sign.signature = signature;
    return sign;
}

/**
 * 验证签名是否来自于这个publicKey
 * @param signature hex 签名后的串
 * @param msg String 加密前的串
 * @param publicKey hex 公钥
 * @return boolean 签名验证结果
 */
exports.verify = function(signature, msg, publicKey) {
    publicKey = Buffer.from(publicKey, 'hex');
    msg = crypto.createHash('sha256').update(msg).digest();
    signature = encodeSignatureToUint(signature);
    let res = secp256k1.ecdsaVerify(signature, msg, publicKey);
    return res;
}

/**
 * 通过签名结果和恢复字段，获取公钥的算法。这里的公钥也是我们所需要的节点唯一标识NodeId
 * @param signature hex 签名后的串
 * @param recid Number 恢复字段
 * @param msg String 加密前的串
 * @return publicKey hex 公钥
 */
exports.recover = function(signature, recid, msg){
    msg = crypto.createHash('sha256').update(msg).digest();
    let signData = encodeSignatureToUint(signature);
    let pk = secp256k1.ecdsaRecover(signData, recid, msg, false);
    let publicKey = '';
    for(var i=0;i<pk.length;i++) {
        let str = pk[i].toString(16);
        if(str.length == 1) {
            str = '0' + str
        }
        publicKey += str;
    }
    return publicKey;
}