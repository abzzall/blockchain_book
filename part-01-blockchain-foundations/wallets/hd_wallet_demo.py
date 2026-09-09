"""Hierarchical deterministic key derivation for Chapter 5.

Implements BIP-39 (mnemonic to seed), BIP-32 (hierarchical deterministic
derivation), and BIP-44 path structure using only the Python standard library.
It is verified against the official test vectors published in those documents.

SAFETY: every key in this file and its tests comes from a published test
vector. Published vectors are public by definition. Never place funds in any
address derived from them, and never paste a real recovery phrase into this or
any other program.
"""

from __future__ import annotations

import hashlib
import hmac
from dataclasses import dataclass

try:  # OpenSSL 3 disables RIPEMD-160 by default.
    hashlib.new("ripemd160", b"")

    def ripemd160(data: bytes) -> bytes:
        return hashlib.new("ripemd160", data).digest()

except ValueError:  # pragma: no cover - depends on the local OpenSSL build
    from ripemd160 import ripemd160

# secp256k1 domain parameters, as used by Bitcoin and Ethereum.
P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
G = (
    0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798,
    0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8,
)

Point = tuple[int, int] | None


def point_add(a: Point, b: Point) -> Point:
    """Add two points on the curve."""
    if a is None:
        return b
    if b is None:
        return a
    if a[0] == b[0] and (a[1] + b[1]) % P == 0:
        return None
    if a == b:
        lam = (3 * a[0] * a[0]) * pow(2 * a[1], P - 2, P) % P
    else:
        lam = (b[1] - a[1]) * pow(b[0] - a[0], P - 2, P) % P
    x = (lam * lam - a[0] - b[0]) % P
    return (x, (lam * (a[0] - x) - a[1]) % P)


def point_mul(k: int, point: Point = G) -> Point:
    """Multiply a point by a scalar using double-and-add."""
    result: Point = None
    addend = point
    while k:
        if k & 1:
            result = point_add(result, addend)
        addend = point_add(addend, addend)
        k >>= 1
    return result


def serialize_point(point: Point) -> bytes:
    """Encode a public key in SEC1 compressed form, as BIP-32 requires."""
    assert point is not None
    prefix = b"\x03" if point[1] & 1 else b"\x02"
    return prefix + point[0].to_bytes(32, "big")


def hash160(data: bytes) -> bytes:
    return ripemd160(hashlib.sha256(data).digest())


# --- BIP-39: mnemonic to seed ------------------------------------------------

def mnemonic_to_seed(mnemonic: str, passphrase: str = "") -> bytes:
    """Stretch a mnemonic into a 64-byte seed.

    BIP-39 fixes every parameter here: PBKDF2 with HMAC-SHA512, 2048
    iterations, and the salt "mnemonic" concatenated with the passphrase. The
    passphrase changes the salt, so a different passphrase yields an entirely
    different and equally valid wallet.
    """
    return hashlib.pbkdf2_hmac(
        "sha512",
        mnemonic.encode("utf-8"),
        ("mnemonic" + passphrase).encode("utf-8"),
        2048,
        dklen=64,
    )


# --- BIP-32: hierarchical deterministic derivation ---------------------------

HARDENED = 0x80000000


@dataclass(frozen=True)
class ExtendedKey:
    """A private key plus the chain code that extends it."""

    key: bytes
    chain_code: bytes
    depth: int = 0
    parent_fingerprint: bytes = b"\x00\x00\x00\x00"
    child_number: int = 0

    @property
    def secret(self) -> int:
        return int.from_bytes(self.key, "big")

    def public_key(self) -> bytes:
        return serialize_point(point_mul(self.secret))

    def fingerprint(self) -> bytes:
        return hash160(self.public_key())[:4]


def master_key(seed: bytes) -> ExtendedKey:
    """Derive the root key from a seed.

    The HMAC key is the fixed ASCII string "Bitcoin seed": the seed is the
    message, not the key.
    """
    digest = hmac.new(b"Bitcoin seed", seed, hashlib.sha512).digest()
    return ExtendedKey(key=digest[:32], chain_code=digest[32:])


def derive_child(parent: ExtendedKey, index: int) -> ExtendedKey:
    """Derive one child key.

    A hardened index (>= 2**31) feeds the parent *private* key into the HMAC,
    which is why hardened children cannot be derived from a public key alone.
    A normal index feeds the parent public key, which is what allows a server
    to generate receiving addresses without holding any private key.
    """
    if index >= HARDENED:
        data = b"\x00" + parent.key + index.to_bytes(4, "big")
    else:
        data = parent.public_key() + index.to_bytes(4, "big")

    digest = hmac.new(parent.chain_code, data, hashlib.sha512).digest()
    offset = int.from_bytes(digest[:32], "big")
    child_secret = (offset + parent.secret) % N
    if offset >= N or child_secret == 0:  # pragma: no cover - negligible odds
        raise ValueError("invalid child key; proceed to the next index")

    return ExtendedKey(
        key=child_secret.to_bytes(32, "big"),
        chain_code=digest[32:],
        depth=parent.depth + 1,
        parent_fingerprint=parent.fingerprint(),
        child_number=index,
    )


def parse_path(path: str) -> list[int]:
    """Turn a BIP-44 path such as m/44'/0'/0'/0/0 into child indices."""
    parts = path.strip().split("/")
    if parts[0] not in ("m", "M"):
        raise ValueError("path must start with m")
    indices = []
    for part in parts[1:]:
        hardened = part.endswith(("'", "h", "H"))
        indices.append(int(part.rstrip("'hH")) + (HARDENED if hardened else 0))
    return indices


def derive_path(root: ExtendedKey, path: str) -> ExtendedKey:
    node = root
    for index in parse_path(path):
        node = derive_child(node, index)
    return node


# --- Serialization -----------------------------------------------------------

_B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
VERSION_PRIVATE = bytes.fromhex("0488ADE4")  # xprv
VERSION_PUBLIC = bytes.fromhex("0488B21E")  # xpub


def base58check(payload: bytes) -> str:
    """Encode with the four-byte checksum that makes typos detectable."""
    checksum = hashlib.sha256(hashlib.sha256(payload).digest()).digest()[:4]
    number = int.from_bytes(payload + checksum, "big")
    encoded = ""
    while number:
        number, remainder = divmod(number, 58)
        encoded = _B58[remainder] + encoded
    leading = len(payload + checksum) - len((payload + checksum).lstrip(b"\x00"))
    return "1" * leading + encoded


def serialize(node: ExtendedKey, private: bool) -> str:
    """Produce the xprv or xpub string defined by BIP-32."""
    version = VERSION_PRIVATE if private else VERSION_PUBLIC
    body = b"".join(
        [
            version,
            bytes([node.depth]),
            node.parent_fingerprint,
            node.child_number.to_bytes(4, "big"),
            node.chain_code,
            b"\x00" + node.key if private else node.public_key(),
        ]
    )
    return base58check(body)


def p2pkh_address(public_key: bytes) -> str:
    """Derive a legacy Bitcoin address from a compressed public key."""
    return base58check(b"\x00" + hash160(public_key))


# --- Demonstration -----------------------------------------------------------

# The all-"abandon" mnemonic is the published BIP-39 test vector. It is public.
TEST_MNEMONIC = " ".join(["abandon"] * 11 + ["about"])


def main() -> None:
    print("BIP-39: mnemonic to seed")
    print(f"  mnemonic:   {TEST_MNEMONIC[:44]}...")
    seed = mnemonic_to_seed(TEST_MNEMONIC, "TREZOR")
    print(f"  seed:       {seed.hex()[:48]}...")

    print("\n  The passphrase changes the salt, so it changes everything:")
    other = mnemonic_to_seed(TEST_MNEMONIC, "different")
    print(f"  seed:       {other.hex()[:48]}...")
    print(f"  same mnemonic, different wallet: {seed != other}")

    print("\nBIP-32: one seed, a tree of keys")
    root = master_key(mnemonic_to_seed(TEST_MNEMONIC))
    print(f"  root xprv:  {serialize(root, private=True)[:40]}...")

    print("\nBIP-44: the standard account path m/44'/0'/0'/0/i")
    for index in range(3):
        node = derive_path(root, f"m/44'/0'/0'/0/{index}")
        print(f"  address {index}:  {p2pkh_address(node.public_key())}")

    print("\n  Every address above came from the one seed.")
    print("  Losing the seed loses all of them; leaking it leaks all of them.")

    print("\nHardened versus normal derivation")
    account = derive_path(root, "m/44'/0'/0'")
    external = derive_child(account, 0)
    print(f"  account fingerprint: {account.fingerprint().hex()}")
    print(f"  external chain xpub: {serialize(external, private=False)[:40]}...")
    print("  Sharing that xpub reveals future addresses, not the private keys.")


if __name__ == "__main__":
    main()
