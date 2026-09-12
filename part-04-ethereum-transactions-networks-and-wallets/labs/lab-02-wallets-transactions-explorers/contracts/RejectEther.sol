// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

contract RejectEther {
    receive() external payable {
        revert("plain ether refused");
    }
}
