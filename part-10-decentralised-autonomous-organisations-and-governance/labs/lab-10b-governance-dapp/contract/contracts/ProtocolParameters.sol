// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/// @notice Something for governance to actually govern. Only the governor may
/// change the fee, so the only route to a new value is a proposal that passes,
/// is queued, and survives the timelock.
contract ProtocolParameters {
    address public immutable governor;
    uint256 public feeBasisPoints;

    event FeeChanged(uint256 previous, uint256 next);

    error NotGovernor(address caller);
    error FeeTooHigh(uint256 requested);

    constructor(address governor_, uint256 initialFeeBasisPoints) {
        governor = governor_;
        feeBasisPoints = initialFeeBasisPoints;
    }

    function setFee(uint256 newFeeBasisPoints) external {
        if (msg.sender != governor) revert NotGovernor(msg.sender);
        if (newFeeBasisPoints > 1000) revert FeeTooHigh(newFeeBasisPoints);
        emit FeeChanged(feeBasisPoints, newFeeBasisPoints);
        feeBasisPoints = newFeeBasisPoints;
    }
}
