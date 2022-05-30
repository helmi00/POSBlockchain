export function abi_index(method: string, solcOutput: any) {
  //console.log((solcOutput.contracts['helpers/nft.sol'].MyNFT.abi))
  const data = solcOutput.contracts['contracts/nft.sol'].MyNFT.abi;
  let i: number = 0;
  var test: boolean = true;
  while (test) {
    //console.log("data",data[i].name)
    if (data[i].name == method) {
      // console.log("i",data[i].name)
      test = false;

    }
    i++;
  }
  return i - 1;
}
