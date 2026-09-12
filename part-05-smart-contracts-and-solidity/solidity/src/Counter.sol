// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/// @title A contract small enough to read in full.
/// @notice Demonstrates state variables, visibility, a constructor, and the
///         difference between reading and writing.
contract Counter {
    /// Public state variables get an automatic getter of the same name.
    /// There is no setter: `public` describes reading, not writing.
    uint256 public count;

    /// Set once at construction and then never changed by any function here.
    address public immutable owner;

    /// Internal state: visible to this contract and contracts deriving from
    /// it, and absent from the ABI, so nothing outside can name it.
    uint256 internal _writes;

    /// Runs exactly once, at deployment. Its code is not part of the
    /// deployed bytecode, as Chapter 14 explained.
    constructor(uint256 start) {
        count = start;
        owner = msg.sender;
    }

    /// Changes state, so it needs a transaction and costs gas.
    function increment() external {
        count += 1;
        _writes += 1;
    }

    /// Reads state without changing it. Callable without a transaction.
    function doubled() external view returns (uint256) {
        return count * 2;
    }

    /// Touches no state at all: the answer depends only on the arguments.
    function add(uint256 a, uint256 b) external pure returns (uint256) {
        return a + b;
    }

    /// Reads internal state that has no automatic getter.
    function writes() external view returns (uint256) {
        return _writes;
    }
}
