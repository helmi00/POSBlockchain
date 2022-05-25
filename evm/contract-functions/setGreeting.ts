import { Address } from 'ethereumjs-util';
import { Transaction } from '@ethereumjs/tx';
import VM from '@ethereumjs/vm';
import { buildTransaction, encodeFunction } from '../helpers/tx-builder';
import { getAccountNonce } from '../helpers/account-utils';

export async function setGreeting(
  vm: VM,
  senderPrivateKey: Buffer,
  contractAddress: Address,
  greeting: string) {
  const data = encodeFunction('setGreeting', {
    types: ['string'],
    values: [greeting],
  });

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
