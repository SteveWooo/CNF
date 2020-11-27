/**
 * Author : Create by SteveWooo at 2020/11/27
 * Updated: 2020/11/27
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */
let Cnf = require(`${__dirname}/../../Cnf.js`);
const Cluster = require("cluster");
const fs = require('fs');

let nodes = [];
async function buildNodes(){
    let cnf = new Cnf();
    for(var i=0;i<100;i++) {
        let key = cnf.utils.sign.genKeys();
        let conf = {
            "net" : {
                "localPrivateKey" : key.privateKey,
                "publicKey" : key.publicKey,
                "localhost" : "127.0.0.1",
                "discoverUdpPort" : 30000 + i,
                "connectionTcpServerPort" : 30000 + i,
                "seed" : []
            }
        }

        nodes.push(conf);
    }
    fs.writeFileSync(`${__dirname}/nodes.json`, JSON.stringify(nodes));
}
// buildNodes();

async function startup(){
    console.log(process.env.port)
}

async function main(){
    if(Cluster.isMaster) {
        for(var i=0;i<8;i++) {
            Cluster.fork({
                CONFIG_INDEX : i
            });
        }
    
        Cluster.on('exit', function(worker, code, signal){
            console.log(`worker: ${worker.process.pid} died`);
        })
    } else {
        startup();
    }
}
// main();
