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
let model = {};
const CONFIG = {
    PING_TYPE: 1,
    NEIGHBOR_TYPE: 3,

    NEIGHBOR_LENGTH: 1024
}
model.CONFIG = CONFIG;

/**
 * 初始化全局数据结构
 * 初始化socket
 */
let init = async function(param){
    let globalDiscover = {
        udpSocket : undefined,
        neighbor : [],
    };

    globalDiscover.udpSocket = dgram.createSocket('udp4');
    
    // 注册回调
    for(var i in param.callbackFunc) {
        globalDiscover.udpSocket.on(i, param.callbackFunc[i]);
    }

    // 绑定端口，这里会触发listening回调
    globalDiscover.udpSocket.bind(global.CNF.CONFIG.net.discoverUdpPort);

    global.CNF.net.discover = globalDiscover;
}
model.init = init;

/**
 * 收到一个节点的PING，放到这个函数里面
 * 目的是把节点提取出来，做成Node对象，然后试别这个Node是否需要入桶。
 * 如果这个节点需要入桶
 * @param Ping包
 * @return 
 *     pushBucket: boolean, // 是否需要入桶
 *     Node : Node对象, // 节点信息
 */
let receiveNodePing = async function(msg, remote, injection) {
    let Node = injection.Node;
    let nodeMsg = msg.from;
}
model.receiveNodePing = receiveNodePing;

/**
 * 收到别人分享的邻居包
 * 这里要把邻居节点排重加入global.CNF.net.discover.neighbor里面，需要排重
 */
let receiveNodeNeighbor = async function(msg, remote, injection) {
    let Node = injection.Node;
    
}
model.receiveNodeNeighbor = receiveNodeNeighbor;

/**
 * 获取一个邻居节点，本质上这里是获取一个连接任务。
 * 如果邻居列表为空，就找种子列表。
 */
let getNeighbor = async function() {

}
model.getNeighbor = getNeighbor;

module.exports = model;