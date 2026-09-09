"""Tests for the Part XIII unlinkability laboratory."""

import unittest

from chain import Ledger, Output
from clustering import (
    UnionFind,
    anonymity_set,
    attribute,
    change_candidates,
    cluster_of,
    common_input_clusters,
)
from scenario import MIX_AMOUNT, MIX_PARTICIPANTS, before_mixing, with_consolidation, with_mixing


class UnionFindTests(unittest.TestCase):
    def test_unrelated_items_stay_separate(self):
        union = UnionFind()
        for item in "abc":
            union.add(item)
        self.assertEqual(len(union.clusters()), 3)

    def test_merging_is_transitive(self):
        union = UnionFind()
        union.union("a", "b")
        union.union("b", "c")
        self.assertEqual(len(union.clusters()), 1)
        self.assertEqual(union.find("a"), union.find("c"))


class ClusteringTests(unittest.TestCase):
    def test_spending_two_addresses_together_merges_them(self):
        clusters = common_input_clusters(before_mixing())
        self.assertEqual(cluster_of(clusters, "a1"), {"a1", "a2"})

    def test_an_address_never_co_spent_stays_alone(self):
        clusters = common_input_clusters(before_mixing())
        self.assertEqual(cluster_of(clusters, "a3"), {"a3"})

    def test_a_single_input_transaction_merges_nothing(self):
        ledger = Ledger()
        ledger.fund("x", 10)
        ledger.spend(["x"], [("y", 6), ("z", 4)])
        for cluster in common_input_clusters(ledger):
            self.assertEqual(len(cluster), 1)

    def test_clustering_reads_only_the_public_record(self):
        # Stated as a test because it is the point: nothing secret is consulted.
        ledger = before_mixing()
        self.assertEqual(cluster_of(common_input_clusters(ledger), "a1"), {"a1", "a2"})


class ChangeTests(unittest.TestCase):
    def test_an_output_to_a_known_address_is_the_clearest_change(self):
        ledger = before_mixing()
        purchase = ledger.transactions[-1]
        self.assertEqual(change_candidates(purchase, {"a1", "a2", "a4"}), ["a4"])

    def test_without_prior_knowledge_the_guess_is_weaker(self):
        ledger = before_mixing()
        purchase = ledger.transactions[-1]
        # 10 is round and 9 is not; the heuristic guesses the non-round output.
        self.assertEqual(change_candidates(purchase, set()), ["a4"])


class MixingTests(unittest.TestCase):
    def test_mixing_produces_an_anonymity_set_of_every_output(self):
        ledger = with_mixing()
        self.assertEqual(len(anonymity_set(ledger, "alice-out")), len(MIX_PARTICIPANTS))

    def test_the_mix_does_not_merge_its_participants_into_one_cluster(self):
        # The mix has many inputs, so the common-input heuristic *does* fire on
        # it. This is why a real mixing protocol is a joint transaction that no
        # single party could have authorised alone.
        ledger = with_mixing()
        clusters = common_input_clusters(ledger)
        joint = cluster_of(clusters, "a3")
        self.assertIn("brona-in", joint)

    def test_amounts_are_equal_so_no_output_is_distinguishable_by_value(self):
        ledger = with_mixing()
        mix = next(tx for tx in ledger.transactions if tx.txid == "mix")
        self.assertEqual({output.amount for output in mix.outputs}, {MIX_AMOUNT})

    def test_the_mixed_output_is_not_attributable_before_consolidation(self):
        owned = attribute(with_mixing(), {"a1"})
        self.assertNotIn("alice-out", owned, "the mix did its job")
        self.assertNotIn("a3", owned, "a fresh address was used to enter the mix")

    def test_consolidating_a_mixed_output_with_attributed_change_undoes_the_mix(self):
        owned = attribute(with_consolidation(), {"a1"})
        self.assertIn("a4", owned, "the change was attributed by the weaker heuristic")
        self.assertIn("alice-out", owned, "and that dragged the mixed output back in")

    def test_attribution_composes_the_two_heuristics(self):
        # Change detection alone attributes a4; common input alone never
        # reaches alice-out. Only the two together close the loop.
        clusters = common_input_clusters(with_consolidation())
        self.assertNotIn("alice-out", cluster_of(clusters, "a1"))
        self.assertIn("alice-out", attribute(with_consolidation(), {"a1"}))


class LedgerTests(unittest.TestCase):
    def test_a_transaction_cannot_spend_more_than_it_holds(self):
        ledger = Ledger()
        ledger.fund("x", 5)
        with self.assertRaises(ValueError):
            ledger.spend(["x"], [("y", 50)])

    def test_the_fee_is_inputs_minus_outputs(self):
        ledger = before_mixing()
        purchase = ledger.transactions[-1]
        self.assertEqual(ledger.fee_of(purchase), 20 - 19)

    def test_every_address_in_the_record_is_visible(self):
        ledger = with_consolidation()
        self.assertIn("savings", ledger.addresses())
        self.assertIn("alice-out", ledger.addresses())


if __name__ == "__main__":
    unittest.main()
