// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {Counter} from "../src/Counter.sol";

/// Tests use plain `require`, so this project needs no dependencies at all.
/// A failing require fails the test.
contract CounterTest {
    Counter internal counter;

    function setUp() public {
        counter = new Counter(10);
    }

    function test_ConstructorSetsInitialValue() public view {
        require(counter.count() == 10, "constructor did not set count");
    }

    function test_ConstructorRecordsDeployer() public view {
        require(counter.owner() == address(this), "owner is not the deployer");
    }

    function test_IncrementChangesState() public {
        counter.increment();
        counter.increment();
        require(counter.count() == 12, "increment did not accumulate");
    }

    function test_ViewFunctionReadsWithoutChanging() public {
        uint256 before = counter.count();
        require(counter.doubled() == before * 2, "doubled is wrong");
        require(counter.count() == before, "a view function changed state");
    }

    function test_PureFunctionIgnoresState() public view {
        require(counter.add(2, 3) == 5, "add is wrong");
    }

    function test_PublicStateVariableHasAGetter() public view {
        // `count()` exists only because the variable is public.
        require(counter.count() == 10, "getter missing");
    }

    function test_InternalStateIsNotInTheAbi() public {
        // `_writes` is internal, so no selector `_writes()` exists. Calling
        // one anyway reaches no function and the call fails.
        (bool ok, ) = address(counter).call(
            abi.encodeWithSignature("_writes()")
        );
        require(!ok, "internal variable should not be callable");
    }

    function test_InternalStateIsReachableThroughAFunction() public {
        counter.increment();
        require(counter.writes() == 1, "internal counter not tracked");
    }
}
