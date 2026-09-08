// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

/// @notice `constant` and `immutable` both avoid storage: their values live
///         in the contract's code. They differ in when the value is fixed.
contract Constants {
    /// Fixed when the contract is compiled. Every use is replaced by the
    /// value, so nothing is read at run time.
    uint256 public constant DECIMALS = 18;

    /// Also compile-time: hashing a literal is allowed.
    bytes32 public constant NAME_HASH = keccak256("blockchain-handbook");

    /// Fixed when the contract is deployed. Its value cannot be known when
    /// the source is compiled, because it depends on who deploys it.
    address public immutable deployer;

    /// Also deployment-time, and taken from an argument.
    uint256 public immutable createdAtBlock;

    /// An ordinary state variable, for comparison: this one uses storage.
    uint256 public mutableValue;

    constructor() {
        deployer = msg.sender;
        createdAtBlock = block.number;
        mutableValue = 1;
    }

    function setMutable(uint256 v) external {
        mutableValue = v;
    }
}
