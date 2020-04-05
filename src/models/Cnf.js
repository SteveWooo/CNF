/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/4/5
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */

const path = require('path');
const fs = require('fs');
const argv = require(`${__dirname}/../utils/argv`)

module.exports = function(param) {
    let that = this;
    /**
     * 这个对象存全局，文档要说明这个全局对象不能覆盖
     */
    let globalCNF = {};

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
     * 全局调用的一些状态，比如节点连接状态
     */
    globalCNF.state = {
        sockets : {}
    }

    /**
     * 拿控制台参数
     */
    globalCNF.argv = argv.getArgv();

    global.CNF = globalCNF;

    /**
     * 对外开放的读写接口，主要针对区块读写和交易缓存读写
     */
    this.dao = {
        init : require(`${__dirname}/../services/dao/init`),
    }

    /**
     * 对外开放的网络接口，主要解决发包和收包回调注册的问题
     */
    this.net = {
        init : require(`${__dirname}/../services/net/init`),
    }

    /**
     * 集成常用工具库，需要根据具体项目实施
     */
    this.utils = {
        print : require(`${__dirname}/../utils/print`),
    }

    return this;
}