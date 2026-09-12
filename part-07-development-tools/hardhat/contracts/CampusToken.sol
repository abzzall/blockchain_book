// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice A token assembled from audited parts. The inheritance is the whole
///         implementation: ERC20 supplies the ledger, Ownable the access rule.
contract CampusToken is ERC20, Ownable {
    /// Ownable in version 5 requires the initial owner explicitly. In
    /// version 4 it silently used msg.sender, which is the single most
    /// common breaking change between the two.
    constructor(address initialOwner)
        ERC20("Campus Token", "CAMP")
        Ownable(initialOwner)
    {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
