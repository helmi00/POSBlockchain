const Block = require('./block');
const Stake = require('./stake');
const Account = require('./account');
const Validators = require('./validator');
const Wallet = require('../wallet/wallet');

const TRANSACTION_TYPE = {
    transaction: "TRANSACTION",
    stake: "STAKE",
    unstake: "UNSTAKE",
    validator_fee: "VALIDATOR_FEE"
};

class Blockchain{
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
    
    addBlock(newblock ){
   

        this.chain.push(newblock);
        console.log("new block added to local chain");
        
        if(Array.isArray(newblock.data)){ // verify if data is an array of transaction. if yes then execute them, if not, that means it's a bloc added directly by post /mine api with a simple string for data
            this.executeTransactions(newblock);
        }
        return newblock;
    }



    createBlock(data, wallet) {
        
        
        let newblock = Block.createBlock(this.chain[this.chain.length-1], data, wallet);
        
        return this.addBlock(newblock);

    }


    isValidBlock(block, wallet) {
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
            
            this.addBlock(block,wallet);
            return true;

        } else if(block.hash === lastBlock.hash){
            
            console.log("Block already added to local chain\n-------------------------------------------------");
        
        
        } else{ 
            console.log("block is not valid by this node");
            return false;}
    }

    //execute all the transactions in a received block before adding it to the local chain.
    executeTransactions(block) {
        
        block.data.forEach(transaction => {
            //console.log("showing transaction before executing it: ", transaction);  
            
            
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

    isValidChain(chain){
        if(JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis())){
        //console.log("fist block is not a genesis: ",JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis()));
        //console.log(JSON.stringify(chain[0]));
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



    replaceChain(newBlockchain){
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


    getBalance(publicKey) {
        return this.accounts.getBalance(publicKey);
    }

    getLeader() {
        return this.stakes.getMax(this.validators.list);
    }


    


}

module.exports = Blockchain;