// SPDX-License-Identifier: MIT
pragma solidity ^0.8.36;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Non-fungible: ownership is recorded per identifier, not as a
///         quantity. There is no balance to divide.
contract CampusBadge is ERC721, Ownable {
    uint256 private _next;

    constructor(address owner_) ERC721("Campus Badge", "BADGE") Ownable(owner_) {}

    function issue(address to) external onlyOwner returns (uint256 id) {
        id = ++_next;
        _safeMint(to, id);
    }
}

/// @notice Both at once: each identifier names a class of item, and an
///         address holds a quantity within that class.
contract CampusItems is ERC1155, Ownable {
    uint256 public constant TICKET = 1;
    uint256 public constant DIPLOMA = 2;

    constructor(address owner_) ERC1155("https://example.invalid/{id}.json") Ownable(owner_) {}

    function issue(address to, uint256 id, uint256 amount) external onlyOwner {
        _mint(to, id, amount, "");
    }
}

/// @notice A contract that cannot accept a safely transferred token, used to
///         show what the safe variant is actually checking.
contract RefusesTokens {}
