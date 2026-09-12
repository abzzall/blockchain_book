// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {ConstantProduct} from "../src/ConstantProduct.sol";
import {SpotPriceLending} from "../src/SpotPriceOracle.sol";

contract OracleManipulationTest {
    /// The pool's quoted price is not a fact about the world. It is a
    /// function of two numbers anyone may change by trading.
    function test_TradingMovesTheQuotedPrice() public {
        ConstantProduct p = new ConstantProduct(1_000e18, 1_000e18, 0);
        uint256 before_ = p.spotPriceBOfA();
        p.swapAForB(500e18);
        uint256 after_ = p.spotPriceBOfA();
        require(after_ < before_, "selling A should lower A's price in B");
        require(after_ * 2 < before_, "a large trade moves it a long way");
    }

    /// Borrowing capacity is computed from that quoted price, so it moves too.
    function test_BorrowingCapacityFollowsTheQuotedPrice() public {
        ConstantProduct p = new ConstantProduct(1_000e18, 1_000e18, 0);
        SpotPriceLending l = new SpotPriceLending(p, 8000);
        l.deposit(100e18);

        uint256 capacityBefore = l.maxBorrow(address(this));

        // The same collateral, valued against a pool quoting four times the
        // price, supports far more borrowing. Nothing about the collateral
        // changed.
        ConstantProduct p2 = new ConstantProduct(1_000e18, 4_000e18, 0);
        SpotPriceLending l2 = new SpotPriceLending(p2, 8000);
        l2.deposit(100e18);
        uint256 capacityAfter = l2.maxBorrow(address(this));

        require(capacityAfter > capacityBefore * 3, "capacity tracks the quote");
    }

    /// The attack, in one transaction: move the price, borrow against the
    /// inflated valuation, and leave. Nothing here is a contract bug; every
    /// contract does exactly what it says.
    function test_ThePriceCanBeMovedAndBorrowedAgainstAtOnce() public {
        ConstantProduct p = new ConstantProduct(1_000e18, 1_000e18, 0);
        SpotPriceLending l = new SpotPriceLending(p, 8000);
        l.deposit(100e18);

        uint256 honest = l.maxBorrow(address(this));

        // Move the pool hard in one direction. A flash loan would supply the
        // capital for this; the pool does not care where it came from.
        p.swapBForA_forTesting(3_000e18);

        uint256 manipulated = l.maxBorrow(address(this));
        require(manipulated > honest * 3, "the same collateral now borrows far more");

        l.borrow(manipulated);
        require(l.debt(address(this)) == manipulated, "the borrow succeeded");
    }
}
