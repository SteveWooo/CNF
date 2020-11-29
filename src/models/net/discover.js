/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/5/10
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 * 节点发现模块在这里写
 * 节点发现的包数据类型：
 * 1->Ping包，表示试探发现这个节点
 * 3->Neighbor包，别人给你分享节点信息，你先存起来，然后逐个ping，等别人ping回来，就能入桶了。
 */

const dgram = require('dgram');
const print = require(`${__dirname}/../../utils/print`);
const Node = require(`${__dirname}/Node`);
const Shake = require(`${__dirname}/Shake`);
const sign = require(`${__dirname}/../utils/sign`);
let model = {};
const CONFIG = {
    PING_TYPE: 1,
    PONG_TYPE: 2,
    PONGPING_TYPE: 12, // 先回pong，再回ping
    NEIGHBOR_TYPE: 3,

    NEIGHBOR_LENGTH: 1024
}
model.CONFIG = CONFIG;

/**
 * 初始化全局数据结构
 * 初始化socket
 */
let build = async function(param){
    let globalDiscover = {
        udpSocket : undefined,
        /**
         * 放一些正在ping的节点
         * TODO: 定期清理不响应的节点
         */
        doingShake : {},
        neighbor : [],
    };
    // return ;
    globalDiscover.udpSocket = dgram.createSocket('udp4');

    // 注册回调
    for(var i in param.callbackFunc) {
        globalDiscover.udpSocket.on(i, param.callbackFunc[i]);
    }

    // 绑定端口，这里会触发listening回调
    // console.log(`processID: ${process.env.CONFIG_INDEX}`, global.CNF.CONFIG.net.discoverUdpPort);
    globalDiscover.udpSocket.bind({
        address : global.CNF.CONFIG.net.localhost,
        port : global.CNF.CONFIG.net.discoverUdpPort,
        exclusive : true, // 为了在Cluster模块下使用，不然默认是不允许一个进程绑定多个UDP端口的
    });

    global.CNF.netData.discover = globalDiscover;

    // 第一次进来，把配置里面的seed全部加到邻居列表里面。
    let neighbors = global.CNF.CONFIG.net.seed;
    for(var i=0;i<neighbors.length;i++) {
        let node = new Node({
            nodeId : neighbors[i].nodeId,
            ip : neighbors[i].ip,
            tcpport : neighbors[i].tcpport,
            udpport : neighbors[i].udpport
        })
        await addNodeToNeighbor(node);
    }
}
model.build = build;

/**
 * type=1代表主动Ping别人，只有发ack=1的包出去时，才能把node写入doingShake。如果doingShake中已经有，就不要发这个Ping包了。
 * type=2代表应答别人的Ping，别人发来Ping，就一定要发Pong回去。
 */
let shakeNode = function(shakeData) {
    return new Promise(resolve=>{
        global.CNF.netData.discover.udpSocket.send(shakeData.data, shakeData.node.udpport, shakeData.node.ip, (err)=>{
            resolve();
        })
    })
}
let doShake = async function(node, type) {
    // print.info(`doing: ${type}`);
    // 拦一栏
    if(type != CONFIG.PING_TYPE && type != CONFIG.PONG_TYPE) {
        print.error(`discover.js doShake: node shake type`)
        return ;
    }
    let shakeData = new Shake(node, type);
    await shakeNode(shakeData);
    if(type == 1) {
        global.CNF.netData.discover.doingShake[node.nodeId] = shakeData;
    }
}
model.doShake = doShake;

/**
 * 收到握手请求。TODO，自己发给自己的数据包就别处理了
 * @param shakePack 数据包
 * @return.node 如果收到的是pong包，而且我们的doingShake中有这个node，就要把它从doingShake中删除，然后返回去
 * @return.doShakeType 需要回的包类型。如果不需要回复，就是一个null
 * @return.storageBucket 需要存的桶名字。如果不需要存，就是一个null
 */
let receiveNodePing = async function(message, remote) {
    // console.log('receive ping')
    let nodeId = sign.recover(message.signature, message.recid, JSON.stringify(message.msg));
    // let ip = message.msg.from.ip;
    let ip = remote.address;
    // 双端口统一，这样打洞的时候方便
    // let udpport = message.msg.from.udpport;
    // let tcpport = message.msg.from.tcpport;
    let udpport = remote.port;
    let tcpport = remote.port;
    let node = new Node({
        nodeId : nodeId,
        ip : ip,
        udpport : udpport,
        tcpport : tcpport
    })

    if(global.CNF.netData.discover.doingShake[nodeId] != undefined) {
        return {
            node : node,
            doShakeType : CONFIG.PONG_TYPE,
            storageBucket : null
        }
    }

    // 如果已经在doing shake的，也要先回pong，然后再重复回一遍ping，以防对方漏了回pong，或者自己被锁了，也不好说。
    // 总之只要桶里没有这个节点，就不断pong后ping。等别人pong回来了，就可以入桶了。
    if(global.CNF.netData.discover.doingShake[nodeId] == undefined) {
        return {
            node : node,
            doShakeType : CONFIG.PONGPING_TYPE,
            storageBucket : null
        }
    }
}
model.receiveNodePing = receiveNodePing;

/**
 * 收到pong请求后，先看看这个是不是doingShake的，如果是的话，就删掉doingShake，然后返回加入new桶的通知，给cnfNet去把这个节点加入新桶。
 * 如果这个不是doingShake，就不管它了。
 */
let receiveNodePong = async function(message, remote) {
    // console.log('receive pong');
    let nodeId = sign.recover(message.signature, message.recid, JSON.stringify(message.msg));
    // let ip = message.msg.from.ip;
    let ip = remote.address;
    // 双端口统一，这样打洞的时候方便
    // let udpport = message.msg.from.udpport;
    // let tcpport = message.msg.from.tcpport;
    let udpport = remote.port;
    let tcpport = remote.port;

    let node = new Node({
        nodeId : nodeId,
        ip : ip,
        udpport : udpport,
        tcpport : tcpport
    })

    // 完成握手，加桶里
    if(global.CNF.netData.discover.doingShake[nodeId] != undefined) {
        delete global.CNF.netData.discover.doingShake[nodeId];
        return {
            node : node,
            doShakeType : null,
            storageBucket : true
        }
    }

    // 莫名其妙收到的pong，而且不在我们doingShake里面的，不需要理会
    if(global.CNF.netData.discover.doingShake[nodeId] == undefined) {
        return {
            node : node,
            doShakeType : null,
            storageBucket : null
        }
    }
}
model.receiveNodePong = receiveNodePong;

/**
 * 收到别人分享的邻居包
 * 这里要把邻居节点排重加入global.CNF.netData.discover.neighbor里面，需要排重
 */
let receiveNodeNeighbor = async function(message, remote) {
    
}
model.receiveNodeNeighbor = receiveNodeNeighbor;

/**
 * 检查节点是否在邻居，不要重复放进邻居。
 */
let isNodeAlreadyInNeighbor = async function(node) {
    let flag = false;
    for(var i=0;i<global.CNF.netData.discover.neighbor.length;i++) {
        if(node.nodeId == global.CNF.netData.discover.neighbor[i].nodeId) {
            flag = true;
            return flag;
        }
    }
    return flag;
}
model.isNodeAlreadyInNeighbor = isNodeAlreadyInNeighbor;

/**
 * 获取一个邻居节点，本质上这里是获取一个连接任务。
 * 如果邻居列表为空，就找种子列表。
 */
let getNeighbor = async function() {
    let node = undefined;
    // 如果neighbor为空，就给一个随机seed进邻居里
    if (global.CNF.netData.discover.neighbor.length == 0) {
        let index = Math.floor(Math.random() * global.CNF.CONFIG.net.seed.length);
        let seedNode = new Node({
            nodeId : global.CNF.CONFIG.net.seed[index].nodeId,
            ip : global.CNF.CONFIG.net.seed[index].ip,
            udpport : global.CNF.CONFIG.net.seed[index].udpport,
            tcpport : global.CNF.CONFIG.net.seed[index].tcpport
        })
        await addNodeToNeighbor(seedNode);
        
    } else {
        let index = Math.floor(Math.random() * global.CNF.netData.discover.neighbor.length)
        node = global.CNF.netData.discover.neighbor[index];
    }

    return node;
}
model.getNeighbor = getNeighbor;

let deleteNeighbor = async function(node) {
    for(var i=0;i<global.CNF.netData.discover.neighbor.length;i++) {
        if(global.CNF.netData.discover.neighbor[i].nodeId == node.nodeId) {
            global.CNF.netData.discover.neighbor.splice(i, 1);
            i--;
        }
    }
    return ;
}
model.deleteNeighbor = deleteNeighbor;

/**
 * 把节点放入邻居的操作
 */
let addNodeToNeighbor = async function(node) {
    if(global.CNF.netData.discover.neighbor.length >= CONFIG.NEIGHBOR_LENGTH) {
        return ;
    }
    if(await isNodeAlreadyInNeighbor(node)) {
        return ;
    }
    global.CNF.netData.discover.neighbor.push(node);
    return ;
}
model.addNodeToNeighbor = addNodeToNeighbor;

module.exports = model;