# Implementation 7 — An ERC-20 token

## Outcome

You will deploy a standard fungible token built on OpenZeppelin's ERC-20
implementation, then exercise every part of the interface that matters: supply
and decimals, a direct transfer, the two-step approve-and-spend path, the
allowance running down as it is spent, burning, and owner-only minting. You will
finish able to say exactly what the standard guarantees and what it does not.

## Safety and environment

- Network: Hardhat's in-process local chain. Nothing leaves your machine.
- Assets: a token you created on a simulated chain. It has no value, cannot be
  sold, and must never be described as though it could be.
- Never connect a wallet holding real assets to this lab.

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
| `contracts/CourseToken.sol` | the token: ERC-20, burnable, with owner-only minting |
| `test/CourseToken.ts` | four behavioural tests |
| `test/Deterministic.ts` | four tests pinning the values this lab marks |
| `scripts/walkthrough.ts` | the whole story, with balances, gas, and both reverts |
| `scripts/selectors.mjs` | separates the ERC-20 interface from the extensions |
| `scripts/deploy.ts` | deploys one token |
| `RESULTS.md` | the template you fill in |

## Command-line work

```bash
cd part-08-tokens-and-digital-assets/labs/lab-07-erc20-token
npm run build
npm test
```

All eight tests must pass before you continue.

### Part A — What is the standard, and what is not

```bash
npm run selectors
```

The output marks each function as either part of ERC-20 or an extension. Read
that division carefully before recording anything. `mint`, `burn`, and `owner`
are not in the standard; `approve` and `transferFrom` are. `RESULTS.md` asks you
what follows from that for anyone integrating an unfamiliar token.

Record the three function selectors and two event topics listed in `RESULTS.md`.

The `Transfer` topic you record is not particular to this token. It is the same
32 bytes for every ERC-20 on every EVM chain, because it is the hash of the
event signature and nothing else. That is the whole reason an explorer can
decode token movements for a contract it has never seen.

### Part B — The whole story

```bash
npm run walkthrough
```

Record the contract address, symbol, decimals, the raw integer supply, the three
gas figures, Alice's balance after she approves Bob, the allowance left after he
spends part of it, the supply after a burn, and the two error names.

Three moments in that output are worth stopping on.

1. The supply prints as `1000000` and as a 25-digit integer. Only the second one
   is stored. The token has no decimal point in it anywhere.
2. Alice approves Bob for 400 and her balance does not move. An approval writes
   a permission, not a payment.
3. Bob spends 250 of his 400 and the allowance falls to 150. He is spending a
   budget, and the budget is what runs out.

## What to record

Everything in `RESULTS.md`. All seventeen marked values come from the two
command-line commands, so a marker reproduces them exactly.

## What to explain

`RESULTS.md` asks six questions in prose, covering where the decimal point
really lives, what an approval writes, why `transferFrom` costs more than
`transfer`, the difference between burning and sending to an unreachable
address, why one shared event topic makes every token legible to an explorer,
and what an integrator may and may not assume.

## Verification

```bash
npm run verify
```

The script recomputes all seventeen values and reports each as correct, wrong,
or blank, exiting non-zero unless every one is correct. It finds them by row
label, so leave the labels alone.

## Troubleshooting and reset

- Every command builds its own chain, so there is nothing to reset. A gas figure
  that disagrees means the chain was not fresh.
- If `npm run selectors` cannot find the artifact, run `npm run build`.
- An `OwnableUnauthorizedAccount` revert means the call came from an account
  other than the deployer. That is the access control working.
- Amounts in this lab are written with `parseUnits(..., 18)`. Passing a plain
  `1000` instead transfers 1000 of the smallest unit, which is not one token but
  a million-million-millionth of one.

## Optional public-testnet extension

Not required and not marked. You may deploy the same token to a public testnet
with test assets only, using Hardhat's encrypted keystore for the RPC URL and a
dedicated test-only key, and then add the token to a development wallet by its
contract address to see the balance appear. If you do, remember that the wallet
is reading `decimals` from the contract to decide where to put the point.
