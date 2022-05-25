import { defaultAbiCoder as AbiCoder, Interface } from '@ethersproject/abi';
import { Address } from 'ethereumjs-util';
import VM from '@ethereumjs/vm';

export async function getMsgSender(vm: VM, contractAddress: Address, caller: Address, methodABI: object) {
  const sigHash = new Interface([methodABI]).getSighash('getMsgSender');

  const result = await vm.runCall({
    to: contractAddress,
    caller: caller,
    origin: caller,
    data: Buffer.from(sigHash.slice(2), 'hex'),
  });

  if (result.execResult.exceptionError) { throw result.execResult.exceptionError; }
  const decodedResult = AbiCoder.decode(['address'], result.execResult.returnValue);
  console.log("decoded result is ", decodedResult[0], " and it's type is ", typeof(decodedResult[0]));

  return decodedResult[0].toLowerCase();
}
