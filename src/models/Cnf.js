/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/4/5
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */

const path = require('path');
const fs = require('fs');
const print = require(`${__dirname}/../utils/print`);
const argv = require(`${__dirname}/../utils/argv`);
const Error = require(`${__dirname}/../utils/Error`);

module.exports = function(param) {
    let that = this;
    /**
     * 这个对象存全局，文档要说明这个全局对象不能覆盖
     */
    let globalCNF = {};
    // 禁止重复创建对象。
    if(global.CNF !== undefined) {
        throw Error(5005);
    }

    /**
     * 全局可用的配置，以及一些默认配置
     */
    globalCNF.CONFIG = param.CONFIG;
    if(globalCNF.CONFIG.dataDir == undefined) {
        /**
         * 默认数据目录就用执行程序的当前目录
         */
        globalCNF.CONFIG.dataDir = path.resolve();
    }

    /**
     * 全局调用的一些状态
     */
    globalCNF.state = {
        
    }

    /**
     * 全局网络状态
     */
    globalCNF.net = {
        // 服务端和客户端身份的socket
        serverSocket : undefined,
        client : {

        },

        /**
         * 节点连接状态，包括对外连接和对内链接。
         */
        connections : {
            inBound : {},
            outBound : {}
        },

        /**
         * 路由桶，先写内存，后续写入硬盘
         */
        buckets : {
            tried : {},
            new : {}
        }
    }

    /**
     * 拿控制台参数
     */
    globalCNF.argv = argv.getArgv();

    global.CNF = globalCNF;

    /**
     * 一些内部函数入口，比如网络和dao的初始化
     */
    let cnfNet = {
        initServer : require(`${__dirname}/../services/net/initServer`),
        initClient : require(`${__dirname}/../services/net/initClient`),
    }
    let cnfDao = {
        init : require(`${__dirname}/../services/dao/init`),
    }

    /**
     * 对外开放的读写接口，主要针对区块读写和交易缓存读写
     */
    this.dao = {
        
    }

    /**
     * 对外开放的网络接口，主要解决发包和收包回调注册的问题
     */
    this.net = {
        
    }

    /**
     * 集成常用工具库，需要根据具体项目实施
     */
    this.utils = {
        print : require(`${__dirname}/../utils/print`),
    }

    /**
     * 节点初始化入口，由于配置都存全局，所以不需要传什么参数。
     * 1、dao初始化
     * 2、网络初始化，包括服务端与客户端身份
     * @param netCallback 数据包回调函数
     */
    this.startup = async function(param){
        print.info(`Node starting ...`);
        await cnfDao.init();
        await cnfNet.initServer({
            port : param.port,
            netCallback : param.netCallback
        });
        await cnfNet.initClient();
        print.info(`Node started ! `);
    }

    return this;
}