/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/5/10
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */
const net = require('net');
const print = require(`${__dirname}/../../utils/print`);
const Error = require(`${__dirname}/../../utils/Error`);
const TcpShake = require(`${__dirname}/TcpShake.js`);
const TcpShakeBack = require(`${__dirname}/TcpShakeBack.js`);
let model = {};
const CONFIG = {
    MAX_INBOUND : 117,
    MAX_OUTBOUND : 8,
    MAX_TEMP : 1024,
    HOST : '127.0.0.1',
    MSG_POOL_LENGTH : 1024
}
model.CONFIG = CONFIG;

let build = async function(param){
    let globalConnection = {
        inBound : [],
        outBound : [],

        temp : []
    };

    global.CNF.net.connections = globalConnection;

    /**
     * 服务端身份的SOCKET初始化
     */
    let serverSocket = net.createServer(param.callbackFunc.onConnect);
    serverSocket.listen(global.CNF.CONFIG.net.connectionTcpServerPort, CONFIG.HOST);
    global.CNF.net.serverSocket = serverSocket;
    print.info(`Node listen at ${CONFIG.HOST}:${global.CNF.CONFIG.net.connectionTcpServerPort}`);
}
model.build = build;

/**
 * 尝试对一个节点发起连接
 */
function doConnect (node, callbackFunc) {
    return new Promise(resolve=>{
        let socket = new net.Socket();
        socket.setEncoding('utf8');
        socket = net.connect(node.tcpport, node.ip, function(){
            print.info('out bound connected: ' + node.nodeId);
        });
        socket.on('error', async function(e) {
            // todo
        })
        socket.on('data', async function(data){
            await callbackFunc.onMessage(data, socket);
        });
        resolve(socket);
    })
}
let tryOutBoundConnect = async function(node, callbackFunc){
    if(global.CNF.net.connections.outBound.length >= CONFIG.MAX_OUTBOUND) {
        return ;
    }
    // 这么连接别的节点就行了。
    let socket = await doConnect(node, callbackFunc);
    return socket;
}
model.tryOutBoundConnect = tryOutBoundConnect;

/**
 * 向参数的socket发送tcp握手包
 */
let tcpShake = async function(socket){
    let pack = new TcpShake();
    socket.write(pack.data);
    return ;
}
model.tcpShake = tcpShake;

/**
 * 别人发shake, 你要shakeBack
 */
let tcpShakeBack = async function(socket) {
    let pack = new TcpShakeBack();
    socket.write(pack.data);
    return ;
}
model.tcpShakeBack = tcpShakeBack;

/**
 * 检查需要连接的这个节点是否在连接池里
 */
let isNodeAlreadyConnected = async function(node){
    let found = false;
    for(var i=0;i<global.CNF.net.connections.outBound.length;i++) {
        if(node.nodeId == global.CNF.net.connections.outBound[i].node.nodeId) {
            found = true;
            return found;
        }
    }
    for(var i=0;i<global.CNF.net.connections.inBound.length;i++) {
        if(node.nodeId == global.CNF.net.connections.inBound[i].node.nodeId) {
            found = true;
            return found;
        }
    }
    
    // 正在尝试进行连接的node也要检测一下, 人家正在连接, 就不要再连人家了.
    for(var i=0;i<global.CNF.net.buckets.trying.length;i++) {
        if(node.nodeId == global.CNF.net.buckets.trying[i].nodeId) {
            found = true;
            return found;
        }
    }

    return found;
}
model.isNodeAlreadyConnected = isNodeAlreadyConnected;

/**
 * 检查这个socekt是否已经握手验证过
 */
let isAlreadyTcpShake = async function(socket) {
    let found = false;
    for(var i=0;i<global.CNF.net.connections.outBound.length;i++) {
        if(socket == global.CNF.net.connections.outBound[i].socket) {
            found = true;
            return found;
        }
    }
    for(var i=0;i<global.CNF.net.connections.inBound.length;i++) {
        if(socket == global.CNF.net.connections.inBound[i].socket) {
            found = true;
            return found;
        }
    }
    // console.log('not already conn')
    return found;
}
model.isAlreadyTcpShake = isAlreadyTcpShake;

/**
 * 把消息压入消息池的操作
 */
let pushMsgPool = async function(data){
    // 满了就不放了
    if(global.CNF.net.msgPool.length >= CONFIG.MSG_POOL_LENGTH) {
        return ;
    }
    global.CNF.net.msgPool.push(data);
    return ;
}
model.pushMsgPool = pushMsgPool;

/**
 * 从消息池里面拿一条消息出来
 */
let getMsgPool = async function(){
    // todo 先检查是否在Inbound和outBound的节点,不在的话,不要拿出来.
    let msg = global.CNF.net.msgPool.shift();
    if(msg != undefined) {
        // console.log(msg);
    }
    return msg;
}
model.getMsgPool = getMsgPool;

/**
 * 插入被链接的INBOUND OUTBOUND SOCKET
 */
let pushInBoundConnection = async function(socket, node) {
    if(global.CNF.net.connections.inBound.legnth >= CONFIG.MAX_INBOUND) {
        return ;
    }
    global.CNF.net.connections.inBound.push({
        node : node,
        socket: socket
    });
}
model.pushInBoundConnection = pushInBoundConnection;

let pushOutBoundConnection = async function(socket, node) {
    if(global.CNF.net.connections.outBound.legnth >= CONFIG.MAX_OUTBOUND) {
        return ;
    }
    global.CNF.net.connections.outBound.push({
        node : node,
        socket: socket
    });
}
model.pushOutBoundConnection = pushOutBoundConnection;

/**
 * 所有socket连接成功后,都丢进来这个临时socket队列中.业务握手完成后才放进inbound outbound队列中
 * 不然inBound连接没有node消息..
 * conn : {node, socket},其中node可能是undefined,这时候是需要tcpShake,让那边反馈node信息的.
 * TODO: 在这里做一下ip&端口排重
 */
let pushTempConnection = async function(socket, node) {
    if(global.CNF.net.connections.temp.legnth >= CONFIG.MAX_TEMP) {
        return ;
    }
    global.CNF.net.connections.temp.push({
        node: node,
        socket: socket
    });
    return ;
}
model.pushTempConnection = pushTempConnection;

/**
 * 握手完成的操作:
 * 1: 检查socket是否在temp桶里面
 * 2: 检查这个node是不是已经连接好了, 如果连接好了, 就不要放进去了
 * 3: 取出来, 标注Node信息 
 * 4: 放进对应的桶里(fromType)
 */
let finishTcpShake = async function(socket, node, fromType) {
    let targetSocket = undefined;
    for(var i=0;i<global.CNF.net.connections.temp.length;i++) {
        if(global.CNF.net.connections.temp[i].socket == socket) {
            targetSocket = global.CNF.net.connections.temp.splice(i, 1);
            break;
        }
    }
    if(targetSocket == undefined) {
        throw new Error(5000);
    }

    /**
     * 如果这个nodeId已经在inBound outBound, 或者outBoundTrying里面了, 就断掉8
     * 这是一个锁
     */
    for(var i=0;i<global.CNF.net.connections.inBound.length;i++) {
        if(global.CNF.net.connections.inBound[i].node.nodeId == node.nodeId) {
            socket.destroy();
            return ;
        }
    }
    for(var i=0;i<global.CNF.net.connections.outBound.length;i++) {
        if(global.CNF.net.connections.outBound[i].node.nodeId == node.nodeId) {
            socket.destroy();
            return ;
        }
    }

    // TODO 如果加不进去, 就把这个socket断掉
    if(fromType == 'inBoundNodeMsg') {
        await pushInBoundConnection(socket, node);
    }
    if(fromType == 'outBoundNodeMsg') {
        await pushOutBoundConnection(socket, node);
    }
    
}
model.finishTcpShake = finishTcpShake;

/**
 * 广播BUSS消息
 */
let brocast = async function(data){
    for(var i=0;i<global.CNF.net.connections.inBound.length;i++) {
        global.CNF.net.connections.inBound[i].socket.write(data);
    }
    for(var i=0;i<global.CNF.net.connections.outBound.length;i++) {
        global.CNF.net.connections.outBound[i].socket.write(data);
    }
    // console.log('done brocast');
}
model.brocast = brocast;

module.exports = model;