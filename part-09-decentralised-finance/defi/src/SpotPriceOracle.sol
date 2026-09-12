// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {ConstantProduct} from "./ConstantProduct.sol";

/// @notice A lending pool that takes its price from a trading pool's current
///         reserves. This is the single most exploited design in this field,
///         and it is reproduced here so the failure can be watched rather
///         than described.
///
/// The mistake is not using a market price. It is using a price that the
/// person borrowing can move, in the same transaction, for a fee.
contract SpotPriceLending {
    uint256 public constant WAD = 1e18;
    uint256 public constant BPS = 10_000;

    ConstantProduct public immutable pool;
    uint256 public immutable liquidationThresholdBps;

    mapping(address => uint256) public collateral;
    mapping(address => uint256) public debt;

    constructor(ConstantProduct pool_, uint256 thresholdBps) {
        pool = pool_;
        liquidationThresholdBps = thresholdBps;
    }

    /// Read straight from the pool, right now. No averaging, no delay.
    function price() public view returns (uint256) {
        return pool.spotPriceBOfA();
    }

    function deposit(uint256 amount) external {
        collateral[msg.sender] += amount;
    }

    function maxBorrow(address who) public view returns (uint256) {
        uint256 value = (collateral[who] * price()) / WAD;
        return (value * liquidationThresholdBps) / BPS;
    }

    function borrow(uint256 amount) external {
        debt[msg.sender] += amount;
        require(debt[msg.sender] <= maxBorrow(msg.sender), "undercollateralized");
    }
}
