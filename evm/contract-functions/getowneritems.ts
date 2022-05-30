import { Address } from 'ethereumjs-util';
import VM from '@ethereumjs/vm';
import { defaultAbiCoder as AbiCoder, Interface } from '@ethersproject/abi'

export async function getowneritems(vm: VM, contractAddress: Address, caller: Address, methodabi: object) {

  const sigHash = new Interface([methodabi]).getSighash('getowneritems');

  const greetResult = await vm.runCall({
    to: contractAddress,
    caller: caller,
    origin: caller,
    data: Buffer.from(sigHash.slice(2), 'hex'),
  });

  if (greetResult.execResult.exceptionError) {
    throw greetResult.execResult.exceptionError;
  }

  const results = AbiCoder.decode(['uint256'], greetResult.execResult.returnValue);
  return results[0];
}
