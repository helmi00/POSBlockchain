const { INITIAL_BALANCE } = require("../config");

class Account {
    constructor() {
        this.addresses = ["51344f39b80865174166521e16442d0ea545771a36c126cd20eecd99eadc4a9d",
                          "51344f39b80865174166521e16442d0ea545771a36c126cd20eecd99eadc4888",
                          "51344f39b80865174166521e16442d0ea545771a36c126cd20eecd99eadc4777"];
        this.balances = {"51344f39b80865174166521e16442d0ea545771a36c126cd20eecd99eadc4a9d":100,
                         "51344f39b80865174166521e16442d0ea545771a36c126cd20eecd99eadc4888":80,
                         "51344f39b80865174166521e16442d0ea545771a36c126cd20eecd99eadc4777":70
                         };
    }

    initialize(address) {
        if (this.balances[address] == undefined) {
            this.balances[address] = INITIAL_BALANCE;
            this.addresses.push(address);
        }
    }


    transfer(from, to, amount) {
    
        this.initialize(from);
        this.initialize(to);
        this.increment(to, amount);
        this.decrement(from, amount);
        
    }
    
    
    //send fee from transaction issuer to the block validator (leader)
    transferFee(block, transaction) {

        let amount = transaction.output.fee;
        let from = transaction.input.from;
        let to = block.validator;
        this.transfer(from, to, amount);
    
    }

    increment(to,amount) {
        this.balances[to] += amount;
    }

    decrement(from, amount) {
        this.balances[from] -= amount;
    }


    getBalance(address) {
        this.initialize(address);
        return this.balances[address];
    }


    updateAccounts(transaction) {
        let amount = transaction.output.amount;
        let from = transaction.input.from;
        let to = transaction.output.to;
        this.transfer(from, to, amount);
    }
}


module.exports = Account;