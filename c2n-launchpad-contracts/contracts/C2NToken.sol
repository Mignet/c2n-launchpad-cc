//C2NToken.sol
//SPDX-License-Identifier: UNLICENSED

// import "hardhat/console.sol";
// Auther: @charley_cai
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract C2NToken is ERC20, Ownable {
    constructor(uint256 _totalSupply) ERC20("C2NToken", "C2N") Ownable(msg.sender){
        require(_totalSupply > 0, "Total supply must be greater than zero");
        mint(msg.sender, _totalSupply);
    }

     /**
      * Convenient to external use
      * @param to target address
      * @param amount cnt of token to be minted
      */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function transfer(address to, uint256 value) public override onlyOwner returns (bool) {
        require(balanceOf(owner()) > value, "Not enough tokens Yet");
        _transfer(owner(), to, value);
        return true;
    }
}