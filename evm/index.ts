import express, {application, Request, Response} from 'express';

import { join } from 'path'
import { readFileSync } from 'fs'
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
const solc = require('solc')
const cors = require('cors')
const Util = require("util");



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
let tokenId=req.body.tokenuri;
let price = req.body.price;
let id =await addNFT(vm,importedAccountPK,contractAddressNft,tokenId,price)
console.log("nft id",id)

res.send({"tokenId":id})
})







process.on('SIGINT', () => {
  console.log("Terminating...");
  s.close();
  process.exit(0); 
});