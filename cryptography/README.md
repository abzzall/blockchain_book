# Chapter 3 cryptography sample

This sample uses only the Python standard library. It demonstrates SHA-256,
the observed effect of changing one input character, and a small
domain-separated Merkle membership proof.

Run it from this directory:

```bash
python3 hash_and_merkle_demo.py
python3 -m unittest -v
```

The Merkle construction is intentionally generic and educational. It is not a
drop-in implementation of Bitcoin's transaction tree or Ethereum's authenticated
data structures.
