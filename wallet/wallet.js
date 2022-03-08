const ChainUtil = require("../chain-Util");
const Transaction = require("./transaction");
const {INITIAL_BALANCE} = require("../config");
const TransactionPool = require("./transaction-pool");



class Wallet {
    constructor(secret){
        this.balance = INITIAL_BALANCE;
        this.keyPair = ChainUtil.genKeyPair(secret);
        this.publicKey = this.keyPair.getPublic("hex");
    }


    toString(){
        return `Wallet -
                publicKey: ${this.publicKey.toString()}
                balance  : ${this.balance}`;
    }

    sign(dataHash) {
        return this.keyPair.sign(dataHash).toHex();
    }


    createTransaction(to, amount, type, blockchain, transactionPool) {
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
        
        console.log("verifying stake balance from create transaction function in wallet class: stake value is: ", blockchain.stakes.stakedBalances[this.getPublicKey()]);
        console.log("type: ", type);
        console.log("condition value: " ,(type == "UNSTAKE" && (blockchain.stakes.stakedBalances[this.getPublicKey()] < amount)));
        
        if (type == "UNSTAKE" && (blockchain.stakes.stakedBalances[this.getPublicKey()] == undefined)){
            console.log("this node has not yet been registered as a staker, please make sure that you have send a stake request and retry later after a few minutes (basically wait for the stake request gets executed in a new block");
            return;
        }

        if (type == "UNSTAKE" && (blockchain.stakes.stakedBalances[this.getPublicKey()] < amount)) {
            console.log(`Amount : ${amount} exceeds the current staked balance for this wallet/node : ${blockchain.stakes.stakedBalances[this.getPublicKey()]}`);
            return;
        }


        //console.log("transactin is about to be generated in wallet class");
        let transaction = Transaction.newTransaction(this, to, amount, type);
        //console.log("transaction created in createTransaction function from wallet.js", transaction);
        if (transaction != undefined) {transactionPool.addTransaction(transaction);}
        //console.log("added transaction to local pool");
        return transaction;
    }

    getBalance(blockchain) {
        return blockchain.getBalance(this.publicKey);
    }

    getPublicKey() {
        return this.publicKey;
    }
}

module.exports = Wallet;