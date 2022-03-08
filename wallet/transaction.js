const { send } = require("express/lib/response");
const ChainUtil = require("../chain-Util");
const { TRANSACTION_FEE } = require("../config");



/*          TRANSACTION MODEL
{
    id: <here goes some identifier>
    type: <transactions type: stake,validator,transaction>
    input: {
            timestamp: <time of creation>,
            from: <senders address>,
            signature: <signature of the transaction>
           }
    output: {
             to: <recievers address>
             amount: <amount transfered>
             fee: <transactions fee>
            }
  }
*/




class Transaction {
    constructor(){

        this.id = ChainUtil.id();
        this.type = null;
        this.input = null;
        this.output = null;
    }

    //verify amount of sender before creating transaction
    static newTransaction(senderWallet, to, amount, type){
        if (type == "UNSTAKE"){
            if (amount + senderWallet.balance < TRANSACTION_FEE){
                console.log("the amount to be unstaked + the current balance of this wallet/node < TRANSACTION FEE");
                return;
            }
        } else{
            
            if(amount + TRANSACTION_FEE > senderWallet.balance){
                console.log('not enough balance');
                return;
                }
        }
        //console.log("about to generate a new transaction in transaction class");
        return Transaction.generateTransaction(senderWallet, to, amount, type);

    }

    //generation transaction after verification
    static generateTransaction(senderWallet, to, amount, type) {

        const transaction = new this();
        transaction.type = type;
        transaction.output = {
            to: to,
            amount: amount,
            fee: TRANSACTION_FEE
        };
        Transaction.signTransaction(transaction,senderWallet);
        return transaction;
    }

    //signing the transactoin with sender's key
    static signTransaction(transaction, senderWallet) {
        transaction.input = {
            timestamp: Date.now(),
            from: senderWallet.getPublicKey(),
            signature: senderWallet.sign(ChainUtil.hash(transaction.output))
        };
    }


    static verifyTransaction(transaction) {
        return ChainUtil.verifySignature(
            transaction.input.from,
            transaction.input.signature,
            ChainUtil.hash(transaction.output)
        );
    }



}

module.exports = Transaction;