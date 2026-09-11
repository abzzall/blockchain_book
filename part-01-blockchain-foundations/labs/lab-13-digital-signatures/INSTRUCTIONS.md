# Implementation 13 — Digital signatures and the cost of a repeated nonce

## Outcome

You will implement, in a language of your choice, the three things Chapter 3
describes in prose: turn a private key into a public key, sign a message, and
verify that signature without ever seeing the key that produced it. You will
then confirm that a signature is bound to the exact bytes it signed.

**The task does not require any particular programming language.** A complete
reference solution in Python is supplied and is worth reading, but every value
this lab marks is fixed by a published standard, so an implementation in any
language reproduces them exactly.

Finally you will run the failure Chapter 5 warns about. Two signatures made with
the same nonce are enough for anyone holding them to recover the private key by
ordinary algebra. You will watch that recovery succeed and explain why it works.

This lab runs entirely offline. There is no wallet, no network, no browser, no
test assets, and nothing to install beyond Python itself.

## Safety and environment

- Network: none. Nothing in this lab touches any blockchain.
- Assets: none.
- Every key here is a published test value and is public by definition. Never
  sign with a key that controls real value using this code.
- The arithmetic is written to be read. It is not constant time and is not
  suitable for production use.

## Verified versions

| Component | Version |
|---|---|
| Verification date | 2026-09-08 |
| Python | 3.11 or newer |
| Dependencies | none (standard library only) |

---

## Specification

Everything in this section is normative, and all of it is published standard
material rather than a choice made by this lab.

### Curve

secp256k1, with the standard domain parameters. Check your implementation
against the published doubling of the generator:

```
(2 * G).x = c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5
```

A public key is the private key times the generator. Its compressed encoding is
33 bytes: `0x02` if `y` is even or `0x03` if `y` is odd, followed by the
32-byte big-endian `x`.

### The key under test

```
private key = 0x18e14a7b6a307f426a94f8114701e7c8e774e7f9a47e2c2035db29a206321725
```

This is a published test value and is public by definition.

### Signing

ECDSA over secp256k1, hashing the UTF-8 message bytes with SHA-256 to obtain
`z`. The signing nonce is derived by **RFC 6979** using HMAC-SHA256, which is
what makes signing deterministic.

No low-`s` normalisation is applied anywhere in this lab, so roughly half the
signatures you produce will have `s > n/2`. Bitcoin and Ethereum both normalise
in consensus rules, to stop a third party rewriting `(r, s)` into the equally
valid `(r, n - s)` and changing a transaction's hash. That rule is left out here
because it would complicate the Part D algebra without adding to the point.

### Nonce reuse

For Part D only, the same nonce is used to sign two different messages:

```
nonce    = 0x00000000000000000000000000000000000000000000deadbeef12345678cafe
message1 = "pay alice 1"
message2 = "pay bob 2"
```

Given two signatures sharing a nonce, the nonce and then the key follow from

```
k = (z1 - z2) / (s1 - s2)   mod n
d = (s1 * k - z1) / r       mod n
```

The subtraction cancels the private key only because both signatures were
produced with the same unnormalised `s` convention, which is why the note above
matters.

---

## Sample solution

A complete, tested reference implementation in Python is supplied. Read it if
you want a worked answer, or ignore it and write your own; `verify_results.py`
marks the values you recorded, not the code you wrote.

## Files supplied

| File | What it holds |
|---|---|
| `signatures.py` | reference solution: curve arithmetic, key derivation, signing, verification, and the two recovery functions |
| `sign_demo.py` | the four commands below |
| `test_signatures.py` | 15 automated tests |
| `RESULTS.md` | the template you fill in |
| `verify_results.py` | the marking script |

## Command-line work

Run everything from the lab directory:

```bash
cd part-01-blockchain-foundations/labs/lab-13-digital-signatures
python3 -m unittest -v
```

All 15 tests must pass before you continue. Three of them check the curve
constants against published values, so a pass tells you the arithmetic is real
secp256k1 and not an approximation of it.

### Part A — From a private key to a public key

```bash
python3 sign_demo.py keys
```

Record the compressed public key. Note that it is 33 bytes, not 64: the y
coordinate is not stored, because the curve equation recovers it from x and a
single parity bit.

### Part B — Signing and verifying

```bash
python3 sign_demo.py sign "transfer 10 to alice"
```

Record the SHA-256 of the message and both halves of the signature. Run the
command a second time and confirm the output is byte-identical. The nonce is
derived from the key and the message, so signing is deterministic; this is
RFC 6979, and Part D shows what it is protecting you from.

### Part C — What a signature is bound to

```bash
python3 sign_demo.py tamper "transfer 10 to alice" "transfer 10 to bob"
python3 sign_demo.py tamper "transfer 10 to alice" "transfer 100 to alice"
```

Record whether each altered message verifies. Try an alteration of your own that
changes only whitespace or only capitalisation, and confirm it also fails.

### Part D — One nonce, used twice

```bash
python3 sign_demo.py reuse
```

The script signs two different messages with one deliberately reused nonce, then
recovers the private key from the two signatures alone. Record the shared `r`,
the recovered nonce, and the recovered private key.

Read the output carefully. Nothing secret entered the recovery. Two signatures
and the two messages they signed were sufficient.

## What to record

Everything listed in `RESULTS.md`. It is split into two tables:

- **Specification-determined values** — the public key, the message digest, and
  both halves of each signature. Any correct implementation in any language
  reproduces these exactly, because every step is fixed by a published standard.
- **Behavioural values** — whether a signature verifies against an altered
  message, whether signing twice is identical, and whether the recovered key
  matches. These follow from the properties being demonstrated and do not depend
  on encoding at all.

## What to explain

`RESULTS.md` asks five questions in prose. They are the part of this lab that a
recorded value cannot demonstrate: why a public key can be published while the
private key cannot, what a valid signature does and does not establish, why
signing a hash rather than a message is the safe construction, why the shared
`r` is the visible symptom of nonce reuse, and what a wallet must guarantee
about its nonces.

## Verification

```bash
python3 verify_results.py
```

The script recomputes all ten marked values and compares them with what you
wrote in `RESULTS.md`, reporting each as correct, wrong, or blank, and exiting
non-zero unless all ten are correct. It finds your values by row label, so leave
the labels alone. Write hex values in lowercase without a `0x` prefix.

## Troubleshooting and reset

- Nothing in this lab writes state, so there is nothing to reset. Re-running any
  command reproduces its output exactly.
- If `verify_results.py` reports `MISSING`, a row label in `RESULTS.md` was
  altered. Restore it from the wording in this repository.
- If a signature disagrees with the marker, confirm you passed the message in
  quotation marks exactly as printed above. A trailing space changes the hash
  and therefore the signature, which is the point of Part C.

## Optional self-study

None of the following is assessed, and none of it is required.

- Sign a message with a browser wallet such as MetaMask using its personal-sign
  feature, and compare the shape of the output with the `r` and `s` printed
  here. Ethereum's personal-sign prefixes the message before hashing, so the
  digests will not match; work out why the prefix exists.
- Read the disclosures behind two well-known nonce-reuse incidents: the 2010
  console signing-key recovery and the 2013 Android wallet key thefts. Both are
  Part D happening to real keys holding real value.
