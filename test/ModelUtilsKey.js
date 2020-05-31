const sign = require(`${__dirname}/../src/models/utils/sign`);
const fs = require('fs');

async function testSignModel(){
    
    // let key = sign.genKeys();
    let key = {
        privateKey : 'c70c5dcc0958294b25d012e9334b06bd9c75cd3c95b300d84d4ddc0925458395',
        publicKey : ''
    }
    key.publicKey = sign.getPublicKey(key.privateKey);
    console.log(key);
    let msg = "test";
    let signed = sign.sign(msg, key.privateKey);
    console.log(signed);
    let recoverPk = sign.recover(signed.signature, signed.recid, msg);
    console.log(recoverPk);
    console.log(`verify: ${sign.verify(signed.signature, msg, key.publicKey)}`);
}
// testSignModel();

async function genManyKeys(){
    let res = [];
    for(var i=0;i<10;i++) {
        let keys = sign.genKeys();
        res.push(keys);
    }
    // fs.writeFileSync(`${__dirname}/keys`, JSON.stringify(res));
}

genManyKeys();

