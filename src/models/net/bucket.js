/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/5/10
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */

let model = {};
const CONFIG = {
    TRIED_BUCKET_TOTAL : 16,
    TRIED_BUCKET_LENGTH : 16,
    NEW_BUCKET_TOTAL : 64,
    NEW_BUCKET_LENGTH : 32
}
model.CONFIG = CONFIG;

let init = async function(){
    let globalBuckets = {
        tried : [],
        new : []
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
model.init = init;

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
 * 往桶里添加新的Node
 */
let addNodeToTried = async function(node){
    //test
    global.CNF.net.buckets.tried[0].push(node);
}
let addNodeToNew = async function(node){
    //test
    global.CNF.net.buckets.new[0].push(node);
}
model.addNodeToNew = addNodeToNew;
model.addNodeToTried = addNodeToTried;

module.exports = model;