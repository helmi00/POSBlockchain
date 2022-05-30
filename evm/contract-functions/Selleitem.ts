import { Address } from 'ethereumjs-util';
import { Transaction } from '@ethereumjs/tx';
import VM from '@ethereumjs/vm';
import { buildTransaction, encodeFunction } from '../helpers/tx-builder';
import { getAccountNonce } from '../helpers/account-utils';

export async function Seleitem(vm: VM, contractAddress: Address, senderPrivateKey: Buffer, tokenId: Number, proposeprice: Number) {
  const data = encodeFunction('Seleitem', {
    types: ['uint256', 'uint256'],
    values: [tokenId, proposeprice],
  });

  const txData = {
    to: contractAddress,
    data,
    nonce: await getAccountNonce(vm, senderPrivateKey),
  };



  const tx = Transaction.fromTxData(buildTransaction(txData)).sign(senderPrivateKey);


  const setCalculatingResult = await vm.runTx({ tx });

  if (setCalculatingResult.execResult.exceptionError) {
    throw setCalculatingResult.execResult.exceptionError;
  }

  //const results = AbiCoder.decode(['bool state'], setCalculatingResult.execResult.returnValue)
  //return results[0] 
}
