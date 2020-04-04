const Cnf = require(`${__dirname}/../Cnf`);
let cnf = new Cnf({
    CONFIG : {
        hello : 'world'
    }
})

console.log(cnf);
console.log(global.CNF);