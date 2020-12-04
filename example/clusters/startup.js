/**
 * Author : Create by SteveWooo at 2020/11/27
 * Updated: 2020/11/27
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */
let Cnf = require(`${__dirname}/../../Cnf.js`);
const path = require('path');
const Cluster = require("cluster");
const fs = require('fs');
const Express = require("express");
const print = require(`${__dirname}/../../src/utils/print.js`);

let nodes = [];
async function buildNodes(){
    let cnf = new Cnf();
    nodes = require(`${__dirname}/nodes.json`);
    for(var i=0;i<100;i++) {
        // let key = cnf.utils.sign.genKeys();
        // let conf = {
        //     "net" : {
        //         "localPrivateKey" : key.privateKey,
        //         "publicKey" : key.publicKey,
        //         "localhost" : "127.0.0.1",
        //         "discoverUdpPort" : 30000 + i,
        //         "connectionTcpServerPort" : 30000 + i,
        //         "seed" : []
        //     }
        // }

        // nodes.push(conf);
        // nodes[i].datadir = `${path.resolve(`${__dirname}/datas/${i}`)}`;
        nodes[i].net.networkid = 1;
    }
    fs.writeFileSync(`${__dirname}/nodes.json`, JSON.stringify(nodes));
}
// buildNodes();

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

    /**
     * Config datadir have to be rewrite in linux system.
     */
    conf.datadir = `${__dirname}/datas/${process.env.CONFIG_INDEX}`;

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
        // if (global.CNF.netData.connections.outBound.length == 0 && global.CNF.netData.connections.inBound.length == 0) {
        //     console.log("=====================");
        //     console.log(`processID: ${process.env.CONFIG_INDEX}`);

        //     console.log("tried bucket length:", global.CNF.netData.buckets.tried[0].length)
        //     console.log("new bucket length:", global.CNF.netData.buckets.new[0].length)
        //     console.log("trying bucket length:", global.CNF.netData.buckets.trying.length)
        //     console.log(`neighbor bucket length:`, global.CNF.netData.discover.neighbor.length)
        //     // console.log(global.CNF.netData.buckets.new[0])
        //     console.log(`inbound connect length :`, global.CNF.netData.connections.inBound.length)
        //     console.log(`outbound connect length:`, global.CNF.netData.connections.outBound.length)
        //     console.log(`temp connect length:`, global.CNF.netData.connections.temp.length)
        //     console.log(`doing shake :`, global.CNF.netData.discover.doingShake);
        // }
        
        if (process.env.CONFIG_INDEX == 0) {
            // console.log("=====================process0=========");
            // console.log("tried bucket length:", global.CNF.netData.buckets.tried[0].length)
            // console.log("new bucket length:", global.CNF.netData.buckets.new[0].length)
            // console.log("trying bucket length:", global.CNF.netData.buckets.trying.length)
            // console.log(`neighbor bucket length:`, global.CNF.netData.discover.neighbor.length)
            // // console.log(global.CNF.netData.buckets.new[0])
            // console.log(`inbound connect length :`, global.CNF.netData.connections.inBound.length)
            // console.log(`outbound connect length:`, global.CNF.netData.connections.outBound.length)
            // console.log(`temp connect length:`, global.CNF.netData.connections.temp.length)
            // console.log(`doing shake :`, global.CNF.netData.discover.doingShake);
            // for(var i=0;i<global.CNF.netData.buckets.tried[0].length;i++) {
            //     console.log(global.CNF.netData.buckets.tried[0][i].nodeId);
            // }

            // process.send(`tried bucket length: ${global.CNF.netData.buckets.tried[0].length}`);
        }

        let nodeStatus = {
            CONFIG : global.CNF.CONFIG,
            processID : process.env.CONFIG_INDEX,

            triedBucketLength : global.CNF.netData.buckets.tried[0].length,
            newBucketLength : global.CNF.netData.buckets.new[0].length,
            tryingBucketLength : global.CNF.netData.buckets.trying.length,
            neighborLength : global.CNF.netData.discover.neighbor.length,

            inBound : global.CNF.netData.connections.inBound.length,
            outBound : global.CNF.netData.connections.outBound.length,
            temp : global.CNF.netData.connections.temp.length,

            connections : global.CNF.netData.connections,
            buckets : global.CNF.netData.buckets,
        }

        process.send(nodeStatus);

        // console.log(`processID: ${process.env.CONFIG_INDEX}`, global.CNF.netData.buckets.tried[0].length);
    }, 500);
}

let masterStatus = {
    workers : [],

    nodes : {}
}

let masterEvents = {
    worker : {
        onMessage : async function(msg) {
            let nodeInfo = {
                nodeId : msg.CONFIG.net.publicKey,
                processID : msg.processID,
                connections : {
                    inBound : [],
                    outBound : []
                },

                update : +new Date()
            }

            // 链路情况
            for(var i=0;i<msg.connections.inBound.length;i++) {
                nodeInfo.connections.inBound.push(msg.connections.inBound[i].node.nodeId);
            }

            for(var i=0;i<msg.connections.outBound.length;i++) {
                nodeInfo.connections.outBound.push(msg.connections.outBound[i].node.nodeId);
            }

            masterStatus.nodes[nodeInfo.nodeId] = nodeInfo;
        }
    }
}

let masterJob = {
    httpServer : {
        init : async function(){
            let app = Express();

            app.use("/public", Express.static(`${__dirname}/frontEnd`));

            app.get("/api/node_status", async function(req, res) {
                res.send(JSON.stringify({
                    status : 2000,
                    nodes : masterStatus.nodes
                }));
            })
	    let port = 8081;
            app.listen(port, function(){
	    	print.info(`Node already listen at ${port}`);
	    })
        }
    }
}

async function main(){
    if(Cluster.isMaster) {
        for(var i=0;i<4;i++) {
            let worker = Cluster.fork({
                CONFIG_INDEX : i
            });

            worker.on('message', async function(msg){
                await masterEvents.worker.onMessage(msg);
            })

            masterStatus.workers.push(worker);
        }
    
        Cluster.on('exit', function(worker, code, signal){
            console.log(`worker: ${worker.process.pid} died`);
        })

        await masterJob.httpServer.init();
    } else {
        startup();
    }
}
main();
