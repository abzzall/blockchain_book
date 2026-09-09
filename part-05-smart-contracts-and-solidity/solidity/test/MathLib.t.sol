// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {MathLib, UsesLibrary} from "../src/MathLib.sol";

contract MathLibTest {
    using MathLib for uint256;

    UsesLibrary internal u;

    function setUp() public {
        u = new UsesLibrary();
    }

    function test_DivModReturnsBothParts() public view {
        (uint256 q, uint256 r) = u.split(7, 2);
        require(q == 3 && r == 1, "divMod wrong");
    }

    function test_CeilDivRoundsUp() public view {
        require(u.ceil(7, 2) == 4, "7/2 should ceil to 4");
        require(u.ceil(6, 2) == 3, "6/2 should be exactly 3");
        require(u.ceil(0, 2) == 0, "0 should ceil to 0");
    }

    function test_MaxPicksTheLarger() public view {
        require(u.largest(3, 9) == 9, "max wrong");
    }

    /// `using ... for` makes the value the receiver; it is the same function.
    function test_UsingForIsTheSameCall() public pure {
        uint256 a = 7;
        require(a.ceilDiv(2) == MathLib.ceilDiv(7, 2), "attachment differs");
    }

    /// An internal library function is inlined, so the calling contract does
    /// not need the library deployed anywhere to use it.
    function test_LibraryNeedsNoDeployment() public view {
        require(u.ceil(5, 3) == 2, "inlined call failed");
    }
}
