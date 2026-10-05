# Schnorr proof-of-knowledge exercise

## Outcome

Generate and verify a small Schnorr-style proof of knowledge, show that the
proof is bound to its public statement, and recover the secret after an
intentionally reused nonce.

## Safety and environment

The exercise is local, uses no network, wallet, account, or funds, and uses a
tiny public group that is insecure by design. Do not reuse this code for real
cryptography.

## Verified versions

Verified with Python 3.12.3 on 2026-10-05. The code uses only the Python standard
library.

## Files supplied

- `zk_proof.py` implements the model and prints the fixed demonstration.
- `test_zk_proof.py` checks valid, altered, and nonce-reuse cases.
- `RESULTS.md` names the values and explanations to record.
- `verify_results.py` reruns the tests and checks the required outcomes.

## Command-line work

```bash
python3 zk_proof.py
python3 -m unittest -v
python3 verify_results.py
```

## Interactive work

1. Run the demonstration and record the public key, commitment, challenge, and response.
2. Confirm `valid=True`; the response satisfies the verifier equation.
3. Confirm `tampered_valid=False`; changing the statement changes the challenge.
4. Confirm `recovered_secret=7`; nonce reuse makes the secret recoverable.

## What to record

Fill the values in `RESULTS.md` exactly as printed by `zk_proof.py`.

## What to explain

Explain why the ordinary transcript does not directly reveal the witness, why
the public statement is included in the challenge, and why nonce reuse destroys secrecy.

## Verification

Run `python3 verify_results.py`. It reruns all tests and checks the three required outcomes.

## Troubleshooting and reset

Run the commands from this directory. There are no dependencies or generated
state to reset; restore edited constants from Git if necessary.
