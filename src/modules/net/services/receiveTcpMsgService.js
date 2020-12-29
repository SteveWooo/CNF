const print = global.CNF.utils.print;
const Error = global.CNF.utils.Error;

// 内部函数在这里为主
let model = {
    // 子对象
    bucket : require(`${__dirname}/../models/bucket`),
    connection : require(`${__dirname}/../models/connection`),
    discover : require(`${__dirname}/../models/discover`),

    brocastPool : require(`${__dirname}/../models/brocastPool`),

    // 子对象类
    Node : require(`${__dirname}/../models/Node`)
}

/**
 * 接受TCP数据的入口模块.
 */
let receiveTcpMsgService = {
    // 无论如何,连接成功后第一件事情都要和对方做tcpShake, 收到shake, 要shakeBack
    events : {
        // 我主动连接别人的话, 那我只能收到shakeBack
        shakeBackEvent : async function(socket, data, fromType) {
            let result = {
                callback : false
            }
            // console.log('get shake back');
            data.msg = JSON.parse(data.msg);
            data.msg.from.nodeId = data.msg.from.nodeID
            let node = new model.Node(data.msg.from);

            // 检查networkid，不允许networkid不一致的节点加入网络
            if (data.msg.from.networkid != global.CNF.CONFIG.net.networkid) {
                await global.CNF.net.msg.socketDestroy(socket, node);
                // print.error("tcp shake中出现networkid不一致的节点");
                return result;
            }

            // 只把主动连接的节点放tried, 被动链接的不放
            if(fromType == 'outBoundNodeMsg') {
                let result = await model.connection.finishTcpShake(socket, node, fromType);
                if (result.status == 'alreadyConnected' || result.status == "full") {
                    await global.CNF.net.msg.socketDestroy(socket, node);
                    // await model.connection.doSocketDestroy(socket);
                    return result;
                }

                await model.bucket.addTryingNodeToTried(node);
            } else {
                print.error("非OutBoudNode发送了TCP shakeEvent")
            }

            return result;
        },
        /**
         * 别人连接完我之后, 第一时间就是给我发shake. 那么我这个时候就需要把这个socket放到inBound里面了.
         * # 必须先检查我的桶里是否有对方，如果没有，这个连接必须断掉。
         */
        shakeEvent : async function(socket, data, fromType){
            let result = {
                callback : false
            }
            // console.log('get shake');
    
            data.msg = JSON.parse(data.msg);
            data.msg.from.nodeId = data.msg.from.nodeID
            let node = new model.Node(data.msg.from);
            
            // 检查networkid，不允许networkid不一致的节点加入网络
            if (data.msg.from.networkid != global.CNF.CONFIG.net.networkid) {
                await global.CNF.net.msg.socketDestroy(socket, node);
                // print.error("tcp shake中出现networkid不一致的节点");
                return result;
            }
            
            // 把节点从tempConnection放到inBound
            if(fromType == 'inBoundNodeMsg') {
                // # 检查我的桶里是否有对方，没有的话果断断掉。
                if (!(await model.bucket.isNodeAlreadyInBucket(node))) {
                    print.warn("Retried abnormal node.");
                    await global.CNF.net.msg.socketDestroy(socket, node);
                    // // 同步从bucket.trying中删除这个节点，不然的话会一直卡死在trying中出不来。
                    // await model.bucket.deleteTryingNode(node);
                    // await model.connection.doSocketDestroy(socket);
                    return result;
                }

                let finishTcpShakeResult = await model.connection.finishTcpShake(socket, node, fromType);
                // 如果是双方同时连接，那么晚到的一位兄弟，就要主动断掉自己发起的连接，并通知对方也断掉这个socket。
                if (finishTcpShakeResult.status == 'alreadyConnected'  || finishTcpShakeResult.status == "full") {
                    print.warn("node already connected");
                    await global.CNF.net.msg.socketDestroy(socket, node);
                    // // 同步从bucket.trying中删除这个节点，不然的话会一直卡死在trying中出不来。
                    // await model.bucket.deleteTryingNode(node);
                    // await model.connection.doSocketDestroy(socket);
                    return result;
                }

                // console.log("add tried")
                await model.bucket.addNewNodeToTried(node);
            } else {
                print.error("非InBoudNode发送了TCP shakeEvent")
            }

            await model.connection.tcpShakeBack(socket, node);

            return result;
        },
        /**
         * 邻居分享事件
         */
        neighborEvent : async function(socket, data, fromType){
            let result = {
                callback : false
            }
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

            return result;
        },
        socketDestroyEvent : async function(socket, data, fromType){
            let result = {
                callback : false
            }
            let nodeInfo = data.from.nodeInfo;
            if (nodeInfo.nodeId == undefined) {
                return result;
            }
            // 从socket中删除
            await model.connection.doSocketDestroy(socket);

            // 从bucket.trying中删除
            await model.bucket.deleteTryingNode(nodeInfo);

            // 防止是udp握手的异常，把doingShake也删除掉
            // await model.discover.deleteDoingShake(nodeInfo);
            return result;
        },
        bussEvent : async function(socket, data, fromType) {
            let result = {
                callback : false
            }
            // console.log('get buss')
            // 先检查在不在inBound和outBound桶里, 不在的话, 就丢掉. 只有合法的节点才能发buss消息
            if(!(await model.connection.isAlreadyTcpShake(socket))) {
                return ;
            }

            // await model.connection.pushMsgPool({
            //     fromType : fromType,
            //     socket : socket,
            //     msg : data
            // });

            result.callback = true;
            return result;
        },

        // 这里负责处理接收到的广播事件
        brocastEvent : async function(socket, brocastData, fromType) {
            let result = {
                callback : false
            }

            if(!(await model.connection.isAlreadyTcpShake(socket))) {
                print.warn("connection not ready");
                return result;
            }

            let now = +new Date()
            // 十分钟之前的数据包不做处理
            if (now - brocastData.originMsg.createAt >= 10 * 60 * 1000) {
                print.warn("msg timeout.");
                return result;
            }

            // 判断在不在缓存里面，如果在，说明已经转发过，不需要处理了
            if (model.brocastPool.isCached(socket, brocastData, fromType) == true) {
                return result;
            }

            // 让业务读数据
            // await model.connection.pushMsgPool({
            //     fromType : fromType,
            //     socket : socket,
            //     brocastData : brocastData
            // });

            // 转发到所有已知节点
            let transData = {
                event : 'brocastEvent',
                // 保留原始信息
                originMsg : brocastData.originMsg,
                // 放置发送方消息
                from : {
                    nodeInfo : {
                        nodeId : global.CNF.netData.nodeId
                    },
                    createAt : now
                },
                hop : brocastData.hop + 1
            }
            transData = JSON.stringify(transData);
            await model.connection.brocast(transData);

            // 放入池子里，下次收到这条信息就不转发了
            model.brocastPool.pushCache(socket, brocastData, fromType);

            // 只在第一次收到这条广播数据的时候，才需要回调业务方
            result.callback = true;

            return result;
        }
    },

    // 入口
    onMessage : async function(socket, data, fromType) {
        if(!(data.event in receiveTcpMsgService.events)) {
            return {
                callback : false
            };
        }
        return await receiveTcpMsgService.events[data.event](socket, data, fromType);
    }
}

module.exports = receiveTcpMsgService;