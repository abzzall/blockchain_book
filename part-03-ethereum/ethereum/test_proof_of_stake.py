"""Verification against the consensus-specification constants and algorithm."""

import math
import unittest
from fractions import Fraction

from proof_of_stake import (
    BASE_REWARD_FACTOR,
    GWEI_PER_ETH,
    MAX_EFFECTIVE_BALANCE_ELECTRA,
    MIN_ACTIVATION_BALANCE,
    MIN_SLASHING_PENALTY_QUOTIENT_BELLATRIX,
    MIN_SLASHING_PENALTY_QUOTIENT_ELECTRA,
    PROPOSER_WEIGHT,
    PROPORTIONAL_SLASHING_MULTIPLIER_BELLATRIX,
    SECONDS_PER_SLOT,
    SLOTS_PER_EPOCH,
    SYNC_REWARD_WEIGHT,
    TIMELY_HEAD_WEIGHT,
    TIMELY_SOURCE_WEIGHT,
    TIMELY_TARGET_WEIGHT,
    WEIGHT_DENOMINATOR,
    Checkpoint,
    FinalityState,
    attestation_reward,
    base_reward,
    correlation_penalty,
    epoch_of_slot,
    first_slot_of_epoch,
    initial_slashing_penalty,
    is_epoch_boundary,
    max_attester_reward,
    missed_attestation_penalty,
    seconds_per_epoch,
)


class SpecConstantTests(unittest.TestCase):
    """Values taken from the mainnet presets and configuration."""

    def test_phase0_constants(self) -> None:
        self.assertEqual(SLOTS_PER_EPOCH, 32)
        self.assertEqual(BASE_REWARD_FACTOR, 64)
        self.assertEqual(SECONDS_PER_SLOT, 12)

    def test_electra_balances(self) -> None:
        self.assertEqual(MIN_ACTIVATION_BALANCE, 32 * GWEI_PER_ETH)
        self.assertEqual(MAX_EFFECTIVE_BALANCE_ELECTRA, 2048 * GWEI_PER_ETH)

    def test_reward_weights_sum_to_denominator(self) -> None:
        total = (
            TIMELY_SOURCE_WEIGHT
            + TIMELY_TARGET_WEIGHT
            + TIMELY_HEAD_WEIGHT
            + SYNC_REWARD_WEIGHT
            + PROPOSER_WEIGHT
        )
        self.assertEqual(total, WEIGHT_DENOMINATOR)
        self.assertEqual(total, 64)

    def test_target_carries_the_largest_weight(self) -> None:
        """Finality depends on the target vote, so it is weighted highest."""
        self.assertGreater(TIMELY_TARGET_WEIGHT, TIMELY_SOURCE_WEIGHT)
        self.assertGreater(TIMELY_TARGET_WEIGHT, TIMELY_HEAD_WEIGHT)


class TimeTests(unittest.TestCase):
    def test_epoch_is_384_seconds(self) -> None:
        self.assertEqual(seconds_per_epoch(), 384)
        self.assertAlmostEqual(seconds_per_epoch() / 60, 6.4)

    def test_epoch_of_slot(self) -> None:
        self.assertEqual(epoch_of_slot(0), 0)
        self.assertEqual(epoch_of_slot(31), 0)
        self.assertEqual(epoch_of_slot(32), 1)
        self.assertEqual(epoch_of_slot(100), 3)

    def test_first_slot_of_epoch(self) -> None:
        self.assertEqual(first_slot_of_epoch(3), 96)
        self.assertEqual(epoch_of_slot(first_slot_of_epoch(7)), 7)

    def test_epoch_boundary_slots(self) -> None:
        self.assertTrue(is_epoch_boundary(64))
        self.assertFalse(is_epoch_boundary(65))


class RewardTests(unittest.TestCase):
    BALANCE = 32 * GWEI_PER_ETH

    def test_base_reward_matches_the_formula(self) -> None:
        total = 500_000 * self.BALANCE
        expected = (
            self.BALANCE // GWEI_PER_ETH
            * (GWEI_PER_ETH * BASE_REWARD_FACTOR // math.isqrt(total))
        )
        self.assertEqual(base_reward(self.BALANCE, total), expected)

    def test_quadrupling_stake_halves_the_base_reward(self) -> None:
        small = base_reward(self.BALANCE, 100_000 * self.BALANCE)
        large = base_reward(self.BALANCE, 400_000 * self.BALANCE)
        self.assertAlmostEqual(small / large, 2.0, places=2)

    def test_base_reward_scales_with_effective_balance(self) -> None:
        """Doubling the balance doubles the reward, up to integer truncation."""
        total = 100_000 * self.BALANCE
        single = base_reward(self.BALANCE, total)
        double = base_reward(2 * self.BALANCE, total)
        # Effective-balance increments multiply one shared reward per increment.
        self.assertEqual(double, 2 * single)

    def test_zero_total_balance_rejected(self) -> None:
        with self.assertRaises(ValueError):
            base_reward(self.BALANCE, 0)

    def test_all_three_votes_earn_54_of_64(self) -> None:
        base = 6400
        self.assertEqual(attestation_reward(base, True, True, True), base * 54 // 64)
        self.assertEqual(max_attester_reward(base), base * 54 // 64)

    def test_missing_votes_forfeits_their_weight(self) -> None:
        base = 6400
        self.assertEqual(attestation_reward(base, True, False, False), base * 14 // 64)
        self.assertEqual(attestation_reward(base, False, False, False), 0)

    def test_low_participation_reduces_rewards(self) -> None:
        base = 6400
        full = attestation_reward(base, True, True, True)
        half = attestation_reward(
            base, True, True, True, participating_balance=1, total_active_balance=2
        )
        self.assertLess(half, full)


class PenaltyTests(unittest.TestCase):
    BALANCE = 32 * GWEI_PER_ETH

    def test_being_offline_costs_about_what_being_online_earns(self) -> None:
        """Inaction loses existing balance as well as foregoing a reward."""
        base = 10_000
        penalty = missed_attestation_penalty(base)
        self.assertEqual(penalty, base * 40 // 64)
        self.assertLess(penalty, max_attester_reward(base))

    def test_initial_slashing_penalty_uses_the_quotient(self) -> None:
        self.assertEqual(
            initial_slashing_penalty(self.BALANCE),
            self.BALANCE // MIN_SLASHING_PENALTY_QUOTIENT_ELECTRA,
        )
        self.assertEqual(
            initial_slashing_penalty(self.BALANCE, electra=False),
            self.BALANCE // MIN_SLASHING_PENALTY_QUOTIENT_BELLATRIX,
        )

    def test_initial_penalty_was_reduced(self) -> None:
        """Electra raised the immediate-penalty quotient from 32 to 4096."""
        self.assertLess(
            initial_slashing_penalty(self.BALANCE),
            initial_slashing_penalty(self.BALANCE, electra=False),
        )

    def test_correlation_penalty_is_negligible_when_alone(self) -> None:
        total = 1_000_000 * self.BALANCE
        penalty = correlation_penalty(self.BALANCE, self.BALANCE, total)
        self.assertLess(penalty, self.BALANCE // 1000)

    def test_correlation_penalty_grows_with_correlated_stake(self) -> None:
        total = 1_000_000 * self.BALANCE
        small = correlation_penalty(self.BALANCE, total // 100, total)
        large = correlation_penalty(self.BALANCE, total // 3, total)
        self.assertGreater(large, small * 10)

    def test_current_correlation_multiplier_is_three(self) -> None:
        self.assertEqual(PROPORTIONAL_SLASHING_MULTIPLIER_BELLATRIX, 3)
        total = 300 * self.BALANCE
        self.assertEqual(
            correlation_penalty(self.BALANCE, total // 3, total), self.BALANCE
        )

    def test_correlation_penalty_is_capped_at_the_whole_stake(self) -> None:
        total = 1_000_000 * self.BALANCE
        penalty = correlation_penalty(self.BALANCE, total, total)
        self.assertEqual(penalty, self.BALANCE)


class FinalityTests(unittest.TestCase):
    """The specification's justification and finalization behaviour."""

    def run_epochs(self, shares: list[Fraction]) -> FinalityState:
        state = FinalityState()
        for i, share in enumerate(shares):
            previous = shares[i - 1] if i > 0 else Fraction(0)
            state.process_epoch(previous, share)
        return state

    def test_full_participation_finalizes(self) -> None:
        state = self.run_epochs([Fraction(1)] * 5)
        self.assertEqual(state.finalized, Checkpoint(3))
        self.assertEqual(state.current_justified, Checkpoint(4))

    def test_finality_lags_justification_by_one_epoch(self) -> None:
        state = self.run_epochs([Fraction(1)] * 6)
        self.assertEqual(
            state.current_justified.epoch - state.finalized.epoch, 1
        )

    def test_supermajority_threshold_is_two_thirds(self) -> None:
        just_under = self.run_epochs([Fraction(66, 100)] * 5)
        self.assertEqual(just_under.finalized, Checkpoint(0))
        just_over = self.run_epochs([Fraction(67, 100)] * 5)
        self.assertGreater(just_over.finalized.epoch, 0)

    def test_participation_gap_stalls_finality(self) -> None:
        state = self.run_epochs([Fraction(1), Fraction(1), Fraction(2, 5), Fraction(2, 5)])
        self.assertEqual(state.finalized, Checkpoint(0))

    def test_ordinary_finality_path_resumes_after_gap(self) -> None:
        state = self.run_epochs([
            Fraction(1), Fraction(1), Fraction(2, 5), Fraction(2, 5),
            Fraction(1), Fraction(1), Fraction(1)
        ])
        self.assertGreater(state.finalized.epoch, 0)

    def test_justification_bits_track_four_epochs(self) -> None:
        state = self.run_epochs([Fraction(1)] * 4)
        self.assertEqual(len(state.justification_bits), 4)

    def test_no_participation_never_finalizes(self) -> None:
        state = self.run_epochs([Fraction(0)] * 10)
        self.assertEqual(state.finalized, Checkpoint(0))
        self.assertEqual(state.current_justified, Checkpoint(0))


if __name__ == "__main__":
    unittest.main()
