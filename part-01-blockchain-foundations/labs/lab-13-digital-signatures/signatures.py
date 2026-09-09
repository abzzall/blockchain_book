"""Digital signatures over secp256k1 for the Part I laboratory.

Implements the two operations Chapter 3 describes in prose --- signing a
message with a private key and verifying that signature against the matching
public key --- and then the failure that Chapter 5 warns about: what an
observer can compute when one signing nonce is used twice.

Everything here uses only the Python standard library. The arithmetic is
written to be read, not to be fast, and it is not constant time.

SAFETY: every key in this file and its tests is either a published test vector
or generated from a fixed constant in the file. All of them are public by
definition. Never sign with a key that controls real value using this code.
"""

from __future__ import annotations

import hashlib
import hmac
from dataclasses import dataclass

# secp256k1 domain parameters. These are public constants of the curve.
P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
G = (
    0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798,
    0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8,
)

Point = tuple[int, int] | None

# The key used throughout the laboratory. It is a published test value, chosen
# so that every student and every marker computes exactly the same signatures.
LAB_KEY = 0x18E14A7B6A307F426A94F8114701E7C8E774E7F9A47E2C2035DB29A206321725


def point_add(a: Point, b: Point) -> Point:
    """Add two curve points, treating None as the point at infinity."""
    if a is None:
        return b
    if b is None:
        return a
    if a[0] == b[0] and (a[1] + b[1]) % P == 0:
        return None
    if a == b:
        slope = 3 * a[0] * a[0] * pow(2 * a[1], -1, P) % P
    else:
        slope = (b[1] - a[1]) * pow(b[0] - a[0], -1, P) % P
    x = (slope * slope - a[0] - b[0]) % P
    return (x, (slope * (a[0] - x) - a[1]) % P)


def point_mul(k: int, point: Point = G) -> Point:
    """Double-and-add scalar multiplication."""
    k %= N
    if k == 0:
        return None
    result: Point = None
    addend = point
    while k:
        if k & 1:
            result = point_add(result, addend)
        addend = point_add(addend, addend)
        k >>= 1
    return result


def is_on_curve(point: Point) -> bool:
    if point is None:
        return True
    x, y = point
    return (y * y - x * x * x - 7) % P == 0


def public_key(private_key: int) -> Point:
    """A public key is the private key times the generator, and nothing else."""
    if not 1 <= private_key < N:
        raise ValueError("a private key must be an integer in [1, n-1]")
    return point_mul(private_key)


def serialize_point(point: Point) -> bytes:
    """33-byte compressed form: a parity byte, then x."""
    if point is None:
        raise ValueError("the point at infinity has no encoding")
    x, y = point
    return bytes([2 + (y & 1)]) + x.to_bytes(32, "big")


def message_hash(message: str) -> int:
    """Signing operates on a hash of the message, never the message itself."""
    digest = hashlib.sha256(message.encode("utf-8")).digest()
    return int.from_bytes(digest, "big")


@dataclass(frozen=True)
class Signature:
    r: int
    s: int

    def hex(self) -> str:
        return f"{self.r:064x}{self.s:064x}"


def deterministic_nonce(private_key: int, z: int) -> int:
    """RFC 6979.

    The nonce is derived from the key and the message rather than drawn from an
    entropy source. Two different messages therefore cannot share a nonce, and
    the same message signed twice produces byte-identical output.
    """
    key_bytes = private_key.to_bytes(32, "big")
    hash_bytes = z.to_bytes(32, "big")
    v = b"\x01" * 32
    k = b"\x00" * 32

    def mac(key: bytes, *chunks: bytes) -> bytes:
        return hmac.new(key, b"".join(chunks), hashlib.sha256).digest()

    k = mac(k, v, b"\x00", key_bytes, hash_bytes)
    v = mac(k, v)
    k = mac(k, v, b"\x01", key_bytes, hash_bytes)
    v = mac(k, v)
    while True:
        v = mac(k, v)
        candidate = int.from_bytes(v, "big")
        if 1 <= candidate < N:
            return candidate
        k = mac(k, v, b"\x00")
        v = mac(k, v)


def sign_with_nonce(private_key: int, message: str, nonce: int) -> Signature:
    """Sign using a caller-supplied nonce.

    Exposed only so the laboratory can demonstrate what reusing one costs.
    Production code must never let the caller choose this value.
    """
    if not 1 <= nonce < N:
        raise ValueError("the nonce must be an integer in [1, n-1]")
    z = message_hash(message)
    point = point_mul(nonce)
    assert point is not None
    r = point[0] % N
    if r == 0:
        raise ValueError("degenerate nonce, choose another")
    s = pow(nonce, -1, N) * (z + r * private_key) % N
    if s == 0:
        raise ValueError("degenerate nonce, choose another")
    return Signature(r, s)


def sign(private_key: int, message: str) -> Signature:
    """Sign with a deterministic nonce, which is what real wallets do."""
    z = message_hash(message)
    return sign_with_nonce(private_key, message, deterministic_nonce(private_key, z))


def verify(point: Point, message: str, signature: Signature) -> bool:
    """Check a signature against a public key.

    Verification never sees the private key. That asymmetry is the whole
    property being relied on.
    """
    if point is None or not 1 <= signature.r < N or not 1 <= signature.s < N:
        return False
    z = message_hash(message)
    s_inverse = pow(signature.s, -1, N)
    candidate = point_add(
        point_mul(z * s_inverse % N),
        point_mul(signature.r * s_inverse % N, point),
    )
    if candidate is None:
        return False
    return candidate[0] % N == signature.r


def recover_nonce(first: Signature, second: Signature, z1: int, z2: int) -> int:
    """Recover the shared nonce from two signatures that reused one.

    Both signatures share r, because r depends only on the nonce. Subtracting
    the two s values eliminates the private key and leaves the nonce.
    """
    if first.r != second.r:
        raise ValueError("these signatures do not share a nonce")
    if first.s == second.s:
        raise ValueError("identical signatures reveal nothing")
    return (z1 - z2) * pow(first.s - second.s, -1, N) % N


def recover_private_key(signature: Signature, z: int, nonce: int) -> int:
    """Recover the private key once the nonce is known.

    Rearranging s = k^-1 (z + r*d) for d needs nothing secret.
    """
    return (signature.s * nonce - z) * pow(signature.r, -1, N) % N
