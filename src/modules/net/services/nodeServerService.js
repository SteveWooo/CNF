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
 * 节点的被链接渠道主要在这里实现。——被动连接渠道
 * 节点被连接渠道的目的是填充connection.inBound
 */
let nodeServerService = {
    isConnecting : false,
    // 被连接的时候，就会触发这个函数，参数socket是别人的socket，需要放到inBound里面
    onConnect : async function(socket){
        // if(nodeServerService.isConnecting === true) {
        //     return ;
        // }
        nodeServerService.isConnecting = true;
        // print.info(`Was connected by ${socket.remoteAddress}:${socket.remotePort}`);

        // 有人来连接,就扔进temp先
        await model.connection.pushTempConnection(socket);

        socket.on('data', async function(data){
            // let result = await receiveTcpMsgService.onMessage(socket, data, 'inBoundNodeMsg');
            try{
                data = JSON.parse(data.toString());
            }catch(e) {
                console.log("nodeServerService.js on message", e);
                // console.log(data.toString());
                throw Error(6001, 'nodeServerServoce.js nodeServerService.onData event');
            }
            
            // 加入消息队列，防拥堵
            await model.connection.pushMsgPool({
                fromType : 'inBoundNodeMsg',
                socket : socket,
                data : data
            });
            return ;
        })
        socket.on('error', async function(e) {
            console.log("nodeServerService on error", e);
            let node = await model.connection.deleteSocket(socket);
            print.warn(`${node != undefined ? node.nodeId : 'unknow'} has disconneced.`);
            // 要把进程结束掉
            process.exit();
        })

        nodeServerService.isConnecting = false;
        return ;
    },

    // 初始化都是为了数据结构
    // todo try catch
    build : async function(){
        await model.connection.build({
            callbackFunc : {
                onConnect : nodeServerService.onConnect
            }
        })
        return ;
    }
}
module.exports = nodeServerService;