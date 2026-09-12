// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

import {Counter} from "../contracts/Counter.sol";

contract CounterTest {
    function test_IncrementRaisesTheCount() public {
        Counter c = new Counter();
        c.increment();
        c.increment();
        require(c.count() == 2, "count did not accumulate");
    }

    function test_StartsAtZero() public {
        Counter c = new Counter();
        require(c.count() == 0, "default value should be zero");
    }
}
