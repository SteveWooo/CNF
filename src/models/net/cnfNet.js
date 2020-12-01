/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/6/18
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

    brocastPool : require(`${__dirname}/brocastPool`),

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

            // 检查networkid，不允许networkid不一致的节点加入网络
            if (data.msg.from.networkid != global.CNF.CONFIG.net.networkid) {
                await global.CNF.net.msg.socketDestroy(socket, node);
                // print.error("tcp shake中出现networkid不一致的节点");
                return ;
            }

            // 只把主动连接的节点放tried, 被动链接的不放
            if(fromType == 'outBoundNodeMsg') {
                let result = await model.connection.finishTcpShake(socket, node, fromType);
                if (result.status == 'alreadyConnected' || result.status == "full") {
                    await global.CNF.net.msg.socketDestroy(socket, node);
                    // await model.connection.doSocketDestroy(socket);
                    return ;
                }

                await model.bucket.addTryingNodeToTried(node);
            } else {
                print.error("非OutBoudNode发送了TCP shakeEvent")
            }
        },
        /**
         * 别人连接完我之后, 第一时间就是给我发shake. 那么我这个时候就需要把这个socket放到inBound里面了.
         * # 必须先检查我的桶里是否有对方，如果没有，这个连接必须断掉。
         */
        shakeEvent : async function(socket, data, fromType){
            // console.log('get shake');
            data.msg = JSON.parse(data.msg);
            let node = new model.Node(data.msg.from);

            // 检查networkid，不允许networkid不一致的节点加入网络
            if (data.msg.from.networkid != global.CNF.CONFIG.net.networkid) {
                await global.CNF.net.msg.socketDestroy(socket, node);
                // print.error("tcp shake中出现networkid不一致的节点");
                return ;
            }
            
            // 把节点从tempConnection放到inBound
            if(fromType == 'inBoundNodeMsg') {
                // # 检查我的桶里是否有对方，没有的话果断断掉。
                if (!(await model.bucket.isNodeAlreadyInBucket(node))) {
                    print.warn("node not in bucket");
                    await global.CNF.net.msg.socketDestroy(socket, node);
                    // // 同步从bucket.trying中删除这个节点，不然的话会一直卡死在trying中出不来。
                    // await model.bucket.deleteTryingNode(node);
                    // await model.connection.doSocketDestroy(socket);
                    return ;
                }

                let result = await model.connection.finishTcpShake(socket, node, fromType);
                // 如果是双方同时连接，那么晚到的一位兄弟，就要主动断掉自己发起的连接，并通知对方也断掉这个socket。
                if (result.status == 'alreadyConnected'  || result.status == "full") {
                    print.info("node already connected");
                    await global.CNF.net.msg.socketDestroy(socket, node);
                    // // 同步从bucket.trying中删除这个节点，不然的话会一直卡死在trying中出不来。
                    // await model.bucket.deleteTryingNode(node);
                    // await model.connection.doSocketDestroy(socket);
                    return ;
                }

                await model.bucket.addNewNodeToTried(node);
            } else {
                print.error("非InBoudNode发送了TCP shakeEvent")
            }

            await model.connection.tcpShakeBack(socket);
        },
        /**
         * 邻居分享事件
         */
        neighborEvent : async function(socket, data, fromType){
            if (global.CNF.CONFIG.net.neighborReceive != true) {
                return ;
            }
            let neighbors = data.neighbor;
            for(var i=0;i<neighbors.length;i++) {
                let node = new model.Node({
                    nodeId : neighbors[i].nodeId,
                    ip : neighbors[i].ip,
                    tcpport : neighbors[i].tcpport,
                    udpport : neighbors[i].udpport
                })
                // 已经在路由中的不要重复添加
                if (await model.bucket.isNodeAlreadyInBucket(node)) {
                    continue ;
                }
                // 也不要连接自己
                if (node.nodeId == global.CNF.netData.nodeId || 
                        (node.tcpport == global.CNF.CONFIG.net.connectionTcpServerPort && node.udpport == global.CNF.CONFIG.net.discoverUdpPort)) {
                    // console.log("这是自己")
                    continue ;
                }
                await model.discover.addNodeToNeighbor(node);
            }
        },
        socketDestroyEvent : async function(socket, data, fromType){
            let nodeInfo = data.from.nodeInfo;
            if (nodeInfo.nodeId == undefined) {
                return ;
            }
            // 从socket中删除
            await model.connection.doSocketDestroy(socket);

            // 从bucket.trying中删除
            await model.bucket.deleteTryingNode(nodeInfo);

            // 防止是udp握手的异常，把doingShake也删除掉
            // await model.discover.deleteDoingShake(nodeInfo);
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
        },
        brocastEvent : async function(socket, data, fromType) {
            if(!(await model.connection.isAlreadyTcpShake(socket))) {
                return ;
            }

            let now = +new Date()
            // 十分钟之前的数据包不做处理
            if (now - data.originMsg.createAt >= 10 * 60 * 1000) {
                return ;
            }

            // 判断在不在缓存里面，如果在，说明已经转发过，不需要处理了
            if (model.brocastPool.isCached(socket, data, fromType) == true) {
                return ;
            }

            // 让业务读数据
            await model.connection.pushMsgPool({
                fromType : fromType,
                socket : socket,
                msg : data
            });

            // 转发到所有已知节点
            let transData = {
                event : 'brocastEvent',
                // 保留原始信息
                originMsg : data.originMsg,
                // 放置发送方消息
                from : {
                    nodeInfo : {
                        nodeId : global.CNF.netData.nodeId
                    },
                    createAt : now
                },
                hop : data.hop + 1
            }
            transData = JSON.stringify(transData);
            await model.connection.brocast(transData);

            // 放入池子里，下次收到这条信息就不转发了
            model.brocastPool.pushCache(socket, data, fromType);
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
        // if(nodeServerModel.isConnecting === true) {
        //     return ;
        // }
        nodeServerModel.isConnecting = true;
        // print.info(`Was connected by ${socket.remoteAddress}:${socket.remotePort}`);

        // 有人来连接,就扔进temp先
        await model.connection.pushTempConnection(socket);

        socket.on('data', async function(data){
            let result = await receiveTcpMsgModel.onMessage(socket, data, 'inBoundNodeMsg');
            return ;
        })
        socket.on('error', async function(e) {
            console.log(e)
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
        console.log(e)
        let node = await model.connection.deleteSocket(socket);
        print.info(`${node != undefined ? node.nodeId : 'unknow'} has disconneced.`);
    },
    /**
     * 找节点工作为：
     * p
     * 1、随机从桶里要个节点出来
     * 2、连接完成。（成功或者失败都算连接完成）
     * v
     * 对于被连接的：A节点的桶里有B，但是B的桶里没有A，这个时候A主动连接B，B应该断开。#必须双方桶里都有对方，连接才能建立
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

        // 不要连接自己
        if(node.nodeId == global.CNF.CONFIG.net.publicKey) {
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
        } else {
            // print.error(`cnfNet.js findNodeModel.doFineNode: socket创建失败`)
        }

        findNodeModel.isFinding = false;
        return ;
    },
    findNodeJob : async function(){
        setInterval(async function(){
            // console.log(global.CNF.netData.buckets.new[0])
            if(findNodeModel.isFinding == true) {
                return ;
            }
            await findNodeModel.doFindNode();
        }, 500);
        return ;
    },
    doShareNeighbor : async function(){
        // 邻居节点分享开关。
        if (global.CNF.CONFIG.net.neighborShare != true) {
            return ;
        }
        const MAX_NEIGHBOR = 20;
        let neighbors = [];
        // 找邻居，混着tried和new去发
        let triedBk = [];
        let newBk = [];
        for(var i=0;i<global.CNF.netData.buckets.tried.length;i++) {
            for(var k=0;k<global.CNF.netData.buckets.tried[i].length;k++) {
                if(global.CNF.netData.buckets.tried[i][k] == undefined) {
                    continue;
                }
                triedBk.push(global.CNF.netData.buckets.tried[i][k]);
            }
        }
        for(var i=0;i<global.CNF.netData.buckets.new.length;i++) {
            for(var k=0;k<global.CNF.netData.buckets.new[i].length;k++) {
                if(global.CNF.netData.buckets.new[i][k] == undefined) {
                    continue;
                }
                newBk.push(global.CNF.netData.buckets.new[i][k]);
            }
        }
        let allBk = triedBk.concat(newBk);

        // 随机找MAX_NEIGHBOR个邻居进行分享
        while(allBk.length > 0) {
            let index = Math.floor(Math.random() * allBk.length);
            let node = allBk[index];
            allBk.splice(index, 1);
            neighbors.push(node);
            if (neighbors.length >= MAX_NEIGHBOR) {
                break;
            }
        }

        // 发送给邻居
        await global.CNF.net.msg.neighbor({
            neighbor : neighbors
        })

        return ;
    },
    /**
     * 在寻找桶里节点进行连接的同时，还需要把自己的两个桶的节点分享给已连接的节点。
     */
    shareNeighborJob : async function(){
        setInterval(async function(){
            await findNodeModel.doShareNeighbor();
        }, 5000);
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
        // console.log(global.CNF.netData.buckets.new[0]);
        let node = await model.discover.getNeighbor();
        if(node == undefined) {
            return ;
        }
        if(await model.bucket.isNodeAlreadyInBucket(node)) {
            // console.log(`nodeAlreadyInBucket`)
            await model.discover.deleteNeighbor(node);
            return ;
        }
        if(await model.connection.isNodeAlreadyConnected(node)) {
            // console.log(`nodeAlreadyConnect`)
            await model.discover.deleteNeighbor(node);
            return ;
        }
        // console.log('shake:');
        // console.log(node);
        // console.log(`doing shake`)
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
        }, 500);
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
            // console.log(message);
            message.msg = JSON.parse(message.msg);
        }catch(e) {
            throw Error(6001, 'cnfNet.js nodeDiscovermodel.onMessage');
        }
        nodeDiscoverModel.isDetecting = true;
        // TODO: 检测协议合法性。

        // 首先判断newworkid是否一致
        if (message.msg.from.networkid == undefined || message.msg.from.networkid != global.CNF.CONFIG.net.networkid) {
            // print.error("udp发现过程中出现networkid不一致的节点");
            nodeDiscoverModel.isDetecting = false;
            return ;
        }

        // 这里识别包类型
        if(message.msg.type == model.discover.CONFIG.PING_TYPE) {
            let result = await model.discover.receiveNodePing(message, remote);
            // 直接回pong的
            if(result.doShakeType == model.discover.CONFIG.PONG_TYPE) {
                await model.discover.doShake(result.node, model.discover.CONFIG.PONG_TYPE);
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

        // 定时任务，主要用于清理过期缓存，垃圾回收
        setInterval(async function(){
            let now = +new Date();
            for(var shakeJob in global.CNF.netData.discover.doingShake) {
                // 过期的握手缓存需要删除掉
                if (now - global.CNF.netData.discover.doingShake[shakeJob].ts >= 5000) {
                    delete global.CNF.netData.discover.doingShake[shakeJob];
                    // await model.discover.deleteDoingShake(global.CNF.netData.discover.doingShake[shakeJob])
                }
            }
        }, 5000);
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

            // 广播一段bussEvent消息，这是主动发送的广播数据包格式。上面brocastEvent中有被动转发的brocast包格式。
            brocast : async function(msg){
                let now = +new Date();
                let data = {
                    event : 'brocastEvent',
                    // 保留原始信息
                    originMsg : {
                        hash : global.CNF.utils.sign.hash(msg + now),
                        msg : msg,
                        createAt : now,
                        nodeInfo : {
                            nodeId : global.CNF.netData.nodeId
                        }
                    },
                    // 放置发送方消息
                    from : {
                        nodeInfo : {
                            nodeId : global.CNF.netData.nodeId
                        },
                        createAt : now
                    },
                    // 消息包转发跳数，第一个包发出去代表0跳，因为传播了0个节点。
                    hop : 0
                }
                // 放入池子里，下次收到这条信息就不转发了
                model.brocastPool.pushCache(undefined, data, undefined);

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
            },

            neighbor : async function(msg) {
                let data = {
                    event : 'neighborEvent',
                    neighbor : msg.neighbor
                }
                data = JSON.stringify(data);
                await model.connection.brocast(data);
            },

            /**
             * 
             * @param {Socket} socket 目标socket
             * @param {Node} node 目标节点信息（有NodeId即可）
             */
            socketDestroy : async function(socket, node) {
                let now = +new Date();
                let data = {
                    event : 'socketDestroyEvent',
                    from : {
                        nodeInfo : {
                            nodeId : global.CNF.netData.nodeId
                        },
                        createAt : now
                    }
                }
                data = JSON.stringify(data);
                socket.write(data);

                // 同步从bucket.trying中删除这个节点，不然的话会一直卡死在trying中出不来。
                await model.bucket.deleteTryingNode(node);
                await model.connection.doSocketDestroy(socket);
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
                // 同时把自己的桶分享给邻居
                await findNodeModel.shareNeighborJob();
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
    global.CNF.netData.nodeId = getLocalNodeId();
    print.info(`NodeId: ${global.CNF.netData.nodeId}`);

    // 配合节点发现服务的bucket
    await model.bucket.build();

    // 主要是udp的连接
    await nodeDiscoverModel.build();
    // 主要是tcp那边的连接
    await nodeServerModel.build();

}
model.build = build;

module.exports = model;