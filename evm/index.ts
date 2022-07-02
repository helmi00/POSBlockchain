import express, {application, Request, Response} from 'express';

import { join } from 'path'
import { readFileSync,createReadStream } from 'fs'
import { Address,Account } from 'ethereumjs-util'
import VM from '@ethereumjs/vm'
import { DefaultStateManager } from '@ethereumjs/vm/dist/state';
import { insertAccount,keyPair } from './helpers/account-utils'
//import { calculate2 } from './contract-functions/calculate2';
import { getMsgSender } from './contract-functions/getMsgSender';
import { addNFT } from './contract-functions/addNFT';
import { compileGreetingContract } from './contract-compilers/compileContracts';
import { compileNftContracts } from './contract-compilers/compileNftContracts';
import { getGreeterDeploymentBytecode } from './contract-compilers/getGreeterDeploymentBytecode';
import { getNftDeploymentBytecode } from './contract-compilers/getNftDeploymentBytecode';
import { testing } from './tests/testing';
import { deployGreetingContract } from './contract-compilers/deployGreetingContract';
import { deployNFTContract } from './contract-compilers/deployNFTContract';
import { getallitem } from './contract-functions/getallitem';
import { abi_index } from './helpers/abi_index';
import { reselleMarketItems } from './contract-functions/reselleMarketItems';
import { fetchownerItems } from './contract-functions/fetchownerItems';
import { fetchMarketItems } from './contract-functions/fetchMarketItems';
import { createMarketSale } from './contract-functions/createMarketSale';
import { getowneritems } from './contract-functions/getowneritems';
import { updateprice } from './contract-functions/updateprice';
import { updateforselle } from './contract-functions/updateforselle';
import { Seleitem } from './contract-functions/Selleitem';
import { gettokenuri } from './contract-functions/gettokenuri';
import axios, {AxiosRequestConfig, AxiosResponse} from 'axios'
import { BN } from 'ethereumjs-util/dist/externals'
import {Blockchain} from './blockchain/blockchain';
import {P2pserver} from './app/p2p-server';
import {Wallet} from './wallet/wallet';
import {TransactionPool} from './wallet/transaction-pool';

import { VALIDATOR_FEE } from './config';
import {Block} from './blockchain/block';
import { json } from 'body-parser';
const solc = require('solc')
const cors = require('cors')
const Util = require("util");
const pinataSDK = require('@pinata/sdk');
const pinata = pinataSDK('66c130be56b3c2927ca1', '4ce5948aa24da4a9057abe94102d24f04ebcde790f558e7e6cbccfd7918664b4');
const formidable = require('formidable');

export const INITIAL_GREETING = 'Hello, Helmi!'
export const SECOND_GREETING = 'Hola, Mundo!'

let vm: VM
export let contractAddress: Address 
let contractAddressNft: Address 
export let accountAddress: Address
export let solcOutput: any
let solcNftOutput:any
export let deployed: boolean = false
let walletAddress: string
export let importedAccountPK: Buffer
let evmAddresses : Map<string,string> = new Map<string,string>() // addresses in web server => addresses in evm
let balances : Map<Address, Number> = new Map<Address,Number>() //addresses in evm => balances
let accountPk:any


/**
 * This function creates the input for the Solidity compiler.
 *
 * For more info about it, go to https://solidity.readthedocs.io/en/v0.5.10/using-the-compiler.html#compiler-input-and-output-json-description
 */
export function getSolcInput() {
  return {
    language: 'Solidity',
    sources: {
      'contracts/Greeter.sol': {
        content: readFileSync(join(__dirname, 'contracts', 'Greeter.sol'), 'utf8'),
      },
      // If more contracts were to be compiled, they should have their own entries here
    },
    settings: {
     
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: 'petersburg',
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode'],
        },
      },
    },
  }
}

export function getSolcInputNFT() {
  return {
    language: 'Solidity',
    sources: {
      'contracts/nft.sol': {
        content: readFileSync(join(__dirname, 'contracts', 'nft.sol'), 'utf8'),
      },
      // If more contracts were to be compiled, they should have their own entries here
    },
    settings: {
     
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: 'petersburg',
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode'],
        },
      },
    },
  }
}

/**
 * 
 * @param path : the import path of the imported contract/library as declared in the smart contract that is being compiled
 * @returns the content of the the imported smart contract in ut8 format, after correcting the path, to be compiled
 */
export function findImports(path:any) {
  console.log("***************************")
  console.log("Now compiling imported smart contract with path of:", path)
  if(path[0]==='@'){
    console.log("which is a zepellin contract")
    return {contents: readFileSync(join('node_modules', path), 'utf8')}
    }
  else {
    console.log("which is not a zepellin contract, but a local contract ", path)
    return {contents: readFileSync(join(__dirname, path), 'utf8')}
  }

}



function populateAccounts(importedBalances: any){
  for (var account in importedBalances) {
    balances.set(Address.fromPrivateKey(Buffer.from(account.slice(2),'hex')),importedBalances[account])
    evmAddresses.set(Address.fromPrivateKey(Buffer.from(account.slice(2),'hex')).toString(),account)
  }
  console.log("populated local balances with: ", balances)
  console.log("populated evm addresses: ", evmAddresses)
}



async function launchEVM(pk:any) {
  

  /*  accountPk = Buffer.from(
    'e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109',
    'hex'
  ) */

   
  


  //importedAccountPK = Buffer.from(walletAddress,'hex')
  accountPk = Buffer.from(pk.toString().slice(2),'hex')

  console.log("pk",pk.toString())
  accountAddress =Address.fromPrivateKey(accountPk)
 // console.log('Accountpk: ', accountPk.toString())
 // console.log('Account: ', accountAddress.toString())
  await insertAccount(vm, accountAddress)

  
  

  const bytecode = getGreeterDeploymentBytecode(solcOutput)
  const bytecodeNft= getNftDeploymentBytecode(solcNftOutput)
  console.log('Deploying the contract...')
 
  function tostring(elements: any) {
    var result : string[] =[]
    for (var i = 0; i<elements.length; i++){
      result[i]=elements[i].toString()
    }
    return result
  }
  //contractAddress = await deployGreetingContract(vm, importedAccountPK, bytecode, INITIAL_GREETING, tostring(Array.from(balances.keys())), Array.from(balances.values()) )
  

  contractAddress = await deployGreetingContract(vm, accountPk, bytecode, INITIAL_GREETING,tostring(Array.from(balances.keys())), Array.from(balances.values()))
  contractAddressNft = await deployNFTContract(vm,accountPk,bytecodeNft,INITIAL_GREETING)

  console.log('Contract nft address:', contractAddressNft.toString())
  console.log("EVM LAUNCHED SUCCESSFULLY \n-------------------------------------------------")
  console.log("getting balances from evm")
  //var rrr = await getBalances(vm, contractAddress, accountAddress )
  //console.log(rrr)
}
let vm1:any
/* function sendvm(){
  axios.get<VM>("http://localhost:3001/syncvm").then(async(result:any)=>{
    console.log("axios get vm",vm.stateManager)
     vm1 = vm.copy()
    console.log("vm1 ",accountAddress.toString())
     
     vm=await VM.create(result.data)
     console.log("get vm",vm.stateManager)
     await insertAccount(vm, accountAddress)
    
  }).catch((err:any)=>{
    console.log("err get vm",err)
  })
} */
//main
console.log('Compiling...')

 let dscache:any

//evm express server creation
const evm_server = express();
evm_server.use(express.json());
//evm_server.use(cors({origin: 'http://localhost:3001'}))
const router = express.Router({strict:true});
evm_server.use('/test', router);


 solcOutput = compileGreetingContract() 
  if (solcOutput === undefined) {
    throw new Error('Compilation failed')
  } else {
    console.log('Compiled the contract')
  }
  solcNftOutput = compileNftContracts() 
  if (solcOutput === undefined) {
    throw new Error('Compilation failed')
  } else {
    console.log('Compiled the contract')
  }
//test authent to pinata
pinata.testAuthentication().then((result:any) => {
  //handle successful authentication here
  console.log(result);
}).catch((err:any) => {
  //handle error here
  console.log(err);
});
const EVM_PORT = process.env.HTTP_PORT || process.argv[2] || 4001;
//create a new Blockchain instance
let blockchain = new Blockchain();



 
//create a new transaction pool which will be later decentralized and synchronized using the peer to peer server
const transactionPool = new TransactionPool();
console.log("transactionPool",transactionPool)
const secret = "I am the first leader/node" //Date.now() is used to create a random string for secret
let wallet = new Wallet(secret); 

//console.log("created new wallet for this node with the balance of", wallet.getBalance(blockchain));
//console.log("and with public key: ", wallet.getPublicKey());
//console.log("*******wallet",wallet.toString());
if(EVM_PORT==4001){
 
  vm =new VM(blockchain.chain[blockchain.chain.length-1].vm)
 
  launchEVM(wallet.getPublicKey()).then(async(result)=>{
   
   // console.log("******vm ", vm.stateManager)
    
}).catch((err)=>{
  console.log("err launch vm",err)
})


}
//passing blockchain as a dependency for peer connection
let p2pserver = new P2pserver(blockchain, transactionPool, wallet);


 
/* let accountPk1 = Buffer.from(
  'e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd110',
  'hex'
)

//importedAccountPK = Buffer.from(walletAddress,'hex')
let accountAddress1 =Address.fromPrivateKey(accountPk1)

console.log('Account: ', accountAddress1.toString()) */

//starts the p2pserver
p2pserver.listen(); 
if(EVM_PORT!=4001)
{
  const secret = "I am the first leader/node" +Date.now() //is used to create a random string for secret
 wallet = new Wallet(secret); 
blockchain.accounts.addAcount(wallet.getPublicKey())
//console.log("created new wallet for this node with the balance of", wallet.getBalance(blockchain));
//console.log("and with public key: ", wallet.getPublicKey());
console.log("*******wallet",wallet.toString());
  vm=new VM(blockchain.chain[blockchain.chain.length-1].vm)
  //console.log("opcode vm",blockchain.chain[blockchain.chain.length-1].vm._opcodes)
  accountPk = Buffer.from(wallet.getPublicKey().toString().slice(2),'hex')

  //console.log("pk",wallet.getPublicKey().toString().slice(2))
  accountAddress =Address.fromPrivateKey(accountPk)
  //console.log('Accountpk: ', accountPk.toString())
  //console.log('Account: ', accountAddress.toString())
  //console.log("****vm 2", vm.stateManager)
}
 //console.log("*****************p2p ",blockchain.chain[blockchain.chain.length-1].vm)
var s = evm_server.listen(EVM_PORT, () => {
  console.log("evm server is listening on port ", EVM_PORT);
})
//console.log("*************blockchain",p2pserver.getbroadcasvm().stateManager)







/** EVM SERVER APIs */
 
/* router.get('/', cors({origin:'https://www.google.com'}), async (req: Request, res: Response) => {

  const result3 = await calculate2(vm, 
                                   contractAddress, 
                                   accountAddress, 
                                   solcOutput.contracts['helpers/Greeter.sol'].Greeter.abi[2], 
                                   20,
                                   4)
                               
     
  console.log("new request received on base Url: ", req.baseUrl)
  console.log(req.headers)
  console.log("remote address: ",req.connection.remoteAddress)
  console.log("remote port: ", req.connection.remotePort)
  console.log("local address: ", req.connection.localAddress)
  console.log("local port: ", req.connection.localPort)
  res.set('Access-Control-Allow-Origin', 'https://www.google.com')
  res.json({
    "result" : result3,
    "sm_adderss": contractAddress.toString()});

}) */
 
 
 
 
 
 
/* router.get('/msg-sender',async (req: Request, res: Response) => {
 
  let msgSender  = await getMsgSender(vm, contractAddress, accountAddress, solcOutput.contracts['contracts/Greeter.sol'].Greeter.abi[4])
  console.log("request received to evm msg sender ", msgSender)
  console.log("request received from web msg-sender: ", evmAddresses.get(msgSender))
  res.json(evmAddresses.get(msgSender))
  
}) */




/* router.post('/deploy', async (req: Request, res:Response) => {
  console.log("deployment request received from blockchain web server with request body of ", req.body)
  
  if(deployed==true) {
    console.log("already deployed \n-----------------------------------------------------")
    res.json({"message": "already deployed"})
    sendvm()
  }
  else {
    console.log("launching evm and deploying smart contracts")
    
    walletAddress = req.body.walletAddress.slice(2)

    console.log("received balances are: ", req.body.balances)
    console.log("populating balances in local variable")
    populateAccounts(req.body.balances)
    
    await launchEVM()
    console.log("deployment completed")   
    console.log("contract address is ", contractAddress.toString())
    console.log("-----------------------------------------------")
    await testing(deployed)
    res.json({"deployed": true,
              "contract Address": contractAddress.toString(),
              "account Address": accountAddress.toString(),
              "evm":vm.stateManager
          })
  }
  sendvm()
}) */

router.post("/mintNFT",async (req:Request,res:Response)=>{
/* let tokenId=req.body.tokenuri;
let price = req.body.price; */
if (EVM_PORT == 4001){
const form = formidable({ multiples: true });

form.parse(req, (err:any, fields:any, files:any) => {
  if (err) {
    console.log("error from parse")
    return;
  }
  console.log("res",files.file.filepath,"   ",fields.token_name,fields.price)
  const readableStreamForFile = createReadStream(files.file.filepath);
const options = {
    pinataMetadata: {
        name: fields.token_name,
        keyvalues: {
            customKey: 'customValue',
            customKey2: 'customValue2'
        }
    },
    pinataOptions: {
        cidVersion: 0
    }
};
 pinata.pinFileToIPFS(readableStreamForFile, options).then(async(result:any) => {
    //handle results here
    console.log(result.IpfsHash);
    let id =await addNFT(vm,accountPk,contractAddressNft,result.IpfsHash,fields.price)
    let ds = new DefaultStateManager(vm.StateManager)
await ds.checkpoint()
dscache = ds._cache._cache
    res.status(200).json({ "id":id });
console.log("nft id",id)
}).catch((err:any) => {
    //handle error here
    console.log(err);
});
  
});

/* await insertAccount(vm, Address.fromPrivateKey(Buffer.from(
  'e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109',
  'hex'
))) */


}

})

router.get("/getallitem",async(req:Request,res:Response)=>{
  //console.log("abi",solcNftOutput.contracts['contracts/nft.sol'].MyNFT.abi[abi_index("fetchMarketItems", solcNftOutput)])
 let Items:{tokenId:number,owner:String,Seller:String,price:number,sold:String}[]=[]

 /* await insertAccount(vm,Address.fromPrivateKey(Buffer.from(
  'e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109',  'hex'
))) */
 let all_item = await getallitem(vm,Address.fromString("0xeb6c46c32887aa4e8f51e0f19ad106b1ec448904"),accountAddress,solcNftOutput.contracts['contracts/nft.sol'].MyNFT.abi[abi_index("getallitem", solcNftOutput)])
  for(var i =0 ; i<all_item;i++){
  await fetchMarketItems(vm, Address.fromString("0xeb6c46c32887aa4e8f51e0f19ad106b1ec448904"),accountAddress,solcNftOutput.contracts['contracts/nft.sol'].MyNFT.abi[abi_index("fetchMarketItems", solcNftOutput)], i+1).then((resul:any)=>{
   
    if(resul.owner!="0x0000000000000000000000000000000000000000")
    {Items.push({"tokenId":parseInt(resul.tokenId),"owner":resul.owner,"Seller":resul.Seller,"price":parseInt(resul.price),"sold":resul.sold})
  
  }
    //res.status(200).json({"tokenId":resul.tokenId,"seller":resul.Seller,"owner":resul.owner,"price":resul.price,"sold":resul.sold});
  }).catch((err)=>{
    console.log("id err",err)
    res.status(500).json({err});
  })

  }
  console.log("id",Items)
  res.status(200).json({Items})
})


router.post("/createMarketSale",async(req:Request,resp:Response)=>{
  let tokenId= req.body.tokenId;
  let price = req.body.price;
  let pk =req.body.pk
 let accountPk = Buffer.from(pk.toString().slice(2),'hex')

  console.log("pk",pk.toString().slice(2))
  let accountAddress =Address.fromPrivateKey(accountPk)
  console.log('Accountpk: ', accountPk.toString())
  console.log('Account: ', accountAddress.toString())
  await insertAccount(vm, accountAddress)

  await createMarketSale(vm,contractAddressNft,accountPk,tokenId,price).then((result:any)=>{
    resp.status(200).json({"state":"ok"})
  }).catch((err:any)=>{
    console.error("errur createMarketSale",err)
    resp.status(500).json({err})
  })
  
})

router.get("/fetchownerItems",async(req:Request,res:Response)=>{
  let pk=req.body.pk
  let accountPk = Buffer.from(pk.toString().slice(2),'hex')

  console.log("pk",pk.toString().slice(2))
 let  accountAddress =Address.fromPrivateKey(accountPk)
  await insertAccount(vm, accountAddress)
  let Items:{tokenId:number,owner:String,Seller:String,price:number,sold:String}[]=[]
await getallitem(vm,contractAddressNft,accountAddress,solcNftOutput.contracts['contracts/nft.sol'].MyNFT.abi[abi_index("getallitem", solcNftOutput)]).then(async(owner_item:any)=>{
  console.log(" nb owner item",parseInt(owner_item))
  for(var i =0 ; i<owner_item;i++){
  await fetchownerItems(vm, contractAddressNft,accountAddress,solcNftOutput.contracts['contracts/nft.sol'].MyNFT.abi[abi_index("fetchownerItems", solcNftOutput)], i+1).then((resul:any)=>{
    //console.log("owner result",resul.tokenId)
    if(resul.owner!="0x0000000000000000000000000000000000000000")
    {Items.push({"tokenId":parseInt(resul.tokenId),"owner":resul.owner,"Seller":resul.Seller,"price":parseInt(resul.price),"sold":resul.sold})}
    //res.status(200).json({"tokenId":resul.tokenId,"seller":resul.Seller,"owner":resul.owner,"price":resul.price,"sold":resul.sold});
  }).catch((err)=>{
    console.log("id err",err)
    res.status(500).json({err});
  })

  }
}).catch((err:any)=>{
  console.log("err fetch owner item",err)
  res.status(500).send(err)
})
 
  console.log("owner item",Items)
  res.status(200).json({Items})
})

router.post("/updateprice",async(req:Request,res:Response)=>{
  let tokenId = req.body.tokenId
  let price = req.body.price
  let pk=req.body.pk
  let accountPk = Buffer.from(pk.toString().slice(2),'hex')

  console.log("pk",pk.toString().slice(2))
 let  accountAddress =Address.fromPrivateKey(accountPk)
  await insertAccount(vm, accountAddress)
  await updateprice(vm,contractAddressNft,accountPk,tokenId,price).then((result:any)=>{
    console.log("update price",result)
    if(result){
      res.status(200).send(true)
    }else res.status(200).send(false)
  }).catch((err:any)=>{
    console.log("update price error",err)
    res.status(500).send(err)
  })

})

router.post("/updateforselle",async(req:Request,res:Response)=>{
  let tokenId = req.body.tokenId
  let pk=req.body.pk
  let accountPk = Buffer.from(pk.toString().slice(2),'hex')

  console.log("pk",pk.toString().slice(2))
 let  accountAddress =Address.fromPrivateKey(accountPk)
  await insertAccount(vm, accountAddress)
  await updateforselle(vm,contractAddressNft,accountPk,tokenId).then((result:any)=>{
   res.status(200).send("updated for selle")
  }).catch((err:any)=>{
    console.log("error updateforselle",err)
    res.status(500).send(err)
  })

})

router.post("/Seleitem",async(req:Request,res:Response)=>{
  let tokenId = req.body.tokenId
  let price = req.body.price
  let _account =req.body.account
  let account_= Buffer.from(_account.slice(2),'hex')
  insertAccount(vm,Address.fromPrivateKey(account_))
  await Seleitem(vm,contractAddressNft,account_,tokenId,price).then((result:any)=>{
   // console.log("selle item ok ")
    res.status(200).send("selle item ok ")
  }).catch((err:any)=>{
    console.log("error sell item",err)
    res.status(500).send(err)
  })
  
})


router.get("/gettokenuri",async(req:Request,res:Response)=>{
  let tokenId = req.body.tokenId
  let cna=req.body.cna
  
 if(EVM_PORT!=4001){
 // vm=await VM.create(blockchain.chain[blockchain.chain.length-1].vm.stateManager)
 //console.log("opcode vm get",blockchain.chain[blockchain.chain.length-1].vm._opcodes)
 //vm = await VM.create(blockchain.chain[blockchain.chain.length-1].opcode)
 //console.log("vm after opcode run ",blockchain.chain[blockchain.chain.length-1].opcode.root.value.val.data)
 
 console.log("vm ", vm.stateManager)
  await vm.stateManager.checkpoint()
   let bu=Buffer.from(await (blockchain.chain[blockchain.chain.length-1].dstate).data)
   //console.log("buf",bu)
   await vm.stateManager.putContractCode(Address.fromString(cna),bu)
   //console.log("get contract code after",await vm.stateManager.getContractCode(Address.fromString(cna)))
   await vm.stateManager.commit()
   
   let ds = new DefaultStateManager(vm.StateManager)
   await ds.checkpoint()
   //console.log("****************************evm cache befor",ds._cache._cache)
   ds._cache.put(Address.fromString(cna),Account.fromAccountData(blockchain.chain[blockchain.chain.length-1].opcode.root.value.val.data))
   //console.log("get contract code",await vm.stateManager.getContractCode(Address.fromString(cna)))
   await ds.commit()
   //console.log("get contract storage",await vm.stateManager.getContractStorage(Address.fromString(cna),Buffer.from(cna.slice(1),"hex")))
   /* console.log("****************************evm",await vm.stateManager.getContractCode(Address.fromString(cna)))
  insertAccount(vm,Address.fromPrivateKey(Buffer.from(
    'e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109',
    'hex'
  ))) */
   //console.log("****************************evm cache after",ds._cache._cache)
   console.log("******vm ", vm.stateManager)
 }
 
  /* vm=(blockchain.getlastvm()).copy()
  console.log("sate",blockchain.getlastvm().stateManager) */
  //await vm.stateManager.putAccount(accountAddress1, account)
  
  await gettokenuri(vm,Address.fromString(cna),Address.fromPrivateKey(Buffer.from(
    'e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109',
    'hex'
  )),solcNftOutput.contracts['contracts/nft.sol'].MyNFT.abi[abi_index("gettokenuri", solcNftOutput)],tokenId).then((result:any)=>{
    console.log("token uri ",result)
    res.status(200).send(result)
  }).catch((err:any)=>{
    console.log("get token uri error",err)
    res.status(500).send(err)
  })
})




//Exposed APIs

//api to get the blocks
evm_server.get('/blocks', (req,res)=>{
   
  res.json(blockchain.chain);

});


//api to add blocks
evm_server.post('/mine',async(req,res)=>{
  console.log("received request to add a new block");
  let ds = new DefaultStateManager(vm.StateManager)
  const block = blockchain.createBlock(req.body.data, wallet,vm.copy(),await vm.stateManager.getContractCode(contractAddressNft),dscache);
  console.log("****************************vm ",ds._cache._cache)
  console.log("_getStorageTrie(",await ds._getStorageTrie(contractAddressNft))
  console.log("new block added ",block);

  p2pserver.syncChain();
  res.redirect('/blocks'); 

});



//api to view transactions in the transaction pool
evm_server.get('/transactions', (req,res) => {
  res.json(transactionPool.transactions);
});


//api to create a new transactions
evm_server.post("/transact", (req, res) => {
  

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


evm_server.get('/accounts', (req,res) => {
  res.json(blockchain.accounts);
});


evm_server.get('/validators', (req,res) => {
  res.json(blockchain.validators);
});


evm_server.get('/stakers', (req,res) => {
  res.json(blockchain.stakes.stakedBalances);
});


evm_server.get('/leader', (req, res) => { 
  res.json({leaderAddress: blockchain.getLeader()})
})
evm_server.post('/wallet',(req,res)=>{
  const wallet_secret=req.body.wallet;
  wallet = new Wallet(wallet_secret)
  blockchain.Addacount(wallet.getPublicKey())
  console.log("new wallet",wallet)
  res.status(200).json({"wallet": wallet.publicKey})
})

evm_server.get("/allnft" ,async(req:Request,res:Response)=>{
  if(EVM_PORT !=4001){
   await  axios.get("http://localhost:4001/test/getallitem").then((data_nft:AxiosResponse)=>{
      console.log("allnft",typeof(data_nft.data.Items[0].tokenId))
      res.status(200).send(data_nft.data)
    }).catch((err:any)=>{
      console.log("err get all nft ",err)
    })
  }
})
evm_server.get("/getowneritem" ,async(req:Request,res:Response)=>{
  if(EVM_PORT !=4001){
    
   await  axios.get("http://localhost:4001/test/fetchownerItems",{"data":{"pk":wallet.getPublicKey()}}).then((data_nft:AxiosResponse)=>{
      console.log("allnft",data_nft.data)
      res.status(200).send(data_nft.data)
    }).catch((err:any)=>{
      console.log("err get all nft ",err)
    })
  }
})
evm_server.post("/buyitem" ,async(req:Request,res:Response)=>{
  if(EVM_PORT !=4001){
  let _tokenId= req.body.tokenId;
  let _price = req.body.price;
  
  let exisit = false;
  await  axios.get("http://localhost:4001/test/getallitem").then(async(data_nft:AxiosResponse)=>{
    console.log("allnft",data_nft.data)
    
    for(let i=0;i<=data_nft.data.Items.length-1;i++){
     if( data_nft.data.Items[i].tokenId==_tokenId && data_nft.data.Items[i].price ==_price ){
    exisit=true
     }
    }
  }).catch((err:any)=>{
   
    console.log("err get all nft ",err)
  })

  if(exisit!=false){
    console.log("received request to make a transaction of type ", "TRANSACTION");
  
    const transaction = wallet.createTransaction("0x51344f39b80865174166521e16442d0ea545771a36c126cd20eecd99eadc4a9d", _price, "TRANSACTION", blockchain, transactionPool);
    
    if(transaction != undefined){    //meaning that transation has actually been created, meaning that the amount is within balance value
        
        console.log("created and added transaction to local pool");
        p2pserver.broadcastTransaction(transaction); //broadcast the newly made transaction to all the local transaction pools of the peers
        p2pserver.createBlockIfLeaderAndIfThreshholdReached();
        await  axios.post("http://localhost:4001/test/createMarketSale",{"tokenId":_tokenId,"price":_price,"pk":wallet.getPublicKey()}).then((data_nft:AxiosResponse)=>{
          //console.log("allnft",data_nft.data)
          res.redirect("/transactions");
          //res.status(200).send(data_nft.data)
        }).catch((err:any)=>{
          console.log("err get all nft ",err)
        })
    
    } else {
    
        console.log("transaction is not created nor broadcasted\n-----------------------------------------------------------------");
        res.status(404).send("sold not enaf")
    }
    
    
  }else res.status(404).send("NFT NOT FOUND")

   
  }
})

evm_server.post("/updatetosell" ,async(req:Request,res:Response)=>{
  if(EVM_PORT !=4001){
    let _tokenId = req.body.tokenId
    let exist =false
    await  axios.get("http://localhost:4001/test/fetchownerItems",{"data":{"pk":wallet.getPublicKey()}}).then(async(data_nft:AxiosResponse)=>{
      console.log("tokenid",data_nft.data.Items[0].tokenId)
    for(let i=0;i<=data_nft.data.Items.length-1;i++){
      if(data_nft.data.Items[i].tokenId ==_tokenId){
        exist=true
      }
    }  
    console.log("tokenid",exist)
    
    }).catch((err:any)=>{
      console.log("err get all nft ",err)
    })

if(exist!=false){
      await  axios.post("http://localhost:4001/test/updateforselle",{"tokenId":_tokenId,"pk":wallet.getPublicKey()}).then((data_nft:AxiosResponse)=>{
      //console.log("allnft",data_nft.data)
      res.status(200).send(data_nft.data)
    }).catch((err:any)=>{
      console.log("err get all nft ",err)
    })
    }else res.status(404).send("NOT FOUND")


   
  }
})

evm_server.post("/update_price" ,async(req:Request,res:Response)=>{
  if(EVM_PORT !=4001){
    let _tokenId = req.body.tokenId
    let new_price = req.body.newprice
    let exist =false
    await  axios.get("http://localhost:4001/test/fetchownerItems",{"data":{"pk":wallet.getPublicKey()}}).then(async(data_nft:AxiosResponse)=>{
      console.log("tokenid",data_nft.data.Items[0].tokenId)
    for(let i=0;i<=data_nft.data.Items.length-1;i++){
      if(data_nft.data.Items[i].tokenId ==_tokenId){
        exist=true
      }
    }  
    console.log("tokenid",exist)
    
    }).catch((err:any)=>{
      console.log("err get all nft ",err)
    })

if(exist!=false){
      await  axios.post("http://localhost:4001/test/updateprice",{"tokenId":_tokenId,"price":new_price,"pk":wallet.getPublicKey()}).then((data_nft:AxiosResponse)=>{
      //console.log("allnft",data_nft.data)
      res.status(200).send(data_nft.data)
    }).catch((err:any)=>{
      console.log("err get all nft ",err)
    })
    }else res.status(404).send("NOT FOUND")


   
  }
})


evm_server.post("/buyitem_p" ,async(req:Request,res:Response)=>{
  if(EVM_PORT !=4001){
  let _tokenId= req.body.tokenId;
  let _price = req.body.price;
  let owner_account= req.body.owner
  let owner_item=""
  let exisit = false;
  await  axios.get("http://localhost:4001/test/getallitem").then(async(data_nft:AxiosResponse)=>{
    console.log("allnft",data_nft.data)
    
    for(let i=0;i<=data_nft.data.Items.length-1;i++){
     if( data_nft.data.Items[i].tokenId==_tokenId && data_nft.data.Items[i].price ==_price ){
    exisit=true
    owner_item = data_nft.data.Items[i].owner
     }
    }
  }).catch((err:any)=>{
   
    console.log("err get all nft ",err)
  })

  if(exisit!=false){
    let accountPkowner = Buffer.from(owner_account.toString().slice(2),'hex')
  let accountAddressowner =Address.fromPrivateKey(accountPkowner)
console.log(accountAddressowner.toString(), "  ",owner_item)
  if(accountAddressowner.toString()==owner_item.toLowerCase()){
    console.log("received request to make a transaction of type ", "TRANSACTION");
  
    const transaction = wallet.createTransaction(owner_account, _price, "TRANSACTION", blockchain, transactionPool);
    
    if(transaction != undefined){    //meaning that transation has actually been created, meaning that the amount is within balance value
        
        console.log("created and added transaction to local pool");
        p2pserver.broadcastTransaction(transaction); //broadcast the newly made transaction to all the local transaction pools of the peers
        p2pserver.createBlockIfLeaderAndIfThreshholdReached();
        await  axios.post("http://localhost:4001/test/Seleitem",{"tokenId":_tokenId,"price":_price,"account":wallet.getPublicKey()}).then((data_nft:AxiosResponse)=>{
          //console.log("allnft",data_nft.data)
          res.redirect("/transactions");
          //res.status(200).send(data_nft.data)
        }).catch((err:any)=>{
          console.log("err get all nft ",err)
        })
    
    } else {
    
        console.log("transaction is not created nor broadcasted\n-----------------------------------------------------------------");
        res.status(404).send("sold not enaf")
    }
  }
    
  }else res.status(404).send("NFT NOT FOUND")

   
  }
})


/* process.on('SIGINT', () => {
  console.log("Terminating...");
  s.close();
  process.exit(0); 
}); */