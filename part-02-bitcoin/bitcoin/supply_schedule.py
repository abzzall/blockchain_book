"""Bitcoin's issuance schedule, computed from the consensus rule for Chapter 6.

This reimplements the subsidy calculation exactly as Bitcoin Core states it:

    int halvings = nHeight / consensusParams.nSubsidyHalvingInterval;
    if (halvings >= 64) return 0;
    CAmount nSubsidy = 50 * COIN;
    nSubsidy >>= halvings;

Every amount here is an integer number of satoshis. That is not a stylistic
choice: the supply cap is a consequence of integer truncation, and computing
the schedule in floating-point BTC gets the answer wrong.
"""

from __future__ import annotations

COIN = 100_000_000  # satoshis per bitcoin
SUBSIDY_HALVING_INTERVAL = 210_000  # blocks
INITIAL_SUBSIDY = 50 * COIN
TARGET_SPACING_SECONDS = 600  # ten minutes


def block_subsidy(height: int) -> int:
    """Return the block subsidy in satoshis at a given height.

    The right shift is integer division by two. Once the subsidy reaches one
    satoshi, the next shift takes it to zero and issuance stops permanently.
    """
    if height < 0:
        raise ValueError("height must not be negative")
    halvings = height // SUBSIDY_HALVING_INTERVAL
    if halvings >= 64:
        return 0
    return INITIAL_SUBSIDY >> halvings


def era_of(height: int) -> int:
    """Return the zero-based halving era containing a height."""
    return height // SUBSIDY_HALVING_INTERVAL


def total_supply_at(height: int) -> int:
    """Return the total satoshis issued through the given height inclusive."""
    total = 0
    era = 0
    while True:
        start = era * SUBSIDY_HALVING_INTERVAL
        if start > height:
            return total
        subsidy = block_subsidy(start)
        if subsidy == 0:
            return total
        end = min(height, start + SUBSIDY_HALVING_INTERVAL - 1)
        total += subsidy * (end - start + 1)
        era += 1


def final_supply() -> int:
    """Return the total satoshis that will ever be issued."""
    total = 0
    era = 0
    while True:
        subsidy = block_subsidy(era * SUBSIDY_HALVING_INTERVAL)
        if subsidy == 0:
            return total
        total += subsidy * SUBSIDY_HALVING_INTERVAL
        era += 1


def last_issuing_era() -> int:
    """Return the last era in which any satoshis are issued."""
    era = 0
    while block_subsidy(era * SUBSIDY_HALVING_INTERVAL) > 0:
        era += 1
    return era - 1


def format_btc(satoshis: int) -> str:
    """Render satoshis as BTC without floating-point arithmetic."""
    sign = "-" if satoshis < 0 else ""
    whole, frac = divmod(abs(satoshis), COIN)
    return f"{sign}{whole:,}.{frac:08d}"


def schedule(eras: int) -> list[tuple[int, int, int, int]]:
    """Return (era, start height, subsidy, cumulative supply) rows."""
    rows = []
    for era in range(eras):
        start = era * SUBSIDY_HALVING_INTERVAL
        subsidy = block_subsidy(start)
        cumulative = total_supply_at(start + SUBSIDY_HALVING_INTERVAL - 1)
        rows.append((era, start, subsidy, cumulative))
    return rows


def main() -> None:
    print("Subsidy at selected heights")
    for height in (0, 209_999, 210_000, 630_000, 840_000, 1_050_000):
        subsidy = block_subsidy(height)
        print(f"  height {height:>9,}  era {era_of(height)}  {format_btc(subsidy):>16} BTC")

    print("\nThe first eras")
    print(f"  {'era':>3}  {'first block':>12}  {'subsidy (BTC)':>16}  {'supply after era':>20}")
    for era, start, subsidy, cumulative in schedule(6):
        print(f"  {era:>3}  {start:>12,}  {format_btc(subsidy):>16}  {format_btc(cumulative):>20}")

    print("\nThe end of issuance")
    last = last_issuing_era()
    print(f"  last era that issues anything: {last}")
    print(f"  its subsidy: {block_subsidy(last * SUBSIDY_HALVING_INTERVAL)} satoshi")
    print(f"  first block with zero subsidy: {(last + 1) * SUBSIDY_HALVING_INTERVAL:,}")
    years = (last + 1) * SUBSIDY_HALVING_INTERVAL * TARGET_SPACING_SECONDS / (365.25 * 86400)
    print(f"  at ten-minute targets that is roughly year {2009 + years:.0f}")

    print("\nThe cap is a consequence, not a constant")
    total = final_supply()
    print(f"  total ever issued: {total:,} satoshis")
    print(f"                   = {format_btc(total)} BTC")
    print(f"  short of 21,000,000 by {format_btc(21_000_000 * COIN - total)} BTC")
    print("  The shortfall comes from integer truncation in the halvings.")


if __name__ == "__main__":
    main()
