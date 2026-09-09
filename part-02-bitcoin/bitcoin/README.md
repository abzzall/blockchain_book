# Bitcoin samples (Chapters 6, 7, and 8)

These samples use only the Python standard library. They make no network
connection and require no node, wallet, key, or funds.

```bash
python3 supply_schedule.py     # Chapter 6: issuance
python3 utxo_and_script.py     # Chapter 7: transactions, UTXOs, Script
python3 proof_of_work.py       # Chapter 8: targets, difficulty, retargeting
python3 -m unittest -v         # runs the tests for all three
```

## Chapter 6 — `supply_schedule.py`

Computes Bitcoin's issuance schedule directly from the consensus rule,
reproducing Bitcoin Core's `GetBlockSubsidy`. Every amount is an integer number
of satoshis: the supply cap is a *consequence* of integer truncation in the
repeated halvings, and computing the schedule in floating-point BTC gets the
total wrong.

## Chapter 7 — `utxo_and_script.py`

Implements Bitcoin's real transaction serialization, plus reduced teaching
models of the UTXO set, coin selection, and Script.

The serialization is verified rather than asserted: the tests rebuild the
**genesis coinbase transaction** from the consensus format and check that it
produces the published transaction id
`4a5e1e4b…deda33b`, then hash the resulting header and check that it produces
the genesis block hash `000000000019d668…8ce26f`, the same value Bitcoin Core
asserts in `chainparams.cpp`. A single wrong byte anywhere in the encoding
would break both.

The UTXO set, coin selection, and Script interpreter are deliberately reduced.
The Script subset covers only the opcodes needed for pay-to-public-key-hash,
and signature checking is a stand-in so the structure can be shown without any
key material. Neither is a drop-in protocol implementation.

## Chapter 8 — `proof_of_work.py`

Implements the real proof-of-work arithmetic: the compact `nBits` target
encoding as `arith_uint256::SetCompact` decodes it, the consensus check from
`CheckProofOfWork`, difficulty as a ratio against the easiest permitted target,
and the retarget rule from `CalculateNextWorkRequired` including the clamp that
limits any single adjustment to a factor of four.

It is verified against the genesis block: the tests decode `0x1d00ffff`, hash
the published genesis header, and confirm the result satisfies that target.
Changing the nonce by one makes the check fail.

Note that a 256-bit hash is compared as a **little-endian** number, which is why
a valid block hash shows its leading zeros at the front of the reversed form
explorers display.
