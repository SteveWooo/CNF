/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/12/9
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 * 这个模块主要是网络模块的内部活动调用。
 */
const print = global.CNF.utils.print;
const Error = global.CNF.utils.Error;
const sign = global.CNF.utils.sign;

// 内部函数在这里为主
let model = {
    // 子对象
    bucket : require(`${__dirname}/models/bucket`),
    connection : require(`${__dirname}/models/connection`),
    discover : require(`${__dirname}/models/discover`),

    brocastPool : require(`${__dirname}/models/brocastPool`),

    // 子对象类
    Node : require(`${__dirname}/models/Node`)
}

/**
 * 接受TCP数据的入口模块.
 */
let receiveTcpMsgService = require(`${__dirname}/services/receiveTcpMsgService.js`);

/**
 * 节点的被链接渠道主要在这里实现。——被动连接渠道
 * 节点被连接渠道的目的是填充connection.inBound
 */
let nodeServerService = require(`${__dirname}/services/nodeServerService.js`);

/**
 * 节点连接服务主要在这里实现。——主动连接渠道
 * 节点连接服务的目的是从bucket中寻找节点出来进行连接，从而填充outBound连接池
 */
let findNodeService = require(`${__dirname}/services/findNodeService.js`);

/**
 * 节点发现服务在这里实现
 * 节点发现服务的目的是填充bucket
 */
let nodeDiscoverService = require(`${__dirname}/services/nodeDiscoverService.js`);

// 给对象用的对外handle
let handle = function(){
    return {
        msg : {
            /**
             * ⭐这里是所有TCP消息的入口。因为所有tcp消息都在socket注册的data事件回调函数中，写入消息队列了。
             * 因为要注册消息回调，所以在这个函数初始化服务端socket，并设置到全局
             */
            registerMsgEvent : async function(param){
                if((typeof param.netCallback) !== 'function') {
                    throw Error(5004, 'netCallback 参数错误');
                }
                
                // 定期捞msgPool里面的东西出来回调给业务方。
                setInterval(async function(){
                    let msgCache = await model.connection.getMsgPool();
                    if(msgCache !== undefined) {
                        let result = await receiveTcpMsgService.onMessage(msgCache.socket, msgCache.data, msgCache.fromType);

                        /**
                         * todo : 需要在两个tcp on data入口处理粘包问题。
                         */

                        // 有些tcp数据是需要返还给业务方处理的，比如广播数据
                        if (result.callback == true) {
                            let callbackData = {
                                socket : msgCache.socket,
                                data : msgCache.data,
                            }

                            // 对广播数据特殊处理一下，方便业务方使用
                            if (callbackData.data.event == 'brocastEvent') {
                                callbackData.message = msgCache.data.originMsg.msg
                            }
                            await param.netCallback(callbackData);
                        }
                    }
                }, 16);
                return ;
            },

            // 广播一段bussEvent消息，这是主动发送的广播数据包格式。上面brocastEvent中有被动转发的brocast包格式。
            brocast : async function(msg){
                let now = +new Date();
                let brocastData = {
                    event : 'brocastEvent',
                    // 保留原始信息
                    originMsg : {
                        hash : global.CNF.utils.sign.hash(msg + now + global.CNF.netData.nodeId),
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
                model.brocastPool.pushCache(undefined, brocastData, undefined);

                brocastData = JSON.stringify(brocastData);
                await model.connection.brocast(brocastData);
            },

            send : async function(socket, msg) {
                let data = {
                    event : 'bussEvent',
                    msg : msg
                }
                data = JSON.stringify(data);
                await model.connection.sendData(socket, data);
            },

            /**
             * Share neighbors data to target socket.
             * @msg neightbor: The object in Bucket.
             */
            sendNeighbor : async function(socket, msg) {
                let data = {
                    event : 'neighborEvent',
                    neighbor : msg.neighbor
                }

                data = JSON.stringify(data);
                await model.connection.sendData(socket, data);
            },

            autoShareNeighbor : async function(msg) {
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
                // await model.connection.sendData(socket, data);

                // // 同步从bucket.trying中删除这个节点，不然的话会一直卡死在trying中出不来。
                // await model.bucket.deleteTryingNode(node);
                // await model.connection.doSocketDestroy(socket);
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
                await nodeDiscoverService.startDetect();
                // 从bucket中找人连接
                await findNodeService.findNodeJob();
                // 同时把自己的桶分享给邻居
                await findNodeService.autoShareNeighborJob();
                print.info(`Node started ! `);
                return ;
            },

            bucket : {
                getNodeByNodeId : model.bucket.getNodeByNodeId
            },

            connect : {
                getConnectionByNodeId : model.connection.getConnectionByNodeId
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
    await nodeDiscoverService.build();
    // 主要是tcp那边的连接
    await nodeServerService.build();

}
model.build = build;

module.exports = model;