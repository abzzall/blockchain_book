"""Command line for the Part XIII unlinkability laboratory.

Usage:
    python3 privacy_demo.py record
    python3 privacy_demo.py cluster
    python3 privacy_demo.py mix
    python3 privacy_demo.py undo
"""

from __future__ import annotations

import sys

from clustering import (
    anonymity_set,
    attribute,
    change_candidates,
    cluster_of,
    common_input_clusters,
)
from scenario import MIX_PARTICIPANTS, before_mixing, with_consolidation, with_mixing


def show_record() -> None:
    ledger = with_consolidation()
    print("The whole record, as anybody may read it.\n")
    for tx in ledger.transactions:
        inputs = ", ".join(tx.inputs) if tx.inputs else "(new value)"
        outputs = ", ".join(f"{o.address}:{o.amount}" for o in tx.outputs)
        print(f"  t={tx.time}  {tx.txid:12} in [{inputs}]  out [{outputs}]")
    print(f"\n  {len(ledger.addresses())} addresses appear in this record.")
    print("  No name is attached to any of them. That is the whole of the privacy.")


def show_cluster() -> None:
    ledger = before_mixing()
    clusters = common_input_clusters(ledger)
    print("Common-input-ownership heuristic, applied to the record before mixing.\n")
    for cluster in clusters:
        print(f"  {{{', '.join(sorted(cluster))}}}")

    print(f"\n  a1 and a2 were spent in one transaction, so one party could authorise")
    print(f"  both. That is not a guess. Cluster of a1: {sorted(cluster_of(clusters, 'a1'))}")

    purchase = ledger.transactions[-1]
    print(f"\n  Change detection on '{purchase.txid}':")
    print(f"    outputs         {[f'{o.address}:{o.amount}' for o in purchase.outputs]}")
    print(f"    knowing nothing {change_candidates(purchase, set())}")
    print(f"    the round-numbered output looks like the payment, the other like change.")
    print("    This one IS a guess, and a wallet can defeat it.")


def show_mix() -> None:
    ledger = with_mixing()
    mix = next(tx for tx in ledger.transactions if tx.txid == "mix")
    print("A mixing round: five inputs, five outputs, all of the same value.\n")
    print(f"  inputs  {mix.inputs}")
    print(f"  outputs {[f'{o.address}:{o.amount}' for o in mix.outputs]}\n")

    anonymity = anonymity_set(ledger, "alice-out")
    print(f"  anonymity set of alice-out: {len(anonymity)} of {len(MIX_PARTICIPANTS)}")
    print(f"    {sorted(anonymity)}")
    print("  No output is distinguishable from another by value, so an observer")
    print("  cannot say which input became which output.\n")

    owned = attribute(ledger, {"a1"})
    print(f"  starting from a1 alone, an analyst attributes: {sorted(owned)}")
    print(f"  alice-out attributed: {'alice-out' in owned}")
    print("\n  The mix worked. Note also that the address used to enter the mix, a3,")
    print("  had never been spent alongside a1 or a2 -- which is why it was not")
    print("  already attributed before the mix began.")


def show_undo() -> None:
    before = attribute(with_mixing(), {"a1"})
    after = attribute(with_consolidation(), {"a1"})

    print("Then the mixed output is spent together with the earlier change output.\n")
    print(f"  attributed before consolidation: {sorted(before)}")
    print(f"  attributed after  consolidation: {sorted(after)}")
    print(f"\n  gained: {sorted(after - before)}")
    print(f"  alice-out attributed: {'alice-out' in after}\n")

    print("  Two heuristics closed the loop between them. The change output a4 was")
    print("  attributed by the weaker of the two. Spending a4 alongside alice-out")
    print("  then attributed alice-out by the stronger one, and the anonymity set of")
    print("  five collapsed to one.")
    print("\n  Nothing was broken. The mix did exactly what it promised, and the")
    print("  owner undid it three transactions later with an ordinary consolidation.")


COMMANDS = {"record": show_record, "cluster": show_cluster, "mix": show_mix, "undo": show_undo}


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[1] not in COMMANDS:
        print(__doc__)
        return 1
    COMMANDS[argv[1]]()
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
