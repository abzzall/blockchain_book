// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

/**
 * A deadline-based funding campaign, written to make the behaviour of payable
 * functions visible. Money arrives only through `contribute`, it leaves only
 * when the caller pulls it, and the contract's own balance is never used as the
 * record of who is owed what.
 */
contract CourseCrowdfund {
    error DeadlineInPast();
    error GoalMustBePositive();
    error CampaignClosed();
    error CampaignStillOpen();
    error ContributionTooSmall(uint256 sent, uint256 minimum);
    error GoalNotReached(uint256 raised, uint256 goal);
    error GoalWasReached(uint256 raised, uint256 goal);
    error NothingToRefund(address contributor);
    error AlreadyWithdrawn();
    error BeneficiaryOnly(address caller);
    error DirectPaymentNotAccepted();
    error TransferFailed();

    event Contributed(address indexed contributor, uint256 amount, uint256 totalRaised);
    event Withdrawn(address indexed beneficiary, uint256 amount);
    event Refunded(address indexed contributor, uint256 amount);

    uint256 public constant MINIMUM_CONTRIBUTION = 0.001 ether;

    address public immutable beneficiary;
    uint256 public immutable goal;
    uint256 public immutable deadline;

    uint256 public totalRaised;
    bool public withdrawn;
    mapping(address contributor => uint256 amount) public contributionOf;

    constructor(address beneficiary_, uint256 goal_, uint256 durationSeconds) {
        if (goal_ == 0) revert GoalMustBePositive();
        if (durationSeconds == 0) revert DeadlineInPast();
        beneficiary = beneficiary_;
        goal = goal_;
        deadline = block.timestamp + durationSeconds;
    }

    /// True once the deadline has passed. The campaign is open strictly before it.
    function isClosed() public view returns (bool) {
        return block.timestamp >= deadline;
    }

    function goalReached() public view returns (bool) {
        return totalRaised >= goal;
    }

    /**
     * The only way ether enters this contract. `payable` is what permits the
     * call to carry value at all; without it the EVM rejects the transaction
     * before any of this code runs.
     */
    function contribute() external payable {
        if (isClosed()) revert CampaignClosed();
        if (msg.value < MINIMUM_CONTRIBUTION) {
            revert ContributionTooSmall(msg.value, MINIMUM_CONTRIBUTION);
        }
        contributionOf[msg.sender] += msg.value;
        totalRaised += msg.value;
        emit Contributed(msg.sender, msg.value, totalRaised);
    }

    /**
     * Pays the beneficiary once, after a successful campaign. State is written
     * before the transfer, so a re-entering beneficiary finds nothing left to
     * claim: this is Checks-Effects-Interactions.
     */
    function withdraw() external {
        if (msg.sender != beneficiary) revert BeneficiaryOnly(msg.sender);
        if (!isClosed()) revert CampaignStillOpen();
        if (!goalReached()) revert GoalNotReached(totalRaised, goal);
        if (withdrawn) revert AlreadyWithdrawn();

        withdrawn = true;
        uint256 amount = address(this).balance;
        emit Withdrawn(beneficiary, amount);
        (bool ok, ) = beneficiary.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    /**
     * Each contributor pulls their own refund after a failed campaign. The
     * contract never pushes money to a list of addresses, because one address
     * that rejects payment would then block everyone else.
     */
    function refund() external {
        if (!isClosed()) revert CampaignStillOpen();
        if (goalReached()) revert GoalWasReached(totalRaised, goal);

        uint256 amount = contributionOf[msg.sender];
        if (amount == 0) revert NothingToRefund(msg.sender);

        contributionOf[msg.sender] = 0;
        emit Refunded(msg.sender, amount);
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    /**
     * A plain transfer with no data reaches `receive`. Rejecting it is a
     * deliberate choice: money sent this way would raise the balance without
     * ever being recorded against a contributor, and so could never be
     * refunded.
     */
    receive() external payable {
        revert DirectPaymentNotAccepted();
    }
}
