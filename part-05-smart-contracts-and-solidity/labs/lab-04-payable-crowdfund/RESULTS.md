# Exercise 4 results

Fill this in as you go. No images. Every value below is fixed by the contract
source and by a fresh local chain, so `npm run verify` marks this file.

Keep the row labels exactly as they are. Write addresses and selectors in
lowercase hex with the `0x` prefix; write wei as a plain integer.

## Environment

- Node.js version:
- Date completed:

## Part A — What the contract declares

| Field | Value |
|---|---|
| Contract address on a fresh local chain | |
| Minimum contribution in wei | |
| Number of payable entry points | |

## Part B — Selectors

| Field | Value |
|---|---|
| Selector of ContributionTooSmall(uint256,uint256) | |
| Selector of DirectPaymentNotAccepted() | |
| Selector of GoalNotReached(uint256,uint256) | |
| Selector of NothingToRefund(address) | |
| topic0 of Contributed(address,uint256,uint256) | |

## Part C — Gas, from the walkthrough

| Field | Value |
|---|---|
| Gas for alice's first contribution | |
| Gas for bob's first contribution | |
| Gas for alice's second contribution | |

## Part D — Where the money is

| Field | Value |
|---|---|
| Total raised in the successful campaign, in wei | |
| Contract balance after withdraw, in wei | |
| Contract balance after alice refunds but before bob does, in wei | |

## Part E — What failed, and with which error

Write the error name only, without arguments.

| Field | Value |
|---|---|
| Error when a plain transfer is sent to the contract | |
| Error when the beneficiary withdraws twice | |

## Explanations

**1. `contribute` is marked `payable` and `refund` is not. Explain what the EVM
does to a transaction that sends ether to a non-payable function, and at what
point it does it:**

**2. The contract keeps `contributionOf` and `totalRaised` even though it could
ask for its own balance at any moment. Explain why its balance is not a
sufficient record of who is owed what:**

**3. Alice's first contribution cost more gas than her second, and Bob's first
cost less than Alice's first. Account for both differences in terms of what each
transaction wrote to storage:**

**4. `refund` lets each contributor pull their own money instead of the contract
paying everyone in a loop. Describe what one hostile contributor could do to
everyone else if the contract pushed refunds in a loop instead:**

**5. When the beneficiary was a contract that rejects payment, the withdrawal
reverted and `withdrawn` stayed false. Explain why leaving the flag false is the
correct outcome, and what would have gone wrong had the contract ignored the
failed transfer and continued:**

**6. `receive` deliberately reverts. Explain what problem an accepted plain
transfer would create for the refund logic:**

## Verification

```bash
npm --workspace @blockchain-handbook/lab-04 run verify
```

- [ ] `npm run verify` reports 16 correct, 0 wrong, 0 blank
- [ ] `npm test` passes all 14 tests
- [ ] Every explanation above is written in my own words
