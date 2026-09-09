"""Tests for the Part I signature laboratory.

The curve constants checked here are public parameters of secp256k1 and the
2*G value is the standard published doubling of the generator.
"""

import unittest

from signatures import (
    G,
    N,
    Signature,
    is_on_curve,
    message_hash,
    point_mul,
    public_key,
    recover_nonce,
    recover_private_key,
    serialize_point,
    sign,
    sign_with_nonce,
    verify,
)

LAB_KEY = 0x18E14A7B6A307F426A94F8114701E7C8E774E7F9A47E2C2035DB29A206321725


class CurveTests(unittest.TestCase):
    def test_generator_is_on_the_curve(self):
        self.assertTrue(is_on_curve(G))
        self.assertTrue(is_on_curve(point_mul(2)))
        self.assertTrue(is_on_curve(public_key(LAB_KEY)))

    def test_one_times_g_is_g_and_n_times_g_is_infinity(self):
        self.assertEqual(point_mul(1), G)
        self.assertIsNone(point_mul(N))

    def test_two_times_g_matches_the_published_value(self):
        self.assertEqual(
            f"{point_mul(2)[0]:064x}",
            "c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5",
        )

    def test_a_key_outside_the_valid_range_is_rejected(self):
        for bad in (0, N, N + 1, -1):
            with self.assertRaises(ValueError):
                public_key(bad)

    def test_a_public_key_serializes_to_thirty_three_bytes(self):
        self.assertEqual(len(serialize_point(public_key(LAB_KEY))), 33)
        self.assertIn(serialize_point(public_key(LAB_KEY))[0], (2, 3))


class SignatureTests(unittest.TestCase):
    def setUp(self):
        self.point = public_key(LAB_KEY)

    def test_a_signature_verifies_against_the_matching_public_key(self):
        message = "transfer 10 to alice"
        self.assertTrue(verify(self.point, message, sign(LAB_KEY, message)))

    def test_signing_is_deterministic(self):
        self.assertEqual(sign(LAB_KEY, "same message"), sign(LAB_KEY, "same message"))

    def test_a_signature_commits_to_the_exact_bytes(self):
        signature = sign(LAB_KEY, "transfer 10 to alice")
        for altered in (
            "transfer 10 to bob",
            "transfer 100 to alice",
            "transfer 10 to alice ",
            "Transfer 10 to alice",
        ):
            self.assertFalse(verify(self.point, altered, signature))

    def test_another_public_key_does_not_verify_the_signature(self):
        signature = sign(LAB_KEY, "hello")
        self.assertFalse(verify(public_key(LAB_KEY + 1), "hello", signature))

    def test_a_malformed_signature_is_rejected_rather_than_raising(self):
        self.assertFalse(verify(self.point, "hello", Signature(0, 1)))
        self.assertFalse(verify(self.point, "hello", Signature(1, N)))

    def test_verification_never_needs_the_private_key(self):
        # Stated as a test because it is the property the whole chapter rests
        # on: verify() takes a point, a message, and a signature only.
        signature = sign(LAB_KEY, "audit me")
        self.assertTrue(verify(self.point, "audit me", signature))


class NonceReuseTests(unittest.TestCase):
    def test_reusing_a_nonce_exposes_the_private_key(self):
        nonce = 0xDEADBEEF12345678
        first = sign_with_nonce(LAB_KEY, "pay alice 1", nonce)
        second = sign_with_nonce(LAB_KEY, "pay bob 2", nonce)

        self.assertEqual(first.r, second.r, "a shared nonce produces a shared r")

        recovered_nonce = recover_nonce(
            first, second, message_hash("pay alice 1"), message_hash("pay bob 2")
        )
        self.assertEqual(recovered_nonce, nonce)

        recovered_key = recover_private_key(
            first, message_hash("pay alice 1"), recovered_nonce
        )
        self.assertEqual(recovered_key, LAB_KEY)

    def test_distinct_nonces_do_not_share_an_r(self):
        first = sign_with_nonce(LAB_KEY, "pay alice 1", 111111)
        second = sign_with_nonce(LAB_KEY, "pay bob 2", 222222)
        self.assertNotEqual(first.r, second.r)
        with self.assertRaises(ValueError):
            recover_nonce(first, second, 1, 2)

    def test_deterministic_signing_cannot_reuse_a_nonce_across_messages(self):
        first = sign(LAB_KEY, "pay alice 1")
        second = sign(LAB_KEY, "pay bob 2")
        self.assertNotEqual(first.r, second.r)

    def test_an_invalid_nonce_is_rejected(self):
        for bad in (0, N, -5):
            with self.assertRaises(ValueError):
                sign_with_nonce(LAB_KEY, "message", bad)


if __name__ == "__main__":
    unittest.main()
