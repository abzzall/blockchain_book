// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

/// @notice A modifier wraps a function body. The underscore marks where the
///         body is spliced in, so code before it runs first and code after
///         it runs last.
contract Guarded {
    address public immutable owner;
    uint256 public value;
    string[] public trace;

    error NotOwner(address caller);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner(msg.sender);
        _;
    }

    modifier records(string memory label) {
        trace.push(string.concat("before:", label));
        _;
        trace.push(string.concat("after:", label));
    }

    function setValue(uint256 v) external onlyOwner {
        value = v;
    }

    /// Modifiers apply in the order written: `outer` wraps `inner`, which
    /// wraps the body.
    function wrapped() external records("outer") records("inner") {
        trace.push("body");
    }

    function traceLength() external view returns (uint256) {
        return trace.length;
    }
}
