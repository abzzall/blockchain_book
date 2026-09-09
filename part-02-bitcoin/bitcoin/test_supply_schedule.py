import unittest

from supply_schedule import (
    COIN,
    INITIAL_SUBSIDY,
    SUBSIDY_HALVING_INTERVAL,
    block_subsidy,
    era_of,
    final_supply,
    format_btc,
    last_issuing_era,
    total_supply_at,
)


class SubsidyRuleTests(unittest.TestCase):
    """Checked against the rule stated in Bitcoin Core's GetBlockSubsidy."""

    def test_genesis_subsidy(self) -> None:
        self.assertEqual(block_subsidy(0), 50 * COIN)

    def test_halving_boundaries_are_exact(self) -> None:
        self.assertEqual(block_subsidy(209_999), 50 * COIN)
        self.assertEqual(block_subsidy(210_000), 25 * COIN)
        self.assertEqual(block_subsidy(419_999), 25 * COIN)
        self.assertEqual(block_subsidy(420_000), 12_50000000)

    def test_known_historical_subsidies(self) -> None:
        """Heights of the first four halvings."""
        self.assertEqual(block_subsidy(210_000), 25 * COIN)
        self.assertEqual(block_subsidy(420_000), 1250000000)
        self.assertEqual(block_subsidy(630_000), 625000000)
        self.assertEqual(block_subsidy(840_000), 312500000)

    def test_subsidy_halves_each_era(self) -> None:
        for era in range(1, 33):
            previous = block_subsidy((era - 1) * SUBSIDY_HALVING_INTERVAL)
            current = block_subsidy(era * SUBSIDY_HALVING_INTERVAL)
            with self.subTest(era=era):
                self.assertEqual(current, previous // 2)

    def test_issuance_stops(self) -> None:
        last = last_issuing_era()
        self.assertEqual(last, 32)
        self.assertEqual(block_subsidy(last * SUBSIDY_HALVING_INTERVAL), 1)
        self.assertEqual(block_subsidy((last + 1) * SUBSIDY_HALVING_INTERVAL), 0)

    def test_negative_height_rejected(self) -> None:
        with self.assertRaises(ValueError):
            block_subsidy(-1)

    def test_era_of(self) -> None:
        self.assertEqual(era_of(0), 0)
        self.assertEqual(era_of(209_999), 0)
        self.assertEqual(era_of(210_000), 1)


class SupplyTests(unittest.TestCase):
    def test_first_era_supply(self) -> None:
        self.assertEqual(total_supply_at(209_999), 210_000 * 50 * COIN)

    def test_supply_is_monotonic(self) -> None:
        heights = [0, 100_000, 210_000, 500_000, 840_000, 2_000_000]
        values = [total_supply_at(h) for h in heights]
        self.assertEqual(values, sorted(values))

    def test_final_supply_is_below_21_million(self) -> None:
        total = final_supply()
        self.assertLess(total, 21_000_000 * COIN)
        self.assertEqual(total, 2_099_999_997_690_000)

    def test_final_supply_matches_summing_every_era(self) -> None:
        """Independent recomputation, era by era."""
        total = sum(
            block_subsidy(era * SUBSIDY_HALVING_INTERVAL) * SUBSIDY_HALVING_INTERVAL
            for era in range(64)
        )
        self.assertEqual(total, final_supply())

    def test_supply_converges_to_final(self) -> None:
        self.assertEqual(total_supply_at(10_000_000), final_supply())


class FormattingTests(unittest.TestCase):
    def test_format_is_exact(self) -> None:
        self.assertEqual(format_btc(COIN), "1.00000000")
        self.assertEqual(format_btc(1), "0.00000001")
        self.assertEqual(format_btc(INITIAL_SUBSIDY), "50.00000000")

    def test_no_floating_point_drift(self) -> None:
        """Ten million satoshi additions must stay exact."""
        total = sum(1 for _ in range(1000))
        self.assertEqual(format_btc(total), "0.00001000")


if __name__ == "__main__":
    unittest.main()
