import assert from 'assert';
import { Address } from 'ethereumjs-util';
import { calculate2 } from '../contract-functions/calculate2';
import { setGreeting } from '../contract-functions/setGreeting';
import { getGreeting } from '../contract-functions/getGreeting';
import { calculate } from '../contract-functions/calculate';
import { getAddress } from '../contract-functions/getAddress';
import { setAddress } from '../contract-functions/setAddress';
import { vm, contractAddress, accountAddress, INITIAL_GREETING, importedAccountPK, SECOND_GREETING, solcOutput, deployed } from '../index';

export async function testing(isDeployed: boolean) {

  console.log("Starting testing evm \n------------------------------------------------");
  const greeting = await getGreeting(vm, contractAddress, accountAddress);

  console.log('Greeting:', greeting);

  assert.equal(greeting, INITIAL_GREETING);

  console.log('Changing greeting...');

  await setGreeting(vm, importedAccountPK, contractAddress, SECOND_GREETING);

  const greeting2 = await getGreeting(vm, contractAddress, accountAddress);

  console.log('Greeting:', greeting2);

  assert.equal(greeting2, SECOND_GREETING);


  console.log('testing calculation...');

  const result = await calculate(vm, importedAccountPK, contractAddress, 3, 4);

  console.log('calculation result is: ', result);


  const result2 = await calculate2(vm, contractAddress, accountAddress, solcOutput.contracts['contracts/Greeter.sol'].Greeter.abi[2], 6, 4);
  console.log('result2 is: ', result2);



  //beginning test set and get address variable
  console.log("--------------------------------\nstart test set and get address");
  console.log("account Address value: ", accountAddress, " and it's type is ", typeof (accountAddress));
  await setAddress(vm, importedAccountPK, contractAddress, Address.fromString("0x71009ccc61579c970ae786cc1a73f5fa84bb1444"));
  console.log("set succeeded");
  var blaAddress = await getAddress(vm, contractAddress, accountAddress);
  console.log("bla address is: ", blaAddress);
  console.log(accountAddress.toString() == blaAddress.toLowerCase());
  console.log(accountAddress.toString() === blaAddress.toLowerCase());






  // Now let's look at what we created. The transaction
  // should have created a new account for the contract
  // in the state. Let's test to see if it did.
  const createdAccount = await vm.stateManager.getAccount(contractAddress);

  console.log('-------results-------');
  console.log('nonce: ' + createdAccount.nonce.toString());
  console.log('balance in wei: ', createdAccount.balance.toString());
  console.log('stateRoot: 0x' + createdAccount.stateRoot.toString('hex'));
  console.log('codeHash: 0x' + createdAccount.codeHash.toString('hex'));
  console.log('---------------------');

  console.log('Everything ran correctly!');



  isDeployed = true;





}
