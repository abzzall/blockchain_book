// SPDX-License-Identifier: MIT
pragma solidity ^0.8.36;

contract Counter {
    uint256 public count;
    event Counted(address indexed by, uint256 newCount);

    function increment() public {
        count += 1;
        emit Counted(msg.sender, count);
    }
}
