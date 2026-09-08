"""Tests for transactions.py.

The encoding is checked against the worked example published in EIP-155,
which prints the signing bytes, the signing hash, and the fully signed
transaction for one concrete transfer. The RLP cases are the canonical ones.
"""

import unittest

from keccak import keccak256
from transactions import (
    TYPE_FEE_MARKET, WEI_PER_GWEI,
    AccessListEntry, FeeMarketTransaction, LegacyTransaction,
    EIP155_CHAIN_ID, EIP155_R, EIP155_S, EIP155_SIGNED, EIP155_SIGNING_BYTES,
    EIP155_SIGNING_HASH, EIP155_TX, EIP155_V, SEPOLIA_CHAIN_ID,
    chain_id_from_v, encode_quantity, fee_market_signing_bytes,
    legacy_signing_bytes, legacy_v, rlp_encode, signed_legacy_bytes,
    signing_hash, transaction_hash,
)


class TestRlp(unittest.TestCase):
    def test_short_string_is_prefixed(self):
        self.assertEqual(rlp_encode(b"dog"), b"\x83dog")

    def test_single_low_byte_is_itself(self):
        self.assertEqual(rlp_encode(b"\x0f"), b"\x0f")

    def test_single_high_byte_is_prefixed(self):
        self.assertEqual(rlp_encode(b"\x80"), b"\x81\x80")

    def test_empty_string(self):
        self.assertEqual(rlp_encode(b""), b"\x80")

    def test_list_of_two_strings(self):
        self.assertEqual(rlp_encode([b"cat", b"dog"]), b"\xc8\x83cat\x83dog")

    def test_empty_list(self):
        self.assertEqual(rlp_encode([]), b"\xc0")

    def test_nested_list(self):
        self.assertEqual(rlp_encode([[], [[]]]), b"\xc3\xc0\xc1\xc0")

    def test_long_string_uses_length_of_length(self):
        encoded = rlp_encode(b"a" * 1024)
        self.assertEqual(encoded[:3], bytes([0xB8 + 1, 0x04, 0x00]))
        self.assertEqual(len(encoded), 1024 + 3)

    def test_zero_encodes_as_empty_string(self):
        self.assertEqual(encode_quantity(0), b"")
        self.assertEqual(rlp_encode(0), b"\x80")

    def test_quantities_carry_no_leading_zeros(self):
        self.assertEqual(encode_quantity(1), b"\x01")
        self.assertEqual(encode_quantity(256), b"\x01\x00")

    def test_negative_quantity_rejected(self):
        with self.assertRaises(ValueError):
            encode_quantity(-1)

    def test_unsupported_types_rejected(self):
        with self.assertRaises(TypeError):
            rlp_encode(1.5)
        with self.assertRaises(TypeError):
            rlp_encode(True)


class TestEip155PublishedVector(unittest.TestCase):
    """Every expected value here is printed in EIP-155 itself."""

    def test_signing_bytes_match_published_value(self):
        self.assertEqual(
            legacy_signing_bytes(EIP155_TX, EIP155_CHAIN_ID),
            EIP155_SIGNING_BYTES,
        )

    def test_signing_hash_matches_published_value(self):
        self.assertEqual(
            signing_hash(legacy_signing_bytes(EIP155_TX, EIP155_CHAIN_ID)),
            EIP155_SIGNING_HASH,
        )

    def test_signed_transaction_matches_published_value(self):
        self.assertEqual(
            signed_legacy_bytes(EIP155_TX, EIP155_V, EIP155_R, EIP155_S),
            EIP155_SIGNED,
        )

    def test_published_v_is_the_eip155_formula(self):
        self.assertEqual(legacy_v(EIP155_CHAIN_ID, 0), EIP155_V)

    def test_v_recovers_the_chain_id(self):
        self.assertEqual(chain_id_from_v(EIP155_V), EIP155_CHAIN_ID)

    def test_pre_eip155_v_carries_no_chain_id(self):
        self.assertEqual(chain_id_from_v(27), 0)
        self.assertEqual(chain_id_from_v(28), 0)

    def test_v_parity_must_be_a_bit(self):
        with self.assertRaises(ValueError):
            legacy_v(1, 2)


class TestChainIdBindsTheSignature(unittest.TestCase):
    def test_the_chain_id_is_inside_the_signed_bytes(self):
        self.assertNotEqual(
            legacy_signing_bytes(EIP155_TX, EIP155_CHAIN_ID),
            legacy_signing_bytes(EIP155_TX, SEPOLIA_CHAIN_ID),
        )

    def test_a_different_chain_gives_a_different_signing_hash(self):
        self.assertNotEqual(
            signing_hash(legacy_signing_bytes(EIP155_TX, EIP155_CHAIN_ID)),
            signing_hash(legacy_signing_bytes(EIP155_TX, SEPOLIA_CHAIN_ID)),
        )


class TestTypedEnvelope(unittest.TestCase):
    def setUp(self):
        self.tx = FeeMarketTransaction(
            chain_id=1, nonce=9,
            max_priority_fee_per_gas=2 * WEI_PER_GWEI,
            max_fee_per_gas=20 * WEI_PER_GWEI,
            gas_limit=21000, to=EIP155_TX.to, value=EIP155_TX.value,
        )

    def test_typed_signing_bytes_begin_with_the_type_byte(self):
        self.assertEqual(fee_market_signing_bytes(self.tx)[0], TYPE_FEE_MARKET)

    def test_legacy_signing_bytes_have_no_type_byte(self):
        first = legacy_signing_bytes(EIP155_TX, EIP155_CHAIN_ID)[0]
        self.assertGreaterEqual(first, 0xC0)  # an RLP list prefix

    def test_the_two_encodings_differ(self):
        self.assertNotEqual(
            fee_market_signing_bytes(self.tx),
            legacy_signing_bytes(EIP155_TX, EIP155_CHAIN_ID),
        )

    def test_an_empty_access_list_encodes_as_an_empty_list(self):
        self.assertTrue(fee_market_signing_bytes(self.tx).endswith(b"\xc0"))

    def test_declaring_access_list_state_changes_the_signing_bytes(self):
        entry = AccessListEntry(EIP155_TX.to, (b"\x01" * 32,))
        with_list = FeeMarketTransaction(
            chain_id=self.tx.chain_id, nonce=self.tx.nonce,
            max_priority_fee_per_gas=self.tx.max_priority_fee_per_gas,
            max_fee_per_gas=self.tx.max_fee_per_gas,
            gas_limit=self.tx.gas_limit, to=self.tx.to, value=self.tx.value,
            access_list=(entry,),
        )
        self.assertNotEqual(
            fee_market_signing_bytes(with_list),
            fee_market_signing_bytes(self.tx),
        )


class TestTransactionHash(unittest.TestCase):
    def setUp(self):
        self.raw = signed_legacy_bytes(EIP155_TX, EIP155_V, EIP155_R, EIP155_S)

    def test_hash_is_keccak_of_the_signed_bytes(self):
        self.assertEqual(transaction_hash(self.raw), keccak256(self.raw))

    def test_one_wei_changes_the_hash(self):
        altered = LegacyTransaction(
            nonce=EIP155_TX.nonce, gas_price=EIP155_TX.gas_price,
            gas_limit=EIP155_TX.gas_limit, to=EIP155_TX.to,
            value=EIP155_TX.value + 1, data=EIP155_TX.data,
        )
        self.assertNotEqual(
            transaction_hash(self.raw),
            transaction_hash(
                signed_legacy_bytes(altered, EIP155_V, EIP155_R, EIP155_S)),
        )

    def test_the_hash_differs_from_the_signing_hash(self):
        self.assertNotEqual(transaction_hash(self.raw), EIP155_SIGNING_HASH)


if __name__ == "__main__":
    unittest.main()
