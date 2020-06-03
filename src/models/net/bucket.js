/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/5/10
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */
const Error = require(`${__dirname}/../../utils/Error`);
let model = {};
const CONFIG = {
    TRIED_BUCKET_TOTAL : 16,
    TRIED_BUCKET_LENGTH : 16,
    NEW_BUCKET_TOTAL : 64,
    NEW_BUCKET_LENGTH : 32
}
model.CONFIG = CONFIG;

let build = async function(){
    let globalBuckets = {
        tried : [],
        new : [],

        // 从桶里拿出来,准备连接的.先临时存到这里面.要注意的是这个桶么有上限
        trying : [], 
    };

    for(var i=0;i<CONFIG.TRIED_BUCKET_TOTAL;i++) {
        globalBuckets.tried[i] = [];
    }

    for(var i=0;i<CONFIG.NEW_BUCKET_TOTAL;i++) {
        globalBuckets.new[i] = [];
    }

    // todo 读取本地路由信息

    global.CNF.net.buckets = globalBuckets;
}
model.build = build;

/**
 * 从某个桶里面随机抽取一个节点出来的函数在这里
 */
let getNodeFromBucket = async function(bucketName) {
    let bucket = global.CNF.net.buckets[bucketName];
    let nodes = [];
    for(var i=0;i<bucket.length;i++) {
        for(var k=0;k<bucket[i].length;k++) {
            nodes.push(bucket[i][k]);
        }
    }
    if(nodes.length == 0) {
        return null;
    }
    
    // 先做成完全随机
    let index = Math.floor(Math.random()*nodes.length);
    return nodes[index];
}
model.getNodeFromBucket = getNodeFromBucket;

/**
 * 用于检查这个Node是否已经在桶里。因为已经在桶里，就不重复ping了
 */
let isNodeAlreadyInBucket = async function(node) {
    let flag = false;
    for(var i=0;i<global.CNF.net.buckets.tried.length;i++) {
        for(var k=0;k<global.CNF.net.buckets.tried[i].length;k++) {
            if(node.nodeId == global.CNF.net.buckets.tried[i][k].nodeId) {
                flag = true;
                return flag;
            }
        }
    }

    for(var i=0;i<global.CNF.net.buckets.new.length;i++) {
        for(var k=0;k<global.CNF.net.buckets.new[i].length;k++) {
            if(node.nodeId == global.CNF.net.buckets.new[i][k].nodeId) {
                flag = true;
                return flag;
            }
        }
    }

    for(var i=0;i<global.CNF.net.buckets.trying.length;i++) {
        if(node.nodeId == global.CNF.net.buckets.trying[i].nodeId) {
            flag = true;
            return flag;
        }
    }
    return flag;
}
model.isNodeAlreadyInBucket = isNodeAlreadyInBucket;

/**
 * 往桶里添加新的Node, 这种节点的来源是outBound的主动连接.
 * 1: 从trying中来
 */
let addTryingNodeToTried = async function(node){
    let tryNode = undefined;
    for(var i=0;i<global.CNF.net.buckets.trying.length;i++) {
        if(node.nodeId == global.CNF.net.buckets.trying[i].nodeId) {
            tryNode = global.CNF.net.buckets.trying.splice(i, 1)[0];
            break;
        }
    }
    if(tryNode == undefined) {
        throw new Error(5000, 'bucket.js add trying Node To Tried');
    }

    // todo
    global.CNF.net.buckets.tried[0].push(tryNode);
}
let addNodeToNew = async function(node){
    let flag = false;
    for(var i=0;i<global.CNF.net.buckets.new.length;i++) {
        for(var k=0;k<global.CNF.net.buckets.new[i].length;k++) {
            if(node.nodeId == global.CNF.net.buckets.new[i][k].nodeId) {
                flag = true;
            }
        }
    }
    if(flag == true) {
        return ;
    }
    // todo
    global.CNF.net.buckets.new[0].push(node);
}
model.addNodeToNew = addNodeToNew;
model.addTryingNodeToTried = addTryingNodeToTried;
// model.addNodeToTried = addNodeToTried;

/**
 * 从桶里拿个节点出来尝试连接,就要塞到trying里面
 */
let tryConnectNode = async function(node) {
    let tryNode = undefined;
    for(var i=0;i<global.CNF.net.buckets.new.length;i++) {
        for(var k=0;k<global.CNF.net.buckets.new[i].length;k++) {
            if(node.nodeId == global.CNF.net.buckets.new[i][k].nodeId) {
                tryNode = global.CNF.net.buckets.new[i].splice(k, 1)[0];
                break;
            }
        }
    }
    if(tryNode == undefined) {
        for(var i=0;i<global.CNF.net.buckets.tried.length;i++) {
            for(var k=0;k<global.CNF.net.buckets.tried[i].length;k++) {
                if(node.nodeId == global.CNF.net.buckets.tried[i][k].nodeId) {
                    tryNode = global.CNF.net.buckets.tried[i].splice(k, 1)[0];
                    break;
                }
            }
        }
    }
    if(tryNode == undefined) {
        for(var i=0;i<global.CNF.net.buckets.trying.length;i++) {
            if(node.nodeId == global.CNF.net.buckets.trying[i].nodeId) {
                tryNode = global.CNF.net.buckets.trying.splice(i, 1)[0];
                break;
            }
        }
    }
    if(tryNode == undefined) {
        throw new Error(5000, 'bucket.js, tryConnectNode');
    }

    global.CNF.net.buckets.trying.push(tryNode);
    return ;
}
model.tryConnectNode = tryConnectNode;

module.exports = model;