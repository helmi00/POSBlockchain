class Stake {
    constructor() {
        this.stakersAddresses = ["0x51344f39b80865174166521e16442d0ea545771a36c126cd20eecd99eadc4a9d"]; //first node to initialize the blockchain network will automatically be a validator and a staker with stake balance of 0
        this.stakedBalances = {"0x51344f39b80865174166521e16442d0ea545771a36c126cd20eecd99eadc4a9d":0};
        //should probabaly be changed later to a map
        
    }



    initialize(address) {
        if (this.stakedBalances[address] == undefined) {
            this.stakedBalances[address] = 0;
            this.stakersAddresses.push(address);
        }
    }


    addStake(staker, amount) {
        this.initialize(staker);
        this.stakedBalances[staker] += amount;
    }

    removeStake(staker, amount) {
        this.stakedBalances[staker] -= amount;
    }


    getStake(address) {
        this.initialize(address);
        return this.stakedBalances[address];
    }




    /** 
     * this function is what determines the leader for each block add operation. Currently it's based a simple highest staked value each time.
        But it should be changed to a more complicated function that assigns probability to each staker with the highest probability of being leader
        goes to the highest staker and so on. And then randomly selects a leader according to those probabilities.
        Also should take into consideration that the probability of being a leader for a previous leader should lower than anticipated for a few add-block
        operation in order to ensure that every staker gets a chance.
        
        */
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
        let staker = transaction.input.from;
        if (transaction.type == "STAKE") {
            this.addStake(staker, amount);
        } else {
            this.removeStake(staker, amount);
        }
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