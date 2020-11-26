/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/6/18
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 * 模块主要负责广播信息过滤工作
 */

const fs = require('fs');
const CONFIG = {
    MAX_CACHE : 1000
}
/**
 * 判断这个数据是否已经发送出去，并缓存
 * @param socket 发送者的socket
 * @param data 数据报文
 * @param fromType 发送方的类型
 */
function isCached (socket, data, fromType){
    let flag = false;
    for(var i=0;i<global.CNF.netData.brocastCache.length;i++) {
        if (global.CNF.netData.brocastCache[i].originMsg.hash == data.originMsg.hash) {
            flag = true;
            break;
        }
    }
    return flag
}
exports.isCached = isCached

/**
 * 添加一条广播报文到缓存中
 * @param socket 发送者的socket 有可能为空
 * @param data 数据报文
 * @param fromType 发送方的类型 有可能为空
 */
function pushCache (socket, data, fromType) {
    if (global.CNF.netData.brocastCache.length >= CONFIG.MAX_CACHE) {
        global.CNF.netData.brocastCache.shift();
    }

    global.CNF.netData.brocastCache.push({
        originMsg : {
            hash : data.originMsg.hash,
            createAt : data.originMsg.createAt,
        }
    })

    return ;
}
exports.pushCache = pushCache

/**
 * 定期清理广播缓存池子，避免爆内存
 */
function cleanCache(){

}
exports.cleanCache = cleanCache;