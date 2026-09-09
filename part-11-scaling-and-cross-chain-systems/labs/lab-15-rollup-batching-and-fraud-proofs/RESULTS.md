# Implementation 15 results

Fill this in as you go. Do not attach images. Every value below is reproducible
on another machine, so `npm run verify` can mark this file.

Keep the row labels exactly as they are; the marking script finds values by
label. Write hex digests in lowercase, with no `0x` prefix.

## Environment

- Language and version used:
- Own implementation or reference solution:
- Date completed:

## Specification-determined values

Any correct implementation, in any language, reproduces these exactly.

| Field | Value |
|---|---|
| Previous root of the canonical batch | |
| Claimed root of the canonical batch | |
| Data hash of the canonical batch | |

## Behavioural values

These follow from the rules and do not depend on the encodings.

| Field | Value |
|---|---|
| Carol's closing balance | |
| Total supply after the batch | |
| Re-executing the honest batch reproduces its claim (yes/no) | |
| The fraudulent batch re-executes to its claimed root (yes/no) | |
| The challenge against the fraudulent batch was upheld (yes/no) | |
| Status of the fraudulent batch when nobody challenges | |
| Gas for fifty transfers sent individually | |
| Gas for the same fifty transfers as one batch | |

## Explanations

Answer each in a short paragraph, in your own words.

**1. The settlement layer never re-executes a batch when it is posted. Explain
what it is actually relying on instead, and what has to be true of the outside
world for that reliance to be sound:**

**2. In the third run of `npm run challenge`, a false claim was finalised and no
contract misbehaved. Explain precisely what failed, and why calling it a bug in
the settlement layer would be wrong:**

**3. Calldata gas per transfer barely changes as the batch grows, yet the saving
per transfer improves considerably. Explain which cost is being amortised and
which is not:**

**4. Explain why withholding the transfer data defeats a challenge even though
the commitment on the settlement layer still verifies, and why this makes data
availability a security property rather than an optimisation:**

**5. A validity-proof design replaces the challenge window with a proof checked
at posting time. State which of the assumptions above it removes, and which one
it does not:**

## Verification

```bash
npm --workspace @blockchain-handbook/lab-15 run verify
```

- [ ] `npm run verify` reports 11 correct, 0 wrong, 0 blank
- [ ] `npm test` passes all 18 tests
- [ ] Every explanation above is written in my own words
