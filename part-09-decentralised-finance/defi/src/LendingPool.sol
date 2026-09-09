// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

/// @notice Overcollateralized lending, reduced to the accounting that decides
///         whether a position survives. Prices arrive from outside, which is
///         the dependency Chapter 35 treats as the main risk.
contract LendingPool {
    uint256 public constant WAD = 1e18;

    /// Collateral must exceed debt by this factor before a position is
    /// considered liquidatable. 8000 bps means debt may reach 80% of
    /// collateral value.
    uint256 public immutable liquidationThresholdBps;
    uint256 public constant BPS = 10_000;

    mapping(address => uint256) public collateral; // units of the collateral asset
    mapping(address => uint256) public debt;       // units of the borrowed asset

    /// Price of one unit of collateral, in units of the borrowed asset.
    uint256 public collateralPrice;

    constructor(uint256 thresholdBps, uint256 price) {
        liquidationThresholdBps = thresholdBps;
        collateralPrice = price;
    }

    function deposit(uint256 amount) external {
        collateral[msg.sender] += amount;
    }

    function borrow(uint256 amount) external {
        debt[msg.sender] += amount;
        require(healthFactor(msg.sender) >= WAD, "would be undercollateralized");
    }

    /// The price is supplied from outside. Everything below depends on it.
    function setPrice(uint256 price) external {
        collateralPrice = price;
    }

    function collateralValue(address who) public view returns (uint256) {
        return collateral[who] * collateralPrice;
    }

    /// Above 1e18 the position is safe; below it, it may be liquidated.
    /// Returns the maximum value when there is no debt.
    function healthFactor(address who) public view returns (uint256) {
        if (debt[who] == 0) return type(uint256).max;
        uint256 usable = (collateralValue(who) * liquidationThresholdBps) / BPS;
        return (usable * WAD) / debt[who];
    }

    function isLiquidatable(address who) external view returns (bool) {
        return healthFactor(who) < WAD;
    }
}
