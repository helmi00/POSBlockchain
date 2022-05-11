import express, {application, Request, Response} from 'express';

import assert from 'assert'
import { join } from 'path'
import { readFileSync } from 'fs'
import { defaultAbiCoder as AbiCoder, Interface } from '@ethersproject/abi'
import { Address } from 'ethereumjs-util'
import { Transaction } from '@ethereumjs/tx'
import VM from '@ethereumjs/vm'
import { buildTransaction, encodeDeployment, encodeFunction } from './helpers/tx-builder'
import { getAccountNonce, insertAccount } from './helpers/account-utils'
const solc = require('solc')
const cors = require('cors')


const INITIAL_GREETING = 'Hello, World!'
const SECOND_GREETING = 'Hola, Mundo!'



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

async function setGreeting(
  vm: VM,
  senderPrivateKey: Buffer,
  contractAddress: Address,
  greeting: string
) {
  const data = encodeFunction('setGreeting', {
    types: ['string'],
    values: [greeting],
  })

  const txData = {
    to: contractAddress,
    data,
    nonce: await getAccountNonce(vm, senderPrivateKey),
  }

  const tx = Transaction.fromTxData(buildTransaction(txData)).sign(senderPrivateKey)

  const setGreetingResult = await vm.runTx({ tx })

  if (setGreetingResult.execResult.exceptionError) {
    throw setGreetingResult.execResult.exceptionError
  }
}

async function getGreeting(vm: VM, contractAddress: Address, caller: Address) {
  const sigHash = new Interface(['function greet()']).getSighash('greet')

  const greetResult = await vm.runCall({
    to: contractAddress,
    caller: caller,
    origin: caller, // The tx.origin is also the caller here
    data: Buffer.from(sigHash.slice(2), 'hex'),
  })

  if (greetResult.execResult.exceptionError) {
    throw greetResult.execResult.exceptionError
  }

  const results = AbiCoder.decode(['string'], greetResult.execResult.returnValue)

  return results[0]
}


async function calculate(
  vm: VM,
  senderPrivateKey: Buffer,
  contractAddress: Address,
  a: number,
  b: number
) {
  const data = encodeFunction('calculate', {
    types: ['uint256','uint256'],
    values: [a,b],
  })
  
  const txData = {
    to: contractAddress,
    data,
    nonce: await getAccountNonce(vm, senderPrivateKey),
  }



  const tx = Transaction.fromTxData(buildTransaction(txData)).sign(senderPrivateKey)


  const setCalculatingResult = await vm.runTx({ tx })

  if (setCalculatingResult.execResult.exceptionError) {
    throw setCalculatingResult.execResult.exceptionError
  }

  const results = AbiCoder.decode(['uint256'], setCalculatingResult.execResult.returnValue)

  return results[0].toString()
}

async function calculate2(vm: VM, contractAddress: Address, caller: Address, methodabi: object , a: number, b: number) {
  
  const sigHash = new Interface([methodabi]).getSighash('calculate')
  
  const greetResult = await vm.runCall({
    to: contractAddress,
    caller: caller,
    origin: caller, // The tx.origin is also the caller here
    data: Buffer.from(sigHash.slice(2)+AbiCoder.encode(['uint256','uint256'],[a,b]).slice(2), 'hex'),
  })

  if (greetResult.execResult.exceptionError) {
    throw greetResult.execResult.exceptionError
  }

  const results = AbiCoder.decode(['uint256'], greetResult.execResult.returnValue)

  return results[0].toString()
}








async function main() {
  const accountPk = Buffer.from(
    'e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109',
    'hex'
  )

  const vm = new VM()

  
  const accountAddress = Address.fromPrivateKey(accountPk)

  console.log('Account: ', accountAddress.toString())
  await insertAccount(vm, accountAddress)

  console.log('Compiling...')

  const solcOutput = compileContracts() 
  if (solcOutput === undefined) {
    throw new Error('Compilation failed')
  } else {
    console.log('Compiled the contract')
  }

  const bytecode = getGreeterDeploymentBytecode(solcOutput)

  console.log('Deploying the contract...')

  const contractAddress = await deployContract(vm, accountPk, bytecode, INITIAL_GREETING)
  process.env.CALCULATION_SM_ADDRESS = contractAddress.toString()
  

  console.log('Contract address:', contractAddress.toString())

  const greeting = await getGreeting(vm, contractAddress, accountAddress)

  console.log('Greeting:', greeting)

  assert.equal(greeting, INITIAL_GREETING)

  console.log('Changing greeting...')

  await setGreeting(vm, accountPk, contractAddress, SECOND_GREETING)

  const greeting2 = await getGreeting(vm, contractAddress, accountAddress)

  console.log('Greeting:', greeting2)

  assert.equal(greeting2, SECOND_GREETING)

  console.log('testing calculation...')

  const result = await calculate(vm, accountPk, contractAddress, 3,4)

  console.log('calculation result is: ', result)
  console.log(typeof(solcOutput.contracts['helpers/Greeter.sol'].Greeter.abi))
  console.log(solcOutput.contracts['helpers/Greeter.sol'].Greeter.abi)
  
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
  //console.log(vm.getActiveOpcodes())
  var blocks =  (await vm.blockchain.getBlock(0))

  
  
  
  
  //evm express server creation
 const evm_server = express();
 evm_server.use(express.json());
 evm_server.use(cors({origin: 'http://localhost:3001'}))
 const router = express.Router({strict:true});
 evm_server.use('/test', router);

 const EVM_PORT = process.argv[2] || 4001;

  var s = evm_server.listen(EVM_PORT, () => {
    console.log("evm server is listening on port ", EVM_PORT);
  })



 process.on('SIGINT', () => {
    console.log("Terminating...");
    s.close();
    process.exit(0); 
 });

 

  

  router.get('/', cors({origin:'https://www.google.com'}), async (req: Request, res: Response) => {

    const result3 = await calculate2(vm, 
                                     contractAddress, 
                                     accountAddress, 
                                     solcOutput.contracts['helpers/Greeter.sol'].Greeter.abi[1], 
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
  //console.log(blocks )
}


main()


