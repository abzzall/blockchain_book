// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {ConstantProduct} from "../src/ConstantProduct.sol";
import {LendingPool} from "../src/LendingPool.sol";

contract ConstantProductTest {
    function test_TheProductDoesNotFall() public {
        ConstantProduct p = new ConstantProduct(1_000e18, 1_000e18, 30);
        uint256 before_ = p.invariant();
        p.swapAForB(10e18);
        require(p.invariant() >= before_, "the invariant fell");
    }

    /// The quoted spot price is only right for a trade of size zero.
    function test_LargerTradesGetAWorsePrice() public {
        ConstantProduct p = new ConstantProduct(1_000e18, 1_000e18, 0);
        uint256 small = p.priceImpactBps(1e18);
        uint256 large = p.priceImpactBps(100e18);
        require(large > small, "impact should grow with size");
        require(small < 200, "1% of the pool should move it little");
        require(large > 800, "10% of the pool should move it a lot");
    }

    function test_PriceImpactIsNotTheFee() public {
        // With no fee at all there is still impact, because the curve moves.
        ConstantProduct free = new ConstantProduct(1_000e18, 1_000e18, 0);
        require(free.priceImpactBps(50e18) > 0, "impact exists without fees");
    }

    function test_ADeeperPoolAbsorbsTheSameTradeBetter() public {
        ConstantProduct shallow = new ConstantProduct(1_000e18, 1_000e18, 0);
        ConstantProduct deep = new ConstantProduct(100_000e18, 100_000e18, 0);
        require(
            deep.priceImpactBps(50e18) < shallow.priceImpactBps(50e18),
            "depth should reduce impact"
        );
    }

    function test_TheFeeIsTakenFromTheInput() public {
        ConstantProduct free = new ConstantProduct(1_000e18, 1_000e18, 0);
        ConstantProduct charged = new ConstantProduct(1_000e18, 1_000e18, 30);
        require(charged.quoteAForB(10e18) < free.quoteAForB(10e18), "fee not applied");
    }

    function test_SwappingBackDoesNotReturnTheSameAmount() public {
        // Even with no fee, a round trip loses to price impact.
        ConstantProduct p = new ConstantProduct(1_000e18, 1_000e18, 0);
        uint256 got = p.swapAForB(100e18);
        require(got < 100e18, "a swap of this size cannot be neutral");
    }
}

contract LendingPoolTest {
    address constant ALICE = address(0xA11CE);

    function test_NoDebtMeansMaximumHealth() public {
        LendingPool p = new LendingPool(8000, 100);
        require(p.healthFactor(ALICE) == type(uint256).max, "no debt is safe");
    }

    function test_BorrowingWithinTheThresholdSucceeds() public {
        LendingPool p = new LendingPool(8000, 100);
        p.deposit(10);              // 10 units at 100 = 1000 value
        p.borrow(700);              // 700 <= 80% of 1000
        require(p.healthFactor(address(this)) >= 1e18, "should be healthy");
    }

    function test_BorrowingBeyondTheThresholdReverts() public {
        LendingPool p = new LendingPool(8000, 100);
        p.deposit(10);
        (bool ok, ) = address(p).call(
            abi.encodeWithSignature("borrow(uint256)", uint256(801))
        );
        require(!ok, "should not be able to exceed the threshold");
    }

    /// The borrower did nothing. The price moved, and the position became
    /// liquidatable. This is the whole risk of collateralized lending.
    function test_APriceFallAloneCanTriggerLiquidation() public {
        LendingPool p = new LendingPool(8000, 100);
        p.deposit(10);
        p.borrow(700);
        require(!p.isLiquidatable(address(this)), "healthy at the start");

        p.setPrice(80);   // collateral value falls from 1000 to 800
        require(p.isLiquidatable(address(this)), "should now be liquidatable");
    }

    function test_HealthFactorIsProportionalToPrice() public {
        LendingPool p = new LendingPool(8000, 100);
        p.deposit(10);
        p.borrow(400);
        uint256 h1 = p.healthFactor(address(this));
        p.setPrice(50);
        uint256 h2 = p.healthFactor(address(this));
        require(h2 == h1 / 2, "halving the price should halve the health factor");
    }

    function test_TheThresholdIsWhatDecides() public {
        LendingPool strict = new LendingPool(5000, 100);
        LendingPool loose = new LendingPool(9000, 100);
        strict.deposit(10); loose.deposit(10);
        loose.borrow(700);
        (bool ok, ) = address(strict).call(
            abi.encodeWithSignature("borrow(uint256)", uint256(700))
        );
        require(!ok, "the stricter pool should refuse the same borrow");
    }
}
