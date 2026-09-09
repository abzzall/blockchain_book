# Lab 7 results

Fill this in as you go. No images. Every value below is fixed by the contract
source and by a fresh local chain, so `npm run verify` marks this file.

Keep the row labels exactly as they are. Write selectors and topics in lowercase
hex with the `0x` prefix. Where a row asks for a token amount, write it in whole
tokens; where it asks for a raw integer, write every digit.

## Environment

- Node.js version:
- Date completed:

## Part A — What the token declares

| Field | Value |
|---|---|
| Contract address on a fresh local chain | |
| Symbol | |
| Decimals | |
| Total supply as the raw integer stored | |

## Part B — Selectors and topics

| Field | Value |
|---|---|
| Selector of transfer(address,uint256) | |
| Selector of approve(address,uint256) | |
| Selector of transferFrom(address,address,uint256) | |
| topic0 of Transfer(address,address,uint256) | |
| topic0 of Approval(address,address,uint256) | |

## Part C — Gas

| Field | Value |
|---|---|
| Gas for the direct transfer | |
| Gas for the approval | |
| Gas for the transferFrom | |

## Part D — Where the tokens are

| Field | Value |
|---|---|
| Alice's balance immediately after she approves bob | |
| Allowance remaining after bob spends 250 of 400 | |
| Total supply after bob burns 100 | |

## Part E — What failed

Write the error name only, without arguments.

| Field | Value |
|---|---|
| Error when bob spends more than his allowance | |
| Error when alice tries to mint | |

## Explanations

**1. `decimals` is 18 and the total supply is stored as a 25-digit integer.
Explain what the token contract itself actually knows about decimal points, and
whose job it is to put the point back:**

**2. Alice approved Bob for 400 tokens and her balance did not change. Explain
what an approval actually writes, and what would still be true if Bob never
called `transferFrom` at all:**

**3. `transferFrom` cost more gas than `transfer`. Account for the difference in
terms of what the extra step has to read and write:**

**4. Burning reduced `totalSupply`, but a transfer to an address nobody controls
would not have. Explain the difference between the two, and why only one of them
is visible in the supply figure:**

**5. Every ERC-20 token on the network emits a `Transfer` event with the same
topic0 that you recorded. Explain why that single fact is what lets a block
explorer show token movements for tokens it has never been told about:**

**6. `mint` is not part of ERC-20, and `approve` is. Explain what follows from
that for a wallet or exchange integrating an unfamiliar token: which behaviours
it may rely on, and which it may not:**

## Verification

```bash
npm --workspace @blockchain-handbook/lab-07 run verify
```

- [ ] `npm run verify` reports 17 correct, 0 wrong, 0 blank
- [ ] `npm test` passes all 8 tests
- [ ] Every explanation above is written in my own words
