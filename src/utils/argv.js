/**
 * Author : Create by SteveWooo at 2020/4/5
 * Updated: 2020/4/5
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */

/**
* 拿进程参数，参数格式为 -key value
*/
function getArgv(){
	var argv = {};
	for(var i=2;i<process.argv.length;i++){
		if(process.argv[i].indexOf("-") == 0){
			argv[process.argv[i].replace("-","")] = process.argv[i + 1];
		}
	}
	return argv;
}

exports.getArgv = getArgv;