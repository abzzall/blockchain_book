// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {Arithmetic} from "../src/Arithmetic.sol";

contract ArithmeticTest {
    Arithmetic internal math;
    uint256 internal constant MAX = type(uint256).max;

    function setUp() public {
        math = new Arithmetic();
    }

    function test_CheckedAdditionRevertsOnOverflow() public {
        (bool ok, ) = address(math).call(
            abi.encodeWithSelector(math.addChecked.selector, MAX, uint256(1))
        );
        require(!ok, "overflow should have reverted");
    }

    function test_UncheckedAdditionWrapsInstead() public view {
        require(math.addUnchecked(MAX, 1) == 0, "wrapping is wrong");
    }

    function test_CheckedSubtractionRevertsOnUnderflow() public {
        (bool ok, ) = address(math).call(
            abi.encodeWithSelector(math.subChecked.selector, uint256(0), uint256(1))
        );
        require(!ok, "underflow should have reverted");
    }

    function test_UncheckedSubtractionWrapsToTheTop() public view {
        require(math.subUnchecked(0, 1) == MAX, "wrapping is wrong");
    }

    function test_OrdinaryArithmeticStillWorks() public view {
        require(math.addChecked(2, 3) == 5, "addition is wrong");
        require(math.subChecked(5, 3) == 2, "subtraction is wrong");
    }

    function test_DivisionByZeroReverts() public {
        (bool ok, ) = address(math).call(
            abi.encodeWithSelector(math.div.selector, uint256(1), uint256(0))
        );
        require(!ok, "division by zero should have reverted");
    }

    function test_IntegerDivisionTruncates() public view {
        require(math.truncates(7, 2) == 3, "7 / 2 should be 3");
        require(math.truncates(1, 2) == 0, "1 / 2 should be 0");
    }

    function test_LiteralDivisionNeedsATypedOperand() public view {
        require(math.literalDivision() == 3, "uint256(7) / 2 should be 3");
    }

    function test_TypeMaxIsWhatTheRangeSays() public pure {
        require(type(uint8).max == 255, "uint8 range");
        require(type(uint256).max == 2 ** 256 - 1, "uint256 range");
        require(type(int8).min == -128, "int8 minimum");
    }
}
