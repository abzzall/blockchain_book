"""Verification against Bitcoin's published proof-of-work constants."""

import unittest

from proof_of_work import (
    GENESIS_BITS,
    POW_LIMIT,
    POW_TARGET_SPACING,
    POW_TARGET_TIMESPAN,
    RETARGET_INTERVAL,
    Header,
    bits_from_target,
    difficulty,
    expected_attempts,
    meets_target,
    mine,
    next_bits,
    target_from_bits,
    was_clamped,
)

GENESIS_MERKLE_ROOT = bytes.fromhex(
    "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b"
)[::-1]
GENESIS_HASH = "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f"


def genesis_header() -> Header:
    return Header(
        version=1,
        prev_hash=b"\x00" * 32,
        merkle_root=GENESIS_MERKLE_ROOT,
        time=1231006505,
        bits=GENESIS_BITS,
        nonce=2083236893,
    )


class ConsensusParameterTests(unittest.TestCase):
    def test_retarget_interval_is_2016(self) -> None:
        self.assertEqual(RETARGET_INTERVAL, 2016)
        self.assertEqual(POW_TARGET_TIMESPAN, 1_209_600)
        self.assertEqual(POW_TARGET_SPACING, 600)


class CompactEncodingTests(unittest.TestCase):
    def test_genesis_bits_decode_to_the_pow_limit(self) -> None:
        """0x1d00ffff is the easiest permitted target on mainnet."""
        self.assertEqual(target_from_bits(GENESIS_BITS), POW_LIMIT)

    def test_encoding_round_trips(self) -> None:
        for bits in (0x1D00FFFF, 0x1C00FFFF, 0x1E00FFFF, 0x1B0404CB):
            with self.subTest(bits=hex(bits)):
                self.assertEqual(bits_from_target(target_from_bits(bits)), bits)

    def test_small_exponent(self) -> None:
        self.assertEqual(target_from_bits(0x01003456), 0x00)
        self.assertEqual(target_from_bits(0x02008000), 0x80)
        self.assertEqual(target_from_bits(0x03123456), 0x123456)

    def test_negative_target_rejected(self) -> None:
        with self.assertRaises(ValueError):
            target_from_bits(0x03812345)

    def test_zero_and_overflow_targets_rejected(self) -> None:
        with self.assertRaises(ValueError):
            target_from_bits(0)
        with self.assertRaises(ValueError):
            target_from_bits(0x23010000)


class GenesisProofOfWorkTests(unittest.TestCase):
    """The published genesis header must satisfy its own published target."""

    def test_genesis_hash(self) -> None:
        self.assertEqual(genesis_header().display_hash(), GENESIS_HASH)

    def test_genesis_meets_its_target(self) -> None:
        self.assertTrue(genesis_header().is_valid())

    def test_wrong_nonce_fails(self) -> None:
        header = genesis_header()
        broken = Header(
            header.version,
            header.prev_hash,
            header.merkle_root,
            header.time,
            header.bits,
            header.nonce + 1,
        )
        self.assertNotEqual(broken.display_hash(), GENESIS_HASH)
        self.assertFalse(broken.is_valid())

    def test_header_is_80_bytes(self) -> None:
        self.assertEqual(len(genesis_header().serialize()), 80)


class DifficultyTests(unittest.TestCase):
    def test_genesis_difficulty_is_one(self) -> None:
        self.assertAlmostEqual(difficulty(GENESIS_BITS), 1.0)

    def test_difficulty_scales_inversely_with_target(self) -> None:
        self.assertAlmostEqual(difficulty(0x1C00FFFF), 256.0)

    def test_expected_attempts_scales_with_difficulty(self) -> None:
        ratio = expected_attempts(0x1C00FFFF) / expected_attempts(GENESIS_BITS)
        self.assertAlmostEqual(ratio, 256.0, places=3)


class RetargetTests(unittest.TestCase):
    START = 0x1C00FFFF

    def test_on_schedule_leaves_difficulty_unchanged(self) -> None:
        self.assertEqual(next_bits(self.START, POW_TARGET_TIMESPAN), self.START)

    def test_fast_blocks_raise_difficulty(self) -> None:
        new = next_bits(self.START, POW_TARGET_TIMESPAN // 2)
        self.assertAlmostEqual(difficulty(new) / difficulty(self.START), 2.0, places=4)

    def test_slow_blocks_lower_difficulty(self) -> None:
        new = next_bits(self.START, POW_TARGET_TIMESPAN * 2)
        self.assertAlmostEqual(difficulty(new) / difficulty(self.START), 0.5, places=4)

    def test_adjustment_is_clamped_upward(self) -> None:
        new = next_bits(self.START, POW_TARGET_TIMESPAN // 1000)
        self.assertAlmostEqual(difficulty(new) / difficulty(self.START), 4.0, places=4)

    def test_adjustment_is_clamped_downward(self) -> None:
        new = next_bits(self.START, POW_TARGET_TIMESPAN * 1000)
        self.assertAlmostEqual(difficulty(new) / difficulty(self.START), 0.25, places=4)

    def test_clamp_detection(self) -> None:
        self.assertFalse(was_clamped(POW_TARGET_TIMESPAN))
        self.assertTrue(was_clamped(POW_TARGET_TIMESPAN * 5))
        self.assertTrue(was_clamped(POW_TARGET_TIMESPAN // 5))

    def test_target_never_exceeds_the_pow_limit(self) -> None:
        """Genesis already sits at the limit, so it cannot become easier."""
        new = next_bits(GENESIS_BITS, POW_TARGET_TIMESPAN * 4)
        self.assertLessEqual(target_from_bits(new), POW_LIMIT)


class MiningTests(unittest.TestCase):
    def test_mining_finds_a_valid_header(self) -> None:
        template = Header(1, b"\x00" * 32, b"\x11" * 32, 1_700_000_000, 0x1F00FFFF, 0)
        found, attempts = mine(template)
        self.assertIsNotNone(found)
        self.assertTrue(found.is_valid())
        self.assertGreater(attempts, 0)

    def test_only_the_nonce_changes(self) -> None:
        template = Header(1, b"\x00" * 32, b"\x22" * 32, 1_700_000_000, 0x1F00FFFF, 0)
        found, _ = mine(template)
        self.assertEqual(found.merkle_root, template.merkle_root)
        self.assertEqual(found.time, template.time)
        self.assertEqual(found.bits, template.bits)

    def test_verification_is_one_hash(self) -> None:
        """Whatever the search cost, checking is a single evaluation."""
        template = Header(1, b"\x00" * 32, b"\x33" * 32, 1_700_000_000, 0x1F00FFFF, 0)
        found, _ = mine(template)
        self.assertTrue(meets_target(found.hash(), found.bits))


if __name__ == "__main__":
    unittest.main()
