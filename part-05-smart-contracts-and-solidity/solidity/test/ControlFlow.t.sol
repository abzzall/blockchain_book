// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {ControlFlowExamples} from "../src/ControlFlow.sol";

contract ControlFlowTest {
    ControlFlowExamples internal examples;

    function setUp() public {
        examples = new ControlFlowExamples();
    }

    function test_ForLoopSumsABoundedPrefix() public view {
        uint256[] memory values = new uint256[](4);
        values[0] = 2;
        values[1] = 3;
        values[2] = 5;
        values[3] = 7;

        require(examples.sumFirst(values, 3) == 10, "wrong prefix sum");
    }

    function test_ForLoopRejectsLimitPastTheArray() public {
        uint256[] memory values = new uint256[](1);
        values[0] = 2;

        (bool ok, ) = address(examples).call(
            abi.encodeWithSignature("sumFirst(uint256[],uint256)", values, uint256(2))
        );
        require(!ok, "out-of-range limit accepted");
    }

    function test_WhileLoopStopsWhenConditionIsMet() public view {
        uint256[] memory values = new uint256[](4);
        values[0] = 3;
        values[1] = 8;
        values[2] = 13;
        values[3] = 21;

        (bool found, uint256 index) = examples.firstAtLeast(values, 10);
        require(found, "target not found");
        require(index == 2, "wrong index");
    }

    function test_WhileLoopReportsMissingValue() public view {
        uint256[] memory values = new uint256[](2);
        values[0] = 3;
        values[1] = 8;

        (bool found, uint256 index) = examples.firstAtLeast(values, 10);
        require(!found, "unexpected target");
        require(index == 0, "missing index should be zero");
    }

    function test_ProcessSplitsWorkAcrossCalls() public {
        examples.enqueue(5);
        examples.enqueue(7);
        examples.enqueue(11);

        require(examples.process(2) == 12, "first batch wrong");
        require(examples.cursor() == 2, "cursor did not advance");
        require(examples.process(2) == 11, "second batch wrong");
        require(examples.cursor() == 3, "cursor did not finish");
    }
}
