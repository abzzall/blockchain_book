// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/// @notice Events, and the two functions that run when no ordinary function
///         matches.
contract Ledger {
    /// Indexed parameters become searchable topics; the rest become the
    /// log's data. At most three may be indexed on a normal event, because
    /// a log has four topics and the first holds the event signature hash.
    event Deposited(address indexed from, uint256 amount);

    /// An indexed string is stored as the Keccak-256 hash of its value, not
    /// the value. It can be searched for and cannot be read back.
    event Labelled(string indexed indexedLabel, string plainLabel);

    /// Records which of the two entry points ran, so a test can tell.
    string public lastEntry;
    uint256 public received;
    bytes public lastData;

    /// Runs on a call with empty call data -- a plain ether transfer.
    receive() external payable {
        lastEntry = "receive";
        received += msg.value;
    }

    /// Runs when no function signature matches, and on empty call data if
    /// no receive function exists. It always gets the data.
    fallback() external payable {
        lastEntry = "fallback";
        received += msg.value;
        lastData = msg.data;
    }

    function deposit() external payable {
        lastEntry = "deposit";
        received += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function label(string calldata text) external {
        emit Labelled(text, text);
    }

    function balance() external view returns (uint256) {
        return address(this).balance;
    }
}

/// A contract with neither receive nor fallback cannot be sent ether by a
/// plain transfer at all.
contract Unreceptive {
    uint256 public x;

    function set(uint256 v) external {
        x = v;
    }
}
