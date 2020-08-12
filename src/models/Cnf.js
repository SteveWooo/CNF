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

module.exports = function(param) {
    let that = this;
    param = param || {};
    /**
     * 这个对象存全局，文档要说明这个全局对象不能覆盖 
     */
    let globalCNF = {};
    // 禁止重复创建对象。
    if(global.CNF !== undefined) {
        throw Error(5005);
    }

    /**
     * 拿控制台参数
     */
    globalCNF.argv = argv.getArgv();

    /**
     * 全局可用的配置，以及一些默认配置。先从参数中拿到配置文件位置，然后读出来。如果参数没有，就拿默认启动目录下的。
     */
    globalCNF.CONFIG = {};
    if(param.config == undefined) {
        let configPath = globalCNF.argv['config'] || `${path.resolve()}/config.json`;
        param.config = require(`${path.resolve(configPath)}`);
    }
    // 载入配置
    if(param.config != undefined) {
        for(var i in param.config) {
            globalCNF.CONFIG[i] = param.config[i];
        }
    } else {
        throw new Error(50041);
    }
    // 直接用当前目录
    globalCNF.CONFIG.DATA_DIR = `${path.resolve()}/${globalCNF.argv['datadir']}` || `${path.resolve()}/dataDir`;

    /**
     * 全局调用的一些状态
     */
    globalCNF.state = {
        
    }

    /**
     * 全局网络状态
     */
    globalCNF.netData = {
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

    global.CNF = globalCNF;

    /**
     * 一些内部函数入口，比如网络和dao的初始化
     * 并注入对业务方开放的handle部分
     */
    let cnfNet = require(`${__dirname}/net/cnfNet`);
    global.CNF.net = cnfNet.handle();
    
    /**
     * 集成常用工具库，需要根据具体项目实施
     */
    global.CNF.utils = {
        print : require(`${__dirname}/../utils/print`),
        sign : require(`${__dirname}/utils/sign`),
    }

    /**
     * 一些数据库的内部函数入口
     */
    let cnfDao = require(`${__dirname}/dao/cnfDao`);

    /**
     * 对外开放的读写接口，主要针对区块读写和交易缓存读写
     */
    global.CNF.dao = cnfDao.handle;

    /**
     * 在构建函数中统一调用初始化函数。目的是构建global.CNF中的对象数据结构
     */
    global.CNF.build = async function(){
        await cnfDao.build();
        await cnfNet.build();
    }

    return global.CNF;
}