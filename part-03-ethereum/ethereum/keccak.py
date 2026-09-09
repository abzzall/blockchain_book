"""Keccak-256, as Ethereum uses it.

Chapter 3 established that Ethereum's "SHA-3" is *not* standardized SHA3-256:
the two differ in their padding byte. Python's hashlib provides SHA3-256 only,
so this module implements original Keccak with the 0x01 pad, which is what
Ethereum uses it throughout the execution layer, including addresses, storage
keys, and event topics.

Verified against published Keccak-256 vectors in the accompanying tests.
"""

from __future__ import annotations

RATE_BYTES = 136  # 1088-bit rate for Keccak-256
OUTPUT_BYTES = 32

_ROUND_CONSTANTS = [
    0x0000000000000001, 0x0000000000008082, 0x800000000000808A,
    0x8000000080008000, 0x000000000000808B, 0x0000000080000001,
    0x8000000080008081, 0x8000000000008009, 0x000000000000008A,
    0x0000000000000088, 0x0000000080008009, 0x000000008000000A,
    0x000000008000808B, 0x800000000000008B, 0x8000000000008089,
    0x8000000000008003, 0x8000000000008002, 0x8000000000000080,
    0x000000000000800A, 0x800000008000000A, 0x8000000080008081,
    0x8000000000008080, 0x0000000080000001, 0x8000000080008008,
]

_ROTATION_OFFSETS = [
    [0, 36, 3, 41, 18],
    [1, 44, 10, 45, 2],
    [62, 6, 43, 15, 61],
    [28, 55, 25, 21, 56],
    [27, 20, 39, 8, 14],
]

MASK = (1 << 64) - 1


def _rol(value: int, shift: int) -> int:
    shift %= 64
    return ((value << shift) | (value >> (64 - shift))) & MASK


def _keccak_f(state: list[list[int]]) -> None:
    """The Keccak-f[1600] permutation, applied in place."""
    for rnd in range(24):
        # Theta
        c = [state[x][0] ^ state[x][1] ^ state[x][2] ^ state[x][3] ^ state[x][4]
             for x in range(5)]
        d = [c[(x - 1) % 5] ^ _rol(c[(x + 1) % 5], 1) for x in range(5)]
        for x in range(5):
            for y in range(5):
                state[x][y] ^= d[x]

        # Rho and Pi
        b = [[0] * 5 for _ in range(5)]
        for x in range(5):
            for y in range(5):
                b[y][(2 * x + 3 * y) % 5] = _rol(state[x][y], _ROTATION_OFFSETS[x][y])

        # Chi
        for x in range(5):
            for y in range(5):
                state[x][y] = b[x][y] ^ ((~b[(x + 1) % 5][y]) & b[(x + 2) % 5][y])

        # Iota
        state[0][0] ^= _ROUND_CONSTANTS[rnd]


def keccak256(data: bytes) -> bytes:
    """Return the 32-byte Keccak-256 digest of data."""
    state = [[0] * 5 for _ in range(5)]

    # Pad with the original Keccak rule: 0x01 ... 0x80.
    # Standardized SHA3-256 uses 0x06 here; that one byte is the whole
    # difference, and it changes every digest.
    padded = bytearray(data)
    padded.append(0x01)
    while len(padded) % RATE_BYTES != 0:
        padded.append(0x00)
    padded[-1] |= 0x80

    # Absorb
    for offset in range(0, len(padded), RATE_BYTES):
        block = padded[offset : offset + RATE_BYTES]
        for i in range(RATE_BYTES // 8):
            lane = int.from_bytes(block[i * 8 : i * 8 + 8], "little")
            state[i % 5][i // 5] ^= lane
        _keccak_f(state)

    # Squeeze
    out = bytearray()
    while len(out) < OUTPUT_BYTES:
        for i in range(RATE_BYTES // 8):
            if len(out) >= OUTPUT_BYTES:
                break
            out += state[i % 5][i // 5].to_bytes(8, "little")
        if len(out) < OUTPUT_BYTES:
            _keccak_f(state)
    return bytes(out[:OUTPUT_BYTES])
