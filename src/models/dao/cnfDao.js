/**
 * Author : Create by SteveWooo at 2020/6/22
 * Updated: 2020/6/22
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 * 这个域主要处理数据问题
 */
const fs = require('fs');
let model = {

}

// 给业务使用的接口
let handle = {

}
model.handle = handle;

/**
 * 主要目的是构建基础数据目录，文件树架构。每次启动都要构建一趟，每个文件创建都独立trycatch，保证文件是动态建立的。
 */
let build = async function(){
    let dataDir = global.CNF.CONFIG.DATA_DIR;
    // 先创建基础数据目录
    try{
        fs.mkdirSync(dataDir);
    }catch(e) {}

    // 然后创建几个基础目录
    try{
        fs.mkdirSync(`${dataDir}/cnf`);
    }catch(e) {}
    try{
        fs.mkdirSync(`${dataDir}/cnf/net`); // net目录最好直接归net模块管，不用给dao模块插一脚了
    }catch(e) {}
    try{
        fs.mkdirSync(`${dataDir}/cnf/data`);
    }catch(e) {}

    // 广播包缓存文件，每次重启都清空一次缓存。
    try{
        fs.writeFileSync(`${dataDir}/cnf/net/brocastCache.json`, JSON.stringify({
            data : []
        }));
    }catch(e) {}
}
model.build = build;

module.exports = model;