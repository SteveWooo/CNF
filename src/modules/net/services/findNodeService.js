const print = global.CNF.utils.print;

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

// 接收TCP的模块复用
let receiveTcpMsgService = require(`${__dirname}/receiveTcpMsgService.js`);

/**
 * 节点连接服务主要在这里实现。——主动连接渠道
 * 节点连接服务的目的是从bucket中寻找节点出来进行连接，从而填充outBound连接池
 */
let findNodeService = {
    isFinding : false, // 锁 

    onMessage : async function(data, socket) {
        // let result = await receiveTcpMsgService.onMessage(socket, data, 'outBoundNodeMsg');

        try{
            data = JSON.parse(data.toString());
        }catch(e) {
            console.log("findNodeService.js on message", e);
            // console.log(data.toString());
            throw Error(6001, 'findNodeService.js findNodeService.onData event');
        }

        // 加入消息队列，防拥堵
        await model.connection.pushMsgPool({
            fromType : 'outBoundNodeMsg',
            socket : socket,
            data : data
        });
        return ;
    },

    onError : async function(e, socket) {
        console.log("findNodeService.js on Error", e);
        let node = await model.connection.deleteSocket(socket);
        print.info(`${node != undefined ? node.nodeId : 'unknow'} has disconneced.`);
        // 要把进程结束掉
        process.exit();
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
        findNodeService.isFinding = true;
        let Config = global.CNF.CONFIG.NET;
        
        // 从桶里找
        let bucketName = Math.random() > 0.5 ? 'tried' : 'new';
        let node = await model.bucket.getNodeFromBucket(bucketName);

        // 说明桶里没东西
        if(node === null) {
            findNodeService.isFinding = false;
            return ;
        }

        // 如果这个节点在连接池的话，直接跳过
        if((await model.connection.isNodeAlreadyConnected(node)) == true) {
            // console.log('already conn:', node.nodeId);
            findNodeService.isFinding = false;
            return ;
        }

        // 不要连接自己
        if(node.nodeId == global.CNF.CONFIG.net.publicKey) {
            findNodeService.isFinding = false;
            return ;
        }

        // 尝试连接这个幸运儿节点,然后加入全局
        let socket = await model.connection.tryOutBoundConnect(node, {
            onMessage : findNodeService.onMessage,
            onError : findNodeService.onError
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
            // print.error(`cnfNet.js findNodeService.doFineNode: socket创建失败`)
        }

        findNodeService.isFinding = false;
        return ;
    },
    findNodeJob : async function(){
        setInterval(async function(){
            // console.log(global.CNF.netData.buckets.new[0])
            if(findNodeService.isFinding == true) {
                return ;
            }
            await findNodeService.doFindNode();
        }, 500);
        return ;
    },

    /**
     * The core logic of Neighbor sharing.
     * Neighbor sharing logic works like the routing. 
     */
    doAutoShareNeighbor : async function(){
        // 邻居节点分享开关。
        if (global.CNF.CONFIG.net.neighborAutoShare != true) {
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
        await global.CNF.net.msg.autoShareNeighbor({
            neighbor : neighbors
        })

        return ;
    },
    /**
     * 在寻找桶里节点进行连接的同时，还需要把自己的两个桶的节点分享给已连接的节点。
     */
    autoShareNeighborJob : async function(){
        setInterval(async function(){
            await findNodeService.doAutoShareNeighbor();
        }, 5000);
        return ;
    }
}

module.exports = findNodeService;