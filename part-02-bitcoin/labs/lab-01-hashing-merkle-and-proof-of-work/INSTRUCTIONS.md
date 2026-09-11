# Implementation 1 — Hashing, Merkle trees, and proof of work

## Outcome

You will build, by running and reading supplied code, the three mechanisms that
make a chain of blocks tamper-evident: a cryptographic hash, a Merkle tree with
membership proofs, and proof of work. You will then edit a small chain and watch
each edit be caught, and explain which mechanism caught it.

This exercise runs entirely offline. There is no wallet, no network, no test assets,
and nothing to install beyond Node.js itself.

## Safety and environment

- Network: none. Nothing in this exercise touches any blockchain.
- Assets: none.
- No keys, addresses, or accounts are involved at any point.

The proof of work here is a teaching model, not Bitcoin's. It hashes a
pipe-separated text header rather than Bitcoin's 80-byte binary header, and it
counts leading zero bits rather than comparing against a 256-bit target.
Chapter 8 explains the real encoding; the exercise is the search, which is the
same in both.

## Verified versions

| Component | Version |
|---|---|
| Verification date | 2026-09-07 |
| Node.js | 24.15.0 |
| Dependencies | none |

## Files supplied

| File | What it holds |
|---|---|
| `src/hash.mjs` | SHA-256, Bitcoin's double SHA-256, and a leading-zero-bit counter |
| `src/merkle.mjs` | tree construction, root, membership proof, proof verification |
| `src/pow.mjs` | header serialization, header hashing, and the nonce search |
| `src/chain.mjs` | a linked chain of mined blocks, and a validator that reports the first fault |
| `scripts/*.mjs` | the four commands below |
| `test/*.test.mjs` | 16 automated tests, including published SHA-256 vectors |
| `RESULTS.md` | the template you fill in |

## Command-line work

Run everything from the exercise directory:

```bash
cd part-02-bitcoin/labs/lab-01-hashing-merkle-and-proof-of-work
npm test
```

All 16 tests must pass before you continue. Two of them check SHA-256 against
the vectors published with the standard, so a pass tells you the implementation
is the real function and not an approximation of it.

### Part A — Hashing

```bash
npm run hash -- "blockchain"
npm run hash -- "blockchaim"
```

Record the SHA-256 and double SHA-256 of `blockchain`. Compare the two digests
character by character and note how much of the first one survives the
one-letter change.

### Part B — Merkle trees

```bash
npm run merkle -- 2 tx-a tx-b tx-c tx-d
```

The command prints every level of the tree, the root, and the membership proof
for the leaf you named — here leaf 2, `tx-c`. Record the root, the number of
steps in the proof, and the first sibling hash. Note the last line, which
re-runs the same proof against a leaf that is not in the tree.

Then try a tree whose leaf count is not a power of two, and count the levels:

```bash
npm run merkle -- 0 tx-a tx-b tx-c
```

### Part C — Proof of work

```bash
npm run mine -- 8
npm run mine -- 16
npm run mine -- 20
```

Each run searches nonces upward from zero until the block hash has at least
that many leading zero bits. Record the nonce and hash at 8 and 16 bits, and
record the attempt count and elapsed time at all three. The nonces are the same
on every machine; the timings are not.

Do not run this above roughly 24 bits. The work doubles with every added bit.

### Part D — Tampering with a chain

```bash
npm run tamper -- 12
```

This builds three mined, linked blocks, validates them, and then makes three
different edits: it changes a transaction, it repoints a block at a different
parent, and it changes a nonce by one. Record the two block hashes and the
height reported for two of the three edits.

## What to record

Everything listed in `RESULTS.md`. Every hash, root, and nonce there is
deterministic, so a marker reproduces all of them by running the same commands.
The attempt counts and timings are yours alone and are recorded for the
discussion, not for marking.

## What to explain

`RESULTS.md` asks five questions in prose. They are the part of this exercise that a
recorded value cannot demonstrate: why the avalanche property is required, where
a Merkle proof's saving comes from and what the verifier must already hold, why
the cost asymmetry between mining and checking is the point, why a fixed
difficulty still gives a variable attempt count, and what it would cost to make
an edited chain valid again.

## Verification

```bash
npm run verify
```

The script recomputes all twelve marked values and compares them with what you
wrote in `RESULTS.md`, reporting each as correct, wrong, or blank, and exiting
non-zero unless all twelve are correct. It finds your values by row label, so
leave the labels alone. Write digests in lowercase without a `0x` prefix.

## Troubleshooting and reset

- Nothing in this exercise writes state, so there is nothing to reset. Re-running any
  command reproduces its output exactly.
- If `npm run verify` reports `MISSING`, a row label in `RESULTS.md` was
  altered. Restore it from the wording in this repository.
- If a nonce disagrees with the marker, confirm you passed the difficulty on the
  command line and did not change the transaction list, since the nonce depends
  on the Merkle root and so on the exact transaction strings.
- If mining at 20 bits seems to hang, it has not; give it a few seconds and
  record the elapsed time the script prints.
