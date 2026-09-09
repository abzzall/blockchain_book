"""Verification against published Keccak-256, RLP, and EIP-55 vectors."""

import hashlib
import unittest

from accounts_and_state import (
    EMPTY_STORAGE_ROOT,
    EMPTY_CODE_HASH,
    WEI_PER_ETH,
    WEI_PER_GWEI,
    Account,
    WorldState,
    address_from_public_key,
    address_case_status,
    create2_address,
    create_address,
    format_eth,
    is_valid_checksum_address,
    rlp_encode,
    to_checksum_address,
)
from keccak import keccak256


class KeccakVectorTests(unittest.TestCase):
    """Published Keccak-256 vectors. These fail if the padding is wrong."""

    def test_published_vectors(self) -> None:
        cases = {
            b"": "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
            b"abc": "4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45",
            b"testing": "5f16f4c7f149ac4f9510d9cf8cf384038ad348b3bcdc01915f95de12df9d1b02",
        }
        for data, want in cases.items():
            with self.subTest(data=data):
                self.assertEqual(keccak256(data).hex(), want)

    def test_keccak_is_not_sha3(self) -> None:
        """Chapter 3's warning, demonstrated."""
        self.assertNotEqual(
            keccak256(b"abc").hex(), hashlib.sha3_256(b"abc").hexdigest()
        )

    def test_digest_length(self) -> None:
        self.assertEqual(len(keccak256(b"x" * 500)), 32)

    def test_multi_block_input(self) -> None:
        """Inputs longer than the 136-byte rate exercise the absorb loop."""
        self.assertEqual(len(keccak256(b"a" * 1000)), 32)
        self.assertNotEqual(keccak256(b"a" * 135), keccak256(b"a" * 136))


class RlpVectorTests(unittest.TestCase):
    """Published RLP examples."""

    def test_short_string(self) -> None:
        self.assertEqual(rlp_encode(b"dog"), b"\x83dog")

    def test_empty_string(self) -> None:
        self.assertEqual(rlp_encode(b""), b"\x80")

    def test_empty_list(self) -> None:
        self.assertEqual(rlp_encode([]), b"\xc0")

    def test_single_low_byte_is_itself(self) -> None:
        self.assertEqual(rlp_encode(b"\x0f"), b"\x0f")

    def test_list_of_strings(self) -> None:
        self.assertEqual(rlp_encode([b"cat", b"dog"]), b"\xc8\x83cat\x83dog")

    def test_integers_use_shortest_big_endian_form(self) -> None:
        self.assertEqual(rlp_encode(0), b"\x80")
        self.assertEqual(rlp_encode(15), b"\x0f")
        self.assertEqual(rlp_encode(1024), b"\x82\x04\x00")

    def test_long_string_uses_length_of_length(self) -> None:
        text = b"Lorem ipsum dolor sit amet, consectetur adipisicing elit"
        self.assertEqual(len(text), 56)
        self.assertEqual(rlp_encode(text)[:2], b"\xb8\x38")

    def test_negative_integer_rejected(self) -> None:
        with self.assertRaises(ValueError):
            rlp_encode(-1)


class Eip55Tests(unittest.TestCase):
    """The eight addresses published as test cases in EIP-55."""

    VECTORS = [
        "0x52908400098527886E0F7030069857D2E4169EE7",
        "0x8617E340B3D01FA5F11F306F4090FD50E238070D",
        "0xde709f2102306220921060314715629080e2fb77",
        "0x27b1fdb04752bbc536007a920d24acb045561c26",
        "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
        "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359",
        "0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB",
        "0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb",
    ]

    def test_all_published_vectors_round_trip(self) -> None:
        for expected in self.VECTORS:
            with self.subTest(address=expected):
                raw = bytes.fromhex(expected[2:])
                self.assertEqual(to_checksum_address(raw), expected)

    def test_published_vectors_validate(self) -> None:
        for expected in self.VECTORS:
            with self.subTest(address=expected):
                expected_status = (
                    "unchecked"
                    if expected[2:] in (expected[2:].lower(), expected[2:].upper())
                    else "checksummed"
                )
                self.assertEqual(address_case_status(expected), expected_status)

    def test_recasing_one_letter_is_detected(self) -> None:
        good = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed"
        bad = "0x5aAeB6053F3E94C9b9A09f33669435E7Ef1BeAed"
        self.assertTrue(is_valid_checksum_address(good))
        self.assertFalse(is_valid_checksum_address(bad))
        self.assertEqual(address_case_status(bad), "invalid")

    def test_uniform_case_is_unchecked(self) -> None:
        address = "0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed"
        self.assertEqual(address_case_status(address), "unchecked")
        self.assertFalse(is_valid_checksum_address(address))

    def test_wrong_length_rejected(self) -> None:
        self.assertFalse(is_valid_checksum_address("0xdeadbeef"))

    def test_non_hex_rejected(self) -> None:
        self.assertFalse(is_valid_checksum_address("0x" + "z" * 40))


class AddressDerivationTests(unittest.TestCase):
    # Public key and address for m/44'/60'/0'/0/0 of the mnemonic
    # "test test test test test test test test test test test junk".
    # Hardhat and Foundry both publish this account as their first default
    # account, so the expected address below is a published value rather than
    # a restatement of what this module computes. The public key was derived
    # with the BIP-32/BIP-39 implementation in samples-and-code/wallets/,
    # itself verified against the official BIP-32 and BIP-39 test vectors.
    PUBLIC_KEY = bytes.fromhex(
        "8318535b54105d4a7aae60c08fc45f9687181b4fdfc625bd1a753fa7397fed753"
        "547f11ca8696646f2f3acb08e31016afac23e630c5d11f59f61fef57b0d2aa5"
    )
    PUBLISHED_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

    def test_address_matches_published_account(self) -> None:
        """The whole chain: public key, Keccak-256, truncation, EIP-55."""
        derived = address_from_public_key(self.PUBLIC_KEY)
        self.assertEqual(to_checksum_address(derived), self.PUBLISHED_ADDRESS)

    def test_address_is_last_20_bytes_of_key_hash(self) -> None:
        pubkey = bytes(range(64))
        self.assertEqual(address_from_public_key(pubkey), keccak256(pubkey)[-20:])

    def test_uncompressed_prefix_is_stripped(self) -> None:
        pubkey = bytes(range(64))
        self.assertEqual(
            address_from_public_key(b"\x04" + pubkey), address_from_public_key(pubkey)
        )

    def test_bad_key_length_rejected(self) -> None:
        with self.assertRaises(ValueError):
            address_from_public_key(b"\x01" * 33)

    def test_create_address_depends_on_nonce(self) -> None:
        sender = bytes.fromhex("00" * 19 + "a1")
        self.assertNotEqual(create_address(sender, 0), create_address(sender, 1))

    def test_create_address_is_deterministic(self) -> None:
        sender = bytes.fromhex("00" * 19 + "a1")
        self.assertEqual(create_address(sender, 7), create_address(sender, 7))

    def test_create_address_is_twenty_bytes(self) -> None:
        self.assertEqual(len(create_address(b"\x11" * 20, 3)), 20)

    def test_create_address_matches_a_deployed_contract(self) -> None:
        """A published CREATE deployment: the deterministic deployment proxy.

        The proxy was deployed from a single-use account at nonce 0, and the
        resulting address is widely published and in use on mainnet and many
        other networks. Confirmed against mainnet on 2026-09-06: code is
        present at the address below, and the deployer's nonce is exactly 1.
        """
        deployer = bytes.fromhex("3fab184622dc19b6109349b94811493bf2a45362")
        self.assertEqual(
            create_address(deployer, 0).hex(),
            "4e59b44847b379578588920ca78fbf26c0b4956c",
        )

    def test_create2_matches_eip_1014_example_zero(self) -> None:
        self.assertEqual(
            create2_address(b"\x00" * 20, b"\x00" * 32, b""),
            bytes.fromhex("e33c0c7f7df4809055c3ebA6c09cFe4BaF1BD9e0"),
        )


class WorldStateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.alice = bytes.fromhex("00" * 19 + "a1")
        self.bob = bytes.fromhex("00" * 19 + "b0")
        self.state = WorldState()
        self.state.get_or_create(self.alice).balance = 5 * WEI_PER_ETH

    def test_unused_address_reads_empty_without_becoming_state(self) -> None:
        unknown = bytes.fromhex("00" * 19 + "ff")
        self.assertEqual(self.state.balance_of(unknown), 0)
        self.assertEqual(self.state.get(unknown).nonce, 0)
        self.assertNotIn(unknown, self.state.accounts)

    def test_empty_code_hash_is_canonical(self) -> None:
        """Keccak-256 of the empty string, the codeHash of every plain account."""
        self.assertEqual(
            EMPTY_CODE_HASH.hex(),
            "c5d2460186f7233c927e7db2dcc703c0"
            "e500b653ca82273b7bfad8045d85a470",
        )

    def test_empty_storage_root_is_canonical(self) -> None:
        self.assertEqual(
            EMPTY_STORAGE_ROOT.hex(),
            "56e81f171bcc55a6ff8345e692c0f86e5"
            "b48e01b996cadc001622fb5e363b421",
        )

    def test_transfer_mutates_two_balances(self) -> None:
        self.state.transfer(self.alice, self.bob, 2 * WEI_PER_ETH, nonce=0)
        self.assertEqual(self.state.balance_of(self.alice), 3 * WEI_PER_ETH)
        self.assertEqual(self.state.balance_of(self.bob), 2 * WEI_PER_ETH)

    def test_value_is_conserved(self) -> None:
        before = self.state.balance_of(self.alice) + self.state.balance_of(self.bob)
        self.state.transfer(self.alice, self.bob, WEI_PER_ETH, nonce=0)
        after = self.state.balance_of(self.alice) + self.state.balance_of(self.bob)
        self.assertEqual(before, after)

    def test_nonce_increments_on_send(self) -> None:
        self.state.transfer(self.alice, self.bob, WEI_PER_ETH, nonce=0)
        self.assertEqual(self.state.get(self.alice).nonce, 1)

    def test_replay_is_rejected(self) -> None:
        self.state.transfer(self.alice, self.bob, WEI_PER_ETH, nonce=0)
        with self.assertRaises(ValueError):
            self.state.transfer(self.alice, self.bob, WEI_PER_ETH, nonce=0)

    def test_out_of_order_nonce_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            self.state.transfer(self.alice, self.bob, WEI_PER_ETH, nonce=5)

    def test_insufficient_balance_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            self.state.transfer(self.alice, self.bob, 99 * WEI_PER_ETH, nonce=0)

    def test_eoa_has_empty_code_hash(self) -> None:
        self.assertFalse(self.state.get(self.alice).has_code)
        self.assertEqual(self.state.get(self.alice).code_hash, EMPTY_CODE_HASH)

    def test_deployed_account_is_a_contract(self) -> None:
        address = self.state.deploy(self.alice, b"\x60\x00")
        self.assertTrue(self.state.get(address).has_code)

    def test_deployed_address_matches_prediction(self) -> None:
        """The address is known before the contract exists."""
        predicted = create_address(self.alice, self.state.get(self.alice).nonce)
        self.assertEqual(self.state.deploy(self.alice, b"\x60\x00"), predicted)


class DenominationTests(unittest.TestCase):
    def test_denominations(self) -> None:
        self.assertEqual(WEI_PER_ETH, 10**18)
        self.assertEqual(WEI_PER_GWEI, 10**9)

    def test_formatting_is_exact(self) -> None:
        self.assertEqual(format_eth(1), "0.000000000000000001")
        self.assertEqual(format_eth(WEI_PER_ETH), "1.000000000000000000")
        self.assertEqual(format_eth(3 * WEI_PER_ETH // 2), "1.500000000000000000")


if __name__ == "__main__":
    unittest.main()
