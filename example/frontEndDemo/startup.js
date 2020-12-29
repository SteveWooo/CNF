const Express = require("express")
const Cluster = require("cluster")
const Dgram = require("dgram")

var masterStatus = {
    nodes : {},
    updateNodes : async function(jsonData){
        // console.log(jsonData)
        masterStatus.nodes[jsonData["nodeID"]] = jsonData
    }
}

let masterJob = {
    httpServer : {
        init : async function(){
            let app = Express();

            app.use("/public", Express.static(`${__dirname}/public`));

            app.get("/api/node_status", async function(req, res) {
                // 清掉没有心跳的节点
                let now = +new Date();
                // for(var nodeId in masterStatus.nodes) {
                //     if (now - masterStatus.nodes[nodeId].update >= 5000) {
                //         masterStatus.nodes[nodeId].nodeStatus = 'disconnect';
                //     }
                // }

                res.send(JSON.stringify({
                    status : 2000,
                    nodes : masterStatus.nodes
                }));
            })

            app.post("/api/update_node_status", async function(req, res) {
                var body = '', jsonStr;
                req.on('data', async function (chunk) {
                    body += chunk; //读取参数流转化为字符串
                });
                req.on('end', async function () {
                    //读取参数流结束后将转化的body字符串解析成 JSON 格式
                    try {
                        jsonStr = JSON.parse(body);

                        for(var nodeID in jsonStr) {
                            await masterStatus.updateNodes(jsonStr[nodeID])
                        }

                        res.send(JSON.stringify({
                            status : 2000,
                        }));
                    } catch (err) {
                        res.send(JSON.stringify({
                            status : 4000,
                        }));
                        jsonStr = null;
                    }
                })
            })

            let port = 8081;
            app.listen(port, function(){
                console.log("app listen : " + port)
            })

            // udp服务器
            let udpSoceket = Dgram.createSocket("udp4")
            udpSoceket.on("listening", async function(){
                console.log("udp server listen at : " + port)
            })
    
            udpSoceket.on("message", async function(message, remote){
                message = message.toString().split("\r\n")[0]
                let data ;
                try{
                    data = JSON.parse(message)
                }catch(e) {
                    console.log(e)
                }

                await masterStatus.updateNodes(data)
            })
    
            udpSoceket.bind({
                exclusive : true,
                address : "127.0.0.1",
                port : port
            })
        }
    }
}

async function main(){
    if(Cluster.isMaster) {
        Cluster.fork()
    } else {
        await masterJob.httpServer.init();
    }
}
main();