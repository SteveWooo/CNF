let Cnf = require(`${__dirname}/../../Cnf.js`);
const fs = require('fs')

async function buildNodes(){
    let nodes = [];
    const NODE_COUNT = 10000
    let cnf = new Cnf();
    for(var i=0;i<NODE_COUNT;i++) {
        let key = cnf.utils.sign.genKeys();
        // 每N个节点共用一个端口
        var N = 1000
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

        // 分树莓派
        if(i >= 50000 && i < 60000) {
            conf.net.ip = "192.168.10.206"
        }
        if(i >= 40000 && i < 50000) {
            conf.net.ip = "192.168.10.205"
        }
        if(i >= 30000 && i < 40000) {
            conf.net.ip = "192.168.10.204"
        }
        if(i >= 20000 && i < 30000) {
            conf.net.ip = "192.168.10.203"
        }
        if(i >= 10000 && i < 20000) {
            conf.net.ip = "192.168.10.202"
        }

        if (i < 10000) {
            // conf.net.ip = "192.168.10.200"、
            conf.net.ip = "192.168.31.164"
        }

        nodes.push(conf);
    }

    console.log("do writing nodes")
    fs.writeFileSync(`${__dirname}/nodes.data`, JSON.stringify(nodes));

    // 然后把节点读出来写成配置
    buildConfigByNodes()
}
buildNodes();

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