const EDDSA = require("elliptic").eddsa;
const eddsa = new EDDSA("ed25519");
const { SHA256 } = require("crypto-js");
const ec  = require("elliptic");
const uuid = require('uuid'); //in production, we shouldnt use v1


class ChainUtil {


    //generate key pair from secret
    static genKeyPair(secret){
        return eddsa.keyFromSecret(secret);

    }


    static id(){
        return uuid.v1();
    }

    static hash(data) {
        return SHA256(JSON.stringify(data)).toString();
    }

    static verifySignature (publicKey,signature,dataHash) {
        return eddsa.keyFromPublic(publicKey).verify(dataHash,signature);
    }
}

module.exports = ChainUtil;