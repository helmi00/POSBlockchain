const { VALIDATOR_FEE } = require("../config");

class Validators {
    constructor() {
        this.list = ["51344f39b80865174166521e16442d0ea545771a36c126cd20eecd99eadc4a9d"]; //the first node/peer to initialize the blockchain network will be automatically a validator with a wallet secret of "I am the first leader/node"
    }


    updateValidators(transaction) {
        //console.log("showing general condition verified of validator ",(transaction.output.amount == VALIDATOR_FEE && transaction.output.to == "0" ));
        //console.log("showing first condition of fee:    transaction amount = ", transaction.output.amount, " condition result: ", transaction.output.amount == VALIDATOR_FEE);
        //console.log("showing second condition of to address:     transaction.to address: ", transaction.output.to, " condition result: ", transaction.output.to =="0");
        if (transaction.output.amount == VALIDATOR_FEE && transaction.output.to == "0") {
            //console.log("condition verified");
            this.list.push(transaction.input.from);
            //console.log("validators updated successfully: ", this.list);
            return true;
        }
        //console.log("update failed");
        return false;
    }


}

module.exports = Validators;