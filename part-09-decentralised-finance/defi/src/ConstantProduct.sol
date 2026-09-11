// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

/// @notice A constant-product automated market maker, reduced to the pricing.
///         Token transfers are omitted so the arithmetic is visible; a real
///         pool moves tokens as well, and Chapter 35 covers what else it must
///         defend against.
///
/// The rule is that the product of the two reserves does not fall. A swap
/// takes an amount in, and gives out whatever keeps the product at least
/// where it was.
contract ConstantProduct {
    uint256 public reserveA;
    uint256 public reserveB;

    /// Fee in basis points, taken from the input before pricing.
    uint256 public immutable feeBps;
    uint256 public constant BPS = 10_000;

    constructor(uint256 a, uint256 b, uint256 feeBps_) {
        require(a > 0 && b > 0, "empty pool");
        require(feeBps_ < BPS, "fee too large");
        reserveA = a;
        reserveB = b;
        feeBps = feeBps_;
    }

    function invariant() public view returns (uint256) {
        return reserveA * reserveB;
    }

    /// The price a marginal unit would fetch, ignoring size. This is the
    /// number people quote, and it is only accurate for an infinitely small
    /// trade.
    function spotPriceBOfA() external view returns (uint256) {
        return (reserveB * 1e18) / reserveA;
    }

    /// What a swap of `amountIn` of A actually returns in B.
    function quoteAForB(uint256 amountIn) public view returns (uint256) {
        uint256 inAfterFee = amountIn * (BPS - feeBps) / BPS;
        // (a + in) * (b - out) >= a * b  =>  out = b*in / (a + in)
        return (reserveB * inAfterFee) / (reserveA + inAfterFee);
    }

    function swapAForB(uint256 amountIn) external returns (uint256 out) {
        out = quoteAForB(amountIn);
        reserveA += amountIn;
        reserveB -= out;
    }

    /// How far the fee-free curve price falls short of the spot price, in basis
    /// points. This is price impact: a property of the pool's size relative
    /// to the trade, not a fee and not a failure.
    function priceImpactBps(uint256 amountIn) external view returns (uint256) {
        uint256 out = (reserveB * amountIn) / (reserveA + amountIn);
        uint256 spotOut = (reserveB * amountIn) / reserveA;
        if (spotOut == 0 || out >= spotOut) return 0;
        return ((spotOut - out) * BPS) / spotOut;
    }

    /// Swap in the other direction. Present so a demonstration can move the
    /// quoted price upward as well as downward.
    function swapBForA_forTesting(uint256 amountIn) external returns (uint256 out) {
        uint256 inAfterFee = amountIn * (BPS - feeBps) / BPS;
        out = (reserveA * inAfterFee) / (reserveB + inAfterFee);
        reserveB += amountIn;
        reserveA -= out;
    }
}
