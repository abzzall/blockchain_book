// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title A stable, minimal contract for the Chapter 19 Remix walkthrough
contract RemixStorage {
    uint256 private storedValue;

    event ValueChanged(uint256 oldValue, uint256 newValue, address indexed caller);

    constructor(uint256 initialValue) {
        storedValue = initialValue;
    }

    function set(uint256 newValue) external {
        uint256 oldValue = storedValue;
        storedValue = newValue;
        emit ValueChanged(oldValue, newValue, msg.sender);
    }

    function get() external view returns (uint256) {
        return storedValue;
    }
}
