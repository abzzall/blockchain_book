"""The canonical synthetic history every command and the marker share.

The story: one user holds three addresses and reveals that they are one owner by
spending two of them together. They then pass through a mixing round with four
strangers, which breaks the direct link. Finally they consolidate the mixed
output with an address already attributed to them --- and undo the whole thing.
"""

from __future__ import annotations

from chain import Ledger

MIX_PARTICIPANTS = ["alice", "brona", "cemal", "dilnaz", "eren"]
MIX_AMOUNT = 10


def before_mixing() -> Ledger:
    """Three addresses, two of them spent together."""
    ledger = Ledger()
    for address in ("a1", "a2", "a3"):
        ledger.fund(address, 10, time=0)
    # Spending a1 and a2 in one transaction proves one party could authorise both.
    ledger.spend(["a1", "a2"], [("shop", 10), ("a4", 9)], time=1, txid="purchase")
    return ledger


def with_mixing() -> Ledger:
    """The same history, followed by a mixing round with equal-valued outputs."""
    ledger = before_mixing()
    # Four strangers arrive with their own funds.
    for name in MIX_PARTICIPANTS[1:]:
        ledger.fund(f"{name}-in", MIX_AMOUNT, time=2)
    # One transaction, five inputs, five indistinguishable outputs.
    ledger.spend(
        ["a3"] + [f"{name}-in" for name in MIX_PARTICIPANTS[1:]],
        [(f"{name}-out", MIX_AMOUNT) for name in MIX_PARTICIPANTS],
        time=3,
        txid="mix",
    )
    return ledger


def with_consolidation() -> Ledger:
    """The mistake: the mixed output is spent together with a known address."""
    ledger = with_mixing()
    ledger.spend(["alice-out", "a4"], [("savings", 13)], time=4, txid="consolidate")
    return ledger
