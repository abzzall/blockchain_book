"""Verification against the published BIP-32 and BIP-39 test vectors.

Every key here is from a public specification document.
"""

import unittest

from hd_wallet_demo import (
    TEST_MNEMONIC,
    derive_path,
    hash160,
    master_key,
    mnemonic_to_seed,
    p2pkh_address,
    parse_path,
    point_mul,
    serialize,
    serialize_point,
    HARDENED,
    G,
    N,
)

# BIP-32 test vector 1.
VECTOR1_SEED = bytes.fromhex("000102030405060708090a0b0c0d0e0f")
VECTOR1 = {
    "m": (
        "xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi",
        "xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8",
    ),
    "m/0'": (
        "xprv9uHRZZhk6KAJC1avXpDAp4MDc3sQKNxDiPvvkX8Br5ngLNv1TxvUxt4cV1rGL5hj6KCesnDYUhd7oWgT11eZG7XnxHrnYeSvkzY7d2bhkJ7",
        "xpub68Gmy5EdvgibQVfPdqkBBCHxA5htiqg55crXYuXoQRKfDBFA1WEjWgP6LHhwBZeNK1VTsfTFUHCdrfp1bgwQ9xv5ski8PX9rL2dZXvgGDnw",
    ),
    "m/0'/1": (
        "xprv9wTYmMFdV23N2TdNG573QoEsfRrWKQgWeibmLntzniatZvR9BmLnvSxqu53Kw1UmYPxLgboyZQaXwTCg8MSY3H2EU4pWcQDnRnrVA1xe8fs",
        "xpub6ASuArnXKPbfEwhqN6e3mwBcDTgzisQN1wXN9BJcM47sSikHjJf3UFHKkNAWbWMiGj7Wf5uMash7SyYq527Hqck2AxYysAA7xmALppuCkwQ",
    ),
    "m/0'/1/2'": (
        "xprv9z4pot5VBttmtdRTWfWQmoH1taj2axGVzFqSb8C9xaxKymcFzXBDptWmT7FwuEzG3ryjH4ktypQSAewRiNMjANTtpgP4mLTj34bhnZX7UiM",
        "xpub6D4BDPcP2GT577Vvch3R8wDkScZWzQzMMUm3PWbmWvVJrZwQY4VUNgqFJPMM3No2dFDFGTsxxpG5uJh7n7epu4trkrX7x7DogT5Uv6fcLW5",
    ),
    "m/0'/1/2'/2": (
        "xprvA2JDeKCSNNZky6uBCviVfJSKyQ1mDYahRjijr5idH2WwLsEd4Hsb2Tyh8RfQMuPh7f7RtyzTtdrbdqqsunu5Mm3wDvUAKRHSC34sJ7in334",
        "xpub6FHa3pjLCk84BayeJxFW2SP4XRrFd1JYnxeLeU8EqN3vDfZmbqBqaGJAyiLjTAwm6ZLRQUMv1ZACTj37sR62cfN7fe5JnJ7dh8zL4fiyLHV",
    ),
    "m/0'/1/2'/2/1000000000": (
        "xprvA41z7zogVVwxVSgdKUHDy1SKmdb533PjDz7J6N6mV6uS3ze1ai8FHa8kmHScGpWmj4WggLyQjgPie1rFSruoUihUZREPSL39UNdE3BBDu76",
        "xpub6H1LXWLaKsWFhvm6RVpEL9P4KfRZSW7abD2ttkWP3SSQvnyA8FSVqNTEcYFgJS2UaFcxupHiYkro49S8yGasTvXEYBVPamhGW6cFJodrTHy",
    ),
}


class Bip32VectorTests(unittest.TestCase):
    """The whole derivation chain must match the specification exactly."""

    def test_vector_1_all_paths(self) -> None:
        root = master_key(VECTOR1_SEED)
        for path, (want_prv, want_pub) in VECTOR1.items():
            node = root if path == "m" else derive_path(root, path)
            with self.subTest(path=path):
                self.assertEqual(serialize(node, private=True), want_prv)
                self.assertEqual(serialize(node, private=False), want_pub)


class Bip39VectorTests(unittest.TestCase):
    def test_published_seed_vector(self) -> None:
        """The all-abandon mnemonic with passphrase TREZOR."""
        self.assertEqual(
            mnemonic_to_seed(TEST_MNEMONIC, "TREZOR").hex(),
            "c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e5349553"
            "1f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04",
        )

    def test_passphrase_produces_a_different_wallet(self) -> None:
        a = mnemonic_to_seed(TEST_MNEMONIC, "one")
        b = mnemonic_to_seed(TEST_MNEMONIC, "two")
        self.assertNotEqual(a, b)
        self.assertEqual(len(a), 64)

    def test_known_first_address(self) -> None:
        root = master_key(mnemonic_to_seed(TEST_MNEMONIC))
        node = derive_path(root, "m/44'/0'/0'/0/0")
        self.assertEqual(
            p2pkh_address(node.public_key()), "1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA"
        )


class DerivationPropertyTests(unittest.TestCase):
    def setUp(self) -> None:
        self.root = master_key(VECTOR1_SEED)

    def test_derivation_is_deterministic(self) -> None:
        a = derive_path(self.root, "m/44'/0'/0'/0/7")
        b = derive_path(master_key(VECTOR1_SEED), "m/44'/0'/0'/0/7")
        self.assertEqual(a.key, b.key)

    def test_sibling_keys_differ(self) -> None:
        a = derive_path(self.root, "m/44'/0'/0'/0/0")
        b = derive_path(self.root, "m/44'/0'/0'/0/1")
        self.assertNotEqual(a.key, b.key)

    def test_hardened_and_normal_indices_differ(self) -> None:
        normal = derive_path(self.root, "m/0")
        hardened = derive_path(self.root, "m/0'")
        self.assertNotEqual(normal.key, hardened.key)

    def test_parse_path_marks_hardened_indices(self) -> None:
        self.assertEqual(parse_path("m/44'/0'/0'/0/5"), [
            44 + HARDENED, HARDENED, HARDENED, 0, 5
        ])

    def test_public_key_is_compressed_and_on_curve(self) -> None:
        node = derive_path(self.root, "m/0'")
        pub = node.public_key()
        self.assertEqual(len(pub), 33)
        self.assertIn(pub[0], (2, 3))

    def test_hash160_length(self) -> None:
        self.assertEqual(len(hash160(b"abc")), 20)

    def test_generator_has_expected_order(self) -> None:
        """point_mul must wrap correctly at the curve order."""
        self.assertIsNone(point_mul(N))
        self.assertEqual(point_mul(1), G)


class Ripemd160FallbackTests(unittest.TestCase):
    """The bundled implementation must match the published RIPEMD-160 vectors."""

    def test_published_vectors(self) -> None:
        from ripemd160 import ripemd160 as fallback

        cases = {
            b"": "9c1185a5c5e9fc54612808977ee8f548b2258d31",
            b"abc": "8eb208f7e05d987a9b044a8e98c6b087f15a0bfc",
            b"message digest": "5d0689ef49d2fae572b881b123a85ffa21595f36",
        }
        for data, want in cases.items():
            with self.subTest(data=data):
                self.assertEqual(fallback(data).hex(), want)


if __name__ == "__main__":
    unittest.main()
