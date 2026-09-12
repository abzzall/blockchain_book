// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/// @title A message board that keeps almost nothing
/// @notice Every message ever posted is recoverable, and the contract stores
/// none of them. The messages live in logs; the contract holds one counter.
///
/// This is the point of the exercise. A log entry costs a fraction of what the
/// same bytes cost in storage, and no contract can read a log — so the division
/// is not a matter of taste. Data that a contract must act on goes in storage.
/// Data that only observers need goes in an event.
contract MessageBoard {
    /// @notice The only storage this contract has. Compare it with the number
    /// of messages the interface can display.
    uint256 public messageCount;

    /// @notice Emitted for every post.
    /// @dev Three indexed parameters is the maximum, because the first of the
    /// four topics is taken by the event signature itself. Each indexed
    /// parameter is a topic an observer can filter on without downloading and
    /// inspecting everything else. `text` is not indexed: it goes in the data
    /// section, where it can be read but not filtered.
    event Posted(
        address indexed author,
        bytes32 indexed room,
        uint256 indexed id,
        string text
    );

    /// @notice Emitted alongside a post carrying a tag.
    /// @dev `tag` is a string and it is indexed, so what reaches the log is
    /// `keccak256(bytes(tag))`, not the tag. An observer who already knows the
    /// tag can search for it; nobody can recover it from the log. This is the
    /// trade the standard forces, and it is worth meeting once in something you
    /// can run.
    event Tagged(string indexed tag, uint256 indexed id);

    error EmptyMessage();
    error MessageTooLong(uint256 length, uint256 maximum);

    uint256 public constant MAX_LENGTH = 280;

    /// @notice Post a message to a room.
    /// @param room An arbitrary identifier. Two participants agree on it out of
    /// band; the contract attaches no meaning to it.
    /// @param text The message. It is never stored.
    /// @return id The identifier this message was given.
    function post(bytes32 room, string calldata text) external returns (uint256 id) {
        return _post(room, text);
    }

    function _post(bytes32 room, string calldata text) internal returns (uint256 id) {
        uint256 length = bytes(text).length;
        if (length == 0) revert EmptyMessage();
        if (length > MAX_LENGTH) revert MessageTooLong(length, MAX_LENGTH);

        id = messageCount;
        unchecked {
            messageCount = id + 1;
        }
        emit Posted(msg.sender, room, id, text);
    }

    /// @notice Post a message and tag it in the same transaction.
    /// @dev Two events from one call. A receipt carries both, in the order they
    /// were emitted.
    function postTagged(bytes32 room, string calldata text, string calldata tag)
        external
        returns (uint256 id)
    {
        id = _post(room, text);
        emit Tagged(tag, id);
    }
}
