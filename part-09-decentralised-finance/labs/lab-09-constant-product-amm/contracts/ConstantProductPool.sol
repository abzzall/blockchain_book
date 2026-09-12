// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * A minimal constant-product automated market maker, written to be read rather
 * than deployed. It holds a reserve of each of two tokens and quotes every
 * trade from the rule that the product of the reserves may not fall.
 *
 * It is deliberately missing much of what a production pool has: no flash-swap
 * callback, no oracle accumulator, no protocol fee, no re-entrancy guard beyond
 * ordering, and no support for tokens that take a fee on transfer. Chapters 31
 * and 35 say why each of those matters.
 */
contract ConstantProductPool {
    error ZeroAmount();
    error InsufficientLiquidity();
    error InsufficientOutput(uint256 got, uint256 wanted);
    error UnknownToken(address token);
    error PoolAlreadySeeded();

    event LiquidityAdded(address indexed provider, uint256 amount0, uint256 amount1, uint256 shares);
    event LiquidityRemoved(address indexed provider, uint256 amount0, uint256 amount1, uint256 shares);
    event Swapped(address indexed trader, address tokenIn, uint256 amountIn, uint256 amountOut);

    /// 30 basis points, the fee this pool charges on the input of every swap.
    uint256 public constant FEE_NUMERATOR = 997;
    uint256 public constant FEE_DENOMINATOR = 1000;

    IERC20 public immutable token0;
    IERC20 public immutable token1;

    uint256 public reserve0;
    uint256 public reserve1;
    uint256 public totalShares;
    mapping(address provider => uint256 shares) public sharesOf;

    constructor(IERC20 token0_, IERC20 token1_) {
        token0 = token0_;
        token1 = token1_;
    }

    /// The invariant the pool defends. It rises only because of fees.
    function invariant() external view returns (uint256) {
        return reserve0 * reserve1;
    }

    /**
     * The first provider fixes the starting price by choosing the ratio, and
     * receives shares equal to the geometric mean of what they put in.
     */
    function seed(uint256 amount0, uint256 amount1) external returns (uint256 shares) {
        if (totalShares != 0) revert PoolAlreadySeeded();
        if (amount0 == 0 || amount1 == 0) revert ZeroAmount();

        token0.transferFrom(msg.sender, address(this), amount0);
        token1.transferFrom(msg.sender, address(this), amount1);

        shares = _sqrt(amount0 * amount1);
        reserve0 = amount0;
        reserve1 = amount1;
        totalShares = shares;
        sharesOf[msg.sender] = shares;
        emit LiquidityAdded(msg.sender, amount0, amount1, shares);
    }

    /**
     * Later providers must supply both tokens at the pool's current ratio, so
     * that adding liquidity does not move the price. The amount of token1
     * required follows from the amount of token0 offered.
     */
    function addLiquidity(uint256 amount0) external returns (uint256 amount1, uint256 shares) {
        if (totalShares == 0) revert InsufficientLiquidity();
        if (amount0 == 0) revert ZeroAmount();

        amount1 = (amount0 * reserve1) / reserve0;
        shares = (amount0 * totalShares) / reserve0;

        token0.transferFrom(msg.sender, address(this), amount0);
        token1.transferFrom(msg.sender, address(this), amount1);

        reserve0 += amount0;
        reserve1 += amount1;
        totalShares += shares;
        sharesOf[msg.sender] += shares;
        emit LiquidityAdded(msg.sender, amount0, amount1, shares);
    }

    function removeLiquidity(uint256 shares) external returns (uint256 amount0, uint256 amount1) {
        if (shares == 0) revert ZeroAmount();
        if (shares > sharesOf[msg.sender]) revert InsufficientLiquidity();

        amount0 = (shares * reserve0) / totalShares;
        amount1 = (shares * reserve1) / totalShares;

        sharesOf[msg.sender] -= shares;
        totalShares -= shares;
        reserve0 -= amount0;
        reserve1 -= amount1;

        token0.transfer(msg.sender, amount0);
        token1.transfer(msg.sender, amount1);
        emit LiquidityRemoved(msg.sender, amount0, amount1, shares);
    }

    /**
     * The quote. The fee is taken off the input before the input is allowed to
     * count towards the invariant, which is why the product rises after a trade.
     */
    function quote(address tokenIn, uint256 amountIn) public view returns (uint256 amountOut) {
        if (amountIn == 0) revert ZeroAmount();
        (uint256 reserveIn, uint256 reserveOut) = _reservesFor(tokenIn);
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();

        uint256 amountInAfterFee = amountIn * FEE_NUMERATOR;
        amountOut = (amountInAfterFee * reserveOut)
            / (reserveIn * FEE_DENOMINATOR + amountInAfterFee);
    }

    /// The price the pool would give for an infinitesimal trade: no impact, no fee.
    function spotPrice0In1() external view returns (uint256) {
        if (reserve0 == 0) revert InsufficientLiquidity();
        return (reserve1 * 1e18) / reserve0;
    }

    function swap(address tokenIn, uint256 amountIn, uint256 minAmountOut)
        external returns (uint256 amountOut)
    {
        amountOut = quote(tokenIn, amountIn);
        if (amountOut < minAmountOut) revert InsufficientOutput(amountOut, minAmountOut);

        bool zeroIn = tokenIn == address(token0);
        IERC20 inToken = zeroIn ? token0 : token1;
        IERC20 outToken = zeroIn ? token1 : token0;

        inToken.transferFrom(msg.sender, address(this), amountIn);
        if (zeroIn) {
            reserve0 += amountIn;
            reserve1 -= amountOut;
        } else {
            reserve1 += amountIn;
            reserve0 -= amountOut;
        }
        outToken.transfer(msg.sender, amountOut);
        emit Swapped(msg.sender, tokenIn, amountIn, amountOut);
    }

    function _reservesFor(address tokenIn) private view returns (uint256, uint256) {
        if (tokenIn == address(token0)) return (reserve0, reserve1);
        if (tokenIn == address(token1)) return (reserve1, reserve0);
        revert UnknownToken(tokenIn);
    }

    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) { z = x; x = (y / x + x) / 2; }
        } else if (y != 0) {
            z = 1;
        }
    }
}
