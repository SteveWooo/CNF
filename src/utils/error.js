/**
 * Author : Create by SteveWooo at 2020/4/5
 * Updated: 2020/4/5
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */

/**
 * 统一处理错误，对于一些严重错误，只要不做trycatch，就能结束进程。
 * 对于普通错误只要catch住就能输出这里的错误信息
 * 这里后续要做统一做错误日志写盘。
 */
const print = require(`${__dirname}/print`);
const ERROR = {
    5004 : {
        msg : '系统传参错误'
    },
    5005 : {
        msg : '关键内存复用错误'
    },
    6001 : {
        msg : '数据包源格式错误'
    }
}
module.exports = function (code, msg){
    let logMessage = `${code} : ${ERROR[code].msg}`;
    print.error(logMessage);
    if(msg != undefined) {
        print.error(msg);
    }
    return logMessage;
}