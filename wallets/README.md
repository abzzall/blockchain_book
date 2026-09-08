# Chapter 5 wallet sample

This sample uses only the Python standard library. It implements BIP-39
(mnemonic to seed), BIP-32 (hierarchical deterministic derivation), and the
BIP-44 path structure, and verifies them against the official test vectors
published in those specifications.

Run it from this directory:

```bash
python3 hd_wallet_demo.py
python3 -m unittest -v
```

## Safety

Every key, mnemonic, and address in this sample comes from a **published test
vector**. Published vectors are public by definition: anyone can derive the
same keys. Never place funds in an address derived from them.

Never paste a real recovery phrase into this program, any other program, any
website, or any chat window. A recovery phrase belongs on paper or metal, never
on a networked device.

## Files

- `hd_wallet_demo.py` — derivation, serialization, and the demonstration.
- `ripemd160.py` — a self-contained RIPEMD-160, used only when the local
  OpenSSL build disables it (OpenSSL 3 does so by default).
- `test_hd_wallet_demo.py` — verification against BIP-32 test vector 1, the
  BIP-39 seed vector, and the published RIPEMD-160 vectors.

The `secp256k1` arithmetic here is written for clarity, not for production. It
is not constant-time and must not be used to handle real keys.
