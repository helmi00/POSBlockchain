export function getNftDeploymentBytecode(solcOutput: any): any {
  return solcOutput.contracts['contracts/nft.sol'].MyNFT.evm.bytecode.object;
}
