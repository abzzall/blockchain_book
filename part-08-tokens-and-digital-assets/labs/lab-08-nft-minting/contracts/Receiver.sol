// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/// The minimum a contract must implement to be allowed to hold an NFT.
contract Receiver is IERC721Receiver {
    function onERC721Received(address, address, uint256, bytes calldata)
        external pure returns (bytes4)
    {
        return IERC721Receiver.onERC721Received.selector;
    }
}
