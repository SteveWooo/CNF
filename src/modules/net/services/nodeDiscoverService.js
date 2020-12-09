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
 * 节点发现服务在这里实现
 * 节点发现服务的目的是填充bucket
 */
let nodeDiscoverService = {
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
            if(nodeDiscoverService.isDetecting === true) {
                return ;
            }
            nodeDiscoverService.isDetecting = true;
            await nodeDiscoverService.detect();
            nodeDiscoverService.isDetecting = false;
        }, 500);
        return ;
    },

    // 被动discovered
    onMessage : async function(message, remote){
        // console.log(`receive from:`);
        // console.log(remote);
        if(nodeDiscoverService.isDetecting === true) {
            return ;
        }
        try{
            message = JSON.parse(message);
            // console.log(message);
            message.msg = JSON.parse(message.msg);
        }catch(e) {
            throw Error(6001, 'cnfNet.js nodeDiscoverService.onMessage');
        }
        nodeDiscoverService.isDetecting = true;
        // TODO: 检测协议合法性。

        // 首先判断newworkid是否一致
        if (message.msg.from.networkid == undefined || message.msg.from.networkid != global.CNF.CONFIG.net.networkid) {
            // print.error("udp发现过程中出现networkid不一致的节点");
            nodeDiscoverService.isDetecting = false;
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

        nodeDiscoverService.isDetecting = false;
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
                message : nodeDiscoverService.onMessage,
                listening : nodeDiscoverService.onListening,
                error : nodeDiscoverService.onError,
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

module.exports = nodeDiscoverService;