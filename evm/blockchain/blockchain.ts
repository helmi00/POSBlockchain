import {Block} from './block';
import {Stake} from './stake';
import {Account} from './account';
import {Validators} from './validator';
import {Wallet} from '../wallet/wallet';

const TRANSACTION_TYPE = {
    transaction: "TRANSACTION",
    stake: "STAKE",
    unstake: "UNSTAKE",
    validator_fee: "VALIDATOR_FEE"
};

export class Blockchain{
    chain: any[];
    stakes: any;
    accounts: any;
    validators: any;
    constructor(){
        this.chain = [Block.genesis()];
        this.stakes = new Stake();
        this.accounts = new Account();
        this.validators = new Validators();
    }

    //to add received block from the network, this function is to be executed by peer/validator
    /*addBlock(data, wallet) {
        //const block = Block.createBlock(this.chain[this.chain.length-1],data, wallet);
        this.chain.push(block);
        console.log("NEW BLOCK ADDED to local chain");
        return block;
    }*/

    //to add a new block to the local chain
    addBlock(newblock:any){
   

        this.chain.push(newblock);
        console.log("NEW BLOCK ADDED TO LOCAL CHAIN");
        
        if(Array.isArray(newblock.data)){ // verify if data is an array of transactions. if yes then execute them, if not, that means it's a bloc added directly by post /mine api with a simple string for data
            this.executeTransactions(newblock);
        }
        return newblock;
    }



    createBlock(data:any, wallet:any) {
        
        
        let newblock = Block.createBlock(this.chain[this.chain.length-1], data, wallet);
        
        return this.addBlock(newblock);

    }


    isValidBlock(block:any) {
        const lastBlock = this.chain[this.chain.length-1];

        /**
         * we must check:
         * - hash
         * - last hash
         * - signature
         * - leader
         */ 


        if (
            block.lastHash === lastBlock.hash &&
            block.hash === Block.blockHash(block) &&
            Block.verifyBlock(block) &&
            Block.verifyLeader(block, this.getLeader())
        ) {
            console.log("Block is valid by this node");
            
            this.addBlock(block);
            return true;

        } else if(block.hash === lastBlock.hash){
            
            console.log("Block already added to local chain\n-------------------------------------------------");
        
        
        } else{ 
            console.log("block is not valid by this node");
            return false;}
    }

    //execute all the transactions in a received block before adding it to the local chain.
    executeTransactions(block:any) {
        
        block.data.forEach((transaction: { type: any; input: { from: any; }; output: { amount: any; }; }) => {
            
            
            switch (transaction.type) {
                case TRANSACTION_TYPE.transaction:
                    
                    this.accounts.updateAccounts(transaction);
                    this.accounts.transferFee(block, transaction);
                    break;

                case TRANSACTION_TYPE.stake:
                    
                    this.stakes.updateStakers(transaction);
                    this.accounts.decrement(
                        transaction.input.from,
                        transaction.output.amount
                    );
                    this.accounts.transferFee(block, transaction);
                    
                    break;
                
                case TRANSACTION_TYPE.unstake:

                        this.stakes.updateStakers(transaction);
                        this.accounts.increment(
                            transaction.input.from,
                            transaction.output.amount
                        );
                        this.accounts.transferFee(block, transaction);

                case TRANSACTION_TYPE.validator_fee:
                        console.log("about to execute validator transaction : ",);
                        if (this.validators.updateValidators(transaction)) {
                            console.log("about to decrement balance");
                            this.accounts.decrement(
                                transaction.input.from,
                                transaction.output.amount //fixed fee that usually be sent to the special address 0 and automatically gets burned
                            );
                            console.log("balance decremented");
                            this.accounts.transferFee(block, transaction);
                        }

                        break;
            }
        });
        console.log("bloc execution completed");

    }

    isValidChain(chain:any){
        if(JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis())){

        return false;
        }
        
        for (let i = 1; i<chain.length; i++){
            const block = chain[i];
            const lastBlock = chain[i-1];
            if ((block.lastHash !== lastBlock.hash) || (block.hash !== Block.blockHash(block)))
            return false;
        }
        
        return true;
    }



    replaceChain(newBlockchain:any){
        if (newBlockchain.chain.length <= this.chain.length){
            console.log("Received chain is not longer than the current chain \n----------------------------------------------------");
            return;
        
        }else if(!this.isValidChain(newBlockchain.chain)){
            console.log("Received chain is invalid");
            return;

        }

        console.log("Replacing the current chain with the new chain \n-----------------------------------------------------");
        this.chain = newBlockchain.chain;
        this.accounts = newBlockchain.accounts;
        this.validators = newBlockchain.validators;
        this.stakes = newBlockchain.stakes;
    }


    getBalance(publicKey:any) {
        return this.accounts.getBalance(publicKey);
    }

    getLeader() {
        return this.stakes.getMax(this.validators.list);
    }


    


}
