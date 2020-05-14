/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/5/10
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */
let Cnf = require(`${__dirname}/../Cnf.js`);

/**
 * 入口处实例化CNF，保留全局变量global.CNF
 */
async function main(){
    let cnf = new Cnf();

    /**
     * 注册网络消息事件回调，netCallback函数为业务主要函数的入口
     */
    await cnf.net.msg.registerMsgEvent({
        port : global.CNF.argv.port,
        netCallback : async function(data){
            console.log(`receive data : `);
            console.log(data);
            // 开始你的表演
        }
    })

    /**
     * 启动组网流程，从DNS seed出发寻找所有可用的节点
     */
    await cnf.net.node.startup();

    /**
     * 广播业务数据，由业务自行调用
     */
    await cnf.net.msg.send({
        msg : {} // 业务数据
    })
}
main()