import { defaultAbiCoder as AbiCoder, Interface } from '@ethersproject/abi';
import { Address } from 'ethereumjs-util';
import VM from '@ethereumjs/vm';

export async function getBalances(vm: VM, contractAddress: Address, caller: Address) {
  const sigHash = new Interface(['function getAddresses()']).getSighash('getAddresses');

  const AddressesResult = await vm.runCall({
    to: contractAddress,
    caller: caller,
    origin: caller,
    data: Buffer.from(sigHash.slice(2), 'hex'),
  });


  //console.log("exec result is ", AddressesResult.execResult.returnValue.toString())
  if (AddressesResult.execResult.exceptionError) {
    throw AddressesResult.execResult.exceptionError;
  }
  
  var results = AbiCoder.decode(['address[]'], AddressesResult.execResult.returnValue);
  
  
  var addresses=results[0]
  console.log("got addresses successfully")

  
  /*console.log("about to get balances now")
  const bData = new Interface(['function getBalances()']).getSighash('getBalances')
  const BalancesResult = await vm.runCall({
    to: contractAddress,
    caller: caller,
    origin: caller,
    data: Buffer.from(bData.slice(2), 'hex')
  })
  
  console.log("request to get balances is finished")
  if (BalancesResult.execResult.exceptionError) {
    throw BalancesResult.execResult.exceptionError;
  }

  results = AbiCoder.decode(['uint256[]'],BalancesResult.execResult.returnValue)
  console.log("got values successfully ", results[0])
*/


  return results[0];
}
