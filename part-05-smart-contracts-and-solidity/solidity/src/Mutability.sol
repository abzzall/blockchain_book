// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/// @notice State mutability is a promise the compiler enforces.
contract Mutability {
    uint256 public stored = 5;

    /// `pure` promises to read no state and write none.
    function pureAdd(uint256 a, uint256 b) external pure returns (uint256) {
        return a + b;
    }

    /// `view` promises to read state but write none.
    function viewStored() external view returns (uint256) {
        return stored;
    }

    /// No mutability keyword: this one may write.
    function write(uint256 v) external {
        stored = v;
    }

    /// `payable` is what allows a function to receive ether. Without it a
    /// call carrying value is rejected.
    function deposit() external payable returns (uint256) {
        return msg.value;
    }

    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    /// Globally available values describing the call and the block. These
    /// are not variables the contract declares; the environment supplies
    /// them. Note what is absent: `msg.value` cannot be named here, because
    /// the compiler only allows it in a payable function. A function that
    /// cannot receive value is not permitted to ask how much came with it.
    function context()
        external
        view
        returns (address caller, uint256 blockNumber, uint256 timestamp)
    {
        return (msg.sender, block.number, block.timestamp);
    }
}

contract PayableVault {
    address public immutable owner;

    error NotOwner(address caller);
    error WithdrawalFailed();

    constructor() {
        owner = msg.sender;
    }

    function deposit() external payable {
        // The balance changes because value arrived with the call.
    }

    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    function withdrawAll(address payable recipient) external {
        if (msg.sender != owner) revert NotOwner(msg.sender);

        uint256 amount = address(this).balance;
        (bool ok, ) = recipient.call{value: amount}("");
        if (!ok) revert WithdrawalFailed();
    }
}

contract NoWithdrawBox {
    function deposit() external payable {}

    function balance() external view returns (uint256) {
        return address(this).balance;
    }
}

contract PaidGreeting {
    address public immutable owner;
    uint256 public immutable price;
    uint256 public purchases;

    error WrongPayment(uint256 expected, uint256 received);
    error NotOwner(address caller);
    error WithdrawalFailed();

    event GreetingPurchased(address indexed buyer, string name, uint256 paid);

    constructor(uint256 price_) {
        owner = msg.sender;
        price = price_;
    }

    function buyGreeting(string calldata name) external payable returns (string memory) {
        if (msg.value != price) revert WrongPayment(price, msg.value);
        purchases += 1;
        emit GreetingPurchased(msg.sender, name, msg.value);
        return string.concat("Hello, ", name);
    }

    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    function withdrawAll(address payable recipient) external {
        if (msg.sender != owner) revert NotOwner(msg.sender);

        uint256 amount = address(this).balance;
        (bool ok, ) = recipient.call{value: amount}("");
        if (!ok) revert WithdrawalFailed();
    }
}
