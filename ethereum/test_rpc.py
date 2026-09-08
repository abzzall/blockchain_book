"""Tests for rpc.py.

The encoding tests use the examples printed in the official JSON-RPC
documentation, including the ones it explicitly labels WRONG. The chain
identifiers and block-tag observations were recorded from live networks and
are frozen in rpc.py.
"""

import unittest

from rpc import (
    BLOCK_TAGS, BLOCK_TAG_OBSERVATION, CHAIN_ID_RESPONSES, JSONRPC_VERSION,
    SLOTS_PER_EPOCH,
    Request, RpcError,
    block_parameter, chain_id, decode_data, decode_quantity, encode_data,
    encode_quantity, get_balance, get_block_by_number, is_valid_data,
    is_valid_quantity, read_response,
)


class TestQuantityEncoding(unittest.TestCase):
    """The documentation's own quantity examples."""

    def test_published_right_examples(self):
        self.assertEqual(encode_quantity(65), "0x41")
        self.assertEqual(encode_quantity(1024), "0x400")

    def test_zero_is_0x0_not_0x(self):
        self.assertEqual(encode_quantity(0), "0x0")

    def test_published_wrong_examples_are_rejected(self):
        for wrong in ("0x", "0x0400", "ff"):
            with self.subTest(wrong=wrong):
                self.assertFalse(is_valid_quantity(wrong))

    def test_round_trip(self):
        for value in (0, 1, 65, 1024, 11_155_111, 2**64):
            self.assertEqual(decode_quantity(encode_quantity(value)), value)

    def test_negative_rejected(self):
        with self.assertRaises(ValueError):
            encode_quantity(-1)

    def test_decode_rejects_missing_prefix(self):
        with self.assertRaises(ValueError):
            decode_quantity("41")


class TestDataEncoding(unittest.TestCase):
    """The documentation's own unformatted-data examples."""

    def test_published_right_examples(self):
        self.assertEqual(encode_data(b"A"), "0x41")
        self.assertEqual(encode_data(bytes([0x00, 0x42, 0x00])), "0x004200")
        self.assertEqual(encode_data(b""), "0x")

    def test_published_wrong_examples_are_rejected(self):
        for wrong in ("0xf0f0f", "004200"):
            with self.subTest(wrong=wrong):
                self.assertFalse(is_valid_data(wrong))

    def test_empty_data_is_valid_but_empty_quantity_is_not(self):
        self.assertTrue(is_valid_data("0x"))
        self.assertFalse(is_valid_quantity("0x"))

    def test_leading_zeros_are_significant_in_data(self):
        self.assertEqual(len(decode_data("0x004200")), 3)
        self.assertEqual(decode_data("0x004200"), bytes([0, 0x42, 0]))

    def test_the_same_text_is_read_differently_by_the_two_rules(self):
        """'0x0400' is a three-and-a-half... no: valid data, invalid quantity."""
        self.assertTrue(is_valid_data("0x0400"))
        self.assertFalse(is_valid_quantity("0x0400"))

    def test_round_trip(self):
        for value in (b"", b"A", bytes(range(32)), b"\x00" * 5):
            self.assertEqual(decode_data(encode_data(value)), value)


class TestLiveChainIdFixtures(unittest.TestCase):
    def test_every_recorded_chain_id_decodes_to_its_value(self):
        for name, (raw, value) in CHAIN_ID_RESPONSES.items():
            with self.subTest(network=name):
                self.assertEqual(decode_quantity(raw), value)

    def test_mainnet_is_chain_one(self):
        self.assertEqual(CHAIN_ID_RESPONSES["mainnet"][1], 1)

    def test_sepolia_and_hoodi_are_distinct_from_mainnet(self):
        ids = {v for _, v in CHAIN_ID_RESPONSES.values()}
        self.assertEqual(len(ids), 3)

    def test_recorded_ids_are_compact_form(self):
        for raw, _ in CHAIN_ID_RESPONSES.values():
            self.assertTrue(is_valid_quantity(raw))


class TestBlockTags(unittest.TestCase):
    def test_the_five_tags(self):
        self.assertEqual(BLOCK_TAGS,
                         ("earliest", "latest", "safe", "finalized", "pending"))

    def test_a_tag_passes_through_unchanged(self):
        self.assertEqual(block_parameter("finalized"), "finalized")

    def test_a_number_becomes_a_quantity(self):
        self.assertEqual(block_parameter(1024), "0x400")

    def test_an_unknown_tag_is_rejected(self):
        with self.assertRaises(ValueError):
            block_parameter("newest")

    def test_finalized_trails_safe_which_trails_the_head(self):
        o = BLOCK_TAG_OBSERVATION
        self.assertLess(o["finalized"], o["safe"])
        self.assertLess(o["safe"], o["latest"])

    def test_the_observed_finality_lag_is_about_two_epochs(self):
        o = BLOCK_TAG_OBSERVATION
        epochs = (o["latest"] - o["finalized"]) / SLOTS_PER_EPOCH
        self.assertGreater(epochs, 2)
        self.assertLess(epochs, 4)


class TestRequests(unittest.TestCase):
    def test_request_shape(self):
        obj = Request("eth_blockNumber", [], id=7).as_object()
        self.assertEqual(obj, {"jsonrpc": JSONRPC_VERSION,
                               "method": "eth_blockNumber",
                               "params": [], "id": 7})

    def test_chain_id_takes_no_parameters(self):
        self.assertEqual(chain_id().as_object()["params"], [])

    def test_get_balance_defaults_to_latest(self):
        self.assertEqual(get_balance("0x" + "11" * 20).as_object()["params"][1],
                         "latest")

    def test_get_balance_accepts_a_block_number(self):
        self.assertEqual(get_balance("0x" + "11" * 20, 1024).as_object()["params"][1],
                         "0x400")

    def test_get_block_carries_the_full_transaction_flag(self):
        self.assertIs(get_block_by_number("latest", True).as_object()["params"][1],
                      True)

    def test_params_are_copied_not_aliased(self):
        params = ["latest"]
        req = Request("eth_getBlockByNumber", params)
        params.append("mutated")
        self.assertEqual(len(req.as_object()["params"]), 1)


class TestResponses(unittest.TestCase):
    def test_a_result_is_returned(self):
        self.assertEqual(
            read_response({"jsonrpc": "2.0", "id": 1, "result": "0x1"}), "0x1")

    def test_an_error_object_raises(self):
        with self.assertRaises(RpcError) as ctx:
            read_response({"jsonrpc": "2.0", "id": 1,
                           "error": {"code": -32602, "message": "bad"}})
        self.assertEqual(ctx.exception.code, -32602)

    def test_a_response_with_neither_is_rejected(self):
        with self.assertRaises(ValueError):
            read_response({"jsonrpc": "2.0", "id": 1})

    def test_a_mismatched_id_is_rejected(self):
        with self.assertRaises(ValueError):
            read_response({"jsonrpc": "2.0", "id": 2, "result": "0x1"},
                          request_id=1)

    def test_a_matching_id_is_accepted(self):
        self.assertEqual(
            read_response({"jsonrpc": "2.0", "id": 1, "result": "0x1"},
                          request_id=1), "0x1")

    def test_a_null_result_is_a_result_not_an_error(self):
        """eth_getTransactionReceipt returns null for a pending transaction."""
        self.assertIsNone(
            read_response({"jsonrpc": "2.0", "id": 1, "result": None}))


if __name__ == "__main__":
    unittest.main()
