# Implementation 15 — Rollup batching and fraud proofs

## Outcome

You will implement, in a language of your choice, the three moving parts of an
optimistic rollup: an operator that applies transfers off-chain and posts a
commitment, a settlement layer that accepts that commitment without checking it,
and a challenger that re-executes the posted data and disproves a false claim.

You will then run the case that matters. A fraudulent batch, left unchallenged
for the length of its window, finalises. Nothing malfunctions and no contract
behaves incorrectly. That is the security model, stated exactly.

**The task does not require any particular programming language.** A complete
reference solution in JavaScript is supplied and is worth reading, but every
value this exercise records follows either from the specification below or from
the behaviour of the state machine, never from a language choice.

This runs entirely offline. There is no wallet, no network, no browser, no node
software, and no test assets.

## Safety and environment

This is a teaching model of how a rollup settles, **not** a rollup. It reproduces
the accounting and the challenge window in a few hundred lines so that the
argument can be followed end to end; it has no prover, no data-availability
layer, no bridge, and no consensus. A production system differs in every one of
those, and — as the chapter's stage discussion says — in who still holds the keys.

- Network: none. Nothing here touches any blockchain.
- Assets: none. All balances are integers in a map.
- No keys, addresses, or accounts are involved at any point.

## Verified versions

| Component | Version |
|---|---|
| Verification date | 2026-09-09 |
| Node.js (reference solution) | 24 or newer |
| Dependencies | none |

---

## Specification

Everything in this section is normative. Two implementations that follow it
produce the same roots and the same commitments.

### Accounts and the state root

An account has an integer `balance` and an integer `nonce`. Serialise the state
by sorting accounts by name ascending and joining, with `|` between accounts:

```
<name>:<balance>:<nonce>
```

The state root is the SHA-256 of that string, in lowercase hexadecimal. Sorting
is what makes the root independent of the order accounts were created in.

### Applying a transfer

A transfer has `from`, `to`, `amount`, and `nonce`. Apply it in this order, and
reject the whole transfer if any check fails:

1. The sender must have an account.
2. The amount must be a positive integer.
3. The transfer's nonce must equal the sender's current nonce.
4. The sender's balance must be at least the amount.

Then deduct the amount from the sender, increment the sender's nonce, and credit
the recipient, creating the recipient's account at zero if it does not exist.

A rejected transfer is an error, not a skip. An operator that silently skips one
produces a root a challenger will disprove, which is the point of the exercise.

### Batches

Encode a transfer as `<from>><to>:<amount>#<nonce>` and a batch as those
encodings joined by `;`. The batch's data hash is the SHA-256 of that string.

A batch is `previousRoot`, `claimedRoot`, the ordered `transfers`, and the
`dataHash`. An honest operator sets `claimedRoot` to the root that results from
applying the transfers; a dishonest one sets it to something else.

### Checking a batch

Given the state before the batch and the batch itself, a challenger checks, in
order: that the state's root equals `previousRoot`; that the transfers hash to
`dataHash`; that every transfer applies without error; and that the resulting
root equals `claimedRoot`. Failing any of these disproves the batch.

### The settlement layer

The settlement layer holds a finalised root and a challenge window of 3 blocks.
It **does not** check a batch when the batch is posted. A batch may be challenged
while fewer than 3 blocks have passed since it was posted; a successful challenge
rejects it. Once 3 or more blocks have passed, the batch finalises and its
claimed root becomes the finalised root.

Gas figures for the cost comparison: 16 gas per byte of published transfer data,
45,000 gas of fixed overhead to record a batch, and 21,000 gas for one transfer
sent individually on the settlement layer.

### The scenario under test

Opening state: `alice` 100, `bob` 50, `carol` 0, all nonces zero. The canonical
batch is three transfers in this order:

| # | From | To | Amount | Nonce |
|---|---|---|---|---|
| 0 | alice | bob | 30 | 0 |
| 1 | bob | carol | 60 | 0 |
| 2 | alice | carol | 10 | 1 |

Transfer 1 spends what transfer 0 delivered, which is what makes the ordering
load-bearing. The dishonest operator claims the root that results from adding
1,000,000 to Carol's balance after applying the transfers honestly.

---

## Sample solution

| File | What it holds |
|---|---|
| `src/state.mjs` | accounts, transfer rules, and the state root |
| `src/rollup.mjs` | batch construction, encoding, and the challenger's check |
| `src/l1.mjs` | the settlement layer, its challenge window, and the gas model |
| `src/scenario.mjs` | the opening state and canonical batch shared by every command |
| `scripts/*.mjs` | the four commands below |
| `test/*.test.mjs` | 18 automated tests |
| `RESULTS.md` | the template you fill in |

Read it if you want a worked answer, or ignore it and write your own;
`npm run verify` marks the values you recorded, not the code you wrote.

```bash
cd part-11-scaling-and-cross-chain-systems/labs/lab-15-rollup-batching-and-fraud-proofs
npm test
```

All 18 tests must pass before the reference solution is trustworthy.

## Command-line work

### Part A — Building a batch

```bash
npm run batch
```

Record the previous root, the claimed root, and the data hash. Confirm that
re-executing the posted data reproduces the claim, and that the total supply is
unchanged: transfers move value, they do not create it.

### Part B — What batching costs

```bash
npm run costs
```

Record the gas for fifty transfers sent individually and as one batch. Note that
calldata per transfer barely moves as the batch grows, while the saving per
transfer improves considerably. Work out which cost is amortised and which is not
before answering the third question.

### Part C — Challenging

```bash
npm run challenge
```

Three runs of the same settlement layer: an honest batch left alone, a fraudulent
batch challenged inside its window, and the same fraudulent batch that nobody
challenges. Record whether the challenge was upheld, and the status of the third
batch.

The third run is the one to think about.

### Part D — Withholding the data

```bash
npm run withhold
```

The operator posts the commitment but not the transfers. Observe that the
challenger can no longer construct a disproof, while nothing on the settlement
layer looks wrong.

## What to record

Everything in `RESULTS.md`, which is split into specification-determined values
(the roots and the data hash, reproducible by any correct implementation) and
behavioural values (balances, outcomes, and gas, which follow from the rules).

## What to explain

`RESULTS.md` asks five questions in prose: what the settlement layer relies on
instead of checking, what actually failed in the third run, which cost is being
amortised, why withholding data defeats a challenge, and which assumption a
validity proof removes and which it leaves in place.

## Verification

```bash
npm run verify
```

The script recomputes all eleven marked values and reports each as correct,
wrong, or blank, exiting non-zero unless all are correct. It finds your values by
row label, so leave the labels alone.

## Troubleshooting and reset

- Nothing here writes state, so there is nothing to reset.
- A wrong state root with correct balances usually means the accounts were not
  sorted by name, or an account created at zero was left out of the serialisation.
- A wrong data hash usually means the separators differ; check `>`, `:`, `#`, `;`.
- If your challenger accepts the fraudulent batch, check that you are comparing
  the computed root against `claimedRoot` rather than recomputing `claimedRoot`.

## Optional self-study

None of the following is assessed, and none of it is required.

- Replace the ordered-hash state commitment with a Merkle tree, and produce a
  proof that one account's balance is wrong without publishing the whole state.
  That is the step from this model towards a real fraud proof.
- Read a published post-mortem of a rollup sequencer outage and identify which
  of the assumptions in Part C the outage stressed.
