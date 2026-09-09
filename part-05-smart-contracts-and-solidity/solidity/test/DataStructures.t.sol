// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {TaskRegistry} from "../src/DataStructures.sol";

contract DataStructuresTest {
    TaskRegistry internal registry;

    function setUp() public {
        registry = new TaskRegistry();
    }

    function test_StructGroupsOneTaskRecord() public {
        uint256 taskId = registry.createTask("Write tests");

        (
            address owner,
            string memory title,
            uint64 createdAt,
            TaskRegistry.Status status
        ) = registry.getTask(taskId);

        require(owner == address(this), "wrong owner");
        require(keccak256(bytes(title)) == keccak256(bytes("Write tests")), "wrong title");
        require(createdAt == uint64(block.timestamp), "wrong timestamp");
        require(status == TaskRegistry.Status.Open, "wrong status");
    }

    function test_StorageReferenceUpdatesOriginalStruct() public {
        uint256 taskId = registry.createTask("Close me");
        registry.closeTask(taskId);

        (, , , TaskRegistry.Status status) = registry.getTask(taskId);
        require(status == TaskRegistry.Status.Closed, "not closed");
    }

    function test_IndexListsTasksByOwner() public {
        uint256 first = registry.createTask("One");
        uint256 second = registry.createTask("Two");

        require(registry.ownerTaskCount(address(this)) == 2, "wrong owner count");
        require(registry.ownerTaskAt(address(this), 0) == first, "wrong first id");
        require(registry.ownerTaskAt(address(this), 1) == second, "wrong second id");
    }

    function test_OnlyOwnerCanCloseTask() public {
        uint256 taskId = registry.createTask("Owned");
        TaskAttacker attacker = new TaskAttacker();

        (bool ok, ) = address(attacker).call(
            abi.encodeWithSignature("tryClose(address,uint256)", address(registry), taskId)
        );
        require(!ok, "non-owner closed task");
    }
}

contract TaskAttacker {
    function tryClose(TaskRegistry registry, uint256 taskId) external {
        registry.closeTask(taskId);
    }
}
