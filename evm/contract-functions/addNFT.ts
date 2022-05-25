import { Address } from 'ethereumjs-util';
import { Transaction } from '@ethereumjs/tx';
import VM from '@ethereumjs/vm';
import { buildTransaction, encodeFunction } from '../helpers/tx-builder';
import { getAccountNonce } from '../helpers/account-utils';
import { defaultAbiCoder as AbiCoder } from '@ethersproject/abi'

export async function addNFT(vm: VM, senderPrivateKey: Buffer, contractAddress: Address, tokenId: string, price: number) {
  const data = encodeFunction('mintNFT', {
    types: ['string', 'uint256'],
    values: [tokenId, price],
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

  const results = AbiCoder.decode(['uint256'], setCalculatingResult.execResult.returnValue);

  return results[0].toString();
}
