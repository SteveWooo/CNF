/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/6/1
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */

const sign = global.CNF.utils.sign;
const crypto = require('crypto');
const print = global.CNF.utils.print;
const CONFIG = {
    VERSION : 1,
}
/**
 * 用于构造主动Shake一个节点的网络包，需要带上自己的签名和主体信息
 * 主体信息包括协议版本，时间戳（ms）。其中主体信息在JSON的顺序，需要按字母表排序。
 * @param.node 需要shake的目标节点
 * @param.ack shake的顺序。第一次Shake就是1，第二次就是2。自己主动发起Shake的，是1；别人Shake你，你应答别人的Shake的，是2
 * @return data JSONstring udp消息主体
 * @return ip IP udp消息收方
 * @return udpport 消息接受方的udpport
 */
function Shake(node, type){
    let now = +new Date();
    let msg = {
        ts : now,
        type : type,
        version : CONFIG.VERSION,
        from : {
            ip : global.CNF.CONFIG.net.localhost,
            udpport : global.CNF.CONFIG.net.discoverUdpPort,
            tcpport : global.CNF.CONFIG.net.connectionTcpServerPort,
            networkid : global.CNF.CONFIG.net.networkid
        }
    }

    // 主体信息需要进一步JSON
    msg = JSON.stringify(msg);

    let signed = sign.sign(msg, global.CNF.CONFIG.net.localPrivateKey);
    let hash = crypto.createHash('sha256').update(`${signed.signature}&${signed.rcid}`).digest('hex');
    let data = {
        hash : hash,
        signature : signed.signature,
        recid : signed.recid,
        msg : msg
    }

    return {
        node: node,
        ts : now,
        data : JSON.stringify(data)
    }
}

module.exports = Shake;