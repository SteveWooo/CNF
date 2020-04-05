/**
 * Author : Create by SteveWooo on 2020/4/5
 * Updated: 2020/4/5
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */

/**
 * 封装一些常用的控制台long（为了好看
 */
let print = {
    info : function(msg){
        console.log(new Date() + '\033[42;37m√ => ' + msg + '\033[0m ');
    },
    error : function(msg){
        console.log(new Date() + 'x => \033[41;37m ' + msg + '\033[0m ');
    }
}

module.exports = print;