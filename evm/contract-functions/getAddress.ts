import { defaultAbiCoder as AbiCoder, Interface } from '@ethersproject/abi';
import { Address } from 'ethereumjs-util';
import VM from '@ethereumjs/vm';

export async function getAddress(vm: VM, contractAddress: Address, caller: Address) {
  const sigHash = new Interface(['function getAddress()']).getSighash('getAddress');

  const greetResult = await vm.runCall({
    to: contractAddress,
    caller: caller,
    origin: caller,
    data: Buffer.from(sigHash.slice(2), 'hex'),
  });

  if (greetResult.execResult.exceptionError) {
    throw greetResult.execResult.exceptionError;
  }

  const results = AbiCoder.decode(['address'], greetResult.execResult.returnValue);

  return results[0];
}
