import SHA256 from 'crypto-js/sha256';
import {verifySignature} from "../chain-Util";


export class Block {
    timestamp: any;
    lastHash: any;
    data: any;
    validator: any;
    signature: any;
    hash:any;
    constructor(timestamp:any, lastHash:any, hash:any, data:any, validator:any, signature:any) {
        this.timestamp = timestamp;
        this.lastHash = lastHash;
        this.hash = hash;
        this.data = data;
        this.validator = validator;
        this.signature = signature;
    }

    toString(){
        /*return `Block -
            Timestamp : ${this.timestamp}
            Last Hash : ${this.lastHash}
            Hash      : ${this.hash}
            Data      : ${JSON.stringify(this.data)} 
            Validator : ${this.validator}
            Signature : ${this.signature})`;  */
        return JSON.parse(JSON.stringify(this));
    }

    static genesis(){
        return new this(`genesis time`, "----", "genesis-hash", [],"","");
    }

    static hash(timestamp:any, lastHash:any, data:any){
        return SHA256(JSON.stringify(`${timestamp}${lastHash}${data}`)).toString();
    }


    static createBlock(lastBlock:any, data:any, wallet:any) {
        let hash;
        let timestamp = Date.now();
        const lastHash = lastBlock.hash;
        hash = Block.hash(timestamp, lastHash, data);


        //get the validator public key
        let validator = data.validator == undefined? wallet.getPublicKey(): data.validator;

        //sign the block
        let signature = data.signature == undefined ? Block.signBlockHash(hash, wallet): data.signature;

        return new this(timestamp, lastHash, hash, data, validator, signature);
    }


    
    //function with the purpose of verifying a block's hash is not tampered
    static blockHash(block:any){
        //destructuring
        const {timestamp, lastHash, data} = block;
        return Block.hash(timestamp,lastHash,data);
    }


    static signBlockHash(hash:any, wallet:any) {
        return wallet.sign(hash);
      }


    

    static verifyBlock(block:any) {
    return verifySignature(
      block.validator.slice(2),
      block.signature,
      Block.hash(block.timestamp, block.lastHash, block.data)
    );
    }

    static verifyLeader(block:any, leader:any){
        return block.validator === leader? true: false;
    }



    
}