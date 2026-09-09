// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

/// @notice Token-weighted governance with delegation, quorum and a timelock,
///         reduced to the parts that decide outcomes. Chapter 36 discusses
///         what this mechanism does and does not achieve.
contract Governance {
    struct Proposal {
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 deadline;
        uint256 executableAt;   // 0 until the vote succeeds
        bool executed;
    }

    /// Voting power, held directly.
    mapping(address => uint256) public balance;
    /// Who each holder has delegated to. Zero means they hold their own.
    mapping(address => address) public delegateOf;
    /// Power currently exercisable by an address, including delegations in.
    mapping(address => uint256) public votingPower;

    mapping(uint256 => mapping(address => bool)) public hasVoted;
    Proposal[] public proposals;

    uint256 public immutable quorum;
    uint256 public immutable votingPeriod;
    uint256 public immutable timelockDelay;

    constructor(uint256 quorum_, uint256 votingPeriod_, uint256 timelockDelay_) {
        quorum = quorum_;
        votingPeriod = votingPeriod_;
        timelockDelay = timelockDelay_;
    }

    function grant(address to, uint256 amount) external {
        balance[to] += amount;
        votingPower[_effective(to)] += amount;
    }

    function _effective(address who) internal view returns (address) {
        address d = delegateOf[who];
        return d == address(0) ? who : d;
    }

    /// Delegation moves the power, not the tokens. The holder keeps the
    /// balance and loses the ability to vote it themselves.
    function delegate(address to) external {
        address from = _effective(msg.sender);
        uint256 amount = balance[msg.sender];
        votingPower[from] -= amount;
        delegateOf[msg.sender] = to;
        votingPower[_effective(msg.sender)] += amount;
    }

    function propose(string calldata description) external returns (uint256 id) {
        id = proposals.length;
        proposals.push(Proposal({
            description: description,
            forVotes: 0,
            againstVotes: 0,
            deadline: block.timestamp + votingPeriod,
            executableAt: 0,
            executed: false
        }));
    }

    function castVote(uint256 id, bool support) external {
        Proposal storage p = proposals[id];
        require(block.timestamp < p.deadline, "voting closed");
        require(!hasVoted[id][msg.sender], "already voted");
        uint256 power = votingPower[msg.sender];
        require(power > 0, "no voting power");
        hasVoted[id][msg.sender] = true;
        if (support) p.forVotes += power; else p.againstVotes += power;
    }

    function turnout(uint256 id) public view returns (uint256) {
        Proposal storage p = proposals[id];
        return p.forVotes + p.againstVotes;
    }

    function succeeded(uint256 id) public view returns (bool) {
        Proposal storage p = proposals[id];
        if (block.timestamp < p.deadline) return false;
        if (turnout(id) < quorum) return false;
        return p.forVotes > p.againstVotes;
    }

    /// A successful vote does not execute. It starts a clock, which is what
    /// gives anyone who disagrees time to act before it takes effect.
    function queue(uint256 id) external {
        require(succeeded(id), "not succeeded");
        require(proposals[id].executableAt == 0, "already queued");
        proposals[id].executableAt = block.timestamp + timelockDelay;
    }

    function execute(uint256 id) external {
        Proposal storage p = proposals[id];
        require(p.executableAt != 0, "not queued");
        require(block.timestamp >= p.executableAt, "timelock has not elapsed");
        require(!p.executed, "already executed");
        p.executed = true;
    }
}
