// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

contract ClassElection {
    struct Candidate {
        string name;
        uint256 voteCount;
    }

    error OwnerOnly(address caller);
    error InvalidSchedule();
    error TooFewCandidates();
    error EmptyCandidateName(uint256 index);
    error VotingNotOpen();
    error NotEligible(address voter);
    error AlreadyVoted(address voter);
    error InvalidCandidate(uint256 candidateId);
    error ResultsNotReady();

    event EligibilitySet(address indexed voter, bool eligible);
    event VoteCast(address indexed voter, uint256 indexed candidateId);

    address public immutable owner;
    uint64 public immutable startsAt;
    uint64 public immutable endsAt;
    uint256 public totalVotes;
    Candidate[] private candidates;
    mapping(address voter => bool allowed) public eligible;
    mapping(address voter => bool cast) public hasVoted;

    constructor(string[] memory candidateNames, uint64 startsAt_, uint64 endsAt_) {
        if (candidateNames.length < 2) revert TooFewCandidates();
        if (startsAt_ < block.timestamp || endsAt_ <= startsAt_) revert InvalidSchedule();
        owner = msg.sender;
        startsAt = startsAt_;
        endsAt = endsAt_;
        for (uint256 i; i < candidateNames.length; ++i) {
            if (bytes(candidateNames[i]).length == 0) revert EmptyCandidateName(i);
            candidates.push(Candidate(candidateNames[i], 0));
        }
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert OwnerOnly(msg.sender);
        _;
    }

    function setEligibility(address[] calldata voters, bool allowed) external onlyOwner {
        if (block.timestamp >= endsAt) revert VotingNotOpen();
        for (uint256 i; i < voters.length; ++i) {
            eligible[voters[i]] = allowed;
            emit EligibilitySet(voters[i], allowed);
        }
    }

    function vote(uint256 candidateId) external {
        if (block.timestamp < startsAt || block.timestamp >= endsAt) revert VotingNotOpen();
        if (!eligible[msg.sender]) revert NotEligible(msg.sender);
        if (hasVoted[msg.sender]) revert AlreadyVoted(msg.sender);
        if (candidateId >= candidates.length) revert InvalidCandidate(candidateId);

        hasVoted[msg.sender] = true;
        candidates[candidateId].voteCount += 1;
        totalVotes += 1;
        emit VoteCast(msg.sender, candidateId);
    }

    function candidateCount() external view returns (uint256) {
        return candidates.length;
    }

    function candidate(uint256 candidateId) external view returns (Candidate memory) {
        if (candidateId >= candidates.length) revert InvalidCandidate(candidateId);
        return candidates[candidateId];
    }

    function result() external view returns (uint256 winnerId, bool tied) {
        if (block.timestamp < endsAt) revert ResultsNotReady();
        uint256 winningVotes;
        for (uint256 i; i < candidates.length; ++i) {
            if (candidates[i].voteCount > winningVotes) {
                winnerId = i;
                winningVotes = candidates[i].voteCount;
                tied = false;
            } else if (i != winnerId && candidates[i].voteCount == winningVotes) {
                tied = true;
            }
        }
    }
}
