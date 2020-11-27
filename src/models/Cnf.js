/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/7/29
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */

const path = require('path');
const fs = require('fs');
const print = require(`${__dirname}/../utils/print`);
const argv = require(`${__dirname}/../utils/argv`);
const Error = require(`${__dirname}/../utils/Error.js`);

module.exports = function() {
    let that = this;

    let cnf = {};
    /**
     * 拿控制台参数
     */
    cnf.argv = argv.getArgv();

    /**
     * 集成常用工具库，需要根据具体项目实施
     */
    cnf.utils = {
        print : require(`${__dirname}/../utils/print`),
        sign : require(`${__dirname}/utils/sign`),
    }

    /**
     * 在构建函数中统一调用初始化函数。目的是构建global.CNF中的对象数据结构
     */
    cnf.build = async function(param){
        param = param || {}

        global.CNF.CONFIG = {};
        if(param.config == undefined) {
            print.error("启动配置不可置空");
            return ;
        }

        // TODO：需要做到只选用有用的配置项目，无用项目不需要载入，必要项目若空则报错退出。
        global.CNF.CONFIG = param.config
        
        // 直接用当前目录
        if (global.CNF.argv['datadir'] != undefined) {
            global.CNF.CONFIG.DATA_DIR = `${path.resolve()}/${global.CNF.argv['datadir']}`
        } else {
            global.CNF.CONFIG.DATA_DIR = `${path.resolve()}/dataDir`
        }

        /**
         * 全局调用的一些状态
         */
        global.CNF.state = {
            
        }

        /**
         * 全局网络状态
         */
        global.CNF.netData = {
            // 节点唯一标识
            nodeId : '',

            // 节点发现服务的对象
            discover : {},

            // 服务端身份的socket，在net.connection中设置这个socket
            serverSocket : undefined,

            /**
             * 节点连接状态，包括对外连接和对内链接的Node，其中这些Node都带有socket属性
             * 这个数据在cnfNet中详细初始化。
             */
            connections : {},

            /**
             * 消息池，其他节点发来的消息，全部先丢到这个池子里面，然后定期捞出来，捞出来callback给业务
             */
            msgPool : [],

            /**
             * 广播消息的缓存，防止广播风暴
             */
            brocastCache : [],

            /**
             * 路由桶，主要为寻址服务
             * 这个数据结构在cnfNet中做详细的初始化，以那个函数的数据结构为准。
             */
            buckets : {}
        }

        /**
         * 一些内部函数入口，比如网络和dao的初始化
         * 并注入对业务方开放的handle部分
         */
        let cnfNet = require(`${__dirname}/net/cnfNet`);
        global.CNF.net = cnfNet.handle();

        /**
         * 一些数据库的内部函数入口
         */
        let cnfDao = require(`${__dirname}/dao/cnfDao`);

        /**
         * 对外开放的读写接口，主要针对区块读写和交易缓存读写
         */
        global.CNF.dao = cnfDao.handle;

        await cnfDao.build();
        await cnfNet.build();
    }

    /**
     * 实例化函数的目的只是创建一个全局变量
     */
    global.CNF = cnf;

    return global.CNF;
}