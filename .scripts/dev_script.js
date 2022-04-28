const { exec } = require('shelljs-nodecli');
var nodeCLI = require('shelljs-nodecli');

var env = '--env=foo'; // <-- Default env flag/value when no arg provided.
var blockchain_web_ports = [3001, 3002, 3003]
var blockchain_p2p_ports = [5001, 5002, 5003]
var blockchain_evm_ports = [4001, 4002, 4003]


if (process.argv.indexOf('--prod') !== -1) {
  env = '--env=prod';
}

// Check for other possible env values
if (process.argv.indexOf('--quux') !== -1) {
  env = '--env=quux';
}

// Run the ng build command
for(i = 0 ; i < blockchain_evm_ports.length; i++){
    //nodeCLI.exec('ng', 'build', '--output-path=../../web/admin-v2', env, '--base-href=\"/admin-v2/\"');
    //nodeCLI.exec('nodemon', './app');
}

//exec('start', 'nodemon', './app')
exec('npm', 'run', 'evm')