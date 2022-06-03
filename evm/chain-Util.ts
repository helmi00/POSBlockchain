const EDDSA = require("elliptic").eddsa;
const eddsa = new EDDSA("ed25519");
import { SHA256 } from "crypto-js";
import {v1} from 'uuid'; //in production, we shouldnt use v1





    //generate key pair from secret
    export  function genKeyPair(secret:any){
        return eddsa.keyFromSecret(secret);

    }


    export  function id(){
        return v1();
    }

    export  function hash(data:any) {
        return SHA256(JSON.stringify(data)).toString();
    }

    export  function verifySignature(publicKey:any,signature:any,dataHash:any) {
        return eddsa.keyFromPublic(publicKey).verify(dataHash,signature);
    }


