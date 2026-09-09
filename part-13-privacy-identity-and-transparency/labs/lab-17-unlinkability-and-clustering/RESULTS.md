# Implementation 17 results

Fill this in as you go. Do not attach images. Every value below is reproducible
on another machine, so `verify_results.py` can mark this file.

Keep the row labels exactly as they are. Write address sets as a comma-separated
list in alphabetical order, for example `a1, a2`.

## Environment

- Language and version used:
- Own implementation or reference solution:
- Date completed:

## What the record shows

| Field | Value |
|---|---|
| Addresses appearing in the full record | |
| Cluster containing a1, before mixing | |
| Cluster containing a3, before mixing | |
| Change candidate for the purchase, knowing nothing | |
| Fee paid by the purchase | |

## What the mix achieved, and what undid it

| Field | Value |
|---|---|
| Size of the anonymity set of alice-out | |
| alice-out is attributed to a1's owner before consolidation (yes/no) | |
| alice-out is attributed to a1's owner after consolidation (yes/no) | |
| Addresses attributed to a1's owner after consolidation | |
| Addresses gained by the analyst through the consolidation | |

## Explanations

Answer each in a short paragraph, in your own words.

**1. The common-input heuristic merged a1 and a2 without breaking anything.
Explain what fact about the record justifies the merge, and why this is not a
guess in the way change detection is:**

**2. a3 was never attributed to a1's owner before the mix, although the same
person controlled it. Explain what the owner did right, and what would have
attributed it:**

**3. State precisely what the mixing round achieved, and what it left visible.
Your answer should mention at least one thing an observer still knows about
alice-out immediately after the mix:**

**4. The consolidation used two heuristics in combination. Set out the chain of
inference, naming which step is certain and which is a guess, and explain why
the guess was good enough:**

**5. Nothing in this exercise broke a cryptographic assumption. Explain what
chain analysis actually works from, and what that implies for a user who
believes an unnamed address is anonymous:**

## Verification

```bash
python3 verify_results.py
```

- [ ] `python3 verify_results.py` reports 10 correct, 0 wrong, 0 blank
- [ ] `python3 -m unittest` passes all 17 tests
- [ ] Every explanation above is written in my own words
