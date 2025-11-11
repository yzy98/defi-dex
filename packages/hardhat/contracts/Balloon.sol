// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Balloon is ERC20 {
  constructor() ERC20("Balloon", "BAL") {
    _mint(msg.sender, 1000 ether); // mints 1000 balloons to the deployer
  }
}