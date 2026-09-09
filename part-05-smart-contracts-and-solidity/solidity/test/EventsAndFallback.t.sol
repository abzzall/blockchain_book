// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {Ledger, Unreceptive} from "../src/EventsAndFallback.sol";

/// The smallest slice of Foundry's cheatcode interface this file needs.
/// Declaring it here keeps the project free of external dependencies.
interface Vm {
    struct Log {
        bytes32[] topics;
        bytes data;
        address emitter;
    }

    function recordLogs() external;
    function getRecordedLogs() external returns (Log[] memory);
}

contract EventsAndFallbackTest {
    Vm internal constant vm =
        Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    Ledger internal ledger;

    function setUp() public {
        ledger = new Ledger();
    }

    // ---- events ---------------------------------------------------------

    function test_TopicZeroIsTheHashOfTheEventSignature() public {
        vm.recordLogs();
        ledger.deposit{value: 1 wei}();
        Vm.Log[] memory logs = vm.getRecordedLogs();
        require(logs.length == 1, "expected one log");
        require(
            logs[0].topics[0] == keccak256("Deposited(address,uint256)"),
            "topic 0 is not the signature hash"
        );
    }

    function test_IndexedParameterBecomesATopicAndTheRestIsData() public {
        vm.recordLogs();
        ledger.deposit{value: 7 wei}();
        Vm.Log[] memory logs = vm.getRecordedLogs();
        // topics: [signature, from]. The amount is not indexed, so it is data.
        require(logs[0].topics.length == 2, "expected two topics");
        require(
            address(uint160(uint256(logs[0].topics[1]))) == address(this),
            "indexed sender wrong"
        );
        require(abi.decode(logs[0].data, (uint256)) == 7, "data wrong");
    }

    /// An indexed string is stored as the hash of its value, so it can be
    /// searched for but not read back. The same value unindexed is readable.
    function test_IndexedStringIsStoredAsItsHash() public {
        vm.recordLogs();
        ledger.label("hello");
        Vm.Log[] memory logs = vm.getRecordedLogs();
        require(logs[0].topics[1] == keccak256("hello"), "not the hash");
        require(
            keccak256(bytes(abi.decode(logs[0].data, (string))))
                == keccak256("hello"),
            "unindexed copy should be readable"
        );
    }

    function test_LogsAreAttributedToTheEmittingContract() public {
        vm.recordLogs();
        ledger.deposit{value: 1 wei}();
        Vm.Log[] memory logs = vm.getRecordedLogs();
        require(logs[0].emitter == address(ledger), "wrong emitter");
    }

    // ---- receive and fallback -------------------------------------------

    function test_EmptyCallDataReachesReceive() public {
        (bool ok, ) = address(ledger).call{value: 1 wei}("");
        require(ok, "plain transfer failed");
        require(_eq(ledger.lastEntry(), "receive"), "receive did not run");
        require(ledger.balance() == 1 wei, "value not credited");
    }

    function test_UnknownSelectorReachesFallback() public {
        (bool ok, ) = address(ledger).call(
            abi.encodeWithSignature("noSuchFunction()")
        );
        require(ok, "fallback should have accepted the call");
        require(_eq(ledger.lastEntry(), "fallback"), "fallback did not run");
    }

    function test_FallbackReceivesTheCallData() public {
        bytes memory payload = abi.encodeWithSignature("noSuchFunction()");
        (bool ok, ) = address(ledger).call(payload);
        require(ok, "call failed");
        require(
            keccak256(ledger.lastData()) == keccak256(payload),
            "fallback did not see the data"
        );
    }

    function test_AMatchingFunctionWinsOverBoth() public {
        ledger.deposit{value: 2 wei}();
        require(_eq(ledger.lastEntry(), "deposit"), "deposit did not run");
    }

    function test_ContractWithNeitherCannotReceiveEther() public {
        Unreceptive u = new Unreceptive();
        (bool ok, ) = address(u).call{value: 1 wei}("");
        require(!ok, "transfer should have been rejected");
    }

    function _eq(string memory a, string memory b) private pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }

    receive() external payable {}
}
