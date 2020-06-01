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
        socket.on('data', async function(data){
            data = data.toString();
            /**
             * TODO 先检查包是否符合CNF通讯协议，然后把data封装成用户客制化可读模式，包括信息来源，具体信息等
             */
            await model.connection.pushInBoundConnection(socket, data.nodeId);
            
            // 检查完毕后，塞入消息池
            await model.connection.pushMsgPool(msg);
        })

        // todo 检查inBound是否满了，满了就踢掉它

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

    /**
     * 找节点工作为：
     * p
     * 1、随机从桶里要个节点出来
     * 2、连接完成。（成功或者失败都算连接完成）
     * v
     */
    doFindNode : async function(){
        console.log('finding connection')
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
            findNodeModel.isFinding = false;
            return ;
        }

        // 尝试连接这个幸运儿节点
        print.info('connecting');
        console.log(node);
        await model.connection.tryOutBoundConnect(node);

        findNodeModel.isFinding = false;
    },
    findNodeJob : async function(){
        setInterval(async function(){
            if(findNodeModel.isFinding == true) {
                console.log('connection locked')
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
        if(nodeDiscoverModel.isDetecting === true) {
            return ;
        }
        try{
            message = JSON.parse(message);
            message.msg = JSON.parse(message.msg);
        }catch(e) {
            throw Error(6001)
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
    onError : async function(e) {
        console.log(e);
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
                        await param.netCallback(msg);
                    }
                }, 16);
                return ;
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