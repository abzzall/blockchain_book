// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/// @notice A commitment: publish a hash now, reveal the value later, and
///         anyone can check the two match. This is the smallest useful
///         privacy primitive and the one behind far more elaborate schemes.
///
/// It demonstrates the property that matters: a value can be *bound* without
/// being *disclosed*, and disclosure can be deferred or made selectively.
contract Commitment {
    mapping(address => bytes32) public commitmentOf;
    mapping(address => bool) public revealed;
    mapping(address => uint256) public revealedValue;

    /// Publishing this discloses nothing about the value, provided the salt
    /// is unpredictable. Without a salt, a small value space can simply be
    /// enumerated until the hash matches.
    function commit(bytes32 c) external {
        require(commitmentOf[msg.sender] == bytes32(0), "already committed");
        commitmentOf[msg.sender] = c;
    }

    function reveal(uint256 value, bytes32 salt) external {
        require(
            keccak256(abi.encodePacked(value, salt)) == commitmentOf[msg.sender],
            "does not match the commitment"
        );
        revealed[msg.sender] = true;
        revealedValue[msg.sender] = value;
    }

    function makeCommitment(uint256 value, bytes32 salt) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(value, salt));
    }
}
