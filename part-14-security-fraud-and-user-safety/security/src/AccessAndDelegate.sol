// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/// @notice Two further failures worth seeing execute.

/// tx.origin is the account that started the transaction, not the immediate
/// caller. Using it for authorisation means any contract the owner is
/// persuaded to call can act as the owner.
contract OriginAuthorised {
    address public owner;
    uint256 public treasure = 100;
    address public paidTo;

    /// The owner is the account that deployed it, which for this
    /// demonstration is an externally-owned account.
    constructor() { owner = tx.origin; }

    function withdrawAll(address to) external {
        require(tx.origin == owner, "not owner");   // the bug
        treasure = 0;
        paidTo = to;
    }
}

/// A contract that an owner might be tricked into calling. It does not need
/// any privilege of its own.
contract Lure {
    OriginAuthorised public immutable target;
    constructor(OriginAuthorised t) { target = t; }

    function claimYourPrize() external {
        target.withdrawAll(address(this));
    }
}

/// delegatecall runs another contract's code against *this* contract's
/// storage. If the two disagree about the storage layout, the callee writes
/// over whatever happens to occupy the slot.
contract Proxy {
    address public owner;      // slot 0
    address public implementation; // slot 1

    constructor(address impl) { owner = msg.sender; implementation = impl; }

    function run(bytes calldata data) external {
        (bool ok, ) = implementation.delegatecall(data);
        require(ok, "call failed");
    }
}

/// Its slot 0 is a number, not an owner. Writing it through a delegatecall
/// overwrites the proxy's owner.
contract Logic {
    uint256 public value;      // slot 0 -- collides with Proxy.owner

    function setValue(uint256 v) external { value = v; }
}
