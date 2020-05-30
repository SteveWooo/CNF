/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/5/10
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
     * 全局可用的配置，以及一些默认配置
     */
    globalCNF.CONFIG = {};
    // 载入配置
    if(param.config != undefined) {
        for(var i in param.config) {
            globalCNF.CONFIG[i] = param.config[i];
        }
    }
    // 直接用当前目录
    globalCNF.CONFIG.DATA_DIR = path.resolve();

    /**
     * 全局调用的一些状态
     */
    globalCNF.state = {
        
    }

    /**
     * 全局网络状态
     */
    globalCNF.net = {
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
         * 路由桶，主要为寻址服务
         * 这个数据结构在cnfNet中做详细的初始化，以那个函数的数据结构为准。
         */
        buckets : {}
    }

    /**
     * 拿控制台参数
     */
    globalCNF.argv = argv.getArgv();
    global.CNF = globalCNF;

    /**
     * 一些内部函数入口，比如网络和dao的初始化
     * 并注入对业务方开放的handle部分
     */
    let cnfNet = require(`${__dirname}/net/cnfNet`);
    this.net = cnfNet.handle();
    
    /**
     * 集成常用工具库，需要根据具体项目实施
     */
    this.utils = {
        print : require(`${__dirname}/../utils/print`),
    }

    /**
     * 一些数据库的内部函数入口
     */
    let cnfDao = {
        init : require(`${__dirname}/../services/dao/init`),
    }

    /**
     * 对外开放的读写接口，主要针对区块读写和交易缓存读写
     */
    this.dao = {
        
    }

    /**
     * 在构建函数中统一调用初始化函数。目的是构建global.CNF中的对象数据结构
     */
    this.build = async function(){
        await cnfDao.init();
        await cnfNet.init();
    }

    return this;
}