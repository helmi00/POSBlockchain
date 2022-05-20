import express, {application, Request, Response} from 'express';

import assert from 'assert'
import { join } from 'path'
import { readFileSync } from 'fs'
import { Address } from 'ethereumjs-util'
import { Transaction } from '@ethereumjs/tx'
import VM from '@ethereumjs/vm'
import { buildTransaction, encodeDeployment } from './helpers/tx-builder'
import { getAccountNonce, insertAccount } from './helpers/account-utils'
import { calculate2 } from './sm-functions/calculate2';
import { getMsgSender } from './sm-functions/getMsgSender';
import { setGreeting } from './sm-functions/setGreeting';
import { getGreeting } from './sm-functions/getGreeting';
import { calculate } from './sm-functions/calculate';
const solc = require('solc')
const cors = require('cors')
const Util = require("util");



const INITIAL_GREETING = 'Hello, World!'
const SECOND_GREETING = 'Hola, Mundo!'


let vm: VM
let contractAddress: Address 
let accountAddress: Address
let solcOutput: any
let deployed: boolean = false
let walletAddress: string
let importedAccountPK: Buffer
let evmAddresses : Map<string,string> = new Map<string,string>()
let balances : Map<Address, Number> = new Map<Address,Number>()



/**
 * This function creates the input for the Solidity compiler.
 *
 * For more info about it, go to https://solidity.readthedocs.io/en/v0.5.10/using-the-compiler.html#compiler-input-and-output-json-description
 */
function getSolcInput() {
  return {
    language: 'Solidity',
    sources: {
      'helpers/Greeter.sol': {
        content: readFileSync(join(__dirname, 'helpers', 'Greeter.sol'), 'utf8'),
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
function findImports(path:any) {
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









/**
 * This function compiles all the contracts in `contracts/` and returns the Solidity Standard JSON
 * output. If the compilation fails, it returns `undefined`.
 *
 * To learn about the output format, go to https://solidity.readthedocs.io/en/v0.5.10/using-the-compiler.html#compiler-input-and-output-json-description
 */
function compileContracts() {
  const input = getSolcInput()
  
  const output = JSON.parse(solc.compile(JSON.stringify(input),  {import: findImports}))
  

  let compilationFailed = false

  if (output.errors) {
    for (const error of output.errors) {
      if (error.severity === 'error') {
        console.error(error.formattedMessage)
        compilationFailed = true
      } else {
        console.warn(error.formattedMessage)
      }
    }
  }

  if (compilationFailed) {
    return undefined
  }
  console.log('compilation output: ', output.contracts['helpers/Greeter.sol'].Greeter.abi)
  return output
}

function getGreeterDeploymentBytecode(solcOutput: any): any {
  return solcOutput.contracts['helpers/Greeter.sol'].Greeter.evm.bytecode.object
}




/**
 * 
 * @param vm 
 * @param senderPrivateKey 
 * @param deploymentBytecode 
 * @param greeting 
 * @returns 
 */
async function deployContract(
  vm: VM,
  senderPrivateKey: Buffer,
  deploymentBytecode: Buffer,
  greeting: string
): Promise<Address> {

  // Contracts are deployed by sending their deployment bytecode to the address 0
  // The contract params should be abi-encoded and appended to the deployment bytecode.
  const data = encodeDeployment(deploymentBytecode.toString('hex'), {
    types: ['string'],
    values: [greeting],
  })
  console.log('deployment data ' ,data)
  const txData = {
    data,
    nonce: await getAccountNonce(vm, senderPrivateKey),
  }

  const tx = Transaction.fromTxData(buildTransaction(txData)).sign(senderPrivateKey)

  const deploymentResult = await vm.runTx({ tx })

  if (deploymentResult.execResult.exceptionError) {
    throw deploymentResult.execResult.exceptionError
  }

  return deploymentResult.createdAddress!
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

  console.log('Deploying the contract...')
  

  contractAddress = await deployContract(vm, importedAccountPK, bytecode, INITIAL_GREETING)
  

  console.log('Contract address:', contractAddress.toString())
  console.log("EVM LAUNCHED SUCCESSFULLY \n-------------------------------------------------")
}


async function testing() {

  console.log("Starting testing evm \n------------------------------------------------")
  const greeting = await getGreeting(vm, contractAddress, accountAddress)

  console.log('Greeting:', greeting)

  assert.equal(greeting, INITIAL_GREETING)

  console.log('Changing greeting...')

  await setGreeting(vm, importedAccountPK, contractAddress, SECOND_GREETING)

  const greeting2 = await getGreeting(vm, contractAddress, accountAddress)

  console.log('Greeting:', greeting2)

  assert.equal(greeting2, SECOND_GREETING)


  console.log('testing calculation...')

  const result = await calculate(vm, importedAccountPK, contractAddress, 3,4)

  console.log('calculation result is: ', result)
  
  
  const result2 = await calculate2(vm, contractAddress, accountAddress, solcOutput.contracts['helpers/Greeter.sol'].Greeter.abi[2], 6,4)
  console.log('result2 is: ', result2)

  

  // Now let's look at what we created. The transaction
  // should have created a new account for the contract
  // in the state. Let's test to see if it did.

  const createdAccount = await vm.stateManager.getAccount(contractAddress)

  console.log('-------results-------')
  console.log('nonce: ' + createdAccount.nonce.toString())
  console.log('balance in wei: ', createdAccount.balance.toString())
  console.log('stateRoot: 0x' + createdAccount.stateRoot.toString('hex'))
  console.log('codeHash: 0x' + createdAccount.codeHash.toString('hex'))
  console.log('---------------------')

  console.log('Everything ran correctly!')
  


  deployed = true



  

}



















//main
console.log('Compiling...')

  solcOutput = compileContracts() 
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
 
  let msgSender  = await getMsgSender(vm, contractAddress, accountAddress, solcOutput.contracts['helpers/Greeter.sol'].Greeter.abi[3])
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
    await testing()
    res.json({"deployed": true,
              "contract Address": contractAddress.toString(),
              "account Address": accountAddress.toString(),
          })
  }
  
})









process.on('SIGINT', () => {
  console.log("Terminating...");
  s.close();
  process.exit(0); 
});