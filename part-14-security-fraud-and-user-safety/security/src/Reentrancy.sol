// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/// @notice The classic reentrancy bug, in full, so it can be exploited in a
///         test rather than described. Chapter 42 explains why it works.
///
/// The mistake is on one line: the balance is written *after* the external
/// call. While that call is running, the balance still says what it said
/// before, and the caller may call back in.
contract VulnerableVault {
    mapping(address => uint256) public balance;

    function deposit() external payable {
        balance[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 amount = balance[msg.sender];
        require(amount > 0, "nothing to withdraw");

        // INTERACTION happens before the EFFECT. This is the bug.
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");

        balance[msg.sender] = 0;
    }
}

/// The same contract with the order corrected: checks, then effects, then
/// interactions. The state is updated before control leaves the contract, so
/// a re-entrant call sees a zero balance and gets nothing.
contract SafeVault {
    mapping(address => uint256) public balance;

    function deposit() external payable {
        balance[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 amount = balance[msg.sender];   // CHECK
        require(amount > 0, "nothing to withdraw");

        balance[msg.sender] = 0;                // EFFECT

        (bool ok, ) = msg.sender.call{value: amount}("");  // INTERACTION
        require(ok, "transfer failed");
    }
}

/// An attacker: withdraw, and while being paid, withdraw again.
contract Reenterer {
    VulnerableVault public immutable target;
    uint256 public depth;

    constructor(VulnerableVault target_) payable {
        target = target_;
    }

    function attack() external payable {
        target.deposit{value: msg.value}();
        target.withdraw();
    }

    /// Called when the vault sends ether. The vault has not yet zeroed the
    /// balance, so calling back in withdraws again.
    receive() external payable {
        if (address(target).balance >= msg.value && depth < 5) {
            depth++;
            target.withdraw();
        }
    }
}

/// The same attacker pointed at the corrected vault. It still tries to
/// re-enter; the balance it sees has already been zeroed.
contract SafeReenterer {
    SafeVault public immutable target;
    uint256 public depth;

    constructor(SafeVault target_) { target = target_; }

    function attack() external payable {
        target.deposit{value: msg.value}();
        target.withdraw();
    }

    receive() external payable {
        if (depth < 5) {
            depth++;
            // This call reverts, because the balance is already zero.
            (bool ok, ) = address(target).call(
                abi.encodeWithSignature("withdraw()"));
            ok;
        }
    }
}
