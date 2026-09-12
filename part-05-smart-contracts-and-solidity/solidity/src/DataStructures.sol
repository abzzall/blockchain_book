// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

contract TaskRegistry {
    enum Status {
        Open,
        Closed
    }

    struct Task {
        address owner;
        string title;
        uint64 createdAt;
        Status status;
    }

    Task[] private tasks;
    mapping(address owner => uint256[] taskIds) private tasksByOwner;

    function createTask(string calldata title) external returns (uint256 taskId) {
        taskId = tasks.length;

        tasks.push(
            Task({
                owner: msg.sender,
                title: title,
                createdAt: uint64(block.timestamp),
                status: Status.Open
            })
        );
        tasksByOwner[msg.sender].push(taskId);
    }

    function closeTask(uint256 taskId) external {
        Task storage task = tasks[taskId];
        require(task.owner == msg.sender, "not owner");
        require(task.status == Status.Open, "not open");

        task.status = Status.Closed;
    }

    function taskCount() external view returns (uint256) {
        return tasks.length;
    }

    function ownerTaskCount(address owner) external view returns (uint256) {
        return tasksByOwner[owner].length;
    }

    function ownerTaskAt(address owner, uint256 index) external view returns (uint256) {
        return tasksByOwner[owner][index];
    }

    function getTask(uint256 taskId)
        external
        view
        returns (address owner, string memory title, uint64 createdAt, Status status)
    {
        Task storage task = tasks[taskId];
        return (task.owner, task.title, task.createdAt, task.status);
    }
}
