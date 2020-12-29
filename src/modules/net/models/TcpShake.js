/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/6/2
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
 * 构造一个tcp shake包, 主要是告知了自己的节点信息.
 * TODO 签名
 */
function Shake(node){
    let now = +new Date();
    let msg = {
        ts : now + "",
        from : {
            nodeID : global.CNF.netData.nodeId,
            ip : global.CNF.CONFIG.net.localhost,
            tcpport : global.CNF.CONFIG.net.connectionTcpServerPort + "",
            udpport : global.CNF.CONFIG.net.discoverUdpPort + "",
            networkid : global.CNF.CONFIG.net.networkid + ""
        },
        version : CONFIG.VERSION + ""
    }
    msg = JSON.stringify(msg);
    let data = {
        event: 'shakeEvent',
        msg : msg,
        targetNodeID : node.nodeId
    }

    return {
        ts : now,
        data : JSON.stringify(data)
    }
}

module.exports = Shake;