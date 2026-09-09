"""Ethereum proof-of-stake arithmetic and finality for Chapter 10.

The constants below are taken from the mainnet presets and configuration in
the consensus specifications. The finality model preserves the specification's
four-bit justification record and all four finalization rules, but represents
checkpoints only by epoch and accepts aggregate vote fractions as input. It is
therefore a reduced teaching model, not an executable client specification.

No network access, node, wallet, key, or funds are required.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from fractions import Fraction

GWEI_PER_ETH = 10**9

# --- Constants from the consensus specifications ----------------------------
# presets/mainnet/phase0.yaml
SLOTS_PER_EPOCH = 32
BASE_REWARD_FACTOR = 64
EFFECTIVE_BALANCE_INCREMENT = 1 * GWEI_PER_ETH
MIN_ATTESTATION_INCLUSION_DELAY = 1
# configs/mainnet.yaml
SECONDS_PER_SLOT = 12
EJECTION_BALANCE = 16 * GWEI_PER_ETH
MIN_VALIDATOR_WITHDRAWABILITY_DELAY = 256
# presets/mainnet/electra.yaml
MIN_ACTIVATION_BALANCE = 32 * GWEI_PER_ETH
MAX_EFFECTIVE_BALANCE_ELECTRA = 2048 * GWEI_PER_ETH
MIN_SLASHING_PENALTY_QUOTIENT_ELECTRA = 4096
# presets/mainnet/bellatrix.yaml (still used by current forks)
MIN_SLASHING_PENALTY_QUOTIENT_BELLATRIX = 32
PROPORTIONAL_SLASHING_MULTIPLIER_BELLATRIX = 3
# presets/mainnet/altair.yaml and Bellatrix inherited weights
SYNC_COMMITTEE_SIZE = 512

# Reward component weights; these sum to WEIGHT_DENOMINATOR.
TIMELY_SOURCE_WEIGHT = 14
TIMELY_TARGET_WEIGHT = 26
TIMELY_HEAD_WEIGHT = 14
SYNC_REWARD_WEIGHT = 2
PROPOSER_WEIGHT = 8
WEIGHT_DENOMINATOR = 64


# --- Time ---------------------------------------------------------------------

def epoch_of_slot(slot: int) -> int:
    return slot // SLOTS_PER_EPOCH


def first_slot_of_epoch(epoch: int) -> int:
    """Return the boundary slot whose block root defines an epoch checkpoint."""
    return epoch * SLOTS_PER_EPOCH


def seconds_per_epoch() -> int:
    return SLOTS_PER_EPOCH * SECONDS_PER_SLOT


def is_epoch_boundary(slot: int) -> bool:
    return slot % SLOTS_PER_EPOCH == 0


# --- Rewards -------------------------------------------------------------------

def base_reward(effective_balance: int, total_active_balance: int) -> int:
    """The unit from which every attestation reward is scaled.

    It is proportional to the validator's effective balance and inversely
    proportional to the square root of total stake. Doubling the number of
    validators therefore does not double issuance: total issuance grows as
    sqrt(N) while each validator's share falls as 1/sqrt(N).
    """
    if total_active_balance <= 0:
        raise ValueError("total active balance must be positive")
    increments = effective_balance // EFFECTIVE_BALANCE_INCREMENT
    reward_per_increment = (
        EFFECTIVE_BALANCE_INCREMENT
        * BASE_REWARD_FACTOR
        // math.isqrt(total_active_balance)
    )
    return increments * reward_per_increment


def attestation_reward(
    base: int,
    source: bool,
    target: bool,
    head: bool,
    participating_balance: int = 1,
    total_active_balance: int = 1,
) -> int:
    """Reward for a single attestation, by which votes were timely and correct.

    The target vote carries the largest weight because it is the vote finality
    depends on.
    """
    weight = (
        (TIMELY_SOURCE_WEIGHT if source else 0)
        + (TIMELY_TARGET_WEIGHT if target else 0)
        + (TIMELY_HEAD_WEIGHT if head else 0)
    )
    if total_active_balance <= 0 or not 0 <= participating_balance <= total_active_balance:
        raise ValueError("participating balance must be within total active balance")
    return (
        base
        * weight
        * participating_balance
        // total_active_balance
        // WEIGHT_DENOMINATOR
    )


def max_attester_reward(base: int) -> int:
    """The most an attester can earn when not proposing or in a sync committee."""
    weight = TIMELY_SOURCE_WEIGHT + TIMELY_TARGET_WEIGHT + TIMELY_HEAD_WEIGHT
    return base * weight // WEIGHT_DENOMINATOR


# --- Penalties ------------------------------------------------------------------

def missed_attestation_penalty(base: int) -> int:
    """Return the ordinary balance deduction for missing source and target.

    This is an actual penalty to existing balance, in addition to the rewards
    not earned. It remains much smaller than correlated slashing.
    """
    return base * (TIMELY_SOURCE_WEIGHT + TIMELY_TARGET_WEIGHT) // WEIGHT_DENOMINATOR


def initial_slashing_penalty(effective_balance: int, electra: bool = True) -> int:
    """The immediate penalty when a validator is slashed.

    Raising the pre-Electra Bellatrix quotient from 32 to 4096 made this
    immediate component far smaller. Forced exit, continuing penalties, and
    foregone rewards remain outside this helper.
    """
    quotient = (
        MIN_SLASHING_PENALTY_QUOTIENT_ELECTRA
        if electra
        else MIN_SLASHING_PENALTY_QUOTIENT_BELLATRIX
    )
    return effective_balance // quotient


def correlation_penalty(
    effective_balance: int, slashed_balance: int, total_active_balance: int
) -> int:
    """The penalty scaled by how much stake was slashed at the same time.

    The correlation component is small for one validator alone. With the
    current multiplier of three, one third of active effective balance being
    slashed in the window reaches the cap.
    """
    adjusted = min(
        slashed_balance * PROPORTIONAL_SLASHING_MULTIPLIER_BELLATRIX,
        total_active_balance,
    )
    penalty_per_increment = adjusted // (
        total_active_balance // EFFECTIVE_BALANCE_INCREMENT
    )
    return (
        effective_balance // EFFECTIVE_BALANCE_INCREMENT * penalty_per_increment
    )


# --- Casper FFG: justification and finalization ---------------------------------

@dataclass(frozen=True)
class Checkpoint:
    """A checkpoint identified by epoch in this reduced model."""

    epoch: int

    def __repr__(self) -> str:
        return f"C{self.epoch}"


@dataclass
class FinalityState:
    """The consensus state that tracks justification and finalization.

    `justification_bits` records, for the four most recent epochs, whether that
    epoch's checkpoint was justified. Bit 0 is the current epoch.
    """

    current_epoch: int = 0
    previous_justified: Checkpoint = field(default_factory=lambda: Checkpoint(0))
    current_justified: Checkpoint = field(default_factory=lambda: Checkpoint(0))
    finalized: Checkpoint = field(default_factory=lambda: Checkpoint(0))
    justification_bits: list[int] = field(default_factory=lambda: [0, 0, 0, 0])

    def process_epoch(
        self,
        previous_epoch_target_stake: Fraction,
        current_epoch_target_stake: Fraction,
    ) -> None:
        """Advance one epoch, given the fraction of stake voting for each target.

        This follows the specification's `process_justification_and_finalization`:
        a checkpoint is justified by a two-thirds supermajority, and is finalized
        when a later justified checkpoint confirms it under one of four rules.
        """
        old_previous_justified = self.previous_justified
        old_current_justified = self.current_justified

        self.previous_justified = self.current_justified
        self.justification_bits = [0] + self.justification_bits[:3]

        previous_epoch = self.current_epoch - 1
        if previous_epoch >= 0 and previous_epoch_target_stake >= Fraction(2, 3):
            self.current_justified = Checkpoint(previous_epoch)
            self.justification_bits[1] = 1
        if current_epoch_target_stake >= Fraction(2, 3):
            self.current_justified = Checkpoint(self.current_epoch)
            self.justification_bits[0] = 1

        bits = self.justification_bits
        # The 2nd/3rd/4th most recent epochs are justified, and the 4th is the
        # source: finalize it.
        if all(bits[1:4]) and old_previous_justified.epoch + 3 == self.current_epoch:
            self.finalized = old_previous_justified
        # The 2nd/3rd most recent are justified, and the 3rd is the source.
        if all(bits[1:3]) and old_previous_justified.epoch + 2 == self.current_epoch:
            self.finalized = old_previous_justified
        # The 1st/2nd/3rd most recent are justified, and the 3rd is the source.
        if all(bits[0:3]) and old_current_justified.epoch + 2 == self.current_epoch:
            self.finalized = old_current_justified
        # The 1st/2nd most recent are justified, and the 2nd is the source.
        # This is the ordinary case: two consecutive supermajorities.
        if all(bits[0:2]) and old_current_justified.epoch + 1 == self.current_epoch:
            self.finalized = old_current_justified

        self.current_epoch += 1


def format_eth(gwei: int) -> str:
    """Render gwei as ETH exactly, without floating-point arithmetic."""
    sign = "-" if gwei < 0 else ""
    whole, frac = divmod(abs(gwei), GWEI_PER_ETH)
    return f"{sign}{whole}.{frac:09d}"


def main() -> None:
    print("Time")
    print(f"  {SLOTS_PER_EPOCH} slots per epoch, {SECONDS_PER_SLOT} seconds per slot")
    print(f"  one epoch = {seconds_per_epoch()} seconds = {seconds_per_epoch()/60:.1f} minutes")
    print(f"  slot 100 is in epoch {epoch_of_slot(100)};"
          f" that epoch starts at slot {first_slot_of_epoch(epoch_of_slot(100))}")
    print(f"  checkpoint boundary slots:"
          f" slot 64 -> {is_epoch_boundary(64)}, slot 65 -> {is_epoch_boundary(65)}")

    print("\nRewards scale with the square root of total active balance")
    balance = 32 * GWEI_PER_ETH
    for validators in (100_000, 400_000, 1_600_000):
        total = validators * balance
        r = base_reward(balance, total)
        print(f"  {validators:>9,} validators  base reward {r:>12,} gwei")
    print("  With equal balances, quadrupling total stake roughly halves this base reward.")

    print("\nWhere an attester's reward comes from")
    total = 1_000_000 * balance
    base = base_reward(balance, total)
    print(f"  base reward                 {base:>10,} gwei")
    print(f"  source+target+head (54/64)  {max_attester_reward(base):>10,} gwei")
    print(f"  target vote alone (26/64)   {attestation_reward(base, False, True, False):>10,} gwei")
    print("  The target vote is weighted highest: finality depends on it.")

    print("\nBeing offline versus being slashable")
    print(f"  missed attestation costs    {missed_attestation_penalty(base):>10,} gwei")
    print(f"  initial slashing penalty    {initial_slashing_penalty(balance):>10,} gwei"
          f"  ({format_eth(initial_slashing_penalty(balance))} ETH)")
    print(f"  under Bellatrix quotient    {initial_slashing_penalty(balance, electra=False):>10,} gwei"
          f"  ({format_eth(initial_slashing_penalty(balance, electra=False))} ETH)")

    print("\n  The correlation penalty is what punishes coordinated failure:")
    for fraction, label in ((0.0001, "0.01% slashed"), (0.05, "5% slashed"), (0.34, "34% slashed")):
        pen = correlation_penalty(balance, int(fraction * total), total)
        print(f"  {label:<16} {format_eth(pen):>16} ETH of a 32 ETH stake")

    print("\nFinality: the ordinary adjacent-checkpoint path")
    state = FinalityState()
    for epoch in range(5):
        prev = Fraction(1) if epoch > 0 else Fraction(0)
        state.process_epoch(prev, Fraction(1))
        print(f"  after epoch {epoch}: justified {state.current_justified},"
              f" finalized {state.finalized}")

    print("\nA gap in participation stalls finality")
    state = FinalityState()
    pattern = [Fraction(1), Fraction(1), Fraction(2, 5), Fraction(2, 5), Fraction(1), Fraction(1), Fraction(1)]
    for epoch, share in enumerate(pattern):
        prev = pattern[epoch - 1] if epoch > 0 else Fraction(0)
        state.process_epoch(prev, share)
        marker = "" if share >= Fraction(2, 3) else "   <- no supermajority"
        print(f"  epoch {epoch} ({float(share):.0%}): finalized {state.finalized}{marker}")
    print("  Here the ordinary adjacent-checkpoint path resumes finality.")


if __name__ == "__main__":
    main()
