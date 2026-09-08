# Lab 4 — Payable functions: a crowdfunding campaign

## Outcome

You will deploy and exercise a contract that receives ether, holds it, and pays
it out along two different paths — to a beneficiary when a goal is met, and back
to contributors when it is not. You will observe what `payable` permits, what
the EVM does to value sent at a function that is not payable, why the contract's
own balance is not a usable record of who is owed what, and why refunds are
pulled rather than pushed.

## Safety and environment

- Network: Hardhat's in-process local chain. Nothing leaves your machine.
- Assets: local test ether, created by the development chain and worth nothing.
- The only private keys involved are the well-known development keys the local
  chain prints. Never use them on any public network.

An optional final section deploys to a public testnet. It is not required, and
nothing in the marking depends on it.

## Verified versions

| Component | Version |
|---|---|
| Verification date | 2026-09-07 |
| Node.js | 24.15.0 |
| Hardhat | 3.15.0 |
| Solidity | 0.8.36 |
| viem | 2.56.3 |

## Files supplied

| File | What it holds |
|---|---|
| `contracts/CourseCrowdfund.sol` | the campaign: `contribute`, `withdraw`, `refund`, and a rejecting `receive` |
| `contracts/RejectingBeneficiary.sol` | a contract that refuses payment, used to force a failed transfer |
| `test/CourseCrowdfund.ts` | ten behavioural tests covering value in and value out |
| `test/Deterministic.ts` | four tests pinning the exact values this lab marks |
| `scripts/walkthrough.ts` | runs two complete campaigns and prints balances and gas |
| `scripts/selectors.mjs` | prints every error selector, event topic, and payable entry point |
| `scripts/deploy.ts` | deploys one campaign |
| `RESULTS.md` | the template you fill in |

## Command-line work

```bash
cd samples-and-code/labs/lab-04-payable-crowdfund
npm run build
npm test
```

All fourteen tests must pass before you continue.

### Part A — What the contract declares

```bash
npm run selectors
```

Record the number of payable entry points and the four error selectors and one
event topic listed in `RESULTS.md`. Note that `receive` appears in the payable
list even though it has no name: it is the function a plain transfer reaches.

Read `contracts/CourseCrowdfund.sol` before going further. In particular, find
the three places where `contributionOf` is read or written, and note that
`refund` sets it to zero *before* sending anything.

### Part B — A campaign that succeeds and one that fails

```bash
npm run walkthrough
```

This runs two complete campaigns on a fresh local chain. Record from its output:
the contract address, the three contribution gas figures, the total raised, the
contract balance after `withdraw`, and the contract balance after one of the two
contributors has refunded but before the other has.

The gas figures are the interesting part. Three contributions cost three
different amounts, and the differences are entirely about which storage slots
were already non-zero. `RESULTS.md` asks you to account for them.

### Part C — The failures

The failures are covered by `test/CourseCrowdfund.ts`, and you should read it
rather than guess. Each of the following is a separate test:

1. a contribution below the minimum;
2. a plain transfer, with no data, sent straight to the contract;
3. a contribution after the deadline;
4. a withdrawal before the deadline, by a stranger, and on a campaign that
   missed its goal;
5. a second withdrawal after a successful one;
6. a refund while the campaign is open, and after it succeeded;
7. a second refund by someone who already refunded;
8. a withdrawal to a beneficiary that refuses payment.

Run a single one to watch it, for example:

```bash
npx hardhat test nodejs --grep "plain transfer"
```

Record the error name for cases 2 and 5 in `RESULTS.md`.

Case 8 is the one worth pausing on. The beneficiary is a contract whose
`receive` reverts. The campaign checks the result of the transfer and reverts
the whole call, which undoes `withdrawn = true` along with everything else, so
the money remains claimable. Confirm that in the test before you explain it.

## What to record

Everything in `RESULTS.md`. All sixteen marked values are fixed by the contract
source and by a fresh local chain, so a marker reproduces every one of them by
running the same two commands.

The contract address is deterministic because a fresh local chain always starts
the same deployer at nonce zero, as Chapter 22 established. If yours differs,
your chain was not fresh.

## What to explain

`RESULTS.md` asks six questions in prose: what the EVM does to value sent at a
non-payable function and when; why the contract's balance is not a record of
who is owed what; why the three contributions cost different gas; what a
hostile contributor could do if refunds were pushed in a loop; why leaving
`withdrawn` false after a failed transfer is correct; and what accepting a plain
transfer would do to the refund logic.

## Verification

```bash
npm run verify
```

The script recomputes all sixteen values and reports each as correct, wrong, or
blank, exiting non-zero unless every one is correct. It finds them by row label,
so leave the labels alone.

## Troubleshooting and reset

- The local chain is created fresh for every command, so there is no state to
  reset. If a gas figure disagrees, you are running against a chain that already
  had transactions on it.
- A wrong contract address almost always means the same thing: the deployer was
  not at nonce zero.
- If `npm run selectors` cannot find the artifact, run `npm run build` first.
- If `npm run verify` reports `MISSING`, a row label in `RESULTS.md` was edited.

## Optional public-testnet extension

Not required and not marked. If you want to see the same contract on a public
network, store a dedicated test-only RPC URL and key in Hardhat's encrypted
keystore — never in this repository — and deploy there. Use a campaign duration
of a few minutes so you do not have to wait a day to test the refund path, and
remember that on a public chain you cannot advance time the way the local chain
does.
