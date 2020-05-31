/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/5/10
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */
const net = require('net');
const print = require(`${__dirname}/../../utils/print`);
let model = {};
const CONFIG = {
    MAX_INBOUND : 117,
    MAX_OUTBOUND : 8,
    HOST : '127.0.0.1',
    MSG_POOL_LENGTH : 1024
}
model.CONFIG = CONFIG;

let build = async function(param){
    let globalConnection = {
        inBound : [],
        outBound : []
    };

    global.CNF.net.connections = globalConnection;

    /**
     * 服务端身份的SOCKET初始化
     */
    let serverSocket = net.createServer(param.callbackFunc.onConnect);
    serverSocket.listen(global.CNF.CONFIG.net.tcpport, CONFIG.HOST);
    global.CNF.net.serverSocket = serverSocket;
    print.info(`Node listen at ${CONFIG.HOST}:${global.CNF.CONFIG.net.tcpport}`);
}
model.build = build;

/**
 * 尝试对一个节点发起连接
 */
let tryOutBoundConnect = async function(node){
    if(global.CNF.net.connections.outBound.length >= CONFIG.MAX_OUTBOUND) {
        return ;
    }
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

/**
 * 把消息压入消息池的操作
 */
let pushMsgPool = async function(msg){
    // 满了就不放了
    if(global.CNF.net.msgPool.length >= CONFIG.MSG_POOL_LENGTH) {
        return ;
    }
    global.CNF.net.msgPool.push(msg);
    return ;
}
model.pushMsgPool = pushMsgPool;

/**
 * 从消息池里面拿一条消息出来
 */
let getMsgPool = async function(){
    return global.CNF.net.msgPool.shift();
}
model.getMsgPool = getMsgPool;

/**
 * 插入被链接的INBOUND SOCKET
 */
let pushInBoundConnection = async function(socket, nodeId) {
    if(global.CNF.net.connections.inBound.legnth >= CONFIG.MAX_INBOUND) {
        return ;
    }
    global.CNF.net.connections.inBound.push({
        nodeId : nodeId,
        socket: socket
    });
}
model.pushInBoundConnection = pushInBoundConnection;

module.exports = model;