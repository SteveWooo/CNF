/**
 * Author : Create by SteveWooo at 2020/4/5
 * Updated: 2020/4/5
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */

const net = require('net');
const print = require(`${__dirname}/../../utils/print`);
const Error = require(`${__dirname}/../../utils/Error`);

/**
 * 初始化客户端行为，做的事情就是定时监控连接状态，尽力保持8个对外连接。
 */
module.exports = async function(param){
    
}