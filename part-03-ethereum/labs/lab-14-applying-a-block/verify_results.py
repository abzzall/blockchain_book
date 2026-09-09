"""Marks RESULTS.md for the Part III block-execution laboratory.

Recomputes every value the laboratory asks the student to record and compares
it with what they wrote. The values are reproducible from the specification in
LAB.md, so this marks work written in any language, not only the reference
solution.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from block_demo import (
    ALICE,
    BOB,
    CAROL,
    COINBASE,
    ETHER,
    STARTING_BALANCE,
    canonical_block,
    opening_state,
    transfer,
)
from execution import (
    TransactionRejected,
    address_of_key,
    apply_block,
    apply_transaction,
)

ROW = re.compile(r"^\s*\|([^|]+)\|([^|]*)\|\s*$")


def read_table_values(markdown: str) -> dict[str, str]:
    """Reads `| label | value |` rows out of the student's RESULTS.md."""
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
    block = canonical_block()

    state = opening_state()
    _, root = apply_block(state, block, COINBASE)
    total = sum(account.balance for account in state.accounts.values())

    # The over-large transfer, applied to a fresh state on its own.
    overspend_state = opening_state()
    overspend_receipts, _ = apply_block(
        overspend_state, [transfer(0, 1000 * ETHER, ALICE, BOB)], COINBASE
    )
    overspend = overspend_receipts[0]

    # A replay of an already-applied transaction.
    replay_state = opening_state()
    once = transfer(0, ETHER, ALICE, BOB)
    apply_transaction(replay_state, once, COINBASE)
    try:
        apply_transaction(replay_state, once, COINBASE)
        replay_rejected = False
    except TransactionRejected:
        replay_rejected = True

    # A second node applying the same block independently.
    second = opening_state()
    _, second_root = apply_block(second, canonical_block(), COINBASE)

    return [
        ("alice's address", address_of_key(ALICE).hex()),
        ("bob's address", address_of_key(BOB).hex()),
        ("hash of transaction 0", block[0].hash().hex()),
        ("closing state root of the canonical block", root.hex()),
        ("bob's closing balance in wei", str(state.balance_of(address_of_key(BOB)))),
        ("carol's closing balance in wei", str(state.balance_of(address_of_key(CAROL)))),
        ("miner's closing balance in wei", str(state.balance_of(COINBASE))),
        ("alice's closing nonce", str(state.nonce_of(address_of_key(ALICE)))),
        (
            "total across all accounts equals the opening supply (yes/no)",
            yes(total == STARTING_BALANCE),
        ),
        ("the over-large transfer was included in the block (yes/no)", "yes"),
        ("the over-large transfer succeeded (yes/no)", yes(overspend.succeeded)),
        (
            "alice's nonce after the over-large transfer alone",
            str(overspend_state.nonce_of(address_of_key(ALICE))),
        ),
        ("the replayed transaction was rejected (yes/no)", yes(replay_rejected)),
        ("both nodes computed the same state root (yes/no)", yes(root == second_root)),
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
