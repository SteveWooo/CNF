/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/5/29
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 * 这个模块主要是网络模块的内部活动调用。
 */
const print = require(`${__dirname}/../../utils/print`);
const Error = require(`${__dirname}/../../utils/Error`);
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
        findNodeModel.isFinding = true;
        let Config = global.CNF.CONFIG.NET;

        // 从桶里找
        let bucketName = Math.random() > 0.5 ? 'tried' : 'new';
        let node = await model.bucket.getNodeFromBucket(bucketName);

        // 说明桶里没东西
        if(node === null) {
            return ;
        }

        // 如果这个节点在连接池的话，直接跳过
        if((await model.connection.isNodeAlreadyConnected(node)) == true) {
            return ;
        }

        // 尝试连接这个幸运儿节点
        print.info('connecting');
        await model.connection.tryOutBoundConnect(node);

        findNodeModel.isFinding = false;
    },
    findNodeJob : async function(){
        setInterval(async function(){
            if(findNodeModel.isFinding == true) {
                return ;
            }
            console.log('finding node');
            await findNodeModel.doFindNode();
        }, 1000);
        return ;
    }
}

/**
 * 节点的被链接渠道主要在这里实现。——被动连接渠道
 * 节点被连接渠道的目的是填充connection.inBound
 */
let nodeServerModel = {
    initServer : async function(param) {
        const HOST = '127.0.0.1';
        /**
         * 服务端身份的SOCKET初始化
         */
        function serverSocketHandle(socket){
            print.info(`Was connected by ${socket.remoteAddress}:${socket.remotePort}`);
            console.log(socket);
            // todo: 添加这个socket到connection.inBound里面。先添加，然后再验证这个节点是否可用。
            socket.on('data', async function(data){
                data = data.toString();
                /**
                 * TODO 先检查包是否符合CNF通讯协议，然后把data封装成用户客制化可读模式，包括信息来源，具体信息等
                 */
    
                /**
                 * 回调通讯内容给客制化注册的函数，
                 */
                await param.netCallback(data);
            })
        }
        let serverSocket = net.createServer(serverSocketHandle);
        serverSocket.listen(param.port, HOST);
        print.info(`Node listen at ${HOST}:${param.port}`);
    }
}

/**
 * 节点发现服务在这里实现
 * 节点发现服务的目的是填充bucket
 */
let nodeDiscoverModel = {
    isDetecting : false,
    
    /**
     * 这里负责主动ping邻居
     */
    initDetect : async function(){
        // 获取一个邻居，然后ping他
    },

    onMessage : async function(msg, remote){
        try{
            msg = JSON.parse(msg);
        }catch(e) {
            throw Error(6001)
        }
        // 这里试别包类型
        if(msg.type == model.discover.CONFIG.PING_TYPE) { // Ping
            let result = await model.discover.reciveNodePing(msg, remote, {
                Node: model.Node
            })

            // todo push new bucket
        }
        if(msg.type == model.discover.CONFIG.NEIGHBOR_TYPE) { // Neighbor
            let result = await model.discover.receiveNodeNeighbor(msg, remote, {
                Node: model.Node
            })

            // todo push neighbor cache
        }
    },

    onListening : async function(){
        print.info(`Discover service is listening at: ${global.CNF.CONFIG.net.discoverUdpPort}`);
    },

    onError : async function(e) {
        console.log(e);
    },

    init : async function(){
        // 初始化被人发现的udp socket
        await model.discover.init({
            callbackFunc : {
                message : nodeDiscoverModel.onMessage,
                listening : nodeDiscoverModel.onListening,
                error : nodeDiscoverModel.onError,
            }
        });

        // 初始化ping邻居的探测器。如果没邻居，就从种子里面找。
        await nodeDiscoverModel.initDetect();
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
                let serverSocket = await nodeServerModel.initServer({
                    port : global.CNF.CONFIG.net.connectionTcpServerPort,
                    netCallback : param.netCallback
                });
                global.CNF.net.serverSocket = serverSocket;
            }
        },
        node : {
            /**
             * 节点初始化入口，由于配置都存全局，所以不需要传什么参数。
             * 节点初始化的目的是开始寻址
             */
            startup : async function(param) {
                print.info(`Node starting ...`);
                // await cnfNet.initClient();
                await findNodeModel.findNodeJob();
                print.info(`Node started ! `);
            }
        }
    }
}
model.handle = handle;

/**
 * 网络服务的基本初始化入口，比如对桶的初始化
 */
let init = async function(){
    await model.bucket.init();
    await nodeDiscoverModel.init();
    await model.connection.init();

    // 先加几个憨憨节点进去测试
    let node1 = new model.Node({
        id : 'hahahaha1',
        ip : '127.0.0.1',
        tcpport : 30303,
        udpport : 30303
    })
    let node2 = new model.Node({
        id : 'hahahaha2',
        ip : '127.0.0.1',
        tcpport : 30304,
        udpport : 30304
    })
    await model.bucket.addNodeToNew(node1);
    await model.bucket.addNodeToTried(node2);
}
model.init = init;

module.exports = model;