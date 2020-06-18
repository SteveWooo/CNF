/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/5/29
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 * 这个模块主要是网络模块的内部活动调用。
 */
const print = require(`${__dirname}/../../utils/print`);
const Error = require(`${__dirname}/../../utils/Error`);
const sign = require(`${__dirname}/../utils/sign`);
const net = require('net');
const dgram = require('dgram');
// 内部函数在这里为主
let model = {
    // 子对象
    bucket : require(`${__dirname}/bucket`),
    connection : require(`${__dirname}/connection`),
    discover : require(`${__dirname}/discover`),

    // 子对象类
    Node : require(`${__dirname}/Node`)
}

/**
 * 接受TCP数据的入口模块.
 */
let receiveTcpMsgModel = {
    // 无论如何,连接成功后第一件事情都要和对方做tcpShake, 收到shake, 要shakeBack
    events : {
        // 我主动连接别人的话, 那我只能收到shakeBack
        shakeBackEvent : async function(socket, data, fromType) {
            // console.log('get shake back');
            data.msg = JSON.parse(data.msg);
            let node = new model.Node(data.msg.from);
            // 只把主动连接的节点放tried, 被动链接的不放
            if(fromType == 'outBoundNodeMsg') {
                await model.connection.finishTcpShake(socket, node, fromType);
                await model.bucket.addTryingNodeToTried(node);
            }
        },
        // 别人连接完我之后, 第一时间就是给我发shake. 那么我这个时候就需要把这个socket放到inBound里面了.
        shakeEvent : async function(socket, data, fromType){
            // console.log('get shake');
            data.msg = JSON.parse(data.msg);
            let node = new model.Node(data.msg.from);
            // 把节点从tempConnection放到inBound
            if(fromType == 'inBoundNodeMsg') {
                await model.connection.finishTcpShake(socket, node, fromType);
            }

            await model.connection.tcpShakeBack(socket);
        },
        bussEvent : async function(socket, data, fromType) {
            // console.log('get buss')
            // 先检查在不在inBound和outBound桶里, 不在的话, 就丢掉. 只有合法的节点才能发buss消息
            if(!(await model.connection.isAlreadyTcpShake(socket))) {
                return ;
            }
            await model.connection.pushMsgPool({
                fromType : fromType,
                socket : socket,
                msg : data
            });
        }
    },

    // 入口
    onMessage : async function(socket, data, fromType) {
        try{
            data = JSON.parse(data.toString());
        }catch(e) {
            throw Error(6001, 'cnfNet.js receiveTcpMsgModel.onMessage');
        }
        if(!(data.event in receiveTcpMsgModel.events)) {
            return ;
        }
        await receiveTcpMsgModel.events[data.event](socket, data, fromType);
    }
}

/**
 * 节点的被链接渠道主要在这里实现。——被动连接渠道
 * 节点被连接渠道的目的是填充connection.inBound
 */
let nodeServerModel = {
    isConnecting : false,
    // 被连接的时候，就会触发这个函数，参数socket是别人的socket，需要放到inBound里面
    onConnect : async function(socket){
        if(nodeServerModel.isConnecting === true) {
            return ;
        }
        nodeServerModel.isConnecting = true;
        print.info(`Was connected by ${socket.remoteAddress}:${socket.remotePort}`);

        // 有人来连接,就扔进temp先
        await model.connection.pushTempConnection(socket);

        socket.on('data', async function(data){
            let result = await receiveTcpMsgModel.onMessage(socket, data, 'inBoundNodeMsg');
            return ;
        })
        socket.on('error', async function(e) {
            let node = await model.connection.deleteSocket(socket);
            print.info(`${node != undefined ? node.nodeId : 'unknow'} has disconneced.`);
        })

        nodeServerModel.isConnecting = false;
        return ;
    },

    // 初始化都是为了数据结构
    build : async function(){
        await model.connection.build({
            callbackFunc : {
                onConnect : nodeServerModel.onConnect
            }
        })
        return ;
    }
}

/**
 * 节点连接服务主要在这里实现。——主动连接渠道
 * 节点连接服务的目的是从bucket中寻找节点出来进行连接，从而填充outBound连接池
 */
let findNodeModel = {
    isFinding : false, // 锁

    onMessage : async function(data, socket) {
        let result = await receiveTcpMsgModel.onMessage(socket, data, 'outBoundNodeMsg');
        return ;
    },

    onError : async function(e, socket) {
        let node = await model.connection.deleteSocket(socket);
        print.info(`${node != undefined ? node.nodeId : 'unknow'} has disconneced.`);
    },
    /**
     * 找节点工作为：
     * p
     * 1、随机从桶里要个节点出来
     * 2、连接完成。（成功或者失败都算连接完成）
     * v
     */
    doFindNode : async function(){
        findNodeModel.isFinding = true;
        let Config = global.CNF.CONFIG.NET;
        
        // 从桶里找
        let bucketName = Math.random() > 0.5 ? 'tried' : 'new';
        let node = await model.bucket.getNodeFromBucket(bucketName);

        // 说明桶里没东西
        if(node === null) {
            findNodeModel.isFinding = false;
            return ;
        }

        // 如果这个节点在连接池的话，直接跳过
        if((await model.connection.isNodeAlreadyConnected(node)) == true) {
            // console.log('already conn:', node.nodeId);
            findNodeModel.isFinding = false;
            return ;
        }

        // 尝试连接这个幸运儿节点,然后加入全局
        let socket = await model.connection.tryOutBoundConnect(node, {
            onMessage : findNodeModel.onMessage,
            onError : findNodeModel.onError
        });
        // 是undefined就说明socket创建失败
        if(socket != undefined) {
            // 先扔进temp里面, 等对面来确认了, 再扔进对应的Bound里面
            await model.connection.pushTempConnection(socket, node);
            // 尝试完就扔tryingNode里面
            await model.bucket.tryConnectNode(node);
            // 然后马上给对方发tcpshake包,表明自己的nodeId
            await model.connection.tcpShake(socket);
        }

        findNodeModel.isFinding = false;
    },
    findNodeJob : async function(){
        setInterval(async function(){
            // console.log(global.CNF.net.buckets)
            if(findNodeModel.isFinding == true) {
                return ;
            }
            await findNodeModel.doFindNode();
        }, 1000);
        return ;
    }
}

/**
 * 节点发现服务在这里实现
 * 节点发现服务的目的是填充bucket
 */
let nodeDiscoverModel = {
    isDetecting : false,
    /**
     * 无论是主动ping别人还是被别人ping，都要上锁。节点发现只能一个一个进
     */
    // 主动discover
    detect : async function(){
        // console.log(global.CNF.net.buckets.new[0]);
        let node = await model.discover.getNeighbor();
        if(node == undefined) {
            return ;
        }
        if(await model.bucket.isNodeAlreadyInBucket(node)) {
            return ;
        }
        if(await model.connection.isNodeAlreadyConnected(node)) {
            return ;
        }
        // console.log('shake:');
        // console.log(node);
        await model.discover.doShake(node, model.discover.CONFIG.PING_TYPE);
        return ;
    },
    // 发起主动discover
    startDetect : async function(){
        // 获取一个邻居，然后ping他
        setInterval(async function(){
            if(nodeDiscoverModel.isDetecting === true) {
                return ;
            }
            nodeDiscoverModel.isDetecting = true;
            await nodeDiscoverModel.detect();
            nodeDiscoverModel.isDetecting = false;
        }, 1100);
        return ;
    },

    // 被动discovered
    onMessage : async function(message, remote){
        // console.log(`receive from:`);
        // console.log(remote);
        if(nodeDiscoverModel.isDetecting === true) {
            return ;
        }
        try{
            message = JSON.parse(message);
            message.msg = JSON.parse(message.msg);
        }catch(e) {
            throw Error(6001, 'cnfNet.js nodeDiscovermodel.onMessage');
        }
        nodeDiscoverModel.isDetecting = true;
        // TODO: 检测协议合法性。

        // 这里识别包类型
        if(message.msg.type == model.discover.CONFIG.PING_TYPE) {
            let result = await model.discover.receiveNodePing(message, remote);
            // 直接回pong的
            if(result.doShakeType == model.discover.CONFIG.PONG_TYPE) {
                await model.discover.doShake(result.node, result.doShakeType);
            }

            // 回完PONG后回PING的。做这个pingpong应答的目的是给那些自己找上门的节点一个建交机会。
            if(result.doShakeType == model.discover.CONFIG.PONGPING_TYPE) {
                // 先来个pong，礼貌礼貌
                await model.discover.doShake(result.node, model.discover.CONFIG.PONG_TYPE);

                // 如果已经在桶里，就别理它了。
                if(!(await model.bucket.isNodeAlreadyInBucket(result.node))) {
                    await model.discover.doShake(result.node, model.discover.CONFIG.PING_TYPE);
                }
            }
        }
        if(message.msg.type == model.discover.CONFIG.PONG_TYPE) {
            let result = await model.discover.receiveNodePong(message, remote);
            // 回来的result满足了握手流程的，入桶
            if(result.storageBucket == true) {
                await model.bucket.addNodeToNew(result.node);
                await model.discover.deleteNeighbor(result.node);
            }
        }

        nodeDiscoverModel.isDetecting = false;
        return ;
    },
    onListening : async function(){
        print.info(`Discover service is listening at: ${global.CNF.CONFIG.net.discoverUdpPort}`);
        return ;
    },

    // todo 踢掉断开连接的socket
    onError : async function(e) {
        // console.log(e);
        return ;
    },

    build : async function(){
        // 初始化全局数据结构，初始化被人发现的udp socket
        await model.discover.build({
            callbackFunc : {
                message : nodeDiscoverModel.onMessage,
                listening : nodeDiscoverModel.onListening,
                error : nodeDiscoverModel.onError,
            }
        });
        return ;
    }
}

// 给对象用的对外handle
let handle = function(){
    return {
        msg : {
            /**
             * 因为要注册消息回调，所以在这个函数初始化服务端socket，并设置到全局
             */
            registerMsgEvent : async function(param){
                if((typeof param.netCallback) !== 'function') {
                    throw Error(5004, 'netCallback 参数错误');
                }
                // let serverSocket = await nodeServerModel.initServer({
                //     port : global.CNF.CONFIG.net.connectionTcpServerPort,
                //     netCallback : param.netCallback
                // });
                // global.CNF.net.serverSocket = serverSocket;
                
                // 定期捞msgPool里面的东西出来回调给业务方。
                setInterval(async function(){
                    let msg = await model.connection.getMsgPool();
                    if(msg !== undefined) {
                        await param.netCallback({
                            socket : msg.socket,
                            msg : msg.msg
                        });
                    }
                }, 16);
                return ;
            },

            // 广播一段bussEvent消息
            brocast : async function(msg){
                let data = {
                    event : 'bussEvent',
                    msg : msg
                }
                data = JSON.stringify(data);
                await model.connection.brocast(data);
            },

            send : async function(socket, msg) {
                let data = {
                    event : 'bussEvent',
                    msg : msg
                }
                data = JSON.stringify(data);
                socket.write(data);
            }
        },
        node : {
            /**
             * 节点初始化入口，由于配置都存全局，所以不需要传什么参数。
             * 节点初始化的目的是填桶，填桶的目的是给findNode用，findNode的目的是填连接
             */
            startup : async function(param) {
                print.info(`Node starting ...`);
                // 启动节点寻找服务，
                await nodeDiscoverModel.startDetect();
                // 从bucket中找人连接
                await findNodeModel.findNodeJob();
                print.info(`Node started ! `);
                return ;
            }
        }
    }
}
model.handle = handle;

function getLocalNodeId(){
    let key = {
        privateKey : global.CNF.CONFIG.net.localPrivateKey,
        publicKey : '',
    }
    if(key.privateKey == undefined || key.privateKey.length !== 64) {
        key = sign.genKeys();
    } else {
        key.publicKey = sign.getPublicKey(key.privateKey);
    }
    return key.publicKey;
}
/**
 * 网络服务的基本初始化入口，比如对桶的初始化
 */
let build = async function(){
    // NodeId的生成，核心逻辑，不分装了。
    global.CNF.net.nodeId = getLocalNodeId();
    print.info(`NodeId: ${global.CNF.net.nodeId}`);

    // 配合节点发现服务的bucket
    await model.bucket.build();

    // 主要是udp的连接
    await nodeDiscoverModel.build();
    // 主要是tcp那边的连接
    await nodeServerModel.build();

    // 先加几个憨憨节点进去测试
    // let node1 = new model.Node({
    //     nodeId : 'hahahaha1',
    //     ip : '127.0.0.1',
    //     tcpport : 30303,
    //     udpport : 30303
    // })
    // let node2 = new model.Node({
    //     nodeId : 'hahahaha2',
    //     ip : '127.0.0.1',
    //     tcpport : 30304,
    //     udpport : 30304
    // })
    // await model.bucket.addNodeToNew(node1);
    // await model.bucket.addNodeToTried(node2);
}
model.build = build;

module.exports = model;