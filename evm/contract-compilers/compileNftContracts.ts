const solc = require('solc');
import { getSolcInputNFT, findImports } from '../index';

export function compileNftContracts() {

  const nftInput = getSolcInputNFT();

  const nftOutput = JSON.parse(solc.compile(JSON.stringify(nftInput), { import: findImports }));

  let compilationFailed = false;

  if (nftOutput.errors) {
    for (const error of nftOutput.errors) {
      if (error.severity === 'error') {
        console.error(error.formattedMessage);
        compilationFailed = true;
      } else {
        console.warn(error.formattedMessage);
      }
    }
  }

  if (compilationFailed) {
    return undefined;
  }
  //console.log('compilation output: ', nftOutput.contracts['contracts/nft.sol'].MyNFT.abi);
  return nftOutput;
}
