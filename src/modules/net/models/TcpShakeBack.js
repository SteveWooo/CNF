/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/6/2
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */

const CONFIG = {
    VERSION : 1,
}
/**
 * 构造一个tcp shake包, 主要是告知了自己的节点信息.
 * TODO 签名
 */
function Shake(){
    let now = +new Date();
    let msg = {
        ts : now,
        from : {
            nodeId : global.CNF.netData.nodeId,
            ip : global.CNF.CONFIG.net.localhost,
            tcpport : global.CNF.CONFIG.net.connectionTcpServerPort,
            udpport : global.CNF.CONFIG.net.discoverUdpPort,
            networkid : global.CNF.CONFIG.net.networkid
        },
        version : CONFIG.VERSION
    }
    msg = JSON.stringify(msg);
    let data = {
        event: 'shakeBackEvent',
        msg : msg
    }

    return {
        ts : now,
        data : JSON.stringify(data)
    }
}

module.exports = Shake;