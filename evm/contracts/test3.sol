// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
//import "../test.sol";
//import "../contracts/test2.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";


 contract CRYPTO_TND is Ownable, ERC20 {
     mapping(address => uint256) balances;

    string bla;
    constructor(address owner,  address[] memory addresses, uint256[] memory importedBalances) Ownable() ERC20("Orange Crypto TND", "OTND"){
        transferOwnership(owner);
        require(addresses.length == importedBalances.length, "number of balances is not equal to the number of addresses");
        for(uint256 i = 0 ; i< addresses.length; i++) {
            balances[addresses[i]]= importedBalances[i];
        }
    }

    function calculate( uint256 _a, uint256 _b) public pure returns (uint) {
        return _a+_b;
    }

    function setbla(string memory _greeting) public returns (bool) {
        bla = _greeting;
        return true;
    }

    function decimals() public view virtual override returns (uint8) {
        return 7;
    }

    function mint(address receiver, uint256 amount) onlyOwner public virtual  {
        _mint(receiver, amount);
    }


    function burn(address from, uint256 amount) onlyOwner public virtual {
        _burn(from, amount);
    }
}