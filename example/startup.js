const Cnf = require(`${__dirname}/../Cnf`);
async function main(){
    let cnf = new Cnf({
        CONFIG : {
            NET : {
                MAX_INBOUND : 117,
                MAX_OUTBOUND : 8
            }
        }
    })

    await cnf.startup({
        port : global.CNF.argv.port,
        netCallback : async function(data){
            console.log(`receive data : `);
            console.log(data);
        }
    });
}
main();
