// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

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
