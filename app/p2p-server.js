const WebSocket = require("ws");
const Util = require("util");
const P2P_PORT = process.argv[3] || process.env.P2P_PORT || 5001;
const MESSAGE_TYPE = {
    chain: 'CHAIN',
    block: 'BLOCK',
    transaction: 'TRANSACTION',
    emtpy: ''
}


//SET PEERS=ws://localhost:5002,.. & SET P2P_PORT=5001 & SET HTTP_PORT=3001 & npm run dev
//when running 3 nodes on the same machine, make sure the first node execute a simple npm run dev and for the rest of the nodes: make http port of 300x, p2p port of 500x and peers has all the previous launched nodes p2p ports in the format above
// no spaces around =!!
const peers = (process.argv[4])? process.argv[4].split(',') : (process.env.PEERS)? process.env.PEERS.split(',') :  [];
 
class P2pserver{
    constructor(blockchain, transactionPool, wallet){
        this.blockchain = blockchain;
        this.transactionPool = transactionPool;
        this.sockets = [];
        this.wallet = wallet;
        
        this.lastTransactionFromLastAddedBlocId = "0";
        /**we need this variable because when the last transaction that fills the transaction pool to its threshhold arrives,
         * that very transaction firstly gets deleted from the local transaction pool just after the bloc add/verified-and-added comes back 
         * again to this node because it's still being broadcasted in the network, thus re-arriving to this node and gets re-added to local 
         * transaction pool
         * MUST FIND A LIBRARY THAT PREVENTS REDONDANT BROADCASTS IN A NETWORK!!!
         */



        
    }

    //create a new p2p server and connections

    listen(){
        //create the p2p server with port as argument
        const server = new WebSocket.Server({ port: P2P_PORT});

        // event listener and a callback function for any new connection.
        // on any new connection, the current instance wil send the current chain to the newly connected peer.
        server.on('connection',socket => this.connectSocket(socket));

        //to connect the peers that we have specified
        this.connectToPeers();

        console.log(`Listening for peer to peer connection on port : ${P2P_PORT}`);
    }

    //after making connection to a socket
    connectSocket(socket){

        //push the socket to the socket array
        this.sockets.push(socket);
        console.log("Socket connected");


        //register a message event listener to the socket
        this.messageHandler(socket);

        
        
        //on new connection, send the blockchain chain to the peer
        //(usually we send the most recent n blocks because the chain is too large)
        //socket.send(JSON.stringify(this.blockchain));
        this.sendChain(socket);


        

    }

    connectToPeers(){

        //connect to each peer
        peers.forEach(peer => {

            //create socket for each peer
            const socket = new WebSocket(peer);

            //open event listener is emitted when a connectin is established
            //saving the socket in the array
            socket.on('open', () => this.connectSocket(socket));

        });
    }


    messageHandler(socket){
        //on receiving a message, execute a callback function
        socket.on('message', message => {
            const data = JSON.parse(message);
            console.log("received data from peer :", data.type);
            console.log(Util.inspect(data,false, null, true));
            switch(data.type) {
                case MESSAGE_TYPE.chain:
                    console.table(data.chain);
                    console.table(data.accounts.balances);
                    console.table(data.stakes.stakedBalances);
                    console.table(data.validators);
                    this.blockchain.replaceChain(data);
                    break;
                
                
                case MESSAGE_TYPE.block:
                    if (this.blockchain.isValidBlock(data.block)) {
                        this.lastTransactionFromLastAddedBlocId = this.transactionPool.transactions[this.transactionPool.transactions.length-1].id;
                        this.transactionPool.clear();
                        console.log("local transaction pool  cleared");
                        this.broadcastBlock(data.block);
                    }
                    break;




                case MESSAGE_TYPE.transaction:
                    
                    if(data.transaction.id === this.lastTransactionFromLastAddedBlocId){
                    
                        console.log("Transaction Already exists in last bloc!!\n------------------------------------------------");
                        
                    } else if((!this.transactionPool.transactionExists(data.transaction) )) {

                            console.log("transaction DOES NOT exist in local pool");

                            this.transactionPool.addTransaction(data.transaction);

                            console.log("transaction added to local pool and pool length is now: ",this.transactionPool.transactions.length);

                            this.broadcastTransaction(data.transaction);
                        
                        }else {console.log("transaction ALREADY exists in local pool ");}

                    
                    
                    
                    
                    //creating the new block when threshhold reached
                    this.createBlockIfLeaderAndIfThreshholdReached();
                    
                    break;
                case emtpy: 
                    console.log("empty message, nothing to treat");
                break;


            }

        });

    }

    
    
    
    createBlockIfLeaderAndIfThreshholdReached(){
        
        
        console.log("thresholdReached? ", this.transactionPool.getThreshholdReached(), "\n-------------------------------------------------------------");

        //creating the new block when threshhold reached
        if(this.transactionPool.getThreshholdReached()) {
            if (this.blockchain.getLeader() == this.wallet.getPublicKey()) {
                
                console.log("threshhold REACHED");
                console.log("I am the leader this time");
                console.log("Creating block");
                
                let block = this.blockchain.createBlock(
                    this.transactionPool.transactions,
                    this.wallet
                );
                console.log("new Block created from transaction pool:");
                console.table(block);
                //this.blockchain.isValidBlock(block, this.wallet);
                console.log("the new block has been executed on creator node");
                //console.log("showing last transactions added to local transaction pool: ", this.transactionPool.transaction[])
                this.lastTransactionFromLastAddedBlocId = this.transactionPool.transactions[this.transactionPool.transactions.length-1].id;
                this.transactionPool.clear();
                console.log("local transaction pool cleared");
                this.broadcastBlock(block);


            }
        }
    }


    //sends local chain to a single socket
    sendChain(socket){
        socket.send(JSON.stringify({
            type: MESSAGE_TYPE.chain,
            chain: this.blockchain.chain,
            accounts: this.blockchain.accounts,
            validators: this.blockchain.validators,
            stakes: this.blockchain.stakes}));
    }


    //broadcasts local chain to all sockets
    syncChain() {
        this.sockets.forEach(socket =>{
            this.sendChain(socket);
        });
        console.log("broadcasted new chain to all connected sockets \n---------------------------------------------------------");
    }


    //sends a transaction to a single socket.
    sendTransaction(socket,transaction) {
        socket.send(JSON.stringify({
            type: MESSAGE_TYPE.transaction,
            transaction: transaction
            })
        );
        
    }


    //broadcasts a transaction to all connected sockets
    broadcastTransaction(transaction) {
        this.sockets.forEach(socket => {
            this.sendTransaction(socket,transaction);
        });
        console.log("transaction broadcasted once to all connected sockets\n-----------------------------------------------------------------------");
    }



    sendBlock(socket, block) {
        socket.send(
            JSON.stringify({
                type: MESSAGE_TYPE.block,
                block: block
            })
        );
    }


    broadcastBlock(block) {
        this.sockets.forEach(socket => {
            this.sendBlock(socket,block);
        });
        console.log("Block broadcasted once to all the connected sockets/peers\n-----------------------------------------------")
    }
    


}


module.exports = P2pserver;