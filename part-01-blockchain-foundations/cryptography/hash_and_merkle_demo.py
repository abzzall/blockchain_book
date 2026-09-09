"""Deterministic SHA-256 and Merkle-proof examples for Chapter 3.

This is an educational, domain-separated Merkle tree. It is not Bitcoin's
transaction-tree serialization and should not be used as a drop-in protocol
implementation.
"""

from __future__ import annotations

import hashlib
import hmac
from collections.abc import Sequence

Hash = bytes
ProofStep = tuple[Hash, str]


def sha256(data: bytes) -> Hash:
    """Return the 32-byte SHA-256 digest of data."""
    return hashlib.sha256(data).digest()


def hash_leaf(data: bytes) -> Hash:
    """Hash a leaf with a prefix that distinguishes it from an inner node."""
    return sha256(b"\x00" + data)


def hash_parent(left: Hash, right: Hash) -> Hash:
    """Hash an ordered pair of child hashes with an inner-node prefix."""
    return sha256(b"\x01" + left + right)


def next_level(level: Sequence[Hash]) -> list[Hash]:
    """Build the next level, duplicating the final hash when the count is odd."""
    work = list(level)
    if len(work) % 2:
        work.append(work[-1])
    return [hash_parent(work[i], work[i + 1]) for i in range(0, len(work), 2)]


def merkle_root(items: Sequence[bytes]) -> Hash:
    """Return the Merkle root for one or more byte strings."""
    if not items:
        raise ValueError("a Merkle tree needs at least one item")
    level = [hash_leaf(item) for item in items]
    while len(level) > 1:
        level = next_level(level)
    return level[0]


def merkle_proof(items: Sequence[bytes], index: int) -> list[ProofStep]:
    """Return sibling hashes and their sides for the item at index."""
    if not items:
        raise ValueError("a Merkle tree needs at least one item")
    if not 0 <= index < len(items):
        raise IndexError("item index is outside the tree")

    proof: list[ProofStep] = []
    level = [hash_leaf(item) for item in items]
    position = index
    while len(level) > 1:
        if len(level) % 2:
            level.append(level[-1])
        sibling_position = position - 1 if position % 2 else position + 1
        sibling_side = "left" if sibling_position < position else "right"
        proof.append((level[sibling_position], sibling_side))
        level = next_level(level)
        position //= 2
    return proof


def verify_proof(item: bytes, proof: Sequence[ProofStep], expected_root: Hash) -> bool:
    """Reconstruct a root from item and proof, then compare it safely."""
    current = hash_leaf(item)
    for sibling, sibling_side in proof:
        if sibling_side == "left":
            current = hash_parent(sibling, current)
        elif sibling_side == "right":
            current = hash_parent(current, sibling)
        else:
            raise ValueError(f"unknown sibling side: {sibling_side}")
    return hmac.compare_digest(current, expected_root)


def differing_bits(left: Hash, right: Hash) -> int:
    """Count bit positions that differ between equal-length byte strings."""
    if len(left) != len(right):
        raise ValueError("inputs must have equal length")
    return sum((a ^ b).bit_count() for a, b in zip(left, right, strict=True))


def main() -> None:
    original = "Alice pays Bob 5 units".encode("utf-8")
    altered = "Alice pays Bob 6 units".encode("utf-8")
    original_hash = sha256(original)
    altered_hash = sha256(altered)

    print("SHA-256 demonstration")
    print(f"original: {original_hash.hex()}")
    print(f"altered:  {altered_hash.hex()}")
    print(f"different digest bits: {differing_bits(original_hash, altered_hash)} / 256")

    transactions = [b"Tx A", b"Tx B", b"Tx C", b"Tx D"]
    root = merkle_root(transactions)
    proof = merkle_proof(transactions, 2)
    print("\nMerkle demonstration")
    print(f"root: {root.hex()}")
    print(f"proof hashes for Tx C: {len(proof)}")
    print(f"valid proof: {verify_proof(b'Tx C', proof, root)}")
    print(f"tampered item: {verify_proof(b'Tx X', proof, root)}")


if __name__ == "__main__":
    main()
