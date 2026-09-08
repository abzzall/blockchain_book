# Lab 3 — Your first smart contract

## Outcome

You will compile, deploy, and exercise `StudentRegistry`: a contract with a
constructor, a struct, a mapping, immutable state, validation, custom errors,
access control, read and write functions, and an event. You will do it twice —
once from the command line, where everything is reproducible, and once in Remix,
where you see the same contract through an interface.

## Safety and environment

- Network: Hardhat's in-process local chain for the marked work, and the Remix
  VM for the interactive part. Both are simulations.
- Assets: none with any value. The Remix VM's accounts and ether are invented by
  the page you are looking at.
- Never connect a wallet holding real assets to this lab, and never paste a
  recovery phrase or private key anywhere in it.

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
| `contracts/StudentRegistry.sol` | the contract, and the exact text to paste into Remix |
| `test/StudentRegistry.ts` | three behavioural tests |
| `test/Deterministic.ts` | three tests pinning the values this lab marks |
| `scripts/walkthrough.ts` | runs the whole story and prints gas and every revert reason |
| `scripts/selectors.mjs` | prints every function, error, and event selector |
| `scripts/deploy.ts` | deploys one registry |
| `RESULTS.md` | the template you fill in |

## Command-line work

```bash
cd samples-and-code/labs/lab-03-first-smart-contract
npm run build
npm test
```

All six tests must pass before you continue.

### Part A — What the contract declares

```bash
npm run selectors
```

Record the four selectors and one event topic listed in `RESULTS.md`. Notice
that the three `view` functions and the one `nonpayable` function are
distinguished in the output: that distinction is what decides whether calling
one costs gas.

### Part B — The whole story, with gas

```bash
npm run walkthrough
```

This deploys to a fresh local chain, creates a record, updates it, creates a
second one, reads one back, and then triggers all five expected failures.
Record the contract address, the three gas figures, the final `studentCount`,
and the error name for each of the five failures.

The three gas figures are the point of this part. Creating a record costs
roughly three times what updating one costs, and creating the second record
costs less than creating the first. `RESULTS.md` asks you to account for both.

## Interactive work in Remix

This part is not marked by a script, and it produces no recorded values. Do it
anyway: it is where you see that a contract is a thing you can hold, not just a
file that compiles.

Interfaces change faster than books do. Each step below names the result that
must become true, not the control that produces it. Where the book and the
screen disagree, the screen is right, and the current Remix documentation is the
authority.

1. Open the official Remix IDE at `https://remix.ethereum.org`.
2. Create a file named `StudentRegistry.sol` and paste the complete contract
   from `contracts/StudentRegistry.sol`.
3. Compile it with Solidity 0.8.36. Get to a clean compile before continuing;
   fix any error the compiler reports rather than working around it.
4. Choose an execution environment that is a local simulation — Remix's own
   in-browser VM — and confirm you have not selected an injected wallet.
5. Deploy the contract with `"Blockchain Systems"` as the constructor argument.
   The deployment must succeed and give you an address.
6. Read `courseName`, `instructor`, and `studentCount`. The count must be zero,
   and `instructor` must equal the account that deployed.
7. Call `saveStudent` with a second account's address, `"Aruzhan"`, and `91`.
   The transaction must succeed and must log a `StudentSaved` event whose
   decoded arguments you can read.
8. Call `getStudent` with the same address and confirm the name, the score, a
   non-zero timestamp, and `exists = true`. Confirm `studentCount` is now one.
9. Call `saveStudent` again for the same address with `95`. The record must
   change and the count must not.
10. Force two failures: a score of `101`, and a valid call made from a different
    account. Both must revert, and Remix must show you which error each raised.

## What to record

Everything in `RESULTS.md`. All fifteen marked values come from the two
command-line commands, so a marker reproduces them exactly. Nothing from the
Remix section is marked mechanically.

The contract address is deterministic because a fresh local chain always starts
the same deployer at nonce zero. If yours differs, your chain was not fresh.

## What to explain

`RESULTS.md` asks six questions in prose. Two of them are about Remix and are
the reason this lab needs no pictures: describing what the interface showed you,
and what you had to know to interpret it, demonstrates something a screenshot
never did.

## Verification

```bash
npm run verify
```

The script recomputes all fifteen values and reports each as correct, wrong, or
blank, exiting non-zero unless every one is correct. It finds them by row label,
so leave the labels alone.

## Troubleshooting and reset

- Every command creates its own chain, so there is nothing to reset. A gas
  figure that disagrees means the chain was not fresh.
- If `npm run selectors` cannot find the artifact, run `npm run build`.
- In Remix, an `InstructorOnly` revert means the selected account is not the one
  that deployed. That is the access control working, not a fault.
- If Remix reports a compiler error on a clean paste, check that the whole file
  was copied, including the licence line and the pragma.

## Optional public-testnet extension

Not required and not marked. After the local work, you may deploy the same
contract to a public testnet with test assets only, using Hardhat's encrypted
keystore for the RPC URL and a dedicated test-only key. Never place either in
this repository.
