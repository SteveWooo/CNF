/**
 * Author : Create by SteveWooo at 2020/4/4
 * Updated: 2020/4/5
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */

const net = require('net');
const print = require(`${__dirname}/../../utils/print`);
const Error = require(`${__dirname}/../../utils/Error`);
const HOST = '127.0.0.1';

/**
 * 初始化节点的tcp socket，然后在这里注册回调函数
 * @param port 本节点监听的端口
 * @param netCallback 数据回调函数
 */
module.exports = async function(param){
    if((typeof param.netCallback) !== 'function') {
        throw Error(5004, 'netCallback 参数错误');
    }
    /**
     * 服务端身份的SOCKET初始化
     */
    function serverSocketHandle(socket){
        print.info(`Was connected by ${socket.remoteAddress}:${socket.remotePort}`);
        console.log(socket);
        socket.on('data', async function(data){
            data = data.toString();
            /**
             * TODO 先检查包是否符合CNF通讯协议，然后把data封装成用户客制化可读模式，包括信息来源，具体信息等
             */

            /**
             * 回调通讯内容给客制化注册的函数，
             */
            await param.netCallback(data);
        })
    }
    let serverSocket = net.createServer(serverSocketHandle);
    serverSocket.listen(param.port, HOST);
    print.info(`Node listen at ${HOST}:${param.port}`);
    global.CNF.net.serverSocket = serverSocket;
}