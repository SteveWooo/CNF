let Cnf = require(`${__dirname}/../../Cnf.js`);
const fs = require('fs')

let nodes = [];
const NODE_COUNT = 50000
async function buildNodes(){
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
                "ip" : "127.0.0.1",
                "servicePort" : port + "",
                "masterServer" : i % N == 0 ? "true" : "false",
                "seed" : [],
                "maxSeedCount" : "1000",
                "networkid" : "1",
                "publicChanelLength" : N + ""
            },
            "number" : i + ""
        }
        nodes.push(conf);
        // nodes[i].datadir = `${path.resolve(`${__dirname}/datas/${i}`)}`;
    }
    // console.log(nodes)

    // 设置拓扑（种子）
    for(var i=0;i<nodes.length;i++) {
        // 整十节点做中央节点，中央节点令牌轮回
        if (i % 10 == 0) {
            let nextSeedIndex = i + 10
            if (nextSeedIndex >= NODE_COUNT) {
                nextSeedIndex = 0
            }
            nodes[i]["net"]["seed"].push({
                "nodeID" : nodes[nextSeedIndex].net.publicKey,
                "ip" : nodes[nextSeedIndex].net.ip,
                "servicePort" : nodes[nextSeedIndex].net.servicePort
            })
        }

        if (i % 10 != 0){
            let seedIndex = Math.floor(i / 10) * 10
            nodes[i]["net"]["seed"].push({
                "nodeID" : nodes[seedIndex].net.publicKey,
                "ip" : nodes[seedIndex].net.ip,
                "servicePort" : nodes[seedIndex].net.servicePort
            })
        }

        // 一个节点紧接着下一个节点
        // let nextSeedIndex = i + 1
        // if (nextSeedIndex >= NODE_COUNT) {
        //     nextSeedIndex = 0
        // }
        // nodes[i]["net"]["seed"].push({
        //     "nodeID" : nodes[nextSeedIndex].net.publicKey,
        //     "ip" : nodes[nextSeedIndex].net.ip,
        //     "servicePort" : nodes[nextSeedIndex].net.servicePort
        // })
    }

    console.log("do writing")

    fs.writeFileSync(`${__dirname}/../../../../GOPATH/src/github.com/cnf_core/config/test1WComplex.json`, JSON.stringify(nodes));

    // for(var i=0;i<nodes.length;i++) {
    //     fs.writeFileSync(`${__dirname}/test10WComplex/node_${i}.json`, JSON.stringify(nodes[i]));
    //     if (i % 10000 == 0) {
    //         console.log("done: " + i)
    //     }
    // }
}
buildNodes();