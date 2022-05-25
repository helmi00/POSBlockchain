import { Address } from 'ethereumjs-util';
import { Transaction } from '@ethereumjs/tx';
import VM from '@ethereumjs/vm';
import { buildTransaction, encodeFunction } from '../helpers/tx-builder';
import { getAccountNonce } from '../helpers/account-utils';

export async function setAddress(
  vm: VM,
  senderPrivateKey: Buffer,
  contractAddress: Address,
  bla: Address) {
  const data = encodeFunction('setAddress', {
    types: ['address'],
    values: [bla.toString()],
  });
  //const sigHash = new Interface([methodabi]).getSighash('calculate')
  const txData = {
    to: contractAddress,
    data,
    nonce: await getAccountNonce(vm, senderPrivateKey),
  };

  const tx = Transaction.fromTxData(buildTransaction(txData)).sign(senderPrivateKey);

  const setGreetingResult = await vm.runTx({ tx });

  if (setGreetingResult.execResult.exceptionError) {
    throw setGreetingResult.execResult.exceptionError;
  }
}
