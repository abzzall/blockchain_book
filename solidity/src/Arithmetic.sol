// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

/// @notice Since Solidity 0.8.0 arithmetic reverts on overflow and underflow
///         by default. Before that it wrapped silently, which is why older
///         code carries a library to check what the language now checks.
contract Arithmetic {
    /// Reverts if the result leaves the range of the type.
    function addChecked(uint256 a, uint256 b) external pure returns (uint256) {
        return a + b;
    }

    /// Wraps instead, which is the pre-0.8 behaviour, requested explicitly.
    function addUnchecked(uint256 a, uint256 b) external pure returns (uint256) {
        unchecked {
            return a + b;
        }
    }

    function subChecked(uint256 a, uint256 b) external pure returns (uint256) {
        return a - b;
    }

    function subUnchecked(uint256 a, uint256 b) external pure returns (uint256) {
        unchecked {
            return a - b;
        }
    }

    /// Division by zero reverts, and always did: it is not an overflow.
    function div(uint256 a, uint256 b) external pure returns (uint256) {
        return a / b;
    }

    /// Integer division truncates towards zero. There are no fractions in
    /// the EVM, so 7 / 2 is 3 and the remainder is simply lost.
    function truncates(uint256 a, uint256 b) external pure returns (uint256) {
        return a / b;
    }

    /// Number *literals* are a separate matter, and a trap worth meeting
    /// once. The compiler evaluates literal expressions as exact rationals
    /// before assigning a type, so `7 / 2` written literally is 3.5 and will
    /// not compile as a uint256. Writing `uint256(7) / 2` gives 3, because
    /// then it is integer division on a typed value.
    function literalDivision() external pure returns (uint256) {
        return uint256(7) / 2;
    }
}
