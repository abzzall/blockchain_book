# Lab 2 results

Fill this in as you go. Do not attach images; every line here is either a value
someone can look up or an explanation in your own words.

## Environment

- Network: Sepolia, chain ID `11155111`
- Date completed:
- Wallet used (name and version):

## The successful transfer

| Field | Value |
|---|---|
| Transaction hash | |
| Block number | |
| Transaction index | |
| `status` | |
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
| `gasUsed` | |
| Fee charged (wei) | |
| What I attempted, and why it failed | |

If your wallet refused to sign every failing case, say so here and explain
which check stopped you:

## Explanations

**1. What the wallet's confirmation showed, and which fields came from the
transaction itself:**

**2. Why a failed transaction is charged a fee:**

**3. What you relied on to believe the explorer, and how you would check
without it:**

**4. Where the fee went — which part was destroyed, which was paid, and why
the split exists:**

## Verification

- [ ] `npm run inspect` reproduces every recorded value for the successful hash
- [ ] `npm run inspect` reproduces every recorded value for the failed hash
- [ ] No private key, seed phrase, or mainnet account appears anywhere above
