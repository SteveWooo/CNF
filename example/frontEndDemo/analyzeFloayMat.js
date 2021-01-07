async function main(){
    var mat = require(`${__dirname}/mats/originFloydMat.json`)
    
    console.log("开始计算")
    for (var i=0;i<mat.length;i++) {
        console.log(`完成：${i} / ${mat.length}`)
        for(var k=0;k<mat.length;k++) {
            if (mat[i][k] == "max") {
                mat[i][k] = Infinity
            } else {
                mat[i][k] = parseInt(mat[i][k])
            }
            for(var j=0;j<mat.length;j++) {
                if (i == 0 || i == k || j == k) {
                    continue
                }

                if (mat[j][k] > mat[j][i] + mat[i][k]) {
                    mat[j][k] = mat[j][i] + mat[i][k]
                }
            }
        }
    }

    // 平均节点间距离
    var sumDistance = 0
    var maxDistance = 0
    var nodeCount = mat.length

    for (var i=0;i<mat.length;i++) {
        for(var k=0;k<mat.length;k++) {
            if (mat[i][k] > maxDistance) {
                maxDistance = mat[i][k]
            }

            sumDistance += mat[i][k]
        }
    }

    console.log(`============= report ============
 结点数：${nodeCount}
 平均节点间距离：${sumDistance / (nodeCount * nodeCount)}
 最大节点间距离：${maxDistance}
 `)
}
main();