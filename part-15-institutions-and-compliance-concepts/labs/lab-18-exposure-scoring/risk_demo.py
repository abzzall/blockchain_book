"""Command line for the Part XV exposure-scoring laboratory.

Usage:
    python3 risk_demo.py graph
    python3 risk_demo.py score
    python3 risk_demo.py methods
    python3 risk_demo.py thresholds

Everything below is a synthetic scenario. No address, amount, or label here
refers to any real party, and nothing produced by this program is a conclusion
about anybody.
"""

from __future__ import annotations

import sys

from scenario import ORIGIN, TRULY_INVOLVED, scenario
from scoring import confusion, flagged, hops_from, poison_exposure, proportional_exposure


def show_graph() -> None:
    graph = scenario()
    print("The flows, in time order.\n")
    for t in graph.ordered():
        label = graph.labels.get(t.source, "")
        mark = f"  [{label}]" if label else ""
        print(f"  t={t.time}  {t.source:16} -> {t.target:20} {t.amount:>5}{mark}")
    print(f"\n  {len(graph.addresses())} addresses. Labels are external claims about")
    print("  three of them; the chain itself records none of these categories.")


def show_score() -> None:
    graph = scenario()
    exposure = proportional_exposure(graph, ORIGIN)
    hops = hops_from(graph, ORIGIN)

    print("Proportional (haircut) exposure: the share of what an address received")
    print("that traces back to the origin.\n")
    print(f"  {'address':22}{'hops':>6}{'exposure':>11}   involved?")
    for address in sorted(graph.addresses(), key=lambda a: (-exposure[a], a)):
        distance = hops.get(address, "-")
        involved = "yes" if address in TRULY_INVOLVED else ""
        print(f"  {address:22}{str(distance):>6}{exposure[address]:>11.4f}   {involved}")

    print("\n  Read the two lines for hop1 and trader carefully. hop1 handled the")
    print("  value knowingly and scores 0.10, because it mixed 60 into a pot of 600.")
    print("  The trader is not involved at all and scores higher, because one of its")
    print("  two incoming streams was undiluted. Exposure measures flow, not conduct.")


def show_methods() -> None:
    graph = scenario()
    haircut = proportional_exposure(graph, ORIGIN)
    poison = poison_exposure(graph, ORIGIN)

    print("The same graph, two accepted methods.\n")
    print(f"  {'address':22}{'haircut':>10}{'poison':>10}")
    for address in sorted(graph.addresses()):
        print(f"  {address:22}{haircut[address]:>10.4f}{poison[address]:>10.1f}")

    print(f"\n  haircut, at a threshold of 0.5 : {len(flagged(haircut, 0.5))} addresses")
    print(f"  poison, any exposure at all    : {len(flagged(poison, 0.5))} addresses")
    print("\n  Neither method is wrong. They answer different questions: 'how much of")
    print("  this came from there' and 'did any of this come from there'. A figure")
    print("  quoted without naming its method cannot be interpreted.")


def show_thresholds() -> None:
    graph = scenario()
    exposure = proportional_exposure(graph, ORIGIN)
    population = graph.addresses()

    print("What a threshold costs, counted against a ground truth that real")
    print("monitoring never has.\n")
    print(f"  {'threshold':>10}{'flagged':>9}{'correct':>9}{'false':>7}{'missed':>8}")
    for threshold in (0.9, 0.5, 0.25, 0.1, 0.01):
        result = confusion(flagged(exposure, threshold), TRULY_INVOLVED, population)
        print(
            f"  {threshold:>10}{result['flagged']:>9}{result['true_positives']:>9}"
            f"{result['false_positives']:>7}{result['missed']:>8}"
        )

    print(f"\n  population: {len(population)} addresses, of which {len(TRULY_INVOLVED)} were actually involved.\n")
    print("  There is no threshold here that catches everyone involved and nobody")
    print("  else. Raising it lets a diluting intermediary through; lowering it")
    print("  sweeps in a supplier and an employee who could not have known anything.")
    print("\n  This is why a score is a candidate for review rather than a finding,")
    print("  and why the review, not the score, is where a conclusion may be reached.")


COMMANDS = {"graph": show_graph, "score": show_score, "methods": show_methods, "thresholds": show_thresholds}


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[1] not in COMMANDS:
        print(__doc__)
        return 1
    COMMANDS[argv[1]]()
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
