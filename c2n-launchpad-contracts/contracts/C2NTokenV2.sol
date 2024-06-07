//C2NTokenv2.sol
//SPDX-License-Identifier: UNLICENSED

// import "hardhat/console.sol";
// Auther: @charley_cai
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract C2NTokenV2 is ERC20, Ownable {

    constructor() ERC20("C2NTokenV2", "C2N2") Ownable(msg.sender){}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}