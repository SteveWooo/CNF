/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/5/10
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */
const net = require('net');
let model = {};
const CONFIG = {
    MAX_INBOUND : 117,
    MAX_OUTBOUND : 8
}
model.CONFIG = CONFIG;

let init = async function(){
    let globalConnection = {
        inBound : [],
        outBound : []
    };

    global.CNF.net.connections = globalConnection;
}
model.init = init;

/**
 * 尝试对一个节点发起连接
 */
let tryOutBoundConnect = async function(node){
    console.log('tring conn:');
    console.log(node);

    // 这么连接别的节点就行了。
    // let socket = net.connect();

    return ;
}
model.tryOutBoundConnect = tryOutBoundConnect;

/**
 * 检查需要连接的这个节点是否在连接池里
 */
let isNodeAlreadyConnected = async function(node){
    let found = false;
    for(var i=0;i<global.CNF.net.connections.outBound.length;i++) {
        if(node.id == global.CNF.net.connections.outBound[i].id) {
            found = true;
            return found;
        }
    }
    for(var i=0;i<global.CNF.net.connections.inBound.length;i++) {
        if(node.id == global.CNF.net.connections.inBound[i].id) {
            found = true;
            return found;
        }
    }
    return found;
}
model.isNodeAlreadyConnected = isNodeAlreadyConnected;

module.exports = model;