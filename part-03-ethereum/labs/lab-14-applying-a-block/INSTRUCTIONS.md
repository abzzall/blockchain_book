# Implementation 14 — Applying a block to account state

## Outcome

You will implement, in a language of your choice, the part of an Ethereum node
that decides what a block does: recover each transaction's sender from its
signature, check the nonce, charge for gas, move the value, and commit the
result to a state root. You will then show that two independent runs over the
same ordered block reach the same root, and that three different faults fail in
three different ways.

**The task does not require any particular programming language.** A complete
reference solution in Python is supplied and is worth reading, but an
implementation in any language that follows the specification below produces
identical recorded values. Everything marked is fixed either by the
specification or by the behaviour of the state machine, never by a language
choice.

This lab runs entirely offline. There is no wallet, no network, no browser, no
node software, and no test assets.

## Safety and environment

- Network: none. Nothing in this lab touches any blockchain.
- Assets: none. All balances are integers in a dictionary.
- Every private key here is a fixed constant printed in this document and is
  public by definition. Never use one on any network.

## Verified versions

| Component | Version |
|---|---|
| Verification date | 2026-09-08 |
| Python (reference solution) | 3.11 or newer |
| Dependencies | none (standard library only) |

---

## Specification

Everything in this section is normative. Two implementations that follow it
produce the same digests, the same signatures, and the same state root.

### Hashing

Keccak-256 as Ethereum uses it: the original Keccak padding byte `0x01`, not
SHA-3's `0x06`. A library's `sha3_256` is a **different function** and will not
reproduce these values. Check your implementation against:

```
keccak256("")                          = c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470
keccak256("transfer(address,uint256)") starts a9059cbb
```

### Curve and keys

secp256k1, with the standard domain parameters. A public key is the private key
times the generator. An address is the **last 20 bytes** of the Keccak-256 hash
of the 64-byte public key, that is the 32-byte big-endian `x` followed by the
32-byte big-endian `y`, with no `0x04` prefix.

The three accounts are derived from these private keys:

| Account | Private key |
|---|---|
| alice | `0x1111111111111111111111111111111111111111111111111111111111111111` |
| bob | `0x2222222222222222222222222222222222222222222222222222222222222222` |
| carol | `0x3333333333333333333333333333333333333333333333333333333333333333` |

The miner receiving the fees is the fixed address `0x000102030405060708090a0b0c0d0e0f10111213`.

### Transaction encoding

A transaction has `to`, `value`, `nonce`, `gas_price`, and `gas_limit`. It has
**no sender field**. Its signing bytes are these six items joined by a single
`|` byte (0x7c):

```
b"transfer" | to | value | nonce | gas_price | gas_limit
```

where `to` is the 20 raw address bytes and the four integers are their decimal
representations in ASCII. The transaction hash is the Keccak-256 of those bytes.

This encoding is a teaching simplification. Real Ethereum transactions are
RLP-encoded and typed; Chapter 11 covers that. The encoding is fixed here only
so that every implementation agrees.

### Signing

ECDSA over secp256k1, with a nonce derived deterministically as

```
k = int(keccak256(private_key_as_32_big_endian_bytes || transaction_hash)) mod (n - 1) + 1
```

Normalise `s` into the lower half of the order: if `s > n/2`, replace it with
`n - s`. The recovery id is the parity of the `R` point's `y` coordinate,
exclusive-ored with 1 when that normalisation flipped `s`.

### Sender recovery

Given the transaction hash and `(r, s, recovery_id)`, rebuild the point `R`
whose `x` coordinate is `r` and whose `y` parity is the recovery id, then

```
public_key = r^-1 * (s * R - z * G)
```

The sender is the address of that public key. A transaction whose signed fields
were altered recovers to a different address, which is what makes the sender
unforgeable without a signing key.

### Gas and validity

Every transfer costs `INTRINSIC_GAS = 21000`. The fee is `gas_limit * gas_price`.

Apply a transaction in exactly this order:

1. Recover the sender.
2. If the transaction's nonce is not equal to the sender's current nonce,
   **reject** it — it is not includable in the block at all.
3. If the sender's balance is less than the fee, **reject** it.
4. If `gas_limit` is below the intrinsic cost, **reject** it.
5. Increment the sender's nonce, deduct the fee, and credit it to the miner.
6. If the sender's remaining balance is less than `value`, the transaction is
   **included but fails**, with reason `insufficient balance`. The fee is kept
   and no value moves.
7. Otherwise deduct `value` from the sender and credit it to `to`.

The distinction in steps 2–4 versus step 6 is the point of the lab: a rejected
transaction never enters the block, whereas a failed one does and is paid for.

### State root

Concatenate, for every account in ascending order of its 20 address bytes:

```
address (20 bytes) || balance (32 bytes big-endian) || nonce (8 bytes big-endian)
```

and take the Keccak-256 of the result. Sorting by address makes the root
independent of the order accounts were created in.

This is not Ethereum's Merkle-Patricia trie. It is an ordered commitment with
the property the lesson needs — any change to any account changes the root —
without trie machinery the chapters do not develop.

### The block under test

Alice opens with 10 ETH and everyone else with nothing. `1 ETH = 10^18` wei and
the gas price is `1 gwei = 10^9` wei throughout. The canonical block is three
transfers, in this order:

| # | From | To | Value | Nonce |
|---|---|---|---|---|
| 0 | alice | bob | 2 ETH | 0 |
| 1 | alice | carol | 1 ETH | 1 |
| 2 | bob | carol | 0.5 ETH | 0 |

Transaction 2 spends what transaction 0 delivered, which is what makes the
ordering load-bearing.

---

## Sample solution

A complete, tested reference implementation in Python is supplied:

| File | What it holds |
|---|---|
| `keccak.py` | Keccak-256, written from the permutation up |
| `execution.py` | curve arithmetic, signing, sender recovery, accounts, and `apply_block` |
| `block_demo.py` | the five commands below |
| `test_execution.py` | 20 automated tests |
| `RESULTS.md` | the template you fill in |
| `verify_results.py` | the marking script |

Read it if you want a worked answer, or ignore it and write your own. If you
implement the lab yourself, you can still mark your work: `verify_results.py`
checks the values you recorded, not the code you wrote.

To run the reference solution:

```bash
cd part-03-ethereum/labs/lab-14-applying-a-block
python3 -m unittest -v
```

All 20 tests must pass before the reference solution is trustworthy.

## Command-line work

### Part A — Accounts

```bash
python3 block_demo.py accounts
```

Record alice's and bob's addresses. Confirm your own implementation derives the
same twenty bytes before going any further; every later value depends on it.

### Part B — The sender is computed, not claimed

```bash
python3 block_demo.py recover
```

Record the hash of the first transaction. Note that after one signed field is
altered, recovery returns a completely different address rather than an error.

### Part C — Applying the block

```bash
python3 block_demo.py block
```

Record the closing state root, the three closing balances, alice's closing
nonce, and whether the total across all accounts still equals the opening
supply.

### Part D — Three ways to fail

```bash
python3 block_demo.py failures
```

Record whether the over-large transfer was included, whether it succeeded, and
what alice's nonce became. Note which of the three faults were rejected outright
and which was included and charged for.

### Part E — Two nodes, one root

```bash
python3 block_demo.py agree
```

Record whether the two nodes agree. Then read what happens when the third node
reorders the block.

## What to record

Everything listed in `RESULTS.md`. It is split into two tables:

- **Specification-determined values** — addresses, digests, and the state root.
  Any correct implementation in any language reproduces these exactly.
- **Behavioural values** — balances, nonces, and whether each transaction was
  rejected, included, or included-and-failed. These follow from the rules and do
  not depend on the encodings at all.

## What to explain

`RESULTS.md` asks five questions in prose: why a transaction needs no sender
field, why a failed transaction still costs the sender money, what the nonce
prevents beyond simple ordering, what the state root does that comparing
balances one at a time would not, and why reordering the canonical block makes
it unincludable rather than merely different.

## Verification

```bash
python3 verify_results.py
```

The script recomputes every marked value and reports each as correct, wrong, or
blank, exiting non-zero unless all are correct. It finds your values by row
label, so leave the labels alone. Write hex values in lowercase without a `0x`
prefix, and write wei as a plain integer with no separators.

## Troubleshooting and reset

- Nothing in this lab writes state, so there is nothing to reset.
- A wrong address usually means SHA-3 was used instead of Keccak. Check the
  `keccak256("")` vector above first; it separates the two immediately.
- A wrong state root with correct balances usually means the accounts were not
  sorted by address, or the miner account was left out.
- A wrong transaction hash usually means the integers were encoded as raw bytes
  rather than as ASCII decimal.

## Optional self-study

None of the following is assessed, and none of it is required.

- Re-encode the transaction with real RLP and a type byte, and compare the hash
  with what an explorer shows for a comparable transfer.
- Replace the ordered-hash commitment with a real Merkle-Patricia trie and check
  that a single account's balance can then be proved without sending the whole
  state.
- Connect a browser wallet to a local development node and watch it construct
  the same fields by hand.
