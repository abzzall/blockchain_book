import unittest

from chain_rules_demo import (
    GENESIS,
    Block,
    Header,
    build_chain,
    meets_target,
    merkle_root,
    mine,
    select_chain,
    total_work,
    validate_link,
    work_of,
)


class ChainRuleTests(unittest.TestCase):
    def setUp(self) -> None:
        self.body = [b"tx: A pays B", b"tx: C pays D"]
        self.block, _ = mine(GENESIS.hash(), self.body, 1_700_000_600, 10)

    def test_mined_header_meets_target(self) -> None:
        self.assertTrue(meets_target(self.block.header))

    def test_header_serialization_is_fixed_width(self) -> None:
        self.assertEqual(len(self.block.header.serialize()), 32 + 32 + 8 + 4 + 8)

    def test_valid_link_accepted(self) -> None:
        self.assertTrue(validate_link(GENESIS, self.block))

    def test_changed_body_breaks_the_merkle_commitment(self) -> None:
        tampered = Block(self.block.header, [b"tx: A pays Z", b"tx: C pays D"])
        self.assertFalse(validate_link(GENESIS, tampered))

    def test_changed_parent_breaks_the_link(self) -> None:
        orphan, _ = mine(b"\xff" * 32, self.body, 1_700_000_600, 10)
        self.assertFalse(validate_link(GENESIS, orphan))

    def test_odd_transaction_count_is_supported(self) -> None:
        self.assertNotEqual(merkle_root([b"a", b"b", b"c"]), merkle_root([b"a", b"b"]))

    def test_work_grows_with_difficulty(self) -> None:
        self.assertEqual(work_of(12), 2 * work_of(11))

    def test_selection_prefers_work_over_length(self) -> None:
        branch_a = build_chain(GENESIS, [[b"a1"], [b"a2"], [b"a3"]], 8, 1_700_001_000)
        branch_b = build_chain(GENESIS, [[b"b1"], [b"b2"]], 12, 1_700_001_000)
        self.assertGreater(len(branch_a), len(branch_b))
        self.assertGreater(total_work(branch_b), total_work(branch_a))
        self.assertIs(select_chain([branch_a, branch_b]), branch_b)


if __name__ == "__main__":
    unittest.main()
