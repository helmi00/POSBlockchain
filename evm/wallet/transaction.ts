import { id,hash,verifySignature } from "../chain-Util";
import { TRANSACTION_FEE } from "../config";



/*          TRANSACTION MODEL
{
    id: <here goes some identifier>
    type: <transactions type: stake,unstake,validator,transaction>
    input: {
            timestamp: <time of creation>,
            from: <senders address>,
            signature: <signature of the transaction>
           }
    output: {
             to: <receivers address>
             amount: <amount transfered>
             fee: <transactions fee>
            }
  }
*/




export class Transaction {
    id: string;
    type: any;
    input: any;
    output: any;
    constructor(){

        this.id = id();
        this.type = null;
        this.input = null;
        this.output = null;
    }

    //verify amount of sender before creating transaction
    static newTransaction(senderWallet:any, to:string, amount:number, type:any){
        
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

        return Transaction.generateTransaction(senderWallet, to, amount, type);

    }

    //generation transaction after verification
    static generateTransaction(senderWallet:any, to:any, amount:any, type:any) {

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
    static signTransaction(transaction:any, senderWallet:any) {
        transaction.input = {
            timestamp: Date.now(),
            from: senderWallet.getPublicKey(),
            signature: senderWallet.sign(hash(transaction.output))
        };
    }


    static verifyTransaction(transaction:any) {
        return verifySignature(
            transaction.input.from,
            transaction.input.signature,
            hash(transaction.output)
        );
    }



}
