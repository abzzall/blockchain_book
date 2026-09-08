import unittest

from hash_and_merkle_demo import (
    differing_bits,
    merkle_proof,
    merkle_root,
    sha256,
    verify_proof,
)


class HashAndMerkleTests(unittest.TestCase):
    def setUp(self) -> None:
        self.items = [b"Tx A", b"Tx B", b"Tx C", b"Tx D"]

    def test_sha256_known_vector(self) -> None:
        self.assertEqual(
            sha256(b"abc").hex(),
            "ba7816bf8f01cfea414140de5dae2223"
            "b00361a396177a9cb410ff61f20015ad",
        )

    def test_every_item_has_a_valid_proof(self) -> None:
        root = merkle_root(self.items)
        for index, item in enumerate(self.items):
            with self.subTest(index=index):
                self.assertTrue(verify_proof(item, merkle_proof(self.items, index), root))

    def test_tampering_fails(self) -> None:
        root = merkle_root(self.items)
        proof = merkle_proof(self.items, 2)
        self.assertFalse(verify_proof(b"Tx X", proof, root))

    def test_odd_leaf_count_is_supported(self) -> None:
        items = self.items[:3]
        root = merkle_root(items)
        self.assertTrue(verify_proof(items[2], merkle_proof(items, 2), root))

    def test_bit_difference_count(self) -> None:
        self.assertEqual(differing_bits(b"\x00", b"\xff"), 8)


if __name__ == "__main__":
    unittest.main()
