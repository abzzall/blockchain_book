"""Tests for the Part XV exposure-scoring laboratory.

Every address and amount is invented. Nothing here is a claim about anybody.
"""

import unittest

from flows import FlowGraph
from scenario import ORIGIN, TRULY_INVOLVED, scenario
from scoring import (
    confusion,
    flagged,
    hops_from,
    poison_exposure,
    proportional_exposure,
)


class GraphTests(unittest.TestCase):
    def test_a_transfer_must_move_a_positive_amount(self):
        graph = FlowGraph()
        for bad in (0, -5):
            with self.assertRaises(ValueError):
                graph.add("a", "b", bad, time=0)

    def test_received_totals_the_incoming_transfers(self):
        graph = scenario()
        self.assertEqual(graph.received("hop1"), 60 + 540)

    def test_every_address_that_appears_is_listed(self):
        graph = scenario()
        self.assertIn("unconnected", graph.addresses())
        self.assertIn("employee", graph.addresses())

    def test_labels_are_external_claims_not_chain_facts(self):
        graph = scenario()
        self.assertEqual(graph.labels["exchange-a"], "exchange")
        self.assertNotIn("trader", graph.labels)


class ProportionalTests(unittest.TestCase):
    def setUp(self):
        self.graph = scenario()
        self.exposure = proportional_exposure(self.graph, ORIGIN)

    def test_the_origin_is_fully_exposed(self):
        self.assertEqual(self.exposure[ORIGIN], 1.0)

    def test_an_address_with_no_path_from_the_origin_has_no_exposure(self):
        self.assertEqual(self.exposure["unconnected"], 0.0)
        self.assertEqual(self.exposure["clean-treasury"], 0.0)

    def test_mixing_with_clean_value_dilutes(self):
        # hop1 received 60 tainted into a pot of 600.
        self.assertAlmostEqual(self.exposure["hop1"], 0.1, places=6)

    def test_receiving_only_tainted_value_does_not_dilute(self):
        self.assertAlmostEqual(self.exposure["hop2"], 1.0, places=6)

    def test_an_absorbing_label_stops_propagation(self):
        # Value entering an exchange stops: what happens next is the operator's
        # record rather than the chain's.
        self.assertGreater(self.exposure["exchange-a"], 0.0)
        self.assertEqual(self.exposure["unrelated-customer"], 0.0)

    def test_an_uninvolved_party_can_score_higher_than_an_involved_one(self):
        # This is the finding the laboratory exists for: the trader mixed a
        # diluted stream with an undiluted one and ended up above hop1, which
        # actually handled the value knowingly.
        self.assertGreater(self.exposure["trader"], self.exposure["hop1"])
        self.assertNotIn("trader", TRULY_INVOLVED)

    def test_exposure_is_a_fraction(self):
        for value in self.exposure.values():
            self.assertGreaterEqual(value, 0.0)
            self.assertLessEqual(value, 1.0)


class PoisonTests(unittest.TestCase):
    def setUp(self):
        self.graph = scenario()
        self.poison = poison_exposure(self.graph, ORIGIN)
        self.proportional = proportional_exposure(self.graph, ORIGIN)

    def test_poison_does_not_decay_with_distance(self):
        self.assertEqual(self.poison["employee"], 1.0)
        self.assertLess(self.proportional["employee"], 0.5)

    def test_poison_reaches_no_further_than_the_paths_do(self):
        self.assertEqual(self.poison["unconnected"], 0.0)

    def test_the_two_methods_disagree_about_almost_everybody(self):
        differing = [
            address
            for address in self.graph.addresses()
            if (self.poison[address] > 0) != (self.proportional[address] >= 0.5)
        ]
        self.assertGreater(len(differing), 3)


class ThresholdTests(unittest.TestCase):
    def setUp(self):
        self.graph = scenario()
        self.exposure = proportional_exposure(self.graph, ORIGIN)

    def test_a_high_threshold_misses_an_involved_party(self):
        result = confusion(flagged(self.exposure, 0.5), TRULY_INVOLVED, self.graph.addresses())
        self.assertEqual(result["missed"], 1, "hop1 diluted its way below the threshold")
        self.assertEqual(result["false_positives"], 0)

    def test_a_low_threshold_catches_everybody_and_many_others(self):
        result = confusion(flagged(self.exposure, 0.1), TRULY_INVOLVED, self.graph.addresses())
        self.assertEqual(result["missed"], 0)
        self.assertGreater(result["false_positives"], 0)

    def test_lowering_the_threshold_never_reduces_what_is_flagged(self):
        sizes = [len(flagged(self.exposure, t)) for t in (0.9, 0.5, 0.2, 0.05)]
        self.assertEqual(sizes, sorted(sizes))

    def test_hops_measures_graph_distance_not_exposure(self):
        hops = hops_from(self.graph, ORIGIN)
        self.assertEqual(hops["hop1"], 1)
        self.assertEqual(hops["supplier"], 3)
        self.assertNotIn("unconnected", hops)


if __name__ == "__main__":
    unittest.main()
