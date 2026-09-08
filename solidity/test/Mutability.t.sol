// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {Mutability} from "../src/Mutability.sol";

contract MutabilityTest {
    Mutability internal m;

    function setUp() public {
        m = new Mutability();
    }

    function test_PureFunctionWorks() public view {
        require(m.pureAdd(2, 3) == 5, "pure add wrong");
    }

    function test_ViewFunctionReadsState() public view {
        require(m.viewStored() == 5, "view read wrong");
    }

    function test_WritingChangesState() public {
        m.write(9);
        require(m.viewStored() == 9, "write did not take");
    }

    function test_PayableFunctionAcceptsValue() public {
        uint256 received = m.deposit{value: 1 ether}();
        require(received == 1 ether, "value not seen");
        require(m.balance() == 1 ether, "balance not credited");
    }

    function test_NonPayableFunctionRejectsValue() public {
        (bool ok, ) = address(m).call{value: 1 wei}(
            abi.encodeWithSignature("write(uint256)", uint256(1))
        );
        require(!ok, "non-payable function accepted value");
    }

    function test_ContextReportsTheCaller() public view {
        (address caller, uint256 blockNumber, ) = m.context();
        require(caller == address(this), "msg.sender wrong");
        require(blockNumber == block.number, "block.number wrong");
    }

    receive() external payable {}
}
