import unittest

from zk_proof import Proof, demonstration, prove, public_key, recover_reused_nonce_secret, verify


class SchnorrProofTests(unittest.TestCase):
    def test_valid_proof_verifies(self):
        proof = prove(7, 3, b"age-at-least-18")
        self.assertTrue(verify(public_key(7), b"age-at-least-18", proof))

    def test_statement_is_bound_to_proof(self):
        proof = prove(7, 3, b"age-at-least-18")
        self.assertFalse(verify(public_key(7), b"age-at-least-21", proof))

    def test_modified_response_fails(self):
        proof = prove(7, 3, b"age-at-least-18")
        changed = Proof(proof.commitment, (proof.response + 1) % 11)
        self.assertFalse(verify(public_key(7), b"age-at-least-18", changed))

    def test_reused_nonce_reveals_secret(self):
        public = public_key(7)
        first = prove(7, 3, b"age-at-least-18")
        second = prove(7, 3, b"balance-at-least-100")
        recovered = recover_reused_nonce_secret(
            public, b"age-at-least-18", first, b"balance-at-least-100", second
        )
        self.assertEqual(recovered, 7)

    def test_demonstration_records_expected_outcomes(self):
        values = demonstration()
        self.assertTrue(values["valid"])
        self.assertFalse(values["tampered_valid"])
        self.assertEqual(values["recovered_secret"], 7)


if __name__ == "__main__":
    unittest.main()
