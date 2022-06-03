import { VALIDATOR_FEE } from "../config";

export class Validators {
    list: string[];
    constructor() {
        this.list = ["0x51344f39b80865174166521e16442d0ea545771a36c126cd20eecd99eadc4a9d"]; //the first node/peer to initialize the blockchain network will be automatically a validator with a wallet secret of "I am the first leader/node"
    }


    updateValidators(transaction:any) {

        if (transaction.output.amount == VALIDATOR_FEE && transaction.output.to == "0") {
            this.list.push(transaction.input.from);
            console.log("validators updated successfully");
            return true;
        }
        
        console.log("updating validators failed");
        
        return false;
    }


}