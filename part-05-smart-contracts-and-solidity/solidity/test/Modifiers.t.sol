// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {Guarded} from "../src/Modifiers.sol";

contract Caller {
    function tryToSet(Guarded g, uint256 v) external returns (bool ok) {
        (ok, ) = address(g).call(
            abi.encodeWithSignature("setValue(uint256)", v)
        );
    }
}

contract ModifiersTest {
    Guarded internal g;

    function setUp() public {
        g = new Guarded();
    }

    function test_OwnerPassesTheGuard() public {
        g.setValue(5);
        require(g.value() == 5, "owner should have been allowed");
    }

    function test_AnotherCallerIsRejected() public {
        Caller other = new Caller();
        bool ok = other.tryToSet(g, 5);
        require(!ok, "a non-owner should have been rejected");
        require(g.value() == 0, "state changed despite the guard");
    }

    /// The underscore marks where the body goes, so a modifier's code runs
    /// on both sides of it, and modifiers nest in the order written.
    function test_ModifiersWrapTheBodyInOrder() public {
        g.wrapped();
        require(g.traceLength() == 5, "wrong number of trace entries");
        require(_eq(g.trace(0), "before:outer"), "outer should open first");
        require(_eq(g.trace(1), "before:inner"), "inner should open second");
        require(_eq(g.trace(2), "body"), "body should run in the middle");
        require(_eq(g.trace(3), "after:inner"), "inner should close first");
        require(_eq(g.trace(4), "after:outer"), "outer should close last");
    }

    function _eq(string memory a, string memory b) private pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
