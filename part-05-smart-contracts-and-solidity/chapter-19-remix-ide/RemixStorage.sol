// SPDX-License-Identifier: MIT
// The wide pragma here is deliberate, and differs from the exact 0.8.37 pinned
// by every build-configured project in this repository. This file is opened in
// Remix, which compiles it with whichever release the browser offers that day
// (0.8.34 when chapter 19 was written). A wide range keeps it compiling as that
// default moves. Reproducible projects pin exactly instead; see the compiler
// version policy in the repository README.
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
