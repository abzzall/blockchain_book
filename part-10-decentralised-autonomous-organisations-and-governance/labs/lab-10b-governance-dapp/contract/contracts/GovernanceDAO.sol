// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

/// @title A teaching governance system: voting power, proposals, quorum, execution.
/// @notice One contract holds the token, the delegation, the governor and the
/// timelock so that a single address is enough to drive the whole lifecycle from
/// a frontend. Production systems separate these; the mechanism is the same.
contract GovernanceDAO {
    // ---------------------------------------------------------------- token

    string public constant name = "Governance Token";
    string public constant symbol = "GOV";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    /// @notice Who each holder has assigned their voting power to.
    mapping(address => address) public delegates;

    /// @dev A recorded voting-power value, valid from `fromBlock` onwards.
    struct Checkpoint {
        uint32 fromBlock;
        uint224 votes;
    }

    mapping(address => Checkpoint[]) private _checkpoints;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event DelegateChanged(address indexed holder, address indexed from, address indexed to);
    event VotingPowerChanged(address indexed delegate, uint256 previousVotes, uint256 newVotes);

    // ----------------------------------------------------------- governance

    enum ProposalState {
        Active,
        Defeated,
        Succeeded,
        Queued,
        Executed
    }

    struct Proposal {
        address proposer;
        string description;
        /// @notice The contract the proposal calls if it executes.
        address target;
        /// @notice The exact calldata that will be sent. This, not the
        /// description, is what actually runs.
        bytes callData;
        /// @notice Voting power is read as of this block, not as of the vote.
        uint256 snapshotBlock;
        uint256 voteEnd;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 executableAt;
        bool queued;
        bool executed;
    }

    Proposal[] private _proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    /// @notice Voting power needed to submit a proposal at all.
    uint256 public immutable proposalThreshold;
    /// @notice Minimum total votes cast for a result to count.
    uint256 public immutable quorumVotes;
    /// @notice How long voting stays open, in seconds.
    uint256 public immutable votingPeriod;
    /// @notice The delay between a proposal passing and becoming executable.
    uint256 public immutable timelockDelay;

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, address target, bytes callData, uint256 snapshotBlock, uint256 voteEnd);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalQueued(uint256 indexed proposalId, uint256 executableAt);
    event ProposalExecuted(uint256 indexed proposalId, bytes returnData);

    error NoVotingPower();
    error BelowProposalThreshold(uint256 held, uint256 required);
    error VotingClosed();
    error VotingStillOpen();
    error AlreadyVoted();
    error ProposalNotSuccessful();
    error ProposalNotQueued();
    error AlreadyQueued();
    error AlreadyExecuted();
    error TimelockNotElapsed(uint256 executableAt, uint256 currentTime);
    error UnknownProposal();
    error ExecutionFailed();

    constructor(
        address[] memory holders,
        uint256[] memory amounts,
        uint256 quorumVotes_,
        uint256 proposalThreshold_,
        uint256 votingPeriod_,
        uint256 timelockDelay_
    ) {
        require(holders.length == amounts.length, "length mismatch");
        quorumVotes = quorumVotes_;
        proposalThreshold = proposalThreshold_;
        votingPeriod = votingPeriod_;
        timelockDelay = timelockDelay_;

        for (uint256 i = 0; i < holders.length; i++) {
            balanceOf[holders[i]] += amounts[i];
            totalSupply += amounts[i];
            emit Transfer(address(0), holders[i], amounts[i]);
            // A holder starts delegated to nobody. They hold tokens and have no
            // voting power until they delegate, which is how the major
            // implementations behave and is the first thing that surprises people.
        }
    }

    // ------------------------------------------------------------- transfers

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        // Voting power follows the tokens, to whoever each side has delegated to.
        _moveVotingPower(delegates[msg.sender], delegates[to], amount);
        return true;
    }

    // ------------------------------------------------------------ delegation

    /// @notice Assign voting power to `delegatee` without moving any tokens.
    function delegate(address delegatee) external {
        address current = delegates[msg.sender];
        delegates[msg.sender] = delegatee;
        emit DelegateChanged(msg.sender, current, delegatee);
        _moveVotingPower(current, delegatee, balanceOf[msg.sender]);
    }

    /// @notice Voting power right now.
    function getVotes(address account) public view returns (uint256) {
        uint256 length = _checkpoints[account].length;
        return length == 0 ? 0 : _checkpoints[account][length - 1].votes;
    }

    /// @notice Voting power as it stood at the end of `blockNumber`.
    /// @dev This is what makes borrowed voting power useless: a proposal reads
    /// the past, and tokens acquired after the snapshot are not in it.
    function getPastVotes(address account, uint256 blockNumber) public view returns (uint256) {
        require(blockNumber < block.number, "not yet determined");
        Checkpoint[] storage checkpoints = _checkpoints[account];
        uint256 high = checkpoints.length;
        uint256 low = 0;
        while (low < high) {
            uint256 mid = (low + high) / 2;
            if (checkpoints[mid].fromBlock > blockNumber) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }
        return low == 0 ? 0 : checkpoints[low - 1].votes;
    }

    function _moveVotingPower(address from, address to, uint256 amount) private {
        if (from == to || amount == 0) return;
        if (from != address(0)) {
            uint256 previous = getVotes(from);
            _writeCheckpoint(from, previous, previous - amount);
        }
        if (to != address(0)) {
            uint256 previous = getVotes(to);
            _writeCheckpoint(to, previous, previous + amount);
        }
    }

    function _writeCheckpoint(address account, uint256 previous, uint256 next) private {
        Checkpoint[] storage checkpoints = _checkpoints[account];
        uint256 length = checkpoints.length;
        if (length > 0 && checkpoints[length - 1].fromBlock == uint32(block.number)) {
            checkpoints[length - 1].votes = uint224(next);
        } else {
            checkpoints.push(Checkpoint({fromBlock: uint32(block.number), votes: uint224(next)}));
        }
        emit VotingPowerChanged(account, previous, next);
    }

    // -------------------------------------------------------------- proposals

    function proposalCount() external view returns (uint256) {
        return _proposals.length;
    }

    function proposal(uint256 proposalId) external view returns (Proposal memory) {
        if (proposalId >= _proposals.length) revert UnknownProposal();
        return _proposals[proposalId];
    }

    /// @notice Submit a proposal. The snapshot is taken now, so voting power
    /// acquired after this call cannot be used on this proposal.
    function propose(string calldata description, address target, bytes calldata callData)
        external
        returns (uint256 proposalId)
    {
        uint256 weight = getVotes(msg.sender);
        if (weight < proposalThreshold) revert BelowProposalThreshold(weight, proposalThreshold);

        proposalId = _proposals.length;
        uint256 voteEnd = block.timestamp + votingPeriod;
        _proposals.push(
            Proposal({
                proposer: msg.sender,
                description: description,
                target: target,
                callData: callData,
                snapshotBlock: block.number - 1,
                voteEnd: voteEnd,
                forVotes: 0,
                againstVotes: 0,
                executableAt: 0,
                queued: false,
                executed: false
            })
        );
        emit ProposalCreated(proposalId, msg.sender, target, callData, block.number - 1, voteEnd);
    }

    function castVote(uint256 proposalId, bool support) external {
        if (proposalId >= _proposals.length) revert UnknownProposal();
        Proposal storage p = _proposals[proposalId];
        if (block.timestamp >= p.voteEnd) revert VotingClosed();
        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();

        uint256 weight = getPastVotes(msg.sender, p.snapshotBlock);
        if (weight == 0) revert NoVotingPower();

        hasVoted[proposalId][msg.sender] = true;
        if (support) {
            p.forVotes += weight;
        } else {
            p.againstVotes += weight;
        }
        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    function state(uint256 proposalId) public view returns (ProposalState) {
        if (proposalId >= _proposals.length) revert UnknownProposal();
        Proposal storage p = _proposals[proposalId];
        if (p.executed) return ProposalState.Executed;
        if (p.queued) return ProposalState.Queued;
        if (block.timestamp < p.voteEnd) return ProposalState.Active;
        uint256 cast = p.forVotes + p.againstVotes;
        // Quorum is checked against votes cast, not against the supply. A
        // proposal every voter supported still fails if too few voted.
        if (cast < quorumVotes) return ProposalState.Defeated;
        return p.forVotes > p.againstVotes ? ProposalState.Succeeded : ProposalState.Defeated;
    }

    /// @notice Start the timelock on a successful proposal.
    function queue(uint256 proposalId) external {
        ProposalState current = state(proposalId);
        if (current == ProposalState.Queued || current == ProposalState.Executed) revert AlreadyQueued();
        if (current != ProposalState.Succeeded) revert ProposalNotSuccessful();
        Proposal storage p = _proposals[proposalId];
        p.queued = true;
        p.executableAt = block.timestamp + timelockDelay;
        emit ProposalQueued(proposalId, p.executableAt);
    }

    /// @notice Execute a queued proposal once its delay has elapsed.
    function execute(uint256 proposalId) external returns (bytes memory) {
        if (proposalId >= _proposals.length) revert UnknownProposal();
        Proposal storage p = _proposals[proposalId];
        if (p.executed) revert AlreadyExecuted();
        if (!p.queued) revert ProposalNotQueued();
        if (block.timestamp < p.executableAt) revert TimelockNotElapsed(p.executableAt, block.timestamp);

        p.executed = true;
        bytes memory returnData;
        if (p.target != address(0)) {
            (bool ok, bytes memory data) = p.target.call(p.callData);
            if (!ok) revert ExecutionFailed();
            returnData = data;
        }
        emit ProposalExecuted(proposalId, returnData);
        return returnData;
    }
}
