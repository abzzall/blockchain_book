"""Marks RESULTS.md for the Part XIII unlinkability laboratory."""

from __future__ import annotations

import re
import sys
from pathlib import Path

from clustering import anonymity_set, attribute, change_candidates, cluster_of, common_input_clusters
from scenario import before_mixing, with_consolidation, with_mixing

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


def yes(condition: bool) -> str:
    return "yes" if condition else "no"


def expected_rows() -> list[tuple[str, str]]:
    early = before_mixing()
    clusters = common_input_clusters(early)
    purchase = early.transactions[-1]

    mixed = with_mixing()
    consolidated = with_consolidation()

    before = attribute(mixed, {"a1"})
    after = attribute(consolidated, {"a1"})

    return [
        ("addresses appearing in the full record", str(len(consolidated.addresses()))),
        ("cluster containing a1, before mixing", ", ".join(sorted(cluster_of(clusters, "a1")))),
        ("cluster containing a3, before mixing", ", ".join(sorted(cluster_of(clusters, "a3")))),
        ("change candidate for the purchase, knowing nothing", ", ".join(change_candidates(purchase, set()))),
        ("fee paid by the purchase", str(early.fee_of(purchase))),
        ("size of the anonymity set of alice-out", str(len(anonymity_set(mixed, "alice-out")))),
        ("alice-out is attributed to a1's owner before consolidation (yes/no)", yes("alice-out" in before)),
        ("alice-out is attributed to a1's owner after consolidation (yes/no)", yes("alice-out" in after)),
        ("addresses attributed to a1's owner after consolidation", str(len(after))),
        ("addresses gained by the analyst through the consolidation", ", ".join(sorted(after - before))),
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
