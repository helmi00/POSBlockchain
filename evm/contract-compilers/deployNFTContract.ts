import { Address } from 'ethereumjs-util';
import { Transaction } from '@ethereumjs/tx';
import VM from '@ethereumjs/vm';
import { buildTransaction, encodeDeployment } from '../helpers/tx-builder';
import { getAccountNonce } from '../helpers/account-utils';

export async function deployNFTContract(
  vm: VM,
  senderPrivateKey: Buffer,
  deploymentBytecode: Buffer,
  greeting: string): Promise<Address> {

  // Contracts are deployed by sending their deployment bytecode to the address 0
  // The contract params should be abi-encoded and appended to the deployment bytecode.
  const data = encodeDeployment(deploymentBytecode.toString('hex'), {
    types: ['string'],
    values: [greeting],
  });
  //console.log('deployment data ', data);
  const txData = {
    data,
    nonce: await getAccountNonce(vm, senderPrivateKey),
  };

  const tx = Transaction.fromTxData(buildTransaction(txData)).sign(senderPrivateKey);

  const deploymentResult = await vm.runTx({ tx });

  if (deploymentResult.execResult.exceptionError) {
    throw deploymentResult.execResult.exceptionError;
  }

  return deploymentResult.createdAddress!;
}
