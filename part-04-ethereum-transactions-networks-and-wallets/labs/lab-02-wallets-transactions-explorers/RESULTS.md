# Exercise 2 results

Fill this in as you go. Do not attach images; every line here is either a value
from a reproducible local chain or an explanation in your own words.

## Environment

- Network: Hardhat in-process local chain
- Date completed:
- Node.js version:
- Hardhat version:

## The successful transfer

| Field | Value |
|---|---|
| Transaction hash | |
| Sender | |
| Recipient | |
| Block number | |
| Transaction index | |
| `status` | |
| Value (wei) | |
| `gasUsed` | |
| `effectiveGasPrice` (wei) | |
| Fee = gasUsed x effectiveGasPrice (wei) | |
| Fee (ETH) | |
| Nonce | |
| Transaction type | |

## The failed transfer

| Field | Value |
|---|---|
| Transaction hash | |
| `status` | |
| Recipient contract | |
| Value attempted (wei) | |
| `gasUsed` | |
| Fee charged (wei) | |
| Why it failed | |

## Explanations

**1. Which fields belong to the signed transaction, and which exist only after
execution:**

**2. Why a failed transaction is charged a fee:**

**3. Which node-returned fields would verify the same facts as an explorer
page:**

**4. Where the fee went — which part was destroyed, which was paid, and why
the split exists:**

## Verification

- [ ] `npm run walkthrough` produced both transaction summaries
- [ ] `npm --workspace @blockchain-handbook/lab-02 test` passes
- [ ] No private key, seed phrase, public-network endpoint, or mainnet account
      appears anywhere above
