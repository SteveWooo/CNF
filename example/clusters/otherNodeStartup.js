/**
 * Author : Create by SteveWooo at 2020/11/30
 * Updated: 2020/11/27
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */
let Cnf = require(`${__dirname}/../../Cnf.js`);
const path = require('path');
const Cluster = require("cluster");
const fs = require('fs');

async function startup(){
    let configFile = require(`${__dirname}/nodes.json`);
    let conf = configFile[process.env.CONFIG_INDEX];

    /**
     * 配置处理逻辑
     * 弄出几个种子节点，然后其他节点就连接种子节点。
     */
    let seedFile = undefined;
    if (process.env.CONFIG_INDEX != 0 && process.env.CONFIG_INDEX != 1 && process.env.CONFIG_INDEX != 2) {
        seedFile = configFile[process.env.CONFIG_INDEX % 3];
        conf.net.seed.push({
            "nodeId" : seedFile.net['publicKey'],
            "ip" : seedFile.net["localhost"],
            "tcpport" : seedFile.net["discoverUdpPort"],
            "udpport" : seedFile.net["connectionTcpServerPort"]
        })
    } else {
        // 把另外两个种子都加进来
        for(var i=0;i<3;i++) {
            if (i == process.env.CONFIG_INDEX) {
                continue ;
            }
            seedFile = configFile[i];
            conf.net.seed.push({
                "nodeId" : seedFile.net['publicKey'],
                "ip" : seedFile.net["localhost"],
                "tcpport" : seedFile.net["discoverUdpPort"],
                "udpport" : seedFile.net["connectionTcpServerPort"]
            })
        }
    }

    // 关掉邻居接收
    // conf.net.neighborReceive = false;
    conf.net.MAX_INBOUND = 1;

    /**
     * 把上面的配置载入
     */
    let cnf = new Cnf();
    await cnf.build({
        config : conf
    });

    /**
     * 注册网络消息事件回调，netCallback函数为业务主要函数的入口
     */
    await cnf.net.msg.registerMsgEvent({
        netCallback : async function(data){
            // console.log(`receive data : `);
            // console.log(data.msg);
            // await cnf.net.msg.send(data.socket, 'receive');
            
            
            console.log(`processID: ${process.env.CONFIG_INDEX}`, global.CNF.netData.buckets.tried[0].length)
        }
    })

    /**
     * 启动组网流程，从seed出发寻找所有可用的节点
     */
    await cnf.net.node.startup();
    nodes = require(`${__dirname}/nodes.json`);

    setInterval(async function(){
        console.log("=====================process=========");
        console.log("tried bucket length:", global.CNF.netData.buckets.tried[0].length)
        console.log("new bucket length:", global.CNF.netData.buckets.new[0].length)
        console.log("trying bucket length:", global.CNF.netData.buckets.trying.length)
        console.log(`neighbor bucket length:`, global.CNF.netData.discover.neighbor.length)
        // console.log(global.CNF.netData.buckets.new[0])
        console.log(`inbound connect length :`, global.CNF.netData.connections.inBound.length)
        console.log(`outbound connect length:`, global.CNF.netData.connections.outBound.length)
        console.log(`temp connect length:`, global.CNF.netData.connections.temp.length)
        console.log(`doing shake :`, global.CNF.netData.discover.doingShake);
        // console.log(`processID: ${process.env.CONFIG_INDEX}`, global.CNF.netData.buckets.tried[0].length);
    }, 500);
}

async function main(){
    if(Cluster.isMaster) {
        for(var i=0;i<1;i++) {
            Cluster.fork({
                CONFIG_INDEX : 40 + i
            });
        }
    
        Cluster.on('exit', function(worker, code, signal){
            console.log(`worker: ${worker.process.pid} died`);
        })
    } else {
        startup();
    }
}
main();