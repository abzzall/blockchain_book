"""Marks RESULTS.md for the Part XV exposure-scoring laboratory."""

from __future__ import annotations

import re
import sys
from pathlib import Path

from scenario import ORIGIN, TRULY_INVOLVED, scenario
from scoring import confusion, flagged, hops_from, poison_exposure, proportional_exposure

ROW = re.compile(r"^\s*\|([^|]+)\|([^|]*)\|\s*$")


def read_table_values(markdown: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in markdown.splitlines():
        match = ROW.match(line)
        if not match:
            continue
        label = match.group(1).strip().strip("`").lower()
        value = match.group(2).strip().strip("`")
        if not label or set(label) <= {"-", " "} or label in {"field", "item"}:
            continue
        values[label] = value
    return values


def expected_rows() -> list[tuple[str, str]]:
    graph = scenario()
    haircut = proportional_exposure(graph, ORIGIN)
    poison = poison_exposure(graph, ORIGIN)
    hops = hops_from(graph, ORIGIN)
    population = graph.addresses()

    high = confusion(flagged(haircut, 0.5), TRULY_INVOLVED, population)
    low = confusion(flagged(haircut, 0.1), TRULY_INVOLVED, population)
    four = lambda v: f"{v:.4f}"

    return [
        ("haircut exposure of hop1", four(haircut["hop1"])),
        ("haircut exposure of hop2", four(haircut["hop2"])),
        ("haircut exposure of trader", four(haircut["trader"])),
        ("haircut exposure of employee", four(haircut["employee"])),
        ("haircut exposure of unrelated-customer", four(haircut["unrelated-customer"])),
        ("hops from the origin to supplier", str(hops["supplier"])),
        ("the trader scores higher than hop1 (yes/no)", "yes" if haircut["trader"] > haircut["hop1"] else "no"),
        ("addresses flagged by haircut at a threshold of 0.5", str(high["flagged"])),
        ("involved parties missed by haircut at a threshold of 0.5", str(high["missed"])),
        ("addresses flagged by haircut at a threshold of 0.1", str(low["flagged"])),
        ("false positives from haircut at a threshold of 0.1", str(low["false_positives"])),
        ("addresses flagged by the poison method", str(len(flagged(poison, 0.5)))),
    ]


def main(argv: list[str]) -> int:
    path = Path(argv[1]) if len(argv) > 1 else Path(__file__).with_name("RESULTS.md")
    recorded = read_table_values(path.read_text(encoding="utf-8"))

    correct = wrong = blank = 0
    print(f"marking {path}\n")
    for label, want in expected_rows():
        got = recorded.get(label.lower())
        if got is None:
            print(f"MISSING  {label}\n         (no row with this label was found)")
            blank += 1
        elif got == "":
            print(f"BLANK    {label}")
            blank += 1
        elif got.lower() == want.lower():
            print(f"ok       {label}")
            correct += 1
        else:
            print(f"WRONG    {label}\n         recorded {got}\n         expected {want}")
            wrong += 1

    total = correct + wrong + blank
    print(f"\n{correct} correct, {wrong} wrong, {blank} blank, out of {total}")
    return 0 if wrong == 0 and blank == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
