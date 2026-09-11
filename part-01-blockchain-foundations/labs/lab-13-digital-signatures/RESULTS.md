# Exercise 13 results

Fill this in as you go. Do not attach images. Every value below is one that
another machine reproduces exactly, so `verify_results.py` can mark this file.

Keep the row labels exactly as they are; the marking script finds values by
label. Write hex values in lowercase, with no `0x` prefix.

## Environment

- Language and version used:
- Own implementation or reference solution:
- Date completed:

## Specification-determined values

Any correct implementation, in any language, reproduces these exactly.

| Field | Value |
|---|---|
| Compressed public key | |
| SHA-256 of the message | |
| Signature r | |
| Signature s | |
| Shared r across the two signatures | |
| Recovered private key | |

## Behavioural values

These follow from the properties being demonstrated and do not depend on
encoding.

| Field | Value |
|---|---|
| Length of the compressed public key in bytes | |
| Signing the same message twice gives the same signature (yes/no) | |
| Verifies against "transfer 10 to bob" (yes/no) | |
| Verifies against "transfer 100 to alice" (yes/no) | |

## Explanations

Answer each in a short paragraph, in your own words.

**1. The public key is published and the private key is not, yet one is computed
directly from the other. Explain what makes that one-way, and what would stop
working if it were not:**

**2. A signature verified. Say precisely what that establishes and what it does
not — in particular, whether it says anything about when the message was signed,
or about who was holding the key at the time:**

**3. The code signs a hash of the message rather than the message itself.
Explain why, and what would go wrong if arbitrarily long messages were signed
directly:**

**4. Both signatures in Part D shared the same r, and that was visible to anyone
who saw them. Explain why r gives the nonce away, and why the private key falls
out once two signatures share one:**

**5. Part B's signing is deterministic and Part D's is not. Explain what a
wallet must guarantee about its nonces, and why deriving the nonce from the key
and the message is safer than drawing one from a random source:**

## Verification

```bash
python3 verify_results.py
```

- [ ] `python3 verify_results.py` reports 10 correct, 0 wrong, 0 blank
- [ ] `python3 -m unittest` passes all 15 tests
- [ ] Every explanation above is written in my own words
