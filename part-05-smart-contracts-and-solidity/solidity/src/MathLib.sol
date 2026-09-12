// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/// @notice A library holds reusable functions and no state of its own. With
///         only internal functions it is inlined into the calling contract
///         at compile time, so no separate deployment is involved.
library MathLib {
    /// Returns the whole part and the remainder, since division truncates.
    function divMod(uint256 a, uint256 b)
        internal
        pure
        returns (uint256 quotient, uint256 remainder)
    {
        return (a / b, a % b);
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }

    /// Rounds up rather than truncating, which integer division cannot do.
    function ceilDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        return a == 0 ? 0 : (a - 1) / b + 1;
    }
}

contract UsesLibrary {
    /// `using ... for` attaches the library's functions to a type, so the
    /// first argument becomes the receiver.
    using MathLib for uint256;

    function ceil(uint256 a, uint256 b) external pure returns (uint256) {
        return a.ceilDiv(b);
    }

    function largest(uint256 a, uint256 b) external pure returns (uint256) {
        return MathLib.max(a, b);
    }

    function split(uint256 a, uint256 b)
        external
        pure
        returns (uint256, uint256)
    {
        return MathLib.divMod(a, b);
    }
}
