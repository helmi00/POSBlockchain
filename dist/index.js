"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const assert_1 = __importDefault(require("assert"));
const path_1 = require("path");
const fs_1 = require("fs");
const abi_1 = require("@ethersproject/abi");
const ethereumjs_util_1 = require("ethereumjs-util");
const tx_1 = require("@ethereumjs/tx");
const vm_1 = __importDefault(require("@ethereumjs/vm"));
const tx_builder_1 = require("./helpers/tx-builder");
const account_utils_1 = require("./helpers/account-utils");
const solc = require('solc');
const smtchecker = require('solc/smtchecker');
const smtsolver = require('solc/smtsolver');
const INITIAL_GREETING = 'Hello, World!';
const SECOND_GREETING = 'Hola, Mundo!';
var { CALCULATION_SM_ADDRESS } = require("../config");
const cors = require('cors');
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
                content: (0, fs_1.readFileSync)((0, path_1.join)(__dirname, 'helpers', 'Greeter.sol'), 'utf8'),
            },
            // If more contracts were to be compiled, they should have their own entries here
        },
        settings: {
            modelChecker: {
                engine: "chc",
                solvers: ["smtlib2"]
            },
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
    };
}
function findImports(path) {
    console.log("***************************");
    console.log("path is now :", path);
    if (path[0] === '@') {
        console.log("it's a zepellin contract");
        console.log("join result: ", (0, path_1.join)('node_modules', path));
        return { contents: (0, fs_1.readFileSync)((0, path_1.join)('node_modules', path), 'utf8') };
        //console.log("manual join result ", join('node_modules','@openzeppelin','contracts','access', 'Ownable.sol'))
        //return {contents: readFileSync(join('node_modules','@openzeppelin','contracts','access', 'Ownable.sol'), 'utf8')}
    }
    else {
        console.log("it's not a zepellin contract, but ", path);
        console.log("join results is: ", (0, path_1.join)(__dirname, path));
        return { contents: (0, fs_1.readFileSync)((0, path_1.join)(__dirname, path), 'utf8') };
    }
}
//const {findImports} = require('./evm-utils.js')
/**
 * This function compiles all the contracts in `contracts/` and returns the Solidity Standard JSON
 * output. If the compilation fails, it returns `undefined`.
 *
 * To learn about the output format, go to https://solidity.readthedocs.io/en/v0.5.10/using-the-compiler.html#compiler-input-and-output-json-description
 */
function compileContracts() {
    const input = getSolcInput();
    const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
    solc.compile();
    let compilationFailed = false;
    if (output.errors) {
        for (const error of output.errors) {
            if (error.severity === 'error') {
                console.error(error.formattedMessage);
                compilationFailed = true;
            }
            else {
                console.warn(error.formattedMessage);
            }
        }
    }
    if (compilationFailed) {
        return undefined;
    }
    console.log('compilation output: ', output.contracts['helpers/Greeter.sol'].Greeter.abi);
    return output;
}
function getGreeterDeploymentBytecode(solcOutput) {
    return solcOutput.contracts['helpers/Greeter.sol'].Greeter.evm.bytecode.object;
}
function deployContract(vm, senderPrivateKey, deploymentBytecode, greeting) {
    return __awaiter(this, void 0, void 0, function* () {
        // Contracts are deployed by sending their deployment bytecode to the address 0
        // The contract params should be abi-encoded and appended to the deployment bytecode.
        const data = (0, tx_builder_1.encodeDeployment)(deploymentBytecode.toString('hex'), {
            types: ['string'],
            values: [greeting],
        });
        console.log('deployment data ', data);
        const txData = {
            data,
            nonce: yield (0, account_utils_1.getAccountNonce)(vm, senderPrivateKey),
        };
        const tx = tx_1.Transaction.fromTxData((0, tx_builder_1.buildTransaction)(txData)).sign(senderPrivateKey);
        const deploymentResult = yield vm.runTx({ tx });
        if (deploymentResult.execResult.exceptionError) {
            throw deploymentResult.execResult.exceptionError;
        }
        return deploymentResult.createdAddress;
    });
}
function setGreeting(vm, senderPrivateKey, contractAddress, greeting) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = (0, tx_builder_1.encodeFunction)('setGreeting', {
            types: ['string'],
            values: [greeting],
        });
        const txData = {
            to: contractAddress,
            data,
            nonce: yield (0, account_utils_1.getAccountNonce)(vm, senderPrivateKey),
        };
        const tx = tx_1.Transaction.fromTxData((0, tx_builder_1.buildTransaction)(txData)).sign(senderPrivateKey);
        const setGreetingResult = yield vm.runTx({ tx });
        if (setGreetingResult.execResult.exceptionError) {
            throw setGreetingResult.execResult.exceptionError;
        }
    });
}
function getGreeting(vm, contractAddress, caller) {
    return __awaiter(this, void 0, void 0, function* () {
        const sigHash = new abi_1.Interface(['function greet()']).getSighash('greet');
        const greetResult = yield vm.runCall({
            to: contractAddress,
            caller: caller,
            origin: caller,
            data: Buffer.from(sigHash.slice(2), 'hex'),
        });
        if (greetResult.execResult.exceptionError) {
            throw greetResult.execResult.exceptionError;
        }
        const results = abi_1.defaultAbiCoder.decode(['string'], greetResult.execResult.returnValue);
        return results[0];
    });
}
function calculate(vm, senderPrivateKey, contractAddress, a, b) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = (0, tx_builder_1.encodeFunction)('calculate', {
            types: ['uint256', 'uint256'],
            values: [a, b],
        });
        const txData = {
            to: contractAddress,
            data,
            nonce: yield (0, account_utils_1.getAccountNonce)(vm, senderPrivateKey),
        };
        //console.log('transaction data created: ', txData)
        const tx = tx_1.Transaction.fromTxData((0, tx_builder_1.buildTransaction)(txData)).sign(senderPrivateKey);
        //console.log('transaction created ', tx)
        const setCalculatingResult = yield vm.runTx({ tx });
        if (setCalculatingResult.execResult.exceptionError) {
            throw setCalculatingResult.execResult.exceptionError;
        }
        const results = abi_1.defaultAbiCoder.decode(['uint256'], setCalculatingResult.execResult.returnValue);
        return results[0].toString();
    });
}
function calculate2(vm, contractAddress, caller, methodabi, a, b) {
    return __awaiter(this, void 0, void 0, function* () {
        const sigHash = new abi_1.Interface([methodabi]).getSighash('calculate');
        const greetResult = yield vm.runCall({
            to: contractAddress,
            caller: caller,
            origin: caller,
            data: Buffer.from(sigHash.slice(2) + abi_1.defaultAbiCoder.encode(['uint256', 'uint256'], [a, b]).slice(2), 'hex'),
        });
        if (greetResult.execResult.exceptionError) {
            throw greetResult.execResult.exceptionError;
        }
        const results = abi_1.defaultAbiCoder.decode(['uint256'], greetResult.execResult.returnValue);
        return results[0].toString();
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const accountPk = Buffer.from('e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109', 'hex');
        const vm = new vm_1.default();
        const accountAddress = ethereumjs_util_1.Address.fromPrivateKey(accountPk);
        console.log('Account: ', accountAddress.toString());
        yield (0, account_utils_1.insertAccount)(vm, accountAddress);
        console.log('Compiling...');
        const solcOutput = compileContracts();
        if (solcOutput === undefined) {
            throw new Error('Compilation failed');
        }
        else {
            console.log('Compiled the contract');
        }
        const bytecode = getGreeterDeploymentBytecode(solcOutput);
        console.log('Deploying the contract...');
        const contractAddress = yield deployContract(vm, accountPk, bytecode, INITIAL_GREETING);
        process.env.CALCULATION_SM_ADDRESS = contractAddress.toString();
        console.log('Contract address:', contractAddress.toString());
        const greeting = yield getGreeting(vm, contractAddress, accountAddress);
        console.log('Greeting:', greeting);
        assert_1.default.equal(greeting, INITIAL_GREETING);
        console.log('Changing greeting...');
        yield setGreeting(vm, accountPk, contractAddress, SECOND_GREETING);
        const greeting2 = yield getGreeting(vm, contractAddress, accountAddress);
        console.log('Greeting:', greeting2);
        assert_1.default.equal(greeting2, SECOND_GREETING);
        console.log('testing calculation...');
        const result = yield calculate(vm, accountPk, contractAddress, 3, 4);
        console.log('calculation result is: ', result);
        console.log(typeof (solcOutput.contracts['helpers/Greeter.sol'].Greeter.abi));
        console.log(solcOutput.contracts['helpers/Greeter.sol'].Greeter.abi);
        const result2 = yield calculate2(vm, contractAddress, accountAddress, solcOutput.contracts['helpers/Greeter.sol'].Greeter.abi[1], 6, 4);
        console.log('result2 is: ', result2);
        // Now let's look at what we created. The transaction
        // should have created a new account for the contract
        // in the state. Let's test to see if it did.
        const createdAccount = yield vm.stateManager.getAccount(contractAddress);
        console.log('-------results-------');
        console.log('nonce: ' + createdAccount.nonce.toString());
        console.log('balance in wei: ', createdAccount.balance.toString());
        console.log('stateRoot: 0x' + createdAccount.stateRoot.toString('hex'));
        console.log('codeHash: 0x' + createdAccount.codeHash.toString('hex'));
        console.log('---------------------');
        console.log('Everything ran correctly!');
        //console.log(vm.getActiveOpcodes())
        var blocks = (yield vm.blockchain.getBlock(0));
        //evm express server creation
        const evm_server = (0, express_1.default)();
        evm_server.use(express_1.default.json());
        evm_server.use(cors({ origin: 'http://localhost:3001' }));
        const router = express_1.default.Router({ strict: true });
        evm_server.use('/test', router);
        const EVM_PORT = process.argv[2] || 4001;
        var s = evm_server.listen(EVM_PORT, () => {
            console.log("evm server is listening on port ", EVM_PORT);
        });
        process.on('SIGINT', () => {
            console.log("Terminating...");
            s.close();
            //process.kill(process.ppid, 'SIGTERM');
            //process.kill(process.ppid, 'SIGINT');
            process.exit(0);
        });
        router.get('/', cors({ origin: 'https://www.google.com' }), (req, res) => __awaiter(this, void 0, void 0, function* () {
            const result3 = yield calculate2(vm, contractAddress, accountAddress, solcOutput.contracts['helpers/Greeter.sol'].Greeter.abi[1], 20, 4);
            console.log("new request received on base Url: ", req.baseUrl);
            console.log(req.headers);
            console.log("remote address: ", req.connection.remoteAddress);
            console.log("remote port: ", req.connection.remotePort);
            console.log("local address: ", req.connection.localAddress);
            console.log("local port: ", req.connection.localPort);
            res.set('Access-Control-Allow-Origin', 'https://www.google.com');
            res.json({
                "result": result3,
                "sm_adderss": contractAddress.toString()
            });
        }));
        //console.log(blocks )
    });
}
main();
