//Contract based on [https://docs.openzeppelin.com/contracts/3.x/erc721](https://docs.openzeppelin.com/contracts/3.x/erc721)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract MyNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;
    Counters.Counter private _itemsSold;

    struct MarketItem {
        uint256 tokenId;
        address seller;
        address owner;
        uint256 price;
        bool sold;
    }
    event MarketItemCreated(
        uint256 indexed tokenId,
        address seller,
        address owner,
        uint256 price,
        bool sold
    );
    mapping(uint256 => MarketItem) private idToMarketItem;

    constructor() ERC721("MyNFT", "NFT") {}

    function mintNFT(string memory tokenURI, uint256 price)
        public
        onlyOwner
        returns (uint256) {
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        _mint(owner(), newItemId);
        _setTokenURI(newItemId, tokenURI);
        createMarketItem(newItemId, price);
        return newItemId;
    }

    function createMarketItem(uint256 tokenId, uint256 price) private {
        require(price > 0, "Price must be at least 1 wei");
        //require(msg.value == 0.00, "Price must be equal to listing price");

        idToMarketItem[tokenId] = MarketItem(
            tokenId,
            owner(),
            address(this),
            price,
            false
        );

        _transfer(msg.sender, address(this), tokenId);
        emit MarketItemCreated(
            tokenId,
            msg.sender,
            address(this),
            price,
            false
        );
    }

    /*get all market items*/
    function reselleMarketItems(uint256 id)
        public
        view
        returns (
            uint256 tokenId,
            address owner,
            address seller,
            uint256 price,
            bool sold
        )
    {
        if (
            (idToMarketItem[id].owner != address(this)) &&
            idToMarketItem[id].sold == false
        ) {
            MarketItem storage currentItem = idToMarketItem[id];
            return (
                currentItem.tokenId,
                currentItem.owner,
                currentItem.seller,
                currentItem.price,
                currentItem.sold
            );
        }
    }

    /* Returns all unsold market items */
    function fetchMarketItems(uint256 id)
        public
        view
        returns (
            uint256 tokenId,
            address owner,
            address seller,
            uint256 price,
            bool sold
        ){
        if (idToMarketItem[id].owner == address(this)) {
            MarketItem storage currentItem = idToMarketItem[id];
            return (
                currentItem.tokenId,
                currentItem.owner,
                currentItem.seller,
                currentItem.price,
                currentItem.sold
            );
        }
    }

    function getallitem() public view returns (uint256 num_all_item) {
        uint256 itemCount = _tokenIds.current();
        return itemCount;
    }

    /* Creates the sale of a marketplace item */
    /* Transfers ownership of the item, as well as funds between parties */
    function createMarketSale(uint256 tokenId, uint256 proposeprice) public {
        uint256 price = idToMarketItem[tokenId].price;
        //address seller = idToMarketItem[tokenId].seller;
        require(
            proposeprice == price,
            "Please submit the asking price in order to complete the purchase"
        );
        idToMarketItem[tokenId].owner = (msg.sender);
        idToMarketItem[tokenId].sold = true;
        idToMarketItem[tokenId].seller = (address(0));
        _itemsSold.increment();
        _transfer(address(this), msg.sender, tokenId);
    }

    /* Returns owner market items */
    function fetchownerItems(uint256 id)
        public
        view
        returns (
            uint256 tokenId,
            address owner,
            address seller,
            uint256 price,
            bool sold
        ){
        if (idToMarketItem[id].owner == msg.sender) {
            MarketItem storage currentItem = idToMarketItem[id];
            return (
                currentItem.tokenId,
                currentItem.owner,
                currentItem.seller,
                currentItem.price,
                currentItem.sold
            );
        }
    }

    /* update price only owner */
    function updateprice(uint256 tokenId, uint256 proposeprice)
        public
        returns (bool){
        if (idToMarketItem[tokenId].owner == msg.sender) {
            require(
                proposeprice > 0,
                "Please submit the asking price in order to complete the purchase"
            );
            idToMarketItem[tokenId].price = proposeprice;
            return true;
        } else return false;
    }

    /* update price only owner */
    function updateforselle(uint256 tokenId) public returns (bool) {
        if (idToMarketItem[tokenId].owner == msg.sender) {
            idToMarketItem[tokenId].sold = false;
            return true;
        } else return false;
    }
     /* Transfers ownership of the item, as well as funds between parties */
    function Selleitem(
      uint256 tokenId,uint256 proposeprice
      ) public  {
      uint256 price = idToMarketItem[tokenId].price;
      address seller = idToMarketItem[tokenId].owner;
      require(proposeprice== price, "Please submit the asking price in order to complete the purchase");
      idToMarketItem[tokenId].owner = (msg.sender);
      idToMarketItem[tokenId].sold = false;
      idToMarketItem[tokenId].seller =seller;
      _transfer(seller, msg.sender, tokenId);
    }
}
