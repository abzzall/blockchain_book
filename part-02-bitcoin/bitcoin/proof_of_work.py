"""Bitcoin's proof-of-work arithmetic for Chapter 8.

This implements the real consensus rules rather than an analogy:

  * the compact "nBits" encoding of a target, as `arith_uint256::SetCompact`
    decodes it;
  * the proof-of-work check from `CheckProofOfWork` -- the header hash,
    read in Bitcoin's internal little-endian integer convention, must not
    exceed the target;
  * difficulty as the ratio of the easiest permitted target to the current one;
  * the retarget rule from `CalculateNextWorkRequired`, including the clamp
    that limits any single adjustment to a factor of four.

The tests verify the arithmetic against the genesis block. The deliberately
easy mining demonstration uses a target above mainnet's proof-of-work limit so
the same hash-and-compare operation can finish quickly offline.

No network access, node, wallet, key, or funds are required.
"""

from __future__ import annotations

from dataclasses import dataclass

from utxo_and_script import sha256d

# Mainnet consensus parameters.
POW_LIMIT = 0x00000000FFFF0000000000000000000000000000000000000000000000000000
POW_TARGET_TIMESPAN = 14 * 24 * 60 * 60  # two weeks, in seconds
POW_TARGET_SPACING = 10 * 60  # ten minutes, in seconds
RETARGET_INTERVAL = POW_TARGET_TIMESPAN // POW_TARGET_SPACING  # 2016 blocks

GENESIS_BITS = 0x1D00FFFF


def target_from_bits(bits: int) -> int:
    """Decode the compact representation of a target.

    The top byte is an exponent giving the size in bytes; the low three bytes
    are the mantissa. This packs a 256-bit threshold into the header's four
    bytes, at the cost of storing only the leading significant digits.
    """
    exponent = bits >> 24
    mantissa = bits & 0x007FFFFF
    if bits & 0x00800000:  # the sign bit; never set in valid headers
        raise ValueError("negative target")
    if mantissa == 0:
        raise ValueError("zero target")
    if exponent > 34 or (mantissa > 0xFF and exponent > 33) or (
        mantissa > 0xFFFF and exponent > 32
    ):
        raise ValueError("target overflows 256 bits")
    if exponent <= 3:
        return mantissa >> (8 * (3 - exponent))
    return mantissa << (8 * (exponent - 3))


def bits_from_target(target: int) -> int:
    """Re-encode a target compactly, as the retarget rule must."""
    if target == 0:
        return 0
    raw = target.to_bytes((target.bit_length() + 7) // 8, "big")
    if raw[0] & 0x80:  # avoid the sign bit by shifting one byte right
        raw = b"\x00" + raw
    exponent = len(raw)
    mantissa = int.from_bytes(raw[:3].ljust(3, b"\x00"), "big")
    return (exponent << 24) | mantissa


def difficulty(bits: int) -> float:
    """Return difficulty: how much harder this target is than the easiest one.

    Difficulty 1 is the genesis target. The value is a ratio, so it is a
    convenience for humans rather than something the protocol itself uses.
    """
    return POW_LIMIT / target_from_bits(bits)


def expected_attempts(bits: int) -> float:
    """Return the mean number of hashes needed to find one valid header.

    Each attempt is an independent trial succeeding with probability
    (target + 1) / 2**256, so the expected count is the reciprocal.
    """
    return 2**256 / (target_from_bits(bits) + 1)


def meets_target(header_hash: bytes, bits: int, pow_limit: int | None = None) -> bool:
    """Check a header hash against a decoded target.

    The hash argument is in internal byte order, and Bitcoin reads a 256-bit
    hash as a *little-endian* number. That is why a valid block hash has its
    leading zeros at the end of the internal bytes and at the start of the
    reversed form explorers display.

    Passing a network's ``pow_limit`` also enforces its network-specific bound.
    The teaching miner omits it so it can use a quickly searchable target.
    """
    target = target_from_bits(bits)
    if pow_limit is not None and target > pow_limit:
        return False
    return int.from_bytes(header_hash, "little") <= target


def next_bits(previous_bits: int, actual_timespan: int) -> int:
    """Apply the retarget rule to produce the next period's target.

    The clamp is the part most often omitted from simplified accounts: no
    single retarget may change the target by more than a factor of four in
    either direction, which bounds how fast difficulty can move.
    """
    clamped = max(
        POW_TARGET_TIMESPAN // 4, min(POW_TARGET_TIMESPAN * 4, actual_timespan)
    )
    target = target_from_bits(previous_bits) * clamped // POW_TARGET_TIMESPAN
    return bits_from_target(min(target, POW_LIMIT))


def was_clamped(actual_timespan: int) -> bool:
    """Report whether the clamp bound this adjustment."""
    return not (
        POW_TARGET_TIMESPAN // 4 <= actual_timespan <= POW_TARGET_TIMESPAN * 4
    )


@dataclass(frozen=True)
class Header:
    """The 80 bytes a miner varies and every node checks."""

    version: int
    prev_hash: bytes
    merkle_root: bytes
    time: int
    bits: int
    nonce: int

    def serialize(self) -> bytes:
        return (
            self.version.to_bytes(4, "little")
            + self.prev_hash
            + self.merkle_root
            + self.time.to_bytes(4, "little")
            + self.bits.to_bytes(4, "little")
            + self.nonce.to_bytes(4, "little")
        )

    def hash(self) -> bytes:
        """Internal byte order, as the consensus check uses it."""
        return sha256d(self.serialize())

    def display_hash(self) -> str:
        return self.hash()[::-1].hex()

    def is_valid(self) -> bool:
        return meets_target(self.hash(), self.bits)


def mine(header: Header, max_attempts: int = 5_000_000) -> tuple[Header | None, int]:
    """Search for a nonce satisfying the target, returning attempts made.

    Only the nonce changes, so every attempt is an independent trial against
    an otherwise fixed header. There is no strategy better than trying again.
    """
    for attempt in range(max_attempts):
        candidate = Header(
            header.version,
            header.prev_hash,
            header.merkle_root,
            header.time,
            header.bits,
            attempt,
        )
        if candidate.is_valid():
            return candidate, attempt + 1
    return None, max_attempts


def main() -> None:
    print("The compact target encoding")
    target = target_from_bits(GENESIS_BITS)
    print(f"  nBits 0x{GENESIS_BITS:08x}")
    print(f"  target  {target:064x}")
    print(f"  difficulty {difficulty(GENESIS_BITS):.0f}")
    print(f"  expected attempts {expected_attempts(GENESIS_BITS):,.0f}")

    print("\nChecking the genesis block against its own target")
    genesis = Header(
        version=1,
        prev_hash=b"\x00" * 32,
        merkle_root=bytes.fromhex(
            "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b"
        )[::-1],
        time=1231006505,
        bits=GENESIS_BITS,
        nonce=2083236893,
    )
    print(f"  hash   {genesis.display_hash()}")
    print(f"  valid  {genesis.is_valid()}")
    print(f"  Its nonce, {genesis.nonce:,}, was found by exhaustive search.")

    print("\nHarder targets cost proportionally more")
    for bits in (0x1F00FFFF, 0x1E00FFFF, 0x1D00FFFF, 0x1C00FFFF):
        print(
            f"  0x{bits:08x}  difficulty {difficulty(bits):>14,.6g}"
            f"  expected attempts {expected_attempts(bits):>18,.0f}"
        )

    print("\nMining at a deliberately easy target")
    easy = Header(1, b"\x00" * 32, b"\x11" * 32, 1_700_000_000, 0x1F00FFFF, 0)
    found, attempts = mine(easy)
    if found:
        print(f"  nonce {found.nonce:,} after {attempts:,} attempts")
        print(f"  hash  {found.display_hash()}")
        print(f"  expected about {expected_attempts(0x1F00FFFF):,.0f} attempts")
        print("  A single sample can land far from the mean; that is normal.")

    print("\nRetargeting")
    two_weeks = POW_TARGET_TIMESPAN
    # Start from a target well below the limit, so difficulty can move down
    # as well as up. Genesis already sits at the easiest permitted target.
    start = 0x1C00FFFF
    cases = [
        ("exactly on schedule", two_weeks),
        ("blocks came twice as fast", two_weeks // 2),
        ("blocks came twice as slow", two_weeks * 2),
        ("absurdly fast (clamped)", two_weeks // 100),
        ("absurdly slow (clamped)", two_weeks * 100),
    ]
    for label, actual in cases:
        new = next_bits(start, actual)
        ratio = difficulty(new) / difficulty(start)
        flag = "   <- clamp bound this" if was_clamped(actual) else ""
        print(f"  {label:<28} difficulty x{ratio:.4f}{flag}")
    print("  No single retarget may move the target by more than a factor of four.")


if __name__ == "__main__":
    main()
