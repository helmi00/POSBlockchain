const { TRANSACTION_THRESHOLD } = require("../config");
const Transaction = require ("./transaction");



class TransactionPool {
    constructor(){
        this.transactions = [];
    }


    addTransaction(transaction) {
        this.transactions.push(transaction);
        ///console.log("pool length", this.transactions.length);
      
    }


    transactionExists(transaction) {

        let exists = false;

        this.transactions.forEach(t => {
            if (t.id === transaction.id)
            exists = true;
            
        });
        
        return exists;
    }

    getThreshholdReached() { return this.transactions.length==TRANSACTION_THRESHOLD;}
    
    clear() {
        this.transactions = [];
    }


    

    validTransactions() {
        return this.transactions.filter(transaction => {
            if (!Transaction.verifyTransaction(transaction)) {
                console.log (`Invalid signature from ${transaction.data.from}`);
                return;
            }

            return transaction;
        });
    }


    

}


module.exports = TransactionPool;
