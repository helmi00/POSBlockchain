import express, {application, Request, Response} from 'express';

import { join } from 'path'
import { readFileSync,createReadStream } from 'fs'
import { Address } from 'ethereumjs-util'
import VM from '@ethereumjs/vm'
import { insertAccount } from './helpers/account-utils'
import { calculate2 } from './contract-functions/calculate2';
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
const solc = require('solc')
const cors = require('cors')
const Util = require("util");
const pinataSDK = require('@pinata/sdk');
const pinata = pinataSDK('66c130be56b3c2927ca1', '4ce5948aa24da4a9057abe94102d24f04ebcde790f558e7e6cbccfd7918664b4');
const formidable = require('formidable');

export const INITIAL_GREETING = 'Hello, Helmi!'
export const SECOND_GREETING = 'Hola, Mundo!'


export let vm: VM
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

async function launchEVM() {
  if(deployed == true) return;

  const accountPk = Buffer.from(
    'e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109',
    'hex'
  )

   vm = new VM()
  


  importedAccountPK = Buffer.from(walletAddress,'hex')
  accountAddress = walletAddress == undefined ? Address.fromPrivateKey(accountPk): Address.fromPrivateKey(importedAccountPK)

  console.log('Account: ', accountAddress.toString())
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
  

  contractAddress = await deployGreetingContract(vm, importedAccountPK, bytecode, INITIAL_GREETING,tostring(Array.from(balances.keys())), Array.from(balances.values()))
  contractAddressNft = await deployNFTContract(vm,importedAccountPK,bytecodeNft,INITIAL_GREETING)

  console.log('Contract address:', contractAddress.toString())
  console.log("EVM LAUNCHED SUCCESSFULLY \n-------------------------------------------------")
  console.log("getting balances from evm")
  //var rrr = await getBalances(vm, contractAddress, accountAddress )
  //console.log(rrr)
}


//main
console.log('Compiling...')

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

//evm express server creation
const evm_server = express();
evm_server.use(express.json());
//evm_server.use(cors({origin: 'http://localhost:3001'}))
const router = express.Router({strict:true});
evm_server.use('/test', router);

//test authent to pinata
pinata.testAuthentication().then((result:any) => {
  //handle successful authentication here
  console.log(result);
}).catch((err:any) => {
  //handle error here
  console.log(err);
});

const EVM_PORT = process.argv[2] || 4001;
 
var s = evm_server.listen(EVM_PORT, () => {
  console.log("evm server is listening on port ", EVM_PORT);
})
 
 
 





/** EVM SERVER APIs */
 
router.get('/', cors({origin:'https://www.google.com'}), async (req: Request, res: Response) => {

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

})
 
 
 
 
 
 
router.get('/msg-sender',async (req: Request, res: Response) => {
 
  let msgSender  = await getMsgSender(vm, contractAddress, accountAddress, solcOutput.contracts['contracts/Greeter.sol'].Greeter.abi[4])
  console.log("request received to evm msg sender ", msgSender)
  console.log("request received from web msg-sender: ", evmAddresses.get(msgSender))
  res.json(evmAddresses.get(msgSender))
  
})




router.post('/deploy', async (req: Request, res:Response) => {
  console.log("deployment request received from blockchain web server with request body of ", req.body)
  
  if(deployed==true) {
    console.log("already deployed \n-----------------------------------------------------")
    res.json({"message": "already deployed"})
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
          })
  }
  
})

router.post("/mintNFT",async (req:Request,res:Response)=>{
/* let tokenId=req.body.tokenuri;
let price = req.body.price; */

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
    let id =await addNFT(vm,importedAccountPK,contractAddressNft,result.IpfsHash,fields.price)
    res.status(200).json({ "id":id });
console.log("nft id",id)
}).catch((err:any) => {
    //handle error here
    console.log(err);
});
  
});
/* let id =await addNFT(vm,importedAccountPK,contractAddressNft,tokenId,price)
    res.status(200).json({ "id":id }); */
})

router.get("/getallitem",async(req:Request,res:Response)=>{
  //console.log("abi",solcNftOutput.contracts['contracts/nft.sol'].MyNFT.abi[abi_index("fetchMarketItems", solcNftOutput)])
 let Items= new Array()
 let all_item = await getallitem(vm,contractAddressNft,accountAddress,solcNftOutput.contracts['contracts/nft.sol'].MyNFT.abi[abi_index("getallitem", solcNftOutput)])
  for(var i =0 ; i<all_item;i++){
  await fetchMarketItems(vm, contractAddressNft,accountAddress,solcNftOutput.contracts['contracts/nft.sol'].MyNFT.abi[abi_index("fetchMarketItems", solcNftOutput)], i+1).then((resul:any)=>{
    console.log("id result",resul.tokenId)
    if(resul.owner!="0x0000000000000000000000000000000000000000")
    {Items.push(resul)}
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
  await createMarketSale(vm,contractAddressNft,importedAccountPK,tokenId,price).then((result:any)=>{
    resp.status(200).json({"state":"ok"})
  }).catch((err:any)=>{
    console.error("errur createMarketSale",err)
    resp.status(500).json({err})
  })
})

router.get("/fetchownerItems",async(req:Request,res:Response)=>{
  let Items= new Array()
await getallitem(vm,contractAddressNft,accountAddress,solcNftOutput.contracts['contracts/nft.sol'].MyNFT.abi[abi_index("getallitem", solcNftOutput)]).then(async(owner_item:any)=>{
  console.log(" nb owner item",parseInt(owner_item))
  for(var i =0 ; i<owner_item;i++){
  await fetchownerItems(vm, contractAddressNft,accountAddress,solcNftOutput.contracts['contracts/nft.sol'].MyNFT.abi[abi_index("fetchownerItems", solcNftOutput)], i+1).then((resul:any)=>{
    console.log("owner result",resul.tokenId)
    if(resul.owner!="0x0000000000000000000000000000000000000000")
    {Items.push(resul)}
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
  await updateprice(vm,contractAddressNft,importedAccountPK,tokenId,price).then((result:any)=>{
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
  await updateforselle(vm,contractAddressNft,importedAccountPK,tokenId).then((result:any)=>{
   res.status(200).send(result)
  }).catch((err:any)=>{
    console.log("error updateforselle",err)
    res.status(500).send(err)
  })
})

router.post("/Seleitem",async(req:Request,res:Response)=>{
  let tokenId = req.body.tokenId
  let price = req.body.price
  await Seleitem(vm,contractAddressNft,importedAccountPK,tokenId,price).then((result:any)=>{
    console.log("selle item ok ")
    res.status(200)
  }).catch((err:any)=>{
    console.log("error sell item",err)
    res.status(500).send(err)
  })
})


router.get("/gettokenuri",async(req:Request,res:Response)=>{
  let tokenId = req.body.tokenId
  await gettokenuri(vm,contractAddressNft,accountAddress,solcNftOutput.contracts['contracts/nft.sol'].MyNFT.abi[abi_index("gettokenuri", solcNftOutput)],tokenId).then((result:any)=>{
    console.log("token uri ",result)
    res.status(200).send(result)
  }).catch((err:any)=>{
    console.log("get token uri error",err)
    res.status(500).send(err)
  })
})


process.on('SIGINT', () => {
  console.log("Terminating...");
  s.close();
  process.exit(0); 
});