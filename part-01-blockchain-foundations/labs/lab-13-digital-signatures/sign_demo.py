"""Command line for the Part I signature laboratory.

Usage:
    python3 sign_demo.py keys
    python3 sign_demo.py sign "transfer 10 to alice"
    python3 sign_demo.py tamper "transfer 10 to alice" "transfer 10 to bob"
    python3 sign_demo.py reuse
"""

from __future__ import annotations

import sys

from signatures import (
    LAB_KEY,
    message_hash,
    public_key,
    recover_nonce,
    recover_private_key,
    serialize_point,
    sign,
    sign_with_nonce,
    verify,
)

REUSED_NONCE = 0x00000000000000000000000000000000000000000000DEADBEEF12345678CAFE
FIRST_MESSAGE = "pay alice 1"
SECOND_MESSAGE = "pay bob 2"


def show_keys() -> None:
    point = public_key(LAB_KEY)
    print(f"private key (public test value) : {LAB_KEY:064x}")
    print(f"public key x                    : {point[0]:064x}")
    print(f"public key y                    : {point[1]:064x}")
    print(f"public key, compressed          : {serialize_point(point).hex()}")
    print()
    print("The private key is one number. The public key is that number times")
    print("the generator. Going forward is a few hundred additions; going back")
    print("is the discrete logarithm problem, and nobody knows how.")


def show_sign(message: str) -> None:
    point = public_key(LAB_KEY)
    signature = sign(LAB_KEY, message)
    print(f"message        : {message!r}")
    print(f"sha-256 of it  : {message_hash(message):064x}")
    print(f"signature r    : {signature.r:064x}")
    print(f"signature s    : {signature.s:064x}")
    print(f"signature      : {signature.hex()}")
    print(f"verifies       : {verify(point, message, signature)}")
    print()
    print("Sign the same message again and the output is identical: the nonce")
    print("is derived from the key and the message, not drawn at random.")
    print(f"identical twice: {sign(LAB_KEY, message) == signature}")


def show_tamper(original: str, altered: str) -> None:
    point = public_key(LAB_KEY)
    signature = sign(LAB_KEY, original)
    print(f"signed        : {original!r}")
    print(f"signature     : {signature.hex()}")
    print()
    print(f"verify against {original!r}: {verify(point, original, signature)}")
    print(f"verify against {altered!r}: {verify(point, altered, signature)}")
    print()
    print("The signature is over the hash of exact bytes. Change one byte and")
    print("the hash is unrelated, so the verification equation no longer holds.")


def show_reuse() -> None:
    point = public_key(LAB_KEY)
    first = sign_with_nonce(LAB_KEY, FIRST_MESSAGE, REUSED_NONCE)
    second = sign_with_nonce(LAB_KEY, SECOND_MESSAGE, REUSED_NONCE)

    print("Two signatures by the same key, over different messages, using the")
    print("same nonce. Both are valid signatures.")
    print()
    print(f"message 1 : {FIRST_MESSAGE!r}")
    print(f"  r       : {first.r:064x}")
    print(f"  s       : {first.s:064x}")
    print(f"  valid   : {verify(point, FIRST_MESSAGE, first)}")
    print(f"message 2 : {SECOND_MESSAGE!r}")
    print(f"  r       : {second.r:064x}")
    print(f"  s       : {second.s:064x}")
    print(f"  valid   : {verify(point, SECOND_MESSAGE, second)}")
    print()
    print(f"the two r values are equal : {first.r == second.r}")
    print()
    print("r depends only on the nonce, so a shared nonce is visible to anyone")
    print("holding both signatures. From here nothing secret is needed.")
    print()

    z1 = message_hash(FIRST_MESSAGE)
    z2 = message_hash(SECOND_MESSAGE)
    nonce = recover_nonce(first, second, z1, z2)
    recovered = recover_private_key(first, z1, nonce)

    print(f"recovered nonce       : {nonce:064x}")
    print(f"recovered private key : {recovered:064x}")
    print(f"actual private key    : {LAB_KEY:064x}")
    print(f"the key was recovered : {recovered == LAB_KEY}")
    print()
    print("Everything above the recovery used only public data: two signatures")
    print("and the two messages they signed.")


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 1
    command = argv[1]
    if command == "keys":
        show_keys()
    elif command == "sign":
        show_sign(argv[2] if len(argv) > 2 else "transfer 10 to alice")
    elif command == "tamper":
        original = argv[2] if len(argv) > 2 else "transfer 10 to alice"
        altered = argv[3] if len(argv) > 3 else "transfer 10 to bob"
        show_tamper(original, altered)
    elif command == "reuse":
        show_reuse()
    else:
        print(__doc__)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
