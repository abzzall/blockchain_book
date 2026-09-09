# Lab 14 results

Fill this in as you go. Do not attach images. Every value below is reproducible
on another machine, so `verify_results.py` can mark this file.

Keep the row labels exactly as they are; the marking script finds values by
label. Write hex values in lowercase with no `0x` prefix, and write wei as a
plain integer with no separators.

## Environment

- Language and version used:
- Own implementation or reference solution:
- Date completed:

## Specification-determined values

Any correct implementation, in any language, reproduces these exactly.

| Field | Value |
|---|---|
| Alice's address | |
| Bob's address | |
| Hash of transaction 0 | |
| Closing state root of the canonical block | |

## Behavioural values

These follow from the rules of the state machine and do not depend on encoding.

| Field | Value |
|---|---|
| Bob's closing balance in wei | |
| Carol's closing balance in wei | |
| Miner's closing balance in wei | |
| Alice's closing nonce | |
| Total across all accounts equals the opening supply (yes/no) | |
| The over-large transfer was included in the block (yes/no) | |
| The over-large transfer succeeded (yes/no) | |
| Alice's nonce after the over-large transfer alone | |
| The replayed transaction was rejected (yes/no) | |
| Both nodes computed the same state root (yes/no) | |

## Explanations

Answer each in a short paragraph, in your own words.

**1. The transaction has no sender field, yet the state machine knows who is
paying. Explain where the sender comes from, and what an attacker achieves by
altering a signed field:**

**2. The over-large transfer was included in the block and still cost Alice a
fee, while the replayed transaction was rejected outright and cost nothing.
Explain why the two faults are treated differently, and what a node would be
exposed to if failed transactions were free:**

**3. The nonce keeps one sender's transactions in order. Explain what else it
prevents, and why a signature alone is not sufficient protection against it:**

**4. The state root is one 32-byte value covering every account. Explain what it
lets two nodes do that comparing balances one at a time would not, and what
property of the hash makes that work:**

**5. Moving Bob's payment to the front of the block made it unincludable rather
than merely reordered. Explain why, and what that shows about whether ordering
is part of the state or a presentational detail of the block:**

## Verification

```bash
python3 verify_results.py
```

- [ ] `python3 verify_results.py` reports 14 correct, 0 wrong, 0 blank
- [ ] My implementation (or the reference solution) passes its own tests
- [ ] Every explanation above is written in my own words
