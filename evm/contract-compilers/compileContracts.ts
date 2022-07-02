const solc = require('solc');
import { getSolcInput, findImports } from '../index';

/**
 * This function compiles all the contracts in `contracts/` and returns the Solidity Standard JSON
 * output. If the compilation fails, it returns `undefined`.
 *
 * To learn about the output format, go to https://solidity.readthedocs.io/en/v0.5.10/using-the-compiler.html#compiler-input-and-output-json-description
 */
export function compileGreetingContract() {
  const input = getSolcInput();
  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

  let compilationFailed = false;

  if (output.errors) {
    for (const error of output.errors) {
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
  //console.log('compilation output: ', output.contracts['contracts/Greeter.sol'].Greeter.abi);
  return output;
}
