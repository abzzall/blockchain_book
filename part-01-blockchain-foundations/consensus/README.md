# Chapter 4 consensus sample

This sample uses only the Python standard library. It demonstrates the
structure of a block header, proof-of-work mining against a target, the
validation checks a node performs before extending its chain, and a
cumulative-work chain-selection rule.

Run it from this directory:

```bash
python3 chain_rules_demo.py
python3 -m unittest -v
```

The model is intentionally reduced. It has no signatures, no real transaction
format, no networking, and no difficulty retargeting, and it is not a drop-in
implementation of Bitcoin or any other protocol. Its purpose is to show why
chain selection compares accumulated work rather than block count.
