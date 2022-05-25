// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
//import "../test.sol";
//import "../contracts/test2.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract Greeter is  Ownable  {
    uint256 numberOfBalances = 0;
    string greeting;
    address bla;
    mapping(address => uint256)  balances;
    address[] accountAddresses;
    uint256[] values;

    constructor(string memory _greeting  /*, address[] memory addresses, uint256[] memory values*/) {
        greeting = _greeting;
        /*require(addresses.length == values.length, "number of addresses is not equal to the number of values");
        for(uint256 i = 0 ; i< addresses.length; i++) {
            balances[addresses[i]] = values[i];
            accountAddresses.push(addresses[i]);
            numberOfBalances++;
            values.push(values[i]);
        }*/
    }

    function setGreeting(string memory _greeting) public returns (bool) {
        greeting = _greeting;
        return true;
    }

    function greet() public view returns (string memory) {  
        return greeting;
    }

    function calculate( uint256 _a, uint256 _b) public pure returns (uint) {
        return _a+_b;
    }


    function getMsgSender() public view returns (address) {

        return _msgSender();
    }

    function getAddress() public view returns (address) {
        return bla;
    }

    function setAddress(address bl) public returns (bool) {
        bla = bl;
        return true;
    }


    function getAddresses() public view returns (address[] memory )  {
         
          
          return (accountAddresses);
    }

    function getBalances() public view returns (uint256[] memory) {
         uint256[] memory b;
         require(accountAddresses.length > 0, "accounts have not been populated yet");
          for(uint i = 0 ; i < accountAddresses.length; i++) {
              
              b[i] = balances[accountAddresses[i]];
          }

          return b;
    }


    
}