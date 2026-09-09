# Lab 9 results

Fill this in as you go. No images. Every value below is fixed by the contract
source and by a fresh local chain, so `npm run verify` marks this file.

Keep the row labels exactly as they are. Write token amounts as the walkthrough
prints them, to six decimal places, without thousands separators. Write error
names without their arguments.

## Environment

- Node.js version:
- Date completed:

## Part A — The pool as seeded

| Field | Value |
|---|---|
| Shares issued to the first provider | |
| Spot price after seeding, in BETA per ALPHA | |

## Part B — Price impact

| Field | Value |
|---|---|
| BETA out for 1 ALPHA in | |
| BETA out for 100 ALPHA in | |
| BETA out for 1000 ALPHA in | |
| BETA out for 5000 ALPHA in | |

## Part C — After one 100 ALPHA swap

| Field | Value |
|---|---|
| reserve0 after a 100 ALPHA swap | |
| reserve1 after a 100 ALPHA swap | |
| Spot price after that swap, in BETA per ALPHA | |
| Percentage k grew by after that swap | |

## Part D — Providing liquidity

| Field | Value |
|---|---|
| Shares the second provider received for 100 ALPHA | |

## Part E — What failed

| Field | Value |
|---|---|
| Error when demanding one wei more than the quote | |
| Error when quoting a token the pool does not hold | |
| Error when seeding a pool twice | |

## Explanations

**1. Trading 1 ALPHA got a rate of about 0.996; trading 1000 got about 0.499.
Explain what causes the difference, using the reserves rather than the word
"slippage":**

**2. A test proves that no single trade, however large, can empty the pool.
Explain what in the formula guarantees that, and what it means for a trader who
tries:**

**3. The invariant `k` rose by 0.0273% across the swap. Explain where that
increase came from, who it belongs to, and why the pool does not pay it out
directly:**

**4. The swap moved the spot price against the buyer. Explain why an automated
market maker must move its price on every trade, and what would happen to a pool
that quoted the same price regardless of size:**

**5. The pool asks a caller for a minimum acceptable output and reverts if it
cannot meet it. Explain what this protects a trader from, given that the price
can change between the moment they read a quote and the moment their transaction
executes:**

**6. The second provider had to supply both tokens at the pool's current ratio.
Explain why, and what a provider could do to the pool if they were allowed to
add only one side:**

**7. The provider withdrew more ALPHA than they deposited and less BETA, after a
large trade moved the price. Explain what the pool did with their money while
the price was moving, and why this outcome is inherent to providing liquidity
rather than a fault in this implementation:**

**8. The contract's own comments list several things it does not have that a
production pool does. Pick two, and explain what could go wrong because they are
missing:**

## Verification

```bash
npm --workspace @blockchain-handbook/lab-09 run verify
```

- [ ] `npm run verify` reports 14 correct, 0 wrong, 0 blank
- [ ] `npm test` passes all 12 tests
- [ ] Every explanation above is written in my own words
