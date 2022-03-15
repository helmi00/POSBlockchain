const express = require('express');
const Blockchain = require('../blockchain/blockchain');
const bodyParser = require('body-parser');
const P2pServer = require('./p2p-server');
const Wallet = require('../wallet/wallet');
const TransactionPool = require('../wallet/transaction-pool');
const { VALIDATOR_FEE } = require('../config');
const Block = require('../blockchain/block');



const HTTP_PORT = process.env.HTTP_PORT || 3001;
// we can run our app something like the following to run on a
// different port

//SET HTTP_PORT = 3002 npm run dev


//create a new app
const app = express();

//using the blody parser middleware
app.use(bodyParser.json());

app.listen(HTTP_PORT, () => {
    console.log(`Listening on port ${HTTP_PORT}`);
  });

  
//app server configurations
app.listenerCount(HTTP_PORT,()=>{
    console.log(`listening on port ${HTTP_PORT}`);
});  






//create a new Blockchain instance
const blockchain = new Blockchain();

//create a new transaction pool which will be later decentralized and synchronized using the peer to peer server
const transactionPool = new TransactionPool();

//create a new wallet for the node/peer excecuting this script
const wallet = new Wallet(HTTP_PORT % 10 == 1? "I am the first leader/node":Date.now().toString()); //Date.now() is used to create a random string for secret

//console.log("created new wallet for this node with the balance of", wallet.getBalance(blockchain));
//console.log("and with public key: ", wallet.getPublicKey());
console.log(wallet.toString());



//passing blockchain as a dependency for peer connection
const p2pserver = new P2pServer(blockchain, transactionPool, wallet);

//starts the p2pserver
p2pserver.listen(); 











//Exposed APIs

//api to get the blocks
app.get('/blocks', (req,res)=>{
    
    
    res.json(blockchain.chain);

});


//api to add blocks
app.post('/mine',(req,res)=>{
    console.log("received request to add a new block");

    const block = blockchain.createBlock(req.body.data, wallet);
    
    console.log("new block added ",block);

    p2pserver.syncChain();
   
    res.redirect('/blocks');

});



//api to view transactions in the transaction pool
app.get('/transactions', (req,res) => {
    res.json(transactionPool.transactions);
});


//api to create a new transactions
app.post("/transact", (req, res) => {
    

    const {to,amount,type} = req.body;

    console.log("received request to make a transaction of type ", type);
    
    const transaction = wallet.createTransaction(to, amount, type, blockchain, transactionPool);
    
    if(transaction != undefined){    //meaning that transation has actually been created, meaning that the amount is within balance value
        
        console.log("created and added transaction to local pool");
        p2pserver.broadcastTransaction(transaction); //broadcast the newly made transaction to all the local transaction pools of the peers
        p2pserver.createBlockIfLeaderAndIfThreshholdReached();
    
    } else {
    
        console.log("transaction is not created nor broadcasted\n-----------------------------------------------------------------");
    
    }
    
    res.redirect("/transactions");

});


app.get('/accounts', (req,res) => {
    res.json(blockchain.accounts);
});


app.get('/validators', (req,res) => {
    res.json(blockchain.validators);
});


app.get('/stakers', (req,res) => {
    res.json(blockchain.stakes.stakedBalances);
});



//rpc api