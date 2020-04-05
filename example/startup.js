const Cnf = require(`${__dirname}/../Cnf`);
async function main(){
    let cnf = new Cnf({
        CONFIG : {
            hello : 'world'
        }
    })
    
    console.log(cnf);
    console.log(global.CNF);
}

main();