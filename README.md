# CNF.js - 共识协议工具
一个部署即用的多节点区块链共识协议开发工具✌️
详情请往下翻👇
## 安装
### node.js
```bash
git clone https://github.com/stevewooo/cnf
cd cnf
npm i
```
## 部署
### 配置
参考 example/mulNodes/config1.json中的配置。
##### 重要字段：
1. 🔑localPrivateKey char(32) : 每个节点的唯一标示的生成密钥，请保证全局唯一配置
2. 😁discoverUdpPort int: 节点发现服务的UDP端口，同一个容器中不可重复
3. 🔗connectionTcpServerPort int : 节点连接时用的TCP端口，建议与udp端口保持一致
4. 🌲seed array : 节点种子，启动节点的时候会主动尝试连接seed列表中的节点，然后再依赖节点发现服务，连接更多节点

### 使用

##### 启动脚本demo (startup.js)
```javascript
let Cnf = require(`${__dirname}/cnf/Cnf.js`);
async function main(){
    let cnf = new Cnf();
	// 构建
    await cnf.build();
    /**
     * 注册网络消息事件回调，netCallback函数为业务主要函数的入口
     */
    await cnf.net.msg.registerMsgEvent({
        netCallback : async function(data){
            console.log(`receive data : `);
            console.log(data.msg);
			// 业务核心逻辑在这里调用
        }
    })

    /**
     * 启动组网流程，从seed出发寻找所有可用的节点
     */
    await cnf.net.node.startup();

    /**
     * 广播业务数据，由业务自行调用
     */
    await cnf.net.msg.brocast(JSON.stringify({
            hello : 'world'
        }))
}
main()
```
##### 启动命令
```bash
node startup.js -config config1.json #配置
```
