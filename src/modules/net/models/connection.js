/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/5/10
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */
const net = require('net');
const { format } = require('path');
const print = global.CNF.utils.print;
const Error = global.CNF.utils.Error;

const TcpShake = require(`${__dirname}/TcpShake.js`);
const TcpShakeBack = require(`${__dirname}/TcpShakeBack.js`);
let model = {};
let CONFIG = {
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

        temp : [],

        /**
         * 这个字段用于处理packet断包问题，用socket的id作为唯一标识索引。这个缓存需要重启节点才能清空
         */
        socketPacketCache : {},
    };

    global.CNF.netData.connections = globalConnection;

    /**
     * 配置初始化
     */
    if (global.CNF.CONFIG.net.MAX_INBOUND != undefined) {
        CONFIG.MAX_INBOUND = global.CNF.CONFIG.net.MAX_INBOUND;
    }
    if (global.CNF.CONFIG.net.MAX_OUTBOUND != undefined) {
        CONFIG.MAX_OUTBOUND = global.CNF.CONFIG.net.MAX_OUTBOUND;
    }
    if (global.CNF.CONFIG.net.localhost != undefined) {
        CONFIG.HOST = global.CNF.CONFIG.net.localhost;
    }

    /**
     * 服务端身份的SOCKET初始化
     */
    let serverSocket = net.createServer(param.callbackFunc.onConnect);
    // serverSocket.listen(global.CNF.CONFIG.net.connectionTcpServerPort, global.CNF.CONFIG.net.localhost || CONFIG.HOST);
    serverSocket.listen(global.CNF.CONFIG.net.connectionTcpServerPort);
    global.CNF.netData.serverSocket = serverSocket;
    print.info(`Node listen at ${global.CNF.CONFIG.net.localhost || CONFIG.HOST}:${global.CNF.CONFIG.net.connectionTcpServerPort}`);
}
model.build = build;

/**
 * 数据包发送之前需要整理成协议。
 * @param {JSON string} jsonData 数据包
 */
let formatPacket = function (jsonData){
    let now = +new Date();

    // 先对jsondata做base64编码，防止传输过程中出问题
    jsonData = Buffer.from(jsonData).toString('base64');

    // 数据包主内容都放这里。
    let content = `ts:${now};nodeid:${global.CNF.netData.nodeId};content:${jsonData}`;
    
    // 40位字符串
    let hash = global.CNF.utils.sign.hash(content);

    // 最后通过content-length字段切割整个段的内容
    let packet = `hash:${hash};content-length:${content.length};${content}`;
    return packet;
}
model.formatPacket = formatPacket;

/**
 * 把socket数据转换成业务可读的JSON数据。
 * @param {binary} socketData socket接口收到的数据
 */
let reFormatPacket = function(socket, socketData) {
    // console.log('re formatData')
    let packets = [];
    socketData = socketData.toString();

    let tempData = socketData; // 创建临时变量，保留原始数据。

    let parsePacket = function(packetData, _socket) {
        let result = {
            packets : []
        }
        let originPacketData = packetData;
        // 用 "hash:" 来切割整个数据包
        packetData = packetData.split('hash:'); // TODO 正则匹配协议
        packetData.shift(); // 去掉第一个空的部分。
        
        // 处理多个数据包
        for(var i=0;i<packetData.length;i++) {
            let data = {};
            data.hash = packetData[i].substring(0, packetData[i].indexOf(';')); // 先把hash取出来，然后去掉这个部分;
            packetData[i] = packetData[i].substring(packetData[i].indexOf(';') + 1) ;

            // 接下来处理内容长度，判断是否断包。断包的话
            data.contentLength = packetData[i].substring(packetData[i].indexOf(':') + 1, packetData[i].indexOf(';'));
            data.contentLength = parseInt(data.contentLength);
            
            packetData[i] = packetData[i].substring(packetData[i].indexOf(';') + 1); // 剩余的协议内容。包括时间戳、nodeid、主体数据等

            // 断包，但带了头部的数据包
            if (packetData[i].length < data.contentLength) {
                global.CNF.netData.connections.socketPacketCache[_socket.id] = originPacketData; // 把整个数据包给它。
                continue;
            }

            // 正常包
            if (packetData[i].length == data.contentLength) {
                delete global.CNF.netData.connections.socketPacketCache[_socket.id];
                let temp = packetData[i].split(';');
                for(var k=0;k<temp.length;k++) {
                    let kv = temp[k].split(':');
                    data[kv[0]] = kv[1];
                }
                result.packets.push(data);
                continue;
            }

            if (packetData[i].length > data.contentLength) {
                print.error("数据包长度异常，已丢包");
                continue ;
            }
        }

        return result;
    }

    // 头部正常的情况
    if (tempData.indexOf('hash:') == 0) {
        let result = parsePacket(tempData, socket);
        for(var i=0;i<result.packets.length;i++) {
            packets.push(result.packets[i]);
        }
    }

    // 头部信息不正常的，一律当作断包处理。
    if (tempData.indexOf('hash:') != 0) {
        // 头部断包，而且没有缓存，就扔掉。
        if (global.CNF.netData.connections.socketPacketCache[socket.id] == undefined) {
            return packets;
        }

        // 直接接上它
        global.CNF.netData.connections.socketPacketCache[socket.id] += tempData;
        let result = parsePacket(global.CNF.netData.connections.socketPacketCache[socket.id], socket);
        for(var i=0;i<result.packets.length;i++) {
            packets.push(result.packets[i]);
        }
    }

    for(var i=0;i<packets.length;i++) {
        packets[i].content = Buffer.from(packets[i].content, 'base64').toString();
    }

    if (packets.length > 1) {
        print.warn("出现粘包情况");
    }

    if (packets.length == 0) {
        print.warn("出现断包情况");
    }

    return packets;
}
model.reFormatPacket = reFormatPacket;

/**
 * 尝试对一个节点发起连接
 */
function doConnect (node, callbackFunc) {
    return new Promise(resolve=>{
        let socket = new net.Socket();
        socket.setEncoding('utf8');
        let isConn = false;
        // console.log('connecting');
        // console.log(node);
        socket = net.connect(node.tcpport, node.ip, function(){
            // socket.on('error', async function(e) {
            //     await callbackFunc.onError(e, socket);
            // })

            // 给socket一个本地唯一标识
            socket.id = global.CNF.utils.sign.hash(global.CNF.utils.sign.genKeys().publicKey);

            socket.on('data', async function(data){
                await callbackFunc.onMessage(data, socket);
            });
            // print.info('out bound connected: ' + node.nodeId);
            isConn = true;
            resolve(socket);
        });
        socket.on('error', async function(e){
            if(!isConn) {
                // 直接就是连不上这个死节点。不管他就行了
                // print.error('on connecting error');
                resolve();
                return ;
            }
            print.error('conn lost');
            // console.log(e);
            await callbackFunc.onError(e, socket);
        })
    })
}
let tryOutBoundConnect = async function(node, callbackFunc){
    if(global.CNF.netData.connections.outBound.length >= CONFIG.MAX_OUTBOUND) {
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
    // 格式化成规范协议
    let sendData = formatPacket(pack.data);
    socket.write(sendData);
    return ;
}
model.tcpShake = tcpShake;

/**
 * 别人发shake, 你要shakeBack
 */
let tcpShakeBack = async function(socket) {
    let pack = new TcpShakeBack();
    // 格式化成规范协议
    let sendData = formatPacket(pack.data);
    socket.write(sendData);
    return ;
}
model.tcpShakeBack = tcpShakeBack;

/**
 * 检查需要连接的这个节点是否在连接池里
 */
let isNodeAlreadyConnected = async function(node){
    let found = false;
    for(var i=0;i<global.CNF.netData.connections.outBound.length;i++) {
        if(node.nodeId == global.CNF.netData.connections.outBound[i].node.nodeId) {
            found = true;
            return found;
        }
    }
    for(var i=0;i<global.CNF.netData.connections.inBound.length;i++) {
        if(node.nodeId == global.CNF.netData.connections.inBound[i].node.nodeId) {
            found = true;
            return found;
        }
    }
    
    // 正在尝试进行连接的node也要检测一下, 人家正在连接, 就不要再连人家了.
    for(var i=0;i<global.CNF.netData.buckets.trying.length;i++) {
        if(node.nodeId == global.CNF.netData.buckets.trying[i].nodeId) {
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
    for(var i=0;i<global.CNF.netData.connections.outBound.length;i++) {
        if(socket == global.CNF.netData.connections.outBound[i].socket) {
            found = true;
            return found;
        }
    }
    for(var i=0;i<global.CNF.netData.connections.inBound.length;i++) {
        if(socket == global.CNF.netData.connections.inBound[i].socket) {
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
    if(global.CNF.netData.msgPool.length >= CONFIG.MSG_POOL_LENGTH) {
        return ;
    }
    global.CNF.netData.msgPool.push(data);
    return ;
}
model.pushMsgPool = pushMsgPool;

/**
 * 从消息池里面拿一条消息出来
 */
let getMsgPool = async function(){
    // todo 先检查是否在Inbound和outBound的节点,不在的话,不要拿出来.
    let msg = global.CNF.netData.msgPool.shift();
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
    if(global.CNF.netData.connections.inBound.length >= CONFIG.MAX_INBOUND) {
        // print.error("full!!")
        return {
            status : "full"
        };
    }
    global.CNF.netData.connections.inBound.push({
        node : node,
        socket: socket
    });
    return {
        status : "ok"
    }
}
model.pushInBoundConnection = pushInBoundConnection;

let pushOutBoundConnection = async function(socket, node) {
    if(global.CNF.netData.connections.outBound.length >= CONFIG.MAX_OUTBOUND) {
        return {
            status : "full"
        };
    }
    global.CNF.netData.connections.outBound.push({
        node : node,
        socket: socket
    });
    return {
        status : "ok"
    }
}
model.pushOutBoundConnection = pushOutBoundConnection;

/**
 * 所有socket连接成功后,都丢进来这个临时socket队列中.业务握手完成后才放进inbound outbound队列中
 * 不然inBound连接没有node消息..
 * conn : {node, socket},其中node可能是undefined,这时候是需要tcpShake,让那边反馈node信息的.
 * TODO: 在这里做一下ip&端口排重
 */
let pushTempConnection = async function(socket, node) {
    if(global.CNF.netData.connections.temp.legnth >= CONFIG.MAX_TEMP) {
        return ;
    }
    global.CNF.netData.connections.temp.push({
        node: node,
        socket: socket
    });
    return ;
}
model.pushTempConnection = pushTempConnection;

/**
 * 当连接断开时，需要把inBound outBound的对应socket删除。
 */
let deleteSocket = async function(socket) {
    for(var i=0;i<global.CNF.netData.connections.outBound.length;i++) {
        if(socket == global.CNF.netData.connections.outBound[i].socket) {
            let conn = global.CNF.netData.connections.outBound.splice(i, 1)[0];
            return conn.node;
        }
    }

    for(var i=0;i<global.CNF.netData.connections.inBound.length;i++) {
        if(socket == global.CNF.netData.connections.inBound[i].socket) {
            let conn = global.CNF.netData.connections.inBound.splice(i, 1)[0];
            return conn.node;
        }
    }

    for(var i=0;i<global.CNF.netData.connections.temp.length;i++) {
        if(socket == global.CNF.netData.connections.temp[i].socket) {
            let conn = global.CNF.netData.connections.temp.splice(i, 1)[0];
            return conn.node;
        }
    }

}
model.deleteSocket = deleteSocket;

let doSocketDestroy = async function(socket) {
    await deleteSocket(socket);
    socket.destroy();
}
model.doSocketDestroy = doSocketDestroy;

/**
 * 握手完成的操作:
 * 1: 检查socket是否在temp桶里面
 * 2: 检查这个node是不是已经连接好了, 如果连接好了, 就不要放进去了
 * 3: 取出来, 标注Node信息 
 * 4: 放进对应的桶里(fromType)
 */
let finishTcpShake = async function(socket, node, fromType) {
    let targetSocket = undefined;
    for(var i=0;i<global.CNF.netData.connections.temp.length;i++) {
        if(global.CNF.netData.connections.temp[i].socket == socket) {
            targetSocket = global.CNF.netData.connections.temp.splice(i, 1);
            break;
        }
    }
    if(targetSocket == undefined) {
        throw new Error(5000);
    }

    /**
     * 如果这个nodeId已经在inBound outBound, 或者outBoundTrying里面了, 就断掉8
     * 断掉也要通知对方，对方需要把这个socket从connections里面删除
     */
    for(var i=0;i<global.CNF.netData.connections.inBound.length;i++) {
        if(global.CNF.netData.connections.inBound[i].node.nodeId == node.nodeId) {
            return {
                status : "alreadyConnected"
            };
        }
    }
    for(var i=0;i<global.CNF.netData.connections.outBound.length;i++) {
        if(global.CNF.netData.connections.outBound[i].node.nodeId == node.nodeId) {
            return {
                status : "alreadyConnected"
            };
        }
    }

    // TODO 如果加不进去, 就把这个socket断掉
    if(fromType == 'inBoundNodeMsg') {
        let result = await pushInBoundConnection(socket, node);
        if (result.status == "full") {
            return result;
        }
    }
    if(fromType == 'outBoundNodeMsg') {
        let result = await pushOutBoundConnection(socket, node);
        if (result.status == "full") {
            return result;
        }
    }
    return {
        status : "ok"
    }
}
model.finishTcpShake = finishTcpShake;

/**
 * 广播BUSS消息
 */
let brocast = async function(data){
    // 格式化成规范协议
    data = formatPacket(data);
    for(var i=0;i<global.CNF.netData.connections.inBound.length;i++) {
        try{
            global.CNF.netData.connections.inBound[i].socket.write(data);
        }catch(e) {
            console.log(e);
            // 不处理
        }
    }
    for(var i=0;i<global.CNF.netData.connections.outBound.length;i++) {
        try{
            global.CNF.netData.connections.outBound[i].socket.write(data);
        }catch(e) {
            console.log(e);
            // 不处理
        }
    }
    // console.log('done brocast');
}
model.brocast = brocast;

/**
 * 发送数据给一个指定的socket，外面不能随便调用，所有发送接口都需要在这个模块里面调用
 */
let sendData = async function(socket, data) {
    data = formatPacket(data);
    socket.write(data);
    return ;
}
model.sendData = sendData;

// 通过nodeId获得连接对象
let getConnectionByNodeId = async function(nodeId) {
    for(var i=0;i<global.CNF.netData.connections.inBound.length;i++) {
        if (nodeId == global.CNF.netData.connections.inBound[i].node.nodeId) {
            return global.CNF.netData.connections.inBound[i];
        }
    }

    for(var i=0;i<global.CNF.netData.connections.outBound.length;i++) {
        if (nodeId == global.CNF.netData.connections.outBound[i].node.nodeId) {
            return global.CNF.netData.connections.outBound[i];
        }
    }

    return undefined;
}
model.getConnectionByNodeId = getConnectionByNodeId;

module.exports = model;