/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/5/10
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */

const crypto = require('crypto');
/**
 * 构造一个节点对象，全局使用。
 * 其中nodeId是使用crypto库里面的ECDH创建的speak2561算法生成的密钥对的公钥。
 */
let Node = function(param){
    let node = {
        id : param.id,
        ip : param.ip,
        tcpport : param.tcpport,
        udpport : param.udpport,
        update : +new Date(),
    }
    // todo if node.id == undefined -> create node.id

    return node;
}

module.exports = Node;