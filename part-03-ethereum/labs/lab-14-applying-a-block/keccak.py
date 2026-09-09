"""Keccak-256 as Ethereum uses it, from the standard library only.

Ethereum hashes with the original Keccak padding rather than the NIST SHA-3
padding finalised afterwards, so `hashlib.sha3_256` is a different function and
cannot be substituted here. The only difference is one padding byte.
"""

from __future__ import annotations

ROUND_CONSTANTS = [
    0x0000000000000001, 0x0000000000008082, 0x800000000000808A, 0x8000000080008000,
    0x000000000000808B, 0x0000000080000001, 0x8000000080008081, 0x8000000000008009,
    0x000000000000008A, 0x0000000000000088, 0x0000000080008009, 0x000000008000000A,
    0x000000008000808B, 0x800000000000008B, 0x8000000000008089, 0x8000000000008003,
    0x8000000000008002, 0x8000000000000080, 0x000000000000800A, 0x800000008000000A,
    0x8000000080008081, 0x8000000000008080, 0x0000000080000001, 0x8000000080008008,
]

ROTATION_OFFSETS = [
    [0, 36, 3, 41, 18],
    [1, 44, 10, 45, 2],
    [62, 6, 43, 15, 61],
    [28, 55, 25, 21, 56],
    [27, 20, 39, 8, 14],
]

MASK = (1 << 64) - 1


def _rotate_left(value: int, shift: int) -> int:
    return ((value << shift) | (value >> (64 - shift))) & MASK


def _permute(lanes: list[list[int]]) -> None:
    """The 24-round Keccak-f[1600] permutation, in place."""
    for round_constant in ROUND_CONSTANTS:
        # Theta: mix each column's parity into every lane of the column.
        parity = [
            lanes[x][0] ^ lanes[x][1] ^ lanes[x][2] ^ lanes[x][3] ^ lanes[x][4]
            for x in range(5)
        ]
        for x in range(5):
            delta = parity[(x - 1) % 5] ^ _rotate_left(parity[(x + 1) % 5], 1)
            for y in range(5):
                lanes[x][y] ^= delta

        # Rho and pi: rotate every lane, then move it to a new position.
        rotated = [[0] * 5 for _ in range(5)]
        for x in range(5):
            for y in range(5):
                rotated[y][(2 * x + 3 * y) % 5] = _rotate_left(
                    lanes[x][y], ROTATION_OFFSETS[x][y]
                )

        # Chi: the only non-linear step.
        for x in range(5):
            for y in range(5):
                lanes[x][y] = rotated[x][y] ^ (
                    (~rotated[(x + 1) % 5][y] & MASK) & rotated[(x + 2) % 5][y]
                )

        # Iota: break the symmetry the other steps preserve.
        lanes[0][0] ^= round_constant


def keccak256(data: bytes) -> bytes:
    """Absorb `data` at a 1088-bit rate and squeeze 32 bytes out."""
    rate = 136  # (1600 - 2*256) / 8
    lanes = [[0] * 5 for _ in range(5)]

    padded = bytearray(data)
    padded.append(0x01)  # Ethereum's Keccak padding, not SHA-3's 0x06.
    while len(padded) % rate != 0:
        padded.append(0x00)
    padded[-1] ^= 0x80

    for offset in range(0, len(padded), rate):
        block = padded[offset : offset + rate]
        for i in range(rate // 8):
            lane = int.from_bytes(block[i * 8 : i * 8 + 8], "little")
            lanes[i % 5][i // 5] ^= lane
        _permute(lanes)

    out = bytearray()
    while len(out) < 32:
        for i in range(rate // 8):
            if len(out) >= 32:
                break
            out += lanes[i % 5][i // 5].to_bytes(8, "little")
        if len(out) < 32:
            _permute(lanes)
    return bytes(out[:32])
