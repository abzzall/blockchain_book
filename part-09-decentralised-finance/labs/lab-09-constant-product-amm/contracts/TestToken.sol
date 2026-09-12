// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// A plain mintable token, used only to give the pool something to trade.
contract TestToken is ERC20 {
    constructor(string memory name_, string memory symbol_, uint256 supply)
        ERC20(name_, symbol_)
    {
        _mint(msg.sender, supply);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
