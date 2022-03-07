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

        if (amount > this.balance) {
            console.log( `Amount : ${amount} exceeds the current balance: ${this.balance}`);
            return;
        }


        //console.log("transactin is about to be generated in wallet class");
        let transaction = Transaction.newTransaction(this, to, amount, type);
        //console.log("transaction created in createTransaction function from wallet.js", transaction);
        transactionPool.addTransaction(transaction);
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