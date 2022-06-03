import {genKeyPair} from "../chain-Util";
import {Transaction} from "./transaction";
import { INITIAL_BALANCE } from "../config";
import {TransactionPool} from "./transaction-pool";
//import { Address } from 'ethereumjs-util'
//const {Address} = require('node_modules/etheremjs-util/dist.browser/Address.js')



export class Wallet {
    balance: any;
    keyPair: any;
    publicKey: string;
    constructor(secret:any){
        this.balance = INITIAL_BALANCE;
        this.keyPair = genKeyPair(secret); //Old keypair algorithm using eddsa
        this.publicKey = '0x'+this.keyPair.getPublic("hex"); //Old keypair algorithm using eddsa
        
        //new key using ethereum-util/address : not working due to some error not recognizing the module
        /*this.keyPair = {
            privateKey: Buffer.from( secret, 'hex'),
            publicKey : Address.fromPrivateKey(privateKey)
        }
        this.publicKey = this.keyPair.publicKey;
        */
    }


    toString(){
        return `Wallet -
                publicKey: ${this.publicKey.toString()}
                balance  : ${this.balance}`;
    }

    sign(dataHash:any) {
        return this.keyPair.sign(dataHash).toHex();
    }


    createTransaction(to:string, amount:number, type:any, blockchain:any, transactionPool:any) {
        this.balance = this.getBalance(blockchain);

        if (type=="TRANSACTION" && (amount > this.balance)) {
            console.log( `Amount : ${amount} exceeds the current balance: ${this.balance}`);
            return;
        }

        if (type == "STAKE" && (blockchain.validators.list.indexOf(this.getPublicKey())==-1)){
            if(blockchain.validators.list.indexOf(this.getPublicKey())==-1){
                console.log(blockchain.validators.list);
                console.log("wallet public key: ", this.getPublicKey());
                console.log("index function result: ", blockchain.validators.list.indexOf(this.getPublicKey()));
            }
            console.log("this node is not a validator. Please make sure that you have sent a validator request and then retry later after a few minutes (until the validator transaction gets executed in a new block");
            return;

        }
        
        if (type == "UNSTAKE" && (blockchain.stakes.stakedBalances[this.getPublicKey()] == undefined)){
            console.log("this node has not yet been registered as a staker, please make sure that you have send a stake request and retry later after a few minutes (basically wait for the stake request gets executed in a new block");
            return;
        }

        if (type == "UNSTAKE" && (blockchain.stakes.stakedBalances[this.getPublicKey()] < amount)) {
            console.log(`Amount : ${amount} exceeds the current staked balance for this wallet/node : ${blockchain.stakes.stakedBalances[this.getPublicKey()]}`);
            return;
        }


        let transaction = Transaction.newTransaction(this, to, amount, type);
        
        if (transaction != undefined) {transactionPool.addTransaction(transaction);}
        return transaction;
    }

    getBalance(blockchain:any) {
        return blockchain.getBalance(this.publicKey);
    }

    getPublicKey() {
        return this.publicKey;
    }

    getPrivateKey() {
        return this.keyPair.getSecret('hex')
    }
}

