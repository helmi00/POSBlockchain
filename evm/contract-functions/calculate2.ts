import { defaultAbiCoder as AbiCoder, Interface } from '@ethersproject/abi'
import VM from '@ethereumjs/vm'
import { Address } from 'ethereumjs-util'



export async function calculate2(vm: VM, contractAddress: Address, caller: Address, methodabi: object , a: number, b: number) {
  
    const sigHash = new Interface([methodabi]).getSighash('calculate')
    console.log("sighash of calculate function is: ", sigHash)
    const greetResult = await vm.runCall({
      to: contractAddress,
      caller: caller,
      origin: caller, // The tx.origin is also the caller here
      data: Buffer.from(sigHash.slice(2)+AbiCoder.encode(['uint256','uint256'],[a,b]).slice(2), 'hex'),
    })
  
    if (greetResult.execResult.exceptionError) {
      throw greetResult.execResult.exceptionError
    }
  
    const results = AbiCoder.decode(['uint256'], greetResult.execResult.returnValue)
  
    return results[0].toString()
  }