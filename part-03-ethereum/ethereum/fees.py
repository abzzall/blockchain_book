"""Ethereum fee arithmetic: base fee, priority fee, and what a sender pays.

Companion to Chapter 12. Every function here is integer arithmetic on wei,
exactly as the protocol performs it. There is no network access and no key
material; the mainnet figures used as test fixtures were read once, recorded
below with their block numbers, and are frozen.

What is verified, and against what:

  * the base fee update rule, against five consecutive mainnet block
    transitions -- the rule must predict each child block's base fee from its
    parent's gas limit, gas used, and base fee, to the wei;
  * the effective gas price, against four real fee-market transactions taken
    from one block, chosen to cover a capped tip, an uncapped tip, and a zero
    tip;
  * the constants, against the EIPs that define them.

Sources:
  EIP-1559 https://eips.ethereum.org/EIPS/eip-1559  (base fee, elasticity)
  EIP-2028 https://eips.ethereum.org/EIPS/eip-2028  (calldata gas)
  EIP-2929 https://eips.ethereum.org/EIPS/eip-2929  (cold and warm access)
  EIP-3529 https://eips.ethereum.org/EIPS/eip-3529  (refund cap)
  EIP-7623 https://eips.ethereum.org/EIPS/eip-7623  (calldata floor)
  EIP-7825 https://eips.ethereum.org/EIPS/eip-7825  (per-transaction gas cap)
"""

from __future__ import annotations

from dataclasses import dataclass

WEI_PER_ETHER = 10**18
WEI_PER_GWEI = 10**9

# EIP-1559.
ELASTICITY_MULTIPLIER = 2
BASE_FEE_MAX_CHANGE_DENOMINATOR = 8

# Intrinsic cost. 21,000 for any transaction; a further 32,000 to create a
# contract. Calldata is charged per byte, cheaper for zero bytes (EIP-2028).
GAS_TRANSACTION = 21_000
GAS_TRANSACTION_CREATE = 32_000
GAS_CALLDATA_ZERO = 4
GAS_CALLDATA_NONZERO = 16

# EIP-7623: calldata-heavy transactions pay a floor instead of the itemised
# cost. A "token" is one zero byte, or four for each non-zero byte.
STANDARD_TOKEN_COST = 4
TOTAL_COST_FLOOR_PER_TOKEN = 10

# EIP-3529: a transaction may reclaim at most a fifth of what it consumed.
MAX_REFUND_QUOTIENT = 5

# EIP-7825: no single transaction may be given more gas than this, whatever
# the block gas limit is.
TX_GAS_LIMIT_CAP = 2**24


# --------------------------------------------------------------------------
# The base fee
# --------------------------------------------------------------------------


def gas_target(gas_limit: int) -> int:
    """The block's target gas use: half its limit.

    EIP-1559 splits the old single limit into a target the protocol steers
    towards and a hard ceiling of twice that, so a block can absorb a burst
    of demand while the base fee responds.
    """
    return gas_limit // ELASTICITY_MULTIPLIER


def next_base_fee(parent_gas_limit: int, parent_gas_used: int,
                  parent_base_fee: int) -> int:
    """The base fee of the block after this one, per EIP-1559.

    The rule is a proportional controller. A block exactly on target leaves
    the fee unchanged; a full block raises it by one eighth; an empty block
    lowers it by one eighth. Every division truncates, which is why the
    increase carries an explicit minimum of one wei -- without it a very low
    base fee could never rise.
    """
    target = gas_target(parent_gas_limit)
    if parent_gas_used == target:
        return parent_base_fee
    if parent_gas_used > target:
        delta = parent_gas_used - target
        return parent_base_fee + max(
            parent_base_fee * delta // target // BASE_FEE_MAX_CHANGE_DENOMINATOR, 1
        )
    delta = target - parent_gas_used
    return parent_base_fee - (
        parent_base_fee * delta // target // BASE_FEE_MAX_CHANGE_DENOMINATOR
    )


def max_base_fee_change_fraction() -> tuple[int, int]:
    """The bound on one block's change, as a fraction: one eighth."""
    return 1, BASE_FEE_MAX_CHANGE_DENOMINATOR


# --------------------------------------------------------------------------
# What the sender pays
# --------------------------------------------------------------------------


def effective_gas_price(base_fee: int, max_fee: int, max_priority_fee: int) -> int:
    """The price per gas actually charged.

    The sender is charged the base fee plus a tip, where the tip is whatever
    is asked for or whatever is left under the maximum, whichever is smaller.
    A sender who sets a generous maximum during a quiet period does not pay
    the maximum; they pay the base fee plus their tip.
    """
    if max_fee < base_fee:
        raise ValueError("max fee below base fee: the transaction is not includable")
    return base_fee + min(max_priority_fee, max_fee - base_fee)


def is_includable(base_fee: int, max_fee: int) -> bool:
    """Whether a transaction may go into a block with this base fee."""
    return max_fee >= base_fee


@dataclass(frozen=True)
class FeeSplit:
    """How a transaction's fee divides between destruction and payment."""

    burned_wei: int
    to_proposer_wei: int

    @property
    def total_wei(self) -> int:
        return self.burned_wei + self.to_proposer_wei


def fee_split(gas_used: int, base_fee: int, effective_price: int) -> FeeSplit:
    """Divide a transaction's fee into the burned part and the proposer's part.

    The base portion is destroyed, so it is paid by the sender and received
    by nobody. Only the tip is income. This is why fee revenue and fee cost
    are different quantities on Ethereum.
    """
    return FeeSplit(
        burned_wei=gas_used * base_fee,
        to_proposer_wei=gas_used * (effective_price - base_fee),
    )


def max_cost_wei(gas_limit: int, max_fee: int, value: int = 0) -> int:
    """The most a transaction can cost, which is what the balance must cover.

    A node checks a sender's balance against this figure, not against the
    likely cost, because the actual price is not known until inclusion.
    """
    return gas_limit * max_fee + value


# --------------------------------------------------------------------------
# Intrinsic gas: what a transaction costs before it computes anything
# --------------------------------------------------------------------------


def calldata_tokens(data: bytes) -> int:
    """Calldata measured in EIP-7623 tokens: 1 per zero byte, 4 per other."""
    zeros = data.count(0)
    return zeros + (len(data) - zeros) * STANDARD_TOKEN_COST


def intrinsic_gas(data: bytes = b"", creates_contract: bool = False) -> int:
    """Gas charged for a transaction before any code runs.

    Under EIP-7623 this is the larger of the itemised cost and a floor that
    depends only on calldata, which is what makes a transaction carrying data
    but doing little computation pay for the space it occupies.
    """
    tokens = calldata_tokens(data)
    itemised = GAS_TRANSACTION + STANDARD_TOKEN_COST * tokens
    if creates_contract:
        itemised += GAS_TRANSACTION_CREATE
    floor = GAS_TRANSACTION + TOTAL_COST_FLOOR_PER_TOKEN * tokens
    return max(itemised, floor)


def calldata_gas_itemised(data: bytes) -> int:
    """The per-byte calldata charge alone, at EIP-2028 rates."""
    zeros = data.count(0)
    return zeros * GAS_CALLDATA_ZERO + (len(data) - zeros) * GAS_CALLDATA_NONZERO


# --------------------------------------------------------------------------
# Limits, refunds, and running out
# --------------------------------------------------------------------------


def refund_allowed(gas_used: int, refund_counter: int) -> int:
    """The refund actually granted, capped at a fifth of gas used (EIP-3529)."""
    return min(refund_counter, gas_used // MAX_REFUND_QUOTIENT)


def exceeds_transaction_cap(gas_limit: int) -> bool:
    """Whether a gas limit exceeds the per-transaction cap of EIP-7825."""
    return gas_limit > TX_GAS_LIMIT_CAP


@dataclass(frozen=True)
class Execution:
    """The outcome of running a transaction against a gas limit."""

    gas_limit: int
    gas_consumed: int

    @property
    def out_of_gas(self) -> bool:
        return self.gas_consumed >= self.gas_limit

    @property
    def gas_charged(self) -> int:
        """Gas billed. Running out bills the whole limit, not the work done.

        This is the asymmetry that makes an out-of-gas failure expensive: the
        sender pays for everything the network was asked to attempt.
        """
        return self.gas_limit if self.out_of_gas else self.gas_consumed


def format_gwei(wei: int) -> str:
    """Render wei as gwei exactly, without floating-point arithmetic."""
    whole, frac = divmod(wei, WEI_PER_GWEI)
    return f"{whole}.{frac:09d}"


# --------------------------------------------------------------------------
# Mainnet fixtures, read once on 2026-09-06 and frozen
# --------------------------------------------------------------------------

# Each entry: the parent block's number, gas limit, gas used, and base fee,
# followed by the base fee the chain actually set for the next block.
BASE_FEE_FIXTURES = [
    (25_918_872, 60_000_000, 48_633_828, 49_860_875, 53_732_120),
    (25_918_873, 60_000_000, 22_423_317, 53_732_120, 52_035_824),
    (25_918_874, 60_000_000,  6_187_759, 52_035_824, 46_872_951),
    (25_918_875, 60_000_000, 26_776_530, 46_872_951, 46_243_395),
    (25_918_876, 60_000_000, 59_901_262, 46_243_395, 52_004_794),
]

# Four fee-market transactions from block 25,918,877, whose base fee was
# 52,004,794 wei. Each is (max fee, max priority fee, effective gas price
# recorded on the receipt).
EFFECTIVE_PRICE_FIXTURE_BASE_FEE = 52_004_794
EFFECTIVE_PRICE_FIXTURES = [
    (615_645_984, 563_641_190, 615_645_984),        # tip capped by the maximum
    (528_717_000_000, 28_717_000_000, 28_769_004_794),  # tip paid in full
    (52_009_994, 0, 52_004_794),                    # no tip at all
    (1_965_799_955, 1_913_795_161, 1_965_799_955),  # tip capped by the maximum
]


def main() -> None:
    print("The base fee rule against five mainnet blocks")
    print("-" * 70)
    for number, limit, used, base, actual in BASE_FEE_FIXTURES:
        predicted = next_base_fee(limit, used, base)
        share = used * 100 // limit
        print(f"  block {number}: {share:>3}% full  "
              f"predicted {predicted:>11,}  actual {actual:>11,}  "
              f"{'OK' if predicted == actual else 'MISMATCH'}")

    print()
    print("A block exactly on target does not move the fee")
    print("-" * 70)
    limit = 60_000_000
    base = 50 * WEI_PER_GWEI
    print(f"  on target ({gas_target(limit):,} gas): "
          f"{next_base_fee(limit, gas_target(limit), base):,} (unchanged)")
    print(f"  completely full:  {next_base_fee(limit, limit, base):,}  (+12.5%)")
    print(f"  completely empty: {next_base_fee(limit, 0, base):,}  (-12.5%)")

    print()
    print("How fast the fee can actually move")
    print("-" * 70)
    b = 1 * WEI_PER_GWEI
    for blocks in (1, 5, 10, 20):
        f = b
        for _ in range(blocks):
            f = next_base_fee(limit, limit, f)
        print(f"  {blocks:>2} consecutive full blocks: "
              f"{format_gwei(b)} -> {format_gwei(f)} gwei")

    print()
    print("What the sender pays, on four real transactions")
    print("-" * 70)
    base = EFFECTIVE_PRICE_FIXTURE_BASE_FEE
    for max_fee, tip, actual in EFFECTIVE_PRICE_FIXTURES:
        p = effective_gas_price(base, max_fee, tip)
        note = "tip capped by the maximum" if p == max_fee else (
            "no tip" if tip == 0 else "tip paid in full")
        print(f"  maxFee {format_gwei(max_fee):>16}  tip {format_gwei(tip):>14}"
              f"  -> {format_gwei(p):>16} gwei  {'OK' if p == actual else 'BAD'}"
              f"  ({note})")

    print()
    print("Where the fee goes: a plain transfer at 50 gwei with a 2 gwei tip")
    print("-" * 70)
    base, tip = 50 * WEI_PER_GWEI, 2 * WEI_PER_GWEI
    price = effective_gas_price(base, base + tip, tip)
    split = fee_split(GAS_TRANSACTION, base, price)
    print(f"  burned      {split.burned_wei:>22,} wei")
    print(f"  to proposer {split.to_proposer_wei:>22,} wei")
    print(f"  total       {split.total_wei:>22,} wei")
    print(f"  the sender pays all of it; only {split.to_proposer_wei * 100 // split.total_wei}%"
          f" is anyone's income")

    print()
    print("Intrinsic gas: paying for data before doing anything")
    print("-" * 70)
    for label, data in [("no data", b""),
                        ("100 non-zero bytes", b"\x01" * 100),
                        ("100 zero bytes", b"\x00" * 100)]:
        print(f"  {label:<22} {intrinsic_gas(data):>8,} gas")
    print(f"  {'contract creation':<22} {intrinsic_gas(b'', True):>8,} gas")

    print()
    print("Running out of gas")
    print("-" * 70)
    for limit_, used_ in [(100_000, 60_000), (100_000, 100_000)]:
        e = Execution(limit_, used_)
        print(f"  limit {limit_:,}, consumed {used_:,}: "
              f"charged {e.gas_charged:,}"
              f"{'  (out of gas: the whole limit)' if e.out_of_gas else ''}")


if __name__ == "__main__":
    main()
