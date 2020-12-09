/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/5/10
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */
const Error = global.CNF.utils.Error;
const print = global.CNF.utils.print;
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

    global.CNF.netData.buckets = globalBuckets;
}
model.build = build;

/**
 * 从某个桶里面随机抽取一个节点出来的函数在这里
 */
let getNodeFromBucket = async function(bucketName) {
    let bucket = global.CNF.netData.buckets[bucketName];
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
 * Get a Node object from newBucket and triedBucket by NodeId. 
 * This function first used for Neighbor share logic.
 */
let getNodeByNodeId = async function(nodeId){
    let node = undefined;
    for(var i=0;i<global.CNF.netData.buckets.tried.length;i++) {
        for(var k=0;k<global.CNF.netData.buckets.tried[i].length;k++) {
            if(nodeId == global.CNF.netData.buckets.tried[i][k].nodeId) {
                return global.CNF.netData.buckets.tried[i][k];
            }
        }
    }

    for(var i=0;i<global.CNF.netData.buckets.new.length;i++) {
        for(var k=0;k<global.CNF.netData.buckets.new[i].length;k++) {
            if(nodeId == global.CNF.netData.buckets.new[i][k].nodeId) {
                return global.CNF.netData.buckets.new[i][k];
            }
        }
    }

    return node;

}
model.getNodeByNodeId = getNodeByNodeId;

/**
 * 用于检查这个Node是否已经在桶里。因为已经在桶里，就不重复ping了
 */
let isNodeAlreadyInBucket = async function(node) {
    let flag = false;
    for(var i=0;i<global.CNF.netData.buckets.tried.length;i++) {
        for(var k=0;k<global.CNF.netData.buckets.tried[i].length;k++) {
            if(node.nodeId == global.CNF.netData.buckets.tried[i][k].nodeId) {
                flag = true;
                return flag;
            }
        }
    }

    for(var i=0;i<global.CNF.netData.buckets.new.length;i++) {
        for(var k=0;k<global.CNF.netData.buckets.new[i].length;k++) {
            if(node.nodeId == global.CNF.netData.buckets.new[i][k].nodeId) {
                flag = true;
                return flag;
            }
        }
    }

    for(var i=0;i<global.CNF.netData.buckets.trying.length;i++) {
        if(node.nodeId == global.CNF.netData.buckets.trying[i].nodeId) {
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
    for(var i=0;i<global.CNF.netData.buckets.trying.length;i++) {
        if(node.nodeId == global.CNF.netData.buckets.trying[i].nodeId) {
            tryNode = global.CNF.netData.buckets.trying.splice(i, 1)[0];
            break;
        }
    }
    if(tryNode == undefined) {
        print.error('trying bucket中找不到该节点，所以丢弃了');
        return ;
        // throw new Error(5000, 'bucket.js add trying Node To Tried');
    }

    if (process.env.CONFIG_INDEX == 0) {
        if (tryNode.nodeId == global.CNF.CONFIG.net.nodeId) {
            print.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!把自己加到tried桶里了")
        }
    }

    // 不要重复加入tried里面已经有的节点。
    let tempNode = undefined;
    for(var i=0;i<global.CNF.netData.buckets.trying.length;i++) {
        if(node.nodeId == global.CNF.netData.buckets.trying[i].nodeId) {
            tempNode = global.CNF.netData.buckets.trying.splice(i, 1)[0];
            break;
        }
    }
    if (tempNode != undefined) {
        return ;
    }
    
    global.CNF.netData.buckets.tried[0].push(tryNode);
}

/**
 * 把new桶里的Node添加到tried桶里. 这发生在TCPshake之后.
 * 其实我怀疑这个操作的必要性.
 */
let addNewNodeToTried = async function(node){
    let newNode = undefined;
    for(var i=0;i<global.CNF.netData.buckets.new.length;i++) {
        for(var k=0;k<global.CNF.netData.buckets.new[i].length;k++) {
            if(node.nodeId == global.CNF.netData.buckets.new[i][k].nodeId) {
                newNode = global.CNF.netData.buckets.new[i].splice(k, 1)[0];
                break;
            }
        }
    }

    // 在新桶里找不到, 就去找找其他桶
    if(newNode == undefined) {
        for(var i=0;i<global.CNF.netData.buckets.trying.length;i++) {
            if(node.nodeId == global.CNF.netData.buckets.trying[i].nodeId) {
                newNode = global.CNF.netData.buckets.trying.splice(i, 1)[0];
                break;
            }
        }
    }
    if(newNode == undefined) {
        for(var i=0;i<global.CNF.netData.buckets.tried.length;i++) {
            for(var k=0;k<global.CNF.netData.buckets.tried[i].length;k++) {
                if(node.nodeId == global.CNF.netData.buckets.tried[i][k].nodeId) {
                    newNode = global.CNF.netData.buckets.tried[i].splice(k, 1)[0];
                    break;
                }
            }
        }
    }

    if(newNode == undefined) {
        print.error("New桶中找不到该node, 但也已经加入tried中.")
        newNode = node;
    }

    // todo
    global.CNF.netData.buckets.tried[0].push(newNode);
}

let addNodeToNew = async function(node){
    let flag = false;
    for(var i=0;i<global.CNF.netData.buckets.new.length;i++) {
        for(var k=0;k<global.CNF.netData.buckets.new[i].length;k++) {
            if(node.nodeId == global.CNF.netData.buckets.new[i][k].nodeId) {
                flag = true;
            }
        }
    }
    if(flag == true) {
        return ;
    }
    // 不要把自己加入自己的new里
    if (node.nodeId == global.CNF.CONFIG.net.publicKey) {
        return ;
    }

    global.CNF.netData.buckets.new[0].push(node);
}

let deleteTryingNode = async function(node) {
    let temp = undefined;
    for(var i=0;i<global.CNF.netData.buckets.trying.length;i++) {
        if(node.nodeId == global.CNF.netData.buckets.trying[i].nodeId) {
            temp = global.CNF.netData.buckets.trying.splice(i, 1)[0];
            break;
        }
    }
    if(temp != undefined) {
        // print.info("delete trying node successful")
    }
    return temp;
}

// let deleteNewNode = async function(node) {
//     let temp = undefined;
//     for(var i=0;i<global.CNF.netData.buckets.new.length;i++) {
//         for(var k=0;k<global.CNF.netData.buckets.new[i].length;k++) {
//             if(node.nodeId == global.CNF.netData.buckets.new[i][k].nodeId) {
//                 temp = global.CNF.netData.buckets.new[i].splice(k, 1)[0];
//                 break;
//             }
//         }
//     }
//     if(temp != undefined) {
//         print.info("delete new node successful")
//     } else {
//         print.error("delete new node faile")
//     }
//     return temp;
// }

// model.deleteNewNode = deleteNewNode;
model.deleteTryingNode = deleteTryingNode;
model.addNodeToNew = addNodeToNew;
model.addTryingNodeToTried = addTryingNodeToTried;
model.addNewNodeToTried = addNewNodeToTried;
// model.addNodeToTried = addNodeToTried;

/**
 * 从桶里拿个节点出来尝试连接,就要塞到trying里面
 */
let tryConnectNode = async function(node) {
    let tryNode = undefined;

    /**
     * 首先检查新桶里面有没有这个尝试连接的Node
     */
    for(var i=0;i<global.CNF.netData.buckets.new.length;i++) {
        for(var k=0;k<global.CNF.netData.buckets.new[i].length;k++) {
            if(node.nodeId == global.CNF.netData.buckets.new[i][k].nodeId) {
                tryNode = global.CNF.netData.buckets.new[i].splice(k, 1)[0];
                break;
            }
        }
    }

    /**
     * 然后检查tried桶里有没有这个Node
     */
    if(tryNode == undefined) {
        for(var i=0;i<global.CNF.netData.buckets.tried.length;i++) {
            for(var k=0;k<global.CNF.netData.buckets.tried[i].length;k++) {
                if(node.nodeId == global.CNF.netData.buckets.tried[i][k].nodeId) {
                    tryNode = global.CNF.netData.buckets.tried[i].splice(k, 1)[0];
                    break;
                }
            }
        }
    }

    /**
     * 最后检查正常尝试的桶里面有没有这个Node
     */
    if(tryNode == undefined) {
        for(var i=0;i<global.CNF.netData.buckets.trying.length;i++) {
            if(node.nodeId == global.CNF.netData.buckets.trying[i].nodeId) {
                tryNode = global.CNF.netData.buckets.trying.splice(i, 1)[0];
                break;
            }
        }
    }

    if(tryNode == undefined) {
        throw new Error(5000, 'bucket.js, tryConnectNode');
    }

    global.CNF.netData.buckets.trying.push(tryNode);
    return ;
}
model.tryConnectNode = tryConnectNode;

module.exports = model;