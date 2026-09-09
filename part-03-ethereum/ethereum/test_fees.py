"""Tests for fees.py.

The base fee rule is checked against five consecutive mainnet block
transitions and the effective gas price against four real transactions; both
sets of figures were read from the chain and are recorded in fees.py with
their block numbers. The constants are checked against the EIPs that define
them.
"""

import unittest

from fees import (
    BASE_FEE_FIXTURES, BASE_FEE_MAX_CHANGE_DENOMINATOR,
    EFFECTIVE_PRICE_FIXTURE_BASE_FEE, EFFECTIVE_PRICE_FIXTURES,
    ELASTICITY_MULTIPLIER, GAS_CALLDATA_NONZERO, GAS_CALLDATA_ZERO,
    GAS_TRANSACTION, GAS_TRANSACTION_CREATE, MAX_REFUND_QUOTIENT,
    STANDARD_TOKEN_COST, TOTAL_COST_FLOOR_PER_TOKEN, TX_GAS_LIMIT_CAP,
    WEI_PER_ETHER, WEI_PER_GWEI,
    Execution, calldata_gas_itemised, calldata_tokens, effective_gas_price,
    exceeds_transaction_cap, fee_split, format_gwei, gas_target,
    intrinsic_gas, is_includable, max_cost_wei, next_base_fee,
    refund_allowed,
)


class TestConstantsMatchTheEips(unittest.TestCase):
    def test_eip_1559(self):
        self.assertEqual(ELASTICITY_MULTIPLIER, 2)
        self.assertEqual(BASE_FEE_MAX_CHANGE_DENOMINATOR, 8)

    def test_eip_2028_calldata(self):
        self.assertEqual(GAS_CALLDATA_NONZERO, 16)
        self.assertEqual(GAS_CALLDATA_ZERO, 4)

    def test_eip_7623_floor(self):
        self.assertEqual(STANDARD_TOKEN_COST, 4)
        self.assertEqual(TOTAL_COST_FLOOR_PER_TOKEN, 10)

    def test_eip_3529_refund_quotient(self):
        self.assertEqual(MAX_REFUND_QUOTIENT, 5)

    def test_eip_7825_cap_is_two_to_the_24th(self):
        self.assertEqual(TX_GAS_LIMIT_CAP, 16_777_216)

    def test_denominations(self):
        self.assertEqual(WEI_PER_ETHER, 10**18)
        self.assertEqual(WEI_PER_GWEI, 10**9)


class TestBaseFeeAgainstMainnet(unittest.TestCase):
    """Five consecutive real block transitions, predicted to the wei."""

    def test_every_fixture_is_predicted_exactly(self):
        for number, limit, used, base, actual in BASE_FEE_FIXTURES:
            with self.subTest(block=number):
                self.assertEqual(next_base_fee(limit, used, base), actual)

    def test_fixtures_cover_both_directions(self):
        above = [f for f in BASE_FEE_FIXTURES if f[2] > gas_target(f[1])]
        below = [f for f in BASE_FEE_FIXTURES if f[2] < gas_target(f[1])]
        self.assertTrue(above and below)

    def test_a_rise_follows_an_above_target_block(self):
        for _, limit, used, base, actual in BASE_FEE_FIXTURES:
            if used > gas_target(limit):
                self.assertGreater(actual, base)

    def test_a_fall_follows_a_below_target_block(self):
        for _, limit, used, base, actual in BASE_FEE_FIXTURES:
            if used < gas_target(limit):
                self.assertLess(actual, base)


class TestBaseFeeRule(unittest.TestCase):
    LIMIT = 60_000_000
    BASE = 50 * WEI_PER_GWEI

    def test_target_is_half_the_limit(self):
        self.assertEqual(gas_target(self.LIMIT), 30_000_000)

    def test_on_target_leaves_the_fee_unchanged(self):
        self.assertEqual(
            next_base_fee(self.LIMIT, gas_target(self.LIMIT), self.BASE), self.BASE)

    def test_full_block_raises_by_one_eighth(self):
        self.assertEqual(
            next_base_fee(self.LIMIT, self.LIMIT, self.BASE), self.BASE * 9 // 8)

    def test_empty_block_lowers_by_one_eighth(self):
        self.assertEqual(
            next_base_fee(self.LIMIT, 0, self.BASE), self.BASE * 7 // 8)

    def test_change_is_bounded_by_one_eighth_either_way(self):
        for used in range(0, self.LIMIT + 1, self.LIMIT // 8):
            nxt = next_base_fee(self.LIMIT, used, self.BASE)
            self.assertLessEqual(abs(nxt - self.BASE), self.BASE // 8)

    def test_a_rise_is_at_least_one_wei(self):
        """Truncation would otherwise pin a very low base fee in place."""
        self.assertEqual(next_base_fee(self.LIMIT, self.LIMIT // 2 + 1, 1), 2)

    def test_the_fee_can_reach_zero_from_below(self):
        self.assertEqual(next_base_fee(self.LIMIT, 0, 1), 1)

    def test_compounding_is_geometric_not_linear(self):
        fee = WEI_PER_GWEI
        for _ in range(10):
            fee = next_base_fee(self.LIMIT, self.LIMIT, fee)
        self.assertGreater(fee, 3 * WEI_PER_GWEI)
        self.assertLess(fee, 4 * WEI_PER_GWEI)


class TestEffectivePriceAgainstMainnet(unittest.TestCase):
    def test_every_fixture_matches_its_receipt(self):
        base = EFFECTIVE_PRICE_FIXTURE_BASE_FEE
        for max_fee, tip, actual in EFFECTIVE_PRICE_FIXTURES:
            with self.subTest(max_fee=max_fee):
                self.assertEqual(effective_gas_price(base, max_fee, tip), actual)

    def test_a_generous_maximum_is_not_what_is_paid(self):
        """The transaction with a 528 gwei maximum paid under 29."""
        max_fee, tip, actual = EFFECTIVE_PRICE_FIXTURES[1]
        self.assertLess(actual, max_fee // 10)


class TestEffectivePrice(unittest.TestCase):
    BASE = 50 * WEI_PER_GWEI

    def test_tip_is_paid_in_full_when_the_maximum_allows(self):
        self.assertEqual(
            effective_gas_price(self.BASE, 100 * WEI_PER_GWEI, 2 * WEI_PER_GWEI),
            52 * WEI_PER_GWEI)

    def test_tip_is_truncated_by_the_maximum(self):
        self.assertEqual(
            effective_gas_price(self.BASE, 51 * WEI_PER_GWEI, 5 * WEI_PER_GWEI),
            51 * WEI_PER_GWEI)

    def test_zero_tip_pays_the_base_fee_only(self):
        self.assertEqual(
            effective_gas_price(self.BASE, 60 * WEI_PER_GWEI, 0), self.BASE)

    def test_a_maximum_below_the_base_fee_is_not_includable(self):
        self.assertFalse(is_includable(self.BASE, self.BASE - 1))
        with self.assertRaises(ValueError):
            effective_gas_price(self.BASE, self.BASE - 1, 0)

    def test_price_never_exceeds_the_maximum(self):
        for tip in (0, WEI_PER_GWEI, 10**12):
            self.assertLessEqual(
                effective_gas_price(self.BASE, 55 * WEI_PER_GWEI, tip),
                55 * WEI_PER_GWEI)


class TestFeeSplit(unittest.TestCase):
    def test_only_the_tip_is_income(self):
        base, tip = 50 * WEI_PER_GWEI, 2 * WEI_PER_GWEI
        price = effective_gas_price(base, base + tip, tip)
        split = fee_split(GAS_TRANSACTION, base, price)
        self.assertEqual(split.burned_wei, GAS_TRANSACTION * base)
        self.assertEqual(split.to_proposer_wei, GAS_TRANSACTION * tip)

    def test_total_is_what_the_sender_pays(self):
        split = fee_split(21_000, 50 * WEI_PER_GWEI, 52 * WEI_PER_GWEI)
        self.assertEqual(split.total_wei, 21_000 * 52 * WEI_PER_GWEI)

    def test_a_zero_tip_pays_the_proposer_nothing(self):
        split = fee_split(21_000, 50 * WEI_PER_GWEI, 50 * WEI_PER_GWEI)
        self.assertEqual(split.to_proposer_wei, 0)
        self.assertGreater(split.burned_wei, 0)

    def test_balance_check_uses_the_maximum_not_the_likely_cost(self):
        self.assertEqual(
            max_cost_wei(21_000, 100 * WEI_PER_GWEI, 10**18),
            21_000 * 100 * WEI_PER_GWEI + 10**18)


class TestIntrinsicGas(unittest.TestCase):
    def test_a_bare_transfer_costs_21000(self):
        self.assertEqual(intrinsic_gas(), GAS_TRANSACTION)

    def test_contract_creation_adds_32000(self):
        self.assertEqual(intrinsic_gas(b"", True),
                         GAS_TRANSACTION + GAS_TRANSACTION_CREATE)

    def test_zero_bytes_are_cheaper_than_other_bytes(self):
        self.assertLess(intrinsic_gas(b"\x00" * 100), intrinsic_gas(b"\x01" * 100))

    def test_tokens_count_zero_bytes_once_and_others_four_times(self):
        self.assertEqual(calldata_tokens(b"\x00" * 10), 10)
        self.assertEqual(calldata_tokens(b"\x01" * 10), 40)

    def test_itemised_rate_reproduces_eip_2028(self):
        self.assertEqual(calldata_gas_itemised(b"\x01" * 10), 160)
        self.assertEqual(calldata_gas_itemised(b"\x00" * 10), 40)

    def test_the_floor_binds_for_calldata_heavy_transactions(self):
        data = b"\x01" * 100
        tokens = calldata_tokens(data)
        itemised = GAS_TRANSACTION + STANDARD_TOKEN_COST * tokens
        floor = GAS_TRANSACTION + TOTAL_COST_FLOOR_PER_TOKEN * tokens
        self.assertGreater(floor, itemised)
        self.assertEqual(intrinsic_gas(data), floor)


class TestLimitsAndRefunds(unittest.TestCase):
    def test_refund_is_capped_at_a_fifth_of_gas_used(self):
        self.assertEqual(refund_allowed(100_000, 50_000), 20_000)

    def test_a_small_refund_is_granted_in_full(self):
        self.assertEqual(refund_allowed(100_000, 5_000), 5_000)

    def test_transaction_cap_is_independent_of_the_block_limit(self):
        self.assertTrue(exceeds_transaction_cap(TX_GAS_LIMIT_CAP + 1))
        self.assertFalse(exceeds_transaction_cap(TX_GAS_LIMIT_CAP))

    def test_finishing_under_the_limit_is_billed_for_work_done(self):
        self.assertEqual(Execution(100_000, 60_000).gas_charged, 60_000)

    def test_running_out_is_billed_for_the_whole_limit(self):
        e = Execution(100_000, 100_000)
        self.assertTrue(e.out_of_gas)
        self.assertEqual(e.gas_charged, 100_000)


class TestFormatting(unittest.TestCase):
    def test_gwei_formatting_is_exact(self):
        self.assertEqual(format_gwei(WEI_PER_GWEI), "1.000000000")
        self.assertEqual(format_gwei(1), "0.000000001")
        self.assertEqual(format_gwei(52_004_794), "0.052004794")


if __name__ == "__main__":
    unittest.main()
