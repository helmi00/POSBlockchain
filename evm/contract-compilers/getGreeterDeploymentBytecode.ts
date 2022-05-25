export function getGreeterDeploymentBytecode(solcOutput: any): any {
  return solcOutput.contracts['contracts/Greeter.sol'].Greeter.evm.bytecode.object;
}
