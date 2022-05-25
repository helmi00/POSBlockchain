import { Address } from 'ethereumjs-util';
import VM from '@ethereumjs/vm';
import { defaultAbiCoder as AbiCoder, Interface } from '@ethersproject/abi'

export async function fetchMarketItems(vm: VM, contractAddress: Address, caller: Address, methodabi: object, id: Number) {

  const sigHash = new Interface([methodabi]).getSighash('fetchMarketItems');

  const greetResult = await vm.runCall({
    to: contractAddress,
    caller: caller,
    origin: caller,
    data: Buffer.from(sigHash.slice(2) + AbiCoder.encode(['uint256'], [id]).slice(2), 'hex'),
  });

  if (greetResult.execResult.exceptionError) {
    throw greetResult.execResult.exceptionError;
  }

  const results = AbiCoder.decode(['tuple(uint256 tokenId,address owner,address Seller,uint256 price,bool sold)'], greetResult.execResult.returnValue);
  //console.log("result market item",results)
  return results;
}
