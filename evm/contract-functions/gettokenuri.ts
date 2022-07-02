import { Address } from 'ethereumjs-util';
import VM from '@ethereumjs/vm';
import { defaultAbiCoder as AbiCoder, Interface } from '@ethersproject/abi'

export async function gettokenuri(vm: VM, contractAddress: Address, caller: Address, methodabi: object, id: Number) {

  const sigHash = new Interface([methodabi]).getSighash('gettokenuri')

  const greetResult = await vm.runCall({
    to: contractAddress,
    caller: caller,
    origin: caller, // The tx.origin is also the caller here
    data: Buffer.from(sigHash.slice(2) + AbiCoder.encode(['uint256'],[id]).slice(2), 'hex'),
  })
console.log(" get uri nft",(greetResult.execResult.returnValue).toString())
  if (greetResult.execResult.exceptionError) {
    throw greetResult.execResult.exceptionError
  }

  const results = AbiCoder.decode(['string'], greetResult.execResult.returnValue)
  console.log("resulttoken uri",results[0])
  return results[0]
}

