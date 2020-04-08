/**
 * Author : Create by SteveWooo at 2020/4/5
 * Updated: 2020/4/8
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */

const net = require('net');
const print = require(`${__dirname}/../../utils/print`);
const timer = require(`${__dirname}/../../utils/timer`);
const Error = require(`${__dirname}/../../utils/Error`);

/**
 * 初始化客户端行为，不断尝试连接，达到8个outBound的目标。
 * 如果bucket全为空，则调用DNS seed进行连接
 */
async function init(param){
    while(true) {
        print.info('try try');

        await timer.sleep(5000);
    }
}

/**
 * 初始化客户端行为，做的事情就是定时监控连接状态，尽力保持8个对外连接。
 */
module.exports = async function(param){
    await init(param);
}