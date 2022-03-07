class Stake {
    constructor() {
        this.stakersAddresses = ["51344f39b80865174166521e16442d0ea545771a36c126cd20eecd99eadc4a9d"]; //first node to initialize the blockchain network will automatically be a validator and a staker with stake balance of 0
        this.stakedBalances = {"51344f39b80865174166521e16442d0ea545771a36c126cd20eecd99eadc4a9d":0};
        //should probabaly be changed later to a map
        
    }



    initialize(address) {
        if (this.stakedBalances[address] == undefined) {
            this.stakedBalances[address] = 0;
            this.stakersAddresses.push(address);
        }
    }


    addStake(from, amount) {
        this.initialize(from);
        this.stakedBalances[from] += amount;
    }


    getStake(address) {
        this.initialize(address);
        return this.stakedBalances[address];
    }

    getMax(addresses) {
        let maxStake = -1;
        let leader = undefined;
        addresses.forEach(address => {
            if (this.getStake(address) > maxStake) { 
                leader = address;
                maxStake = this.getStake(address);
            }
        });
        return leader;
    }


    updateStakers(transaction) {
        let amount = transaction.output.amount;
        let from = transaction.input.from;
        this.addStake(from, amount);
    }



    toString() {
        let string = `STAKES: 
        `;
        this.stakersAddresses.forEach(staker => {
            string += `     Staker: ${staker} 
                Stake: ${this.stakedBalances[staker]}
                ------------------------------------
                `
        });
        return string;
    }




}

module.exports = Stake;