let Cnf = require(`${__dirname}/../../Cnf.js`);
const fs = require('fs')

async function buildNodes(nodeCount){
    let nodes = [];
    const NODE_COUNT = nodeCount
    let cnf = new Cnf();
    for(var i=0;i<NODE_COUNT;i++) {
        let key = cnf.utils.sign.genKeys();
        // 每N个节点共用一个端口
        var N = 1
        var port = 30000;
        port += Math.floor(i / N)
        let conf = {
            "net" : {
                "localPrivateKey" : key.privateKey,
                "publicKey" : key.publicKey,
                "nodeID" : key.publicKey.substring(0, 34),
                "ip" : "0.0.0.0",
                "servicePort" : port + "",
                "masterServer" : i % N == 0 ? "true" : "false",
                "seed" : [],
                "maxSeedCount" : "1000",
                "networkid" : "1",
                "publicChanelLength" : N + ""
            },
            "number" : i + ""
        }
        // 分树莓派的创建方式：
        // let NODE_PER_SERVER = 8888
        // if(i >= 4*NODE_PER_SERVER && i < 5*NODE_PER_SERVER) {
        //     conf.net.ip = "192.168.10.205"
        // }
        // if(i >= 3 * NODE_PER_SERVER && i < 4 * NODE_PER_SERVER) {
        //     conf.net.ip = "192.168.10.204"
        // }
        // if(i >= 2 * NODE_PER_SERVER && i < 3 * NODE_PER_SERVER) {
        //     conf.net.ip = "192.168.10.203"
        // }
        // if(i >= NODE_PER_SERVER && i < 2 * NODE_PER_SERVER) {
        //     conf.net.ip = "192.168.10.202"
        // }
        // if (i < NODE_PER_SERVER) {
        //     conf.net.ip = "192.168.10.200"
        //     // conf.net.ip = "192.168.31.164"
        //     // conf.net.ip = "192.168.10.206"
        //     // conf.net.ip = "192.168.10.206"
        // }

        // 单机测试的创建方式
        conf.net.ip = "192.168.10.200";

        nodes.push(conf);
    }

    console.log("do writing nodes")
    fs.writeFileSync(`${__dirname}/nodes.data`, JSON.stringify(nodes));

    // 然后把节点读出来写成配置
    // buildConfigByNodes()
    buildConfigByNodesOfMasterArea()
}

// for(var i = 2700;i<=2700;i+=100) {
//     buildNodes(i);
// }

// 创建结点入口
// buildNodes(8888 * 5)
buildNodes(1000);

// 先找出一堆超级结点
async function buildConfigByNodesOfMasterArea() {
    let nodes = fs.readFileSync(`${__dirname}/nodes.data`).toString()
    nodes = JSON.parse(nodes)
    let ipConfs = {} // 索引
    const SUPER_NODE_PRE = {
        "00" : true,
        "01" : true,
        "20" : true,
        "21" : true,
        "40" : true,
        "41" : true,
        "60" : true,
        "61" : true,
        "80" : true,
        "81" : true,
        "a0" : true,
        "a1" : true,
        "c0" : true,
        "c1" : true,
        "e0" : true,
        "e1" : true,
    }
    // 存放超级结点的nodeID
    let superNodeIndexGroup = []

    // 找出这些超级结点
    for(var i=0;i<nodes.length;i++) {
        if (SUPER_NODE_PRE[nodes[i].net.nodeID.substring(2,4)] == true)  {
            superNodeIndexGroup.push(nodes[i])
        }
    }

    // 每组结点的个数
    let nodeGroupCount = Math.ceil(nodes.length / superNodeIndexGroup.length)
    
    // 给普通结点添加种子（注意不要自己给自己上种子
    for(var i=0;i<nodes.length;i++) {
        if(ipConfs[nodes[i].net.ip] == undefined) {
            ipConfs[nodes[i].net.ip] = []
        }

        // 这个结点用这个超级结点即可
        superNodeIndex = Math.floor(i / nodeGroupCount)

        // 如果撞了自己就是超级结点，那就跳到下一组
        if (superNodeIndexGroup[superNodeIndex].net.nodeID == nodes[i].net.nodeID) {
            superNodeIndex = superNodeIndex + 1 >= superNodeIndexGroup.length ? 0 : superNodeIndex + 1
        }
        nodes[i]["net"]["seed"].push({
            "nodeID" : superNodeIndexGroup[superNodeIndex].net.nodeID,
            "publicKey" : superNodeIndexGroup[superNodeIndex].net.publicKey,
            "ip" : superNodeIndexGroup[superNodeIndex].net.ip,
            "servicePort" : superNodeIndexGroup[superNodeIndex].net.servicePort
        })

        // 再加一次
        superNodeIndex ++ 
        if (superNodeIndex >= superNodeIndexGroup.length) {
            superNodeIndex = 0
        }
        if (superNodeIndexGroup[superNodeIndex].net.nodeID == nodes[i].net.nodeID) {
            superNodeIndex = superNodeIndex + 1 >= superNodeIndexGroup.length ? 0 : superNodeIndex + 1
        }
        nodes[i]["net"]["seed"].push({
            "nodeID" : superNodeIndexGroup[superNodeIndex].net.nodeID,
            "publicKey" : superNodeIndexGroup[superNodeIndex].net.publicKey,
            "ip" : superNodeIndexGroup[superNodeIndex].net.ip,
            "servicePort" : superNodeIndexGroup[superNodeIndex].net.servicePort
        })

        // 再加一次
        superNodeIndex ++ 
        if (superNodeIndex >= superNodeIndexGroup.length) {
            superNodeIndex = 0
        }
        if (superNodeIndexGroup[superNodeIndex].net.nodeID == nodes[i].net.nodeID) {
            superNodeIndex = superNodeIndex + 1 >= superNodeIndexGroup.length ? 0 : superNodeIndex + 1
        }
        nodes[i]["net"]["seed"].push({
            "nodeID" : superNodeIndexGroup[superNodeIndex].net.nodeID,
            "publicKey" : superNodeIndexGroup[superNodeIndex].net.publicKey,
            "ip" : superNodeIndexGroup[superNodeIndex].net.ip,
            "servicePort" : superNodeIndexGroup[superNodeIndex].net.servicePort
        })

        // 再加一次
        superNodeIndex ++ 
        if (superNodeIndex >= superNodeIndexGroup.length) {
            superNodeIndex = 0
        }
        if (superNodeIndexGroup[superNodeIndex].net.nodeID == nodes[i].net.nodeID) {
            superNodeIndex = superNodeIndex + 1 >= superNodeIndexGroup.length ? 0 : superNodeIndex + 1
        }
        nodes[i]["net"]["seed"].push({
            "nodeID" : superNodeIndexGroup[superNodeIndex].net.nodeID,
            "publicKey" : superNodeIndexGroup[superNodeIndex].net.publicKey,
            "ip" : superNodeIndexGroup[superNodeIndex].net.ip,
            "servicePort" : superNodeIndexGroup[superNodeIndex].net.servicePort
        })

        // 再加一次
        superNodeIndex ++ 
        if (superNodeIndex >= superNodeIndexGroup.length) {
            superNodeIndex = 0
        }
        if (superNodeIndexGroup[superNodeIndex].net.nodeID == nodes[i].net.nodeID) {
            superNodeIndex = superNodeIndex + 1 >= superNodeIndexGroup.length ? 0 : superNodeIndex + 1
        }
        nodes[i]["net"]["seed"].push({
            "nodeID" : superNodeIndexGroup[superNodeIndex].net.nodeID,
            "publicKey" : superNodeIndexGroup[superNodeIndex].net.publicKey,
            "ip" : superNodeIndexGroup[superNodeIndex].net.ip,
            "servicePort" : superNodeIndexGroup[superNodeIndex].net.servicePort
        })

        // 再加一次
        superNodeIndex ++ 
        if (superNodeIndex >= superNodeIndexGroup.length) {
            superNodeIndex = 0
        }
        if (superNodeIndexGroup[superNodeIndex].net.nodeID == nodes[i].net.nodeID) {
            superNodeIndex = superNodeIndex + 1 >= superNodeIndexGroup.length ? 0 : superNodeIndex + 1
        }
        nodes[i]["net"]["seed"].push({
            "nodeID" : superNodeIndexGroup[superNodeIndex].net.nodeID,
            "publicKey" : superNodeIndexGroup[superNodeIndex].net.publicKey,
            "ip" : superNodeIndexGroup[superNodeIndex].net.ip,
            "servicePort" : superNodeIndexGroup[superNodeIndex].net.servicePort
        })

        ipConfs[nodes[i].net.ip].push(nodes[i])
    }

    for (var nodeIP in ipConfs) {
        fs.writeFileSync(`${__dirname}/../../../cnf_core/config/conf.${nodeIP}-${ipConfs[nodeIP].length}.json`, JSON.stringify(ipConfs[nodeIP]));
    }
}
// buildConfigByNodesOfMasterArea()

async function buildConfigByNodes(){
    let nodes = fs.readFileSync(`${__dirname}/nodes.data`).toString()
    nodes = JSON.parse(nodes)

    let ipConfs = {} // 索引
    const SEED_GAP = 100 // 每GAP个结点，出一个结点做seed

    for(var i=0;i<nodes.length;i++) {
        // 给每台服务器初始化
        let nodeIP = nodes[i].net.ip
        if(ipConfs[nodeIP] == undefined) {
            ipConfs[nodeIP] = []
        }

        let node = nodes[i]

        // 每SEED_GAP个节点出一个超级路由
        if (i % SEED_GAP == 0) {
            let nextSeedIndex = i + SEED_GAP
            if (nextSeedIndex >= nodes.length) {
                nextSeedIndex = 0
            }
            nodes[i]["net"]["seed"].push({
                "nodeID" : nodes[nextSeedIndex].net.publicKey.substring(0, 34),
                "publicKey" : nodes[nextSeedIndex].net.publicKey,
                "ip" : nodes[nextSeedIndex].net.ip,
                "servicePort" : nodes[nextSeedIndex].net.servicePort
            })

            nextSeedIndex = nextSeedIndex + SEED_GAP
            if (nextSeedIndex >= nodes.length) {
                nextSeedIndex = 0
            }
            // 再加紧接在后面的一个结点做种子
            nodes[i]["net"]["seed"].push({
                "nodeID" : nodes[nextSeedIndex].net.publicKey.substring(0, 34),
                "publicKey" : nodes[nextSeedIndex].net.publicKey,
                "ip" : nodes[nextSeedIndex].net.ip,
                "servicePort" : nodes[nextSeedIndex].net.servicePort
            })
        }

        if (i % SEED_GAP != 0){
            let seedIndex = Math.floor(i / SEED_GAP) * SEED_GAP
            nodes[i]["net"]["seed"].push({
                "nodeID" : nodes[seedIndex].net.publicKey.substring(0, 34),
                "publicKey" : nodes[seedIndex].net.publicKey,
                "ip" : nodes[seedIndex].net.ip,
                "servicePort" : nodes[seedIndex].net.servicePort
            })

            seedIndex = seedIndex + SEED_GAP
            if (seedIndex >= nodes.length) {
                seedIndex = 0
            }

            // 加入紧接在后面的第二个结点做种子
            nodes[i]["net"]["seed"].push({
                "nodeID" : nodes[seedIndex].net.publicKey.substring(0, 34),
                "publicKey" : nodes[seedIndex].net.publicKey,
                "ip" : nodes[seedIndex].net.ip,
                "servicePort" : nodes[seedIndex].net.servicePort
            })
        }

        ipConfs[nodeIP].push(node)
    }

    for (var nodeIP in ipConfs) {
        fs.writeFileSync(`${__dirname}/../../../cnf_core/config/conf.${nodeIP}.json`, JSON.stringify(ipConfs[nodeIP]));
    }
}