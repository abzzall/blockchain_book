// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {
    ICounter,
    SimpleCounter,
    Diamond,
    CtorDerived,
    FixedMetadata,
    ConfiguredMetadata
} from "../src/Inheritance.sol";

contract InheritanceTest {
    function test_ConcreteContractSatisfiesTheInterface() public {
        SimpleCounter c = new SimpleCounter();
        c.bump();
        c.bump();
        require(c.value() == 2, "bump did not accumulate");
    }

    function test_ItCanBeUsedThroughTheInterfaceType() public {
        ICounter c = ICounter(address(new SimpleCounter()));
        c.bump();
        require(c.value() == 1, "interface dispatch failed");
    }

    /// `super` follows the linearized order, not a named parent. With
    /// `Diamond is Left, Right`, the order runs from most derived towards
    /// the base, taking the rightmost base first.
    function test_SuperFollowsTheLinearizedOrder() public {
        Diamond d = new Diamond();
        d.step();
        require(d.traceLength() == 4, "wrong number of steps");
        require(_eq(d.trace(0), "Diamond"), "first should be Diamond");
        require(_eq(d.trace(1), "Right"), "second should be Right");
        require(_eq(d.trace(2), "Left"), "third should be Left");
        require(_eq(d.trace(3), "Root"), "fourth should be Root");
    }

    /// Root appears once even though both Left and Right derive from it.
    function test_TheSharedBaseRunsOnlyOnce() public {
        Diamond d = new Diamond();
        d.step();
        uint256 roots = 0;
        for (uint256 i = 0; i < d.traceLength(); i++) {
            if (_eq(d.trace(i), "Root")) roots++;
        }
        require(roots == 1, "shared base ran more than once");
    }

    /// Constructors run base-first, in linearized order.
    function test_ConstructorsRunBaseFirst() public {
        CtorDerived d = new CtorDerived();
        require(d.orderLength() == 4, "wrong number of constructors");
        require(_eq(d.order(0), "CtorRoot"), "root should run first");
        require(_eq(d.order(1), "CtorA"), "A should run second");
        require(_eq(d.order(2), "CtorB"), "B should run third");
        require(_eq(d.order(3), "CtorDerived"), "derived should run last");
    }

    function test_BaseConstructorArgumentsCanBeFixed() public {
        FixedMetadata m = new FixedMetadata();
        require(_eq(m.name(), "fixed"), "wrong fixed name");
        require(m.version() == 1, "wrong fixed version");
    }

    function test_BaseConstructorArgumentsCanComeFromDerivedConstructor() public {
        ConfiguredMetadata m = new ConfiguredMetadata("configured", 7);
        require(_eq(m.name(), "configured"), "wrong configured name");
        require(m.version() == 7, "wrong configured version");
    }

    function _eq(string memory a, string memory b) private pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
