# Implementation 9 — A constant-product automated market maker

## Outcome

You will seed a two-token pool, watch it quote worse and worse prices as trades
grow, execute a swap and see the invariant rise by exactly the fee, provide
liquidity yourself, and then withdraw it after the price has moved and account
for what happened to your money. You will finish able to explain price impact,
the fee, slippage protection, and impermanent loss in terms of the reserves
rather than as vocabulary.

## Safety and environment

- Network: Hardhat's in-process local chain. Nothing leaves your machine.
- Assets: two tokens invented for this exercise, mintable by anyone, worth nothing.
- The pool is written to be read, not deployed. Its own comments list what a
  production pool has that it does not, and `RESULTS.md` asks you about two of
  those omissions. Never deploy it anywhere.

This exercise describes how a mechanism works. It is not advice about providing
liquidity, and nothing in it should be read as a suggestion to do so.

## Verified versions

| Component | Version |
|---|---|
| Verification date | 2026-09-07 |
| Node.js | 24.15.0 |
| Hardhat | 3.15.0 |
| Solidity | 0.8.36 |
| OpenZeppelin Contracts | 5.6.1 |
| viem | 2.56.3 |

## Files supplied

| File | What it holds |
|---|---|
| `contracts/ConstantProductPool.sol` | seed, add and remove liquidity, quote, swap |
| `contracts/TestToken.sol` | a plain mintable ERC-20, so the pool has something to trade |
| `test/Pool.ts` | twelve tests, two of which pin the values this exercise marks |
| `scripts/walkthrough.ts` | seeds, quotes a size ladder, swaps, and provides liquidity |
| `RESULTS.md` | the template you fill in |

## Command-line work

```bash
cd part-09-decentralised-finance/labs/lab-09-constant-product-amm
npm run build
npm test
```

All twelve tests must pass before you continue.

### Part A — Read the quote function first

Open `ConstantProductPool.sol` and read `quote` before running anything. It is
four lines. Everything in this exercise follows from them: the fee is taken off the
input before the input counts towards the invariant, and the output is whatever
keeps the product of the reserves from falling.

The pool never consults a price. There is no oracle, no order book, and nothing
that knows what either token is worth. The price is a consequence of the
reserves and nothing else.

### Part B — The size ladder

```bash
npm run walkthrough
```

The first table quotes trades from 1 ALPHA to 5000 against a pool holding 1000
of each. Record the outputs for 1, 100, 1000, and 5000.

Read the last column before moving on. A trade of 1 gets a rate 0.4% worse than
spot, almost all of which is the fee. A trade of 5000 gets a rate 83% worse, and
almost none of that is the fee. The gap between those two facts is price impact,
and `RESULTS.md` asks you to account for it using the reserves.

Note also that trading 5000 ALPHA — five times the entire ALPHA reserve — yields
833 BETA, not 1000. A test proves no trade of any size can empty the pool.

### Part C — One swap

Record the reserves after the 100 ALPHA swap, the new spot price, and the
percentage the invariant grew by.

That growth is the fee. It was not paid to anyone; it stayed in the pool, which
means every share is now worth slightly more than it was. `RESULTS.md` asks you
who it belongs to and why the pool does not pay it out directly.

### Part D — Providing liquidity, and getting it back

The walkthrough adds liquidity as a second provider, lets a large trade move the
price a long way, and then withdraws everything. Record the shares received.

Read the final table carefully. The provider deposited both tokens and withdrew
more ALPHA than they put in and less BETA. Nothing went wrong, nobody took
anything, and the contract behaved exactly as written. `RESULTS.md` asks you to
explain what the pool did with their money while the price was moving.

## What to record

The fourteen values in `RESULTS.md`, all from the walkthrough, all reproducible.

## What to explain

`RESULTS.md` asks eight questions: what causes the rate to worsen with size; why
no trade can drain the pool; where the invariant's growth came from and who owns
it; why an automated market maker must move its price; what a minimum-output
parameter protects against; why liquidity must be added at the current ratio;
what happened to the provider's money as the price moved; and what could go
wrong because of two of the things this pool deliberately lacks.

## Verification

```bash
npm run verify
```

The script recomputes all fourteen values and reports each as correct, wrong, or
blank, exiting non-zero unless every one is correct.

## Troubleshooting and reset

- Every command builds its own chain, so there is nothing to reset. A quoted
  figure that disagrees means the pool was not freshly seeded at 1000/1000.
- `InsufficientOutput` and `PoolAlreadySeeded` are the contract working, not
  faults.
- If a swap reverts with an ERC-20 error, the token approval was not set. The
  walkthrough approves the pool for every account before it starts.
- The invariant is a product of two 18-decimal numbers, so it carries 36
  decimals. Compare the printed values, not your own re-scaling of them.
