"""Block structure, proof-of-work mining, and chain selection for Chapter 4.

This is an educational model. It keeps the *shape* of a real protocol -- a
header that commits to a body, a previous-header link, a target threshold, and
a cumulative-work selection rule -- while omitting signatures, a real
transaction format, networking, and difficulty retargeting. It is not a
drop-in implementation of Bitcoin or any other protocol.
"""

from __future__ import annotations

import hashlib
from collections.abc import Sequence
from dataclasses import dataclass, field

Hash = bytes


def sha256d(data: bytes) -> Hash:
    """Return the double SHA-256 digest, as Bitcoin uses for headers."""
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()


def merkle_root(items: Sequence[bytes]) -> Hash:
    """Reduce ordered transactions to one root, duplicating an odd last node.

    The duplication rule mirrors Bitcoin's construction. It is a protocol
    choice, not a property of the hash function.
    """
    if not items:
        return b"\x00" * 32
    level = [sha256d(item) for item in items]
    while len(level) > 1:
        if len(level) % 2 == 1:
            level.append(level[-1])
        level = [sha256d(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
    return level[0]


@dataclass(frozen=True)
class Header:
    """The small, fixed set of fields that the proof rule actually acts on."""

    previous_hash: Hash
    merkle_root: Hash
    timestamp: int
    difficulty_bits: int
    nonce: int = 0

    def serialize(self) -> bytes:
        """Produce the exact bytes that get hashed.

        Field order and widths are part of the rules: two nodes that serialize
        differently will compute different header hashes from the same values.
        """
        return b"".join(
            [
                self.previous_hash,
                self.merkle_root,
                self.timestamp.to_bytes(8, "little"),
                self.difficulty_bits.to_bytes(4, "little"),
                self.nonce.to_bytes(8, "little"),
            ]
        )

    def hash(self) -> Hash:
        return sha256d(self.serialize())


@dataclass
class Block:
    header: Header
    transactions: list[bytes] = field(default_factory=list)

    def hash(self) -> Hash:
        return self.header.hash()


def target_from_bits(difficulty_bits: int) -> int:
    """Return the threshold a header hash must fall below.

    More leading zero bits means a smaller target and more expected attempts.
    """
    return (1 << (256 - difficulty_bits)) - 1


def work_of(difficulty_bits: int) -> int:
    """Return the expected number of attempts for one block at this difficulty.

    Chain selection compares summed work, not block count, so a longer chain of
    easy blocks does not automatically win.
    """
    return 1 << difficulty_bits


def meets_target(header: Header) -> bool:
    return int.from_bytes(header.hash(), "big") <= target_from_bits(
        header.difficulty_bits
    )


def mine(
    previous_hash: Hash,
    transactions: Sequence[bytes],
    timestamp: int,
    difficulty_bits: int,
    start_nonce: int = 0,
) -> tuple[Block, int]:
    """Search for a nonce whose header hash falls below the target.

    Returns the block and the number of attempts made. Only the nonce changes,
    so every attempt is an independent trial against a fixed body.
    """
    root = merkle_root(list(transactions))
    nonce = start_nonce
    attempts = 0
    while True:
        header = Header(previous_hash, root, timestamp, difficulty_bits, nonce)
        attempts += 1
        if meets_target(header):
            return Block(header, list(transactions)), attempts
        nonce += 1


def validate_link(parent: Block, child: Block) -> bool:
    """Check the three things a node checks before extending its chain."""
    if child.header.previous_hash != parent.hash():
        return False
    if child.header.merkle_root != merkle_root(child.transactions):
        return False
    return meets_target(child.header)


def total_work(chain: Sequence[Block]) -> int:
    return sum(work_of(block.header.difficulty_bits) for block in chain)


def select_chain(candidates: Sequence[Sequence[Block]]) -> Sequence[Block]:
    """Apply the selection rule: most cumulative work wins, not most blocks."""
    return max(candidates, key=total_work)


GENESIS = Block(
    Header(b"\x00" * 32, merkle_root([b"genesis"]), 1_700_000_000, 8, 0),
    [b"genesis"],
)


def build_chain(
    tip: Block, bodies: Sequence[Sequence[bytes]], difficulty_bits: int, timestamp: int
) -> list[Block]:
    """Mine a sequence of blocks onto a tip, returning the blocks added."""
    chain = []
    parent = tip
    for offset, body in enumerate(bodies):
        block, _ = mine(parent.hash(), body, timestamp + offset, difficulty_bits)
        chain.append(block)
        parent = block
    return chain


def main() -> None:
    print("Block and header demonstration")
    body = [b"tx: A pays B", b"tx: C pays D", b"tx: E pays F"]
    block, attempts = mine(GENESIS.hash(), body, 1_700_000_600, 12)
    print(f"  merkle root:  {block.header.merkle_root.hex()[:32]}...")
    print(f"  header hash:  {block.hash().hex()[:32]}...")
    print(f"  nonce found:  {block.header.nonce}")
    print(f"  attempts:     {attempts}")
    print(f"  serialized header is {len(block.header.serialize())} bytes")

    print("\nTampering demonstration")
    tampered = Block(block.header, [b"tx: A pays Z", b"tx: C pays D", b"tx: E pays F"])
    print(f"  link still valid: {validate_link(GENESIS, tampered)}")

    print("\nChain selection demonstration")
    # Branch one: three blocks at low difficulty. Branch two: two harder blocks.
    branch_a = build_chain(GENESIS, [[b"a1"], [b"a2"], [b"a3"]], 8, 1_700_001_000)
    branch_b = build_chain(GENESIS, [[b"b1"], [b"b2"]], 12, 1_700_001_000)
    print(f"  branch A: {len(branch_a)} blocks, work {total_work(branch_a)}")
    print(f"  branch B: {len(branch_b)} blocks, work {total_work(branch_b)}")
    chosen = select_chain([branch_a, branch_b])
    print(f"  selected:  branch {'A' if chosen is branch_a else 'B'} (more work)")
    print(f"  longer by block count: branch {'A' if len(branch_a) > len(branch_b) else 'B'}")


if __name__ == "__main__":
    main()
