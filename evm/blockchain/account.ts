import { INITIAL_BALANCE } from "../config";

export class Account {
    addresses: string[];
    balances :any
    constructor() {
        this.addresses = ["0x51344f39b80865174166521e16442d0ea545771a36c126cd20eecd99eadc4a9d",
                          "0x51344f39b80865174166521e16442d0ea545771a36c126cd20eecd99eadc4888",
                          "0x51344f39b80865174166521e16442d0ea545771a36c126cd20eecd99eadc4777"];
        this.balances = {"0x51344f39b80865174166521e16442d0ea545771a36c126cd20eecd99eadc4a9d":100,
                         "0x51344f39b80865174166521e16442d0ea545771a36c126cd20eecd99eadc4888":80,
                         "0x51344f39b80865174166521e16442d0ea545771a36c126cd20eecd99eadc4777":70
                         };
    }

    initialize(address:any) {
        if (this.balances[address] == undefined) {
            this.balances[address] = INITIAL_BALANCE;
            this.addresses.push(address);
            console.log("address ", address, " has been initialized with balance of: ", this.balances[address])
        }
    }


    transfer(from:string, to:string, amount:number) {
    
        this.initialize(from);
        this.initialize(to);
        this.increment(to, amount);
        this.decrement(from, amount);
        
    }
    
    
    //send fee from transaction issuer to the block validator (leader)
    transferFee(block:any, transaction:any) {

        let amount = transaction.output.fee;
        let from = transaction.input.from;
        let to = block.validator;
        this.transfer(from, to, amount);
    
    }

    increment(to:string,amount:number) {
        this.balances[to] += amount;
    }

    decrement(from:string, amount:number) {
        this.balances[from] -= amount;
    }


    getBalance(address:string) {
        this.initialize(address);
        return this.balances[address];
    }


    updateAccounts(transaction:any) {
        let amount = transaction.output.amount;
        let from = transaction.input.from;
        let to = transaction.output.to;
        this.transfer(from, to, amount);
    }

    addAcount(pk:any){
        this.addresses.push(pk);
        this.balances[pk]=INITIAL_BALANCE
        console.log("balence  ",this.balances)
    }
}