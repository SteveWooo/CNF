const fs = require('fs');

// 根据最终的floyd图，统计成excel图
async function main(){
    let dirs = fs.readdirSync(`${__dirname}/mats_originKad`)
    let result = []

    // 先对dir排序
    for(var i=0;i<dirs.length;i++) {
        for(var k=i+1;k<dirs.length;k++) {
            if(parseInt(dirs[i]) > parseInt(dirs[k])) {
                temp = dirs[i];
                dirs[i] = dirs[k];
                dirs[k] = temp
            }
        }
    }

    for(var i=0;i<dirs.length;i++) {
        var data = await handleDir(dirs[i])
        result.push(data)
    }
    handleResult(result)
}
main();

async function handleResult(result) {
    let nodeCount = ""
    let originAvgResult = ""
    let masterAreaAvgResult = ""
    let originMaxResult = ""
    let masterAreaMaxResult = ""
    for(var i=0;i<result.length;i++) {
        nodeCount += `${result[i].origin.nodeCount}\n`
    }
    for(var i=0;i<result.length;i++) {
        originAvgResult += `${result[i].origin.avgDistance}\n`
        originMaxResult += `${result[i].origin.maxDistance}\n`

        masterAreaAvgResult += `${result[i].masterArea.avgDistance}\n`
        masterAreaMaxResult += `${result[i].masterArea.maxDistance}\n`
    }

    let file = `nodeCount:\n${nodeCount}\n\noriginAvg:\n${originAvgResult}\n\noriginMax:\n${originMaxResult}\n\nmasterAreaAvg:\n${masterAreaAvgResult}\n\nmasterAreaMax:\n${masterAreaMaxResult}`;
    fs.writeFileSync(`${__dirname}/filaldata.data`, file)
}

async function handleDir(nodeCount) {
    let originKadMat = require(`${__dirname}/mats_originKad/${nodeCount}/floydMat.json`);
    let originKadMatData = await calculateMatData(originKadMat)
    // console.log(originKadMatData)

    let masterAreaKadMat = require(`${__dirname}/mats_masterAreaKad/${nodeCount}/floydMat.json`);
    let masterAreaKadMatData = await calculateMatData(masterAreaKadMat)
    // console.log(masterAreaKadMatData)

    return {
        origin: originKadMatData,
        masterArea : masterAreaKadMatData
    }
}

async function calculateMatData(mat) {
    // 平均节点间距离
    var sumDistance = 0
    // 最大节点间距离
    var maxDistance = 0
    var nodeCount = mat.length

    for (var i=0;i<mat.length;i++) {
        for(var k=i+1;k<mat.length;k++) {
            if (mat[i][k] > maxDistance) {
                maxDistance = mat[i][k]
            }

            sumDistance += mat[i][k]
        }
    }

    return {
        avgDistance : (sumDistance * 2) / (nodeCount * (nodeCount - 1)),
        maxDistance : maxDistance,
        nodeCount : nodeCount
    }
}
// async function main(){
//     var mat = require(`${__dirname}/mats/originFloydMat.json`)
    
//     console.log("开始计算")
//     for (var i=0;i<mat.length;i++) {
//         console.log(`完成：${i} / ${mat.length}`)
//         for(var k=0;k<mat.length;k++) {
//             if (mat[i][k] == "max") {
//                 mat[i][k] = Infinity
//             } else {
//                 mat[i][k] = parseInt(mat[i][k])
//             }
//             for(var j=0;j<mat.length;j++) {
//                 if (i == 0 || i == k || j == k) {
//                     continue
//                 }

//                 if (mat[j][k] > mat[j][i] + mat[i][k]) {
//                     mat[j][k] = mat[j][i] + mat[i][k]
//                 }
//             }
//         }
//     }

//     // 平均节点间距离
//     var sumDistance = 0
//     var maxDistance = 0
//     var nodeCount = mat.length

//     for (var i=0;i<mat.length;i++) {
//         for(var k=0;k<mat.length;k++) {
//             if (mat[i][k] > maxDistance) {
//                 maxDistance = mat[i][k]
//             }

//             sumDistance += mat[i][k]
//         }
//     }

//     console.log(`============= report ============
//  结点数：${nodeCount}
//  平均节点间距离：${sumDistance / (nodeCount * nodeCount)}
//  最大节点间距离：${maxDistance}
//  `)
// }
// main();