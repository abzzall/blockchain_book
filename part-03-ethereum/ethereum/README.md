# Chapters 9--14 Ethereum samples

This sample uses only the Python standard library. It makes no network
connection and requires no node, wallet, key, or funds.

```bash
python3 accounts_and_state.py
python3 proof_of_stake.py
python3 transactions.py
python3 fees.py
python3 rpc.py
python3 contracts.py
python3 -m unittest -v
```

## What is real, and what is a teaching model

Three parts are the actual specified algorithms, verified in the tests against
published vectors:

- **Keccak-256** (`keccak.py`). Ethereum execution conventions such as account
  addresses use original Keccak, *not* standardized SHA3-256; the two differ
  by a single padding byte. The tests
  assert both the published Keccak-256 vectors and that the two functions
  disagree. Python's `hashlib` provides SHA3-256 only, which is why this
  module exists.
- **RLP encoding**, checked against the published examples.
- **EIP-55 checksummed addresses**, checked against all eight addresses
  published as test cases in that document.
- **Address derivation from a public key**, checked end to end against a
  documented account: the public key for `m/44'/60'/0'/0/0` of the mnemonic
  `test test test test test test test test test test test junk`, derived with
  the BIP-32/BIP-39 code in `part-01-blockchain-foundations/wallets/`, must produce the
  address Hardhat and Foundry both publish as their first default account.
- **CREATE and CREATE2 address formulas**. CREATE2 is checked against a
  published EIP-1014 vector. CREATE is checked against a real deployment: the
  deterministic deployment proxy, deployed from a single-use account at nonce
  zero. Confirmed against mainnet on 2026-09-06 --- code is present at the
  predicted address and the deployer's nonce is exactly 1.
- **The canonical empty-code hash and empty-storage-trie root**, asserted
  against their published values.

`WorldState` is a **reduced teaching model**. It implements account fields,
basic balance and nonce transitions, and contract-address derivation. It
distinguishes an absent account from the values returned when one is read and
uses the canonical empty-storage-trie root. It omits transaction fees,
signatures, EVM execution, trie mutation, and EIP-7702 delegation processing.
`has_code` is intentionally not an account-type classifier.

`proof_of_stake.py` is also a **reduced teaching model**. Its current mainnet
constants and arithmetic come from the consensus specifications, and it
preserves the four structural finalization rules, but it accepts aggregate vote
fractions and represents checkpoints only by epoch. Its tests verify this local
model; they are not substitutes for the official consensus-spec test vectors.

`transactions.py` covers Chapter 11, and covers only transaction *encoding*:
RLP, the exact bytes that get signed, the signing hash, and the transaction
hash. Its central test is the worked example published in EIP-155 itself, so
the encoding is checked against a value printed in that document rather than
against its own assumptions.

It deliberately stops there. It does not sign --- there is no key material and
no secp256k1 implementation here, so signature values are supplied as inputs.
It does not model receipts, nonce ordering, or fee arithmetic: those are
explained in the chapter's prose, and restating prose as Python would produce
tests that only confirm the code agrees with itself. Fee-market arithmetic
belongs to Chapter 12; reading a real transaction and receipt belongs to the
Part IV lab, where the tooling for it exists.

`fees.py` covers Chapter 12: base fee, priority fee, intrinsic gas, refunds,
and what a sender actually pays. All arithmetic is integer wei; no floating
point appears anywhere in the module.

Its verification is live-chain data, frozen. The EIP-1559 base fee rule is
checked against five consecutive mainnet block transitions (25,918,872 through
25,918,877, read 2026-09-06) and must predict each child block's base fee to
the wei. The effective gas price is checked against four real transactions
from one block, chosen to cover a tip capped by the maximum, a tip paid in
full, and a tip of zero. The gas constants are asserted against the EIPs that
define them.

The block gas limit of 60,000,000 appears only inside those fixtures, as
observed data with block numbers attached. It is not a protocol constant --- it
is set by validators and has been raised repeatedly, so read it from a recent
block rather than from this file.

`rpc.py` covers Chapter 13: the two hex encoding rules of the JSON-RPC
interface, request construction, and response reading. It is tested against
the examples in the official documentation, including the ones that document
explicitly labels WRONG --- `0x`, `0x0400` and `ff` must be rejected as
quantities, `0xf0f0f` and `004200` as data, while `0x` is valid data and an
invalid quantity. Chain identifiers for mainnet, Sepolia and Hoodi, and one
set of mainnet head/safe/finalized block numbers, were read from live networks
on 2026-09-06 and are frozen as fixtures.

It sends nothing. There is no network access in this directory at all;
issuing real requests belongs to the Part IV lab.

`contracts.py` covers Chapter 14: function selectors, ABI argument encoding,
and an EVM disassembler. Its ABI output is checked against the worked example
printed in the Solidity ABI specification (`baz(uint32,bool)` with 69 and
`true`), plus three widely deployed token selectors. Its opcode table comes
from the execution specifications (Osaka fork).

The bytecode it disassembles is real: the 69-byte deterministic deployment
proxy at `0x4e59b448...0b4956c`, read once with `eth_getCode` and frozen. That
is the same contract whose address `accounts_and_state.py` derives from its
deployer and a nonce of zero, so the two samples verify one object from
opposite directions.

`address_from_public_key` takes a public key as input; key generation itself is
in the Chapter 5 sample under `part-01-blockchain-foundations/wallets/`.
