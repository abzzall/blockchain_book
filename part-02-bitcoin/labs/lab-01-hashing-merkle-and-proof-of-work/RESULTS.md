# Exercise 1 results

Fill this in as you go. Do not attach images. Every value below is one that
another machine reproduces exactly, so `npm run verify` can mark this file.

Keep the row labels exactly as they are; the marking script finds values by
label. Write hex digests in lowercase, with no `0x` prefix.

## Environment

- Node.js version:
- Date completed:

## Part A — Hashing

| Field | Value |
|---|---|
| SHA-256 of "blockchain" | |
| Double SHA-256 of "blockchain" | |

## Part B — The Merkle tree over `tx-a`, `tx-b`, `tx-c`, `tx-d`

| Field | Value |
|---|---|
| Merkle root of the four transactions | |
| Number of steps in the proof for tx-c | |
| First sibling hash in the proof for tx-c | |

## Part C — Proof of work over that same root

| Field | Value |
|---|---|
| Nonce at 8 bits | |
| Nonce at 16 bits | |
| Block hash at 16 bits | |

Attempts and elapsed time you observed, which will differ between machines:

| Field | Value |
|---|---|
| Attempts at 8 bits | |
| Attempts at 16 bits | |
| Attempts at 20 bits | |
| Elapsed time at 20 bits (ms) | |

## Part D — The three-block chain at 12 bits

| Field | Value |
|---|---|
| Hash of block 0 in the three-block chain | |
| Hash of block 2 in the three-block chain | |
| Height reported when block 0's first transaction is edited | |
| Height reported when block 2's previous hash is edited | |

## Explanations

Answer each in a short paragraph, in your own words.

**1. You changed one letter of the input and the digest changed completely.
Explain why this is required of a hash function, and what an attacker could do
if a small input change produced a small digest change:**

**2. A proof for one transaction in a tree of 1024 needed ten sibling hashes,
not 1023. Explain where the saving comes from, and what the verifier must
already know for the proof to mean anything:**

**3. Mining at 16 bits took you many thousands of attempts, but checking the
answer took one hash. Explain why this asymmetry is the whole point, and what
would break if verification were as expensive as mining:**

**4. Your attempt count at 16 bits was probably not exactly 65536, and may have
been several times that. Explain why the number of attempts varies even though
the difficulty is fixed, and what quantity 65536 actually describes:**

**5. Editing a transaction in block 0 was reported at height 0, but the two
blocks after it were also invalid. Explain what would have to be redone to make
the edited chain valid again, and why that cost is what protects the history:**

## Verification

```bash
npm --workspace @blockchain-handbook/lab-01 run verify
```

- [ ] `npm run verify` reports 12 correct, 0 wrong, 0 blank
- [ ] `npm test` passes
- [ ] Every explanation above is written in my own words
