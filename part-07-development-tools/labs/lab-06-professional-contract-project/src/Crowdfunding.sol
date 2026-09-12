// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

contract Crowdfunding {
    error ZeroAddress();
    error InvalidGoal();
    error InvalidDeadline();
    error CampaignClosed();
    error ZeroContribution();
    error CampaignStillOpen();
    error GoalNotReached();
    error GoalWasReached();
    error NothingToRefund();
    error AlreadyFinalized();
    error TransferFailed();

    event Contribution(address indexed contributor, uint256 amount, uint256 totalRaised);
    event Finalized(address indexed beneficiary, uint256 amount);
    event Refund(address indexed contributor, uint256 amount);

    address public immutable owner;
    address payable public immutable beneficiary;
    uint256 public immutable goalWei;
    uint64 public immutable deadline;
    uint256 public totalRaised;
    bool public finalized;
    mapping(address contributor => uint256 amount) public contributions;

    constructor(address payable beneficiary_, uint256 goalWei_, uint64 deadline_) {
        if (beneficiary_ == address(0)) revert ZeroAddress();
        if (goalWei_ == 0) revert InvalidGoal();
        if (deadline_ <= block.timestamp) revert InvalidDeadline();
        owner = msg.sender;
        beneficiary = beneficiary_;
        goalWei = goalWei_;
        deadline = deadline_;
    }

    function contribute() external payable {
        if (block.timestamp >= deadline || finalized) revert CampaignClosed();
        if (msg.value == 0) revert ZeroContribution();
        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;
        emit Contribution(msg.sender, msg.value, totalRaised);
    }

    function finalize() external {
        if (block.timestamp < deadline) revert CampaignStillOpen();
        if (finalized) revert AlreadyFinalized();
        if (totalRaised < goalWei) revert GoalNotReached();
        finalized = true;
        uint256 amount = address(this).balance;
        emit Finalized(beneficiary, amount);
        (bool sent,) = beneficiary.call{value: amount}("");
        if (!sent) revert TransferFailed();
    }

    function claimRefund() external {
        if (block.timestamp < deadline) revert CampaignStillOpen();
        if (totalRaised >= goalWei) revert GoalWasReached();
        uint256 amount = contributions[msg.sender];
        if (amount == 0) revert NothingToRefund();
        contributions[msg.sender] = 0;
        emit Refund(msg.sender, amount);
        (bool sent,) = payable(msg.sender).call{value: amount}("");
        if (!sent) revert TransferFailed();
    }

    function secondsRemaining() external view returns (uint256) {
        return block.timestamp >= deadline ? 0 : deadline - block.timestamp;
    }
}
