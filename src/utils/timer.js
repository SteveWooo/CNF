/**
 * Author : Create by SteveWooo at 2020/4/8
 * Updated: 2020/4/8
 * Email  : SteveWoo23@gmail.com
 * Github : https://github.com/stevewooo
 */

exports.sleep = async function(time){
    return new Promise(resolve=>{
        setTimeout(function(){
            resolve();
        }, time);
    })
}