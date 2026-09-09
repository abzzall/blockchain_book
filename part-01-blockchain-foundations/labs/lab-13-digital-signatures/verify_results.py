"""Marks RESULTS.md for the Part I signature laboratory.

Recomputes every deterministic value the laboratory asks the student to record
and compares it with what they wrote. Reports each row as correct, wrong, or
blank, and exits non-zero unless every row is correct.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from sign_demo import FIRST_MESSAGE, REUSED_NONCE, SECOND_MESSAGE
from signatures import (
    LAB_KEY,
    message_hash,
    public_key,
    recover_nonce,
    recover_private_key,
    serialize_point,
    sign,
    sign_with_nonce,
    verify,
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


def expected_rows() -> list[tuple[str, str]]:
    point = public_key(LAB_KEY)
    compressed = serialize_point(point)
    message = "transfer 10 to alice"
    signature = sign(LAB_KEY, message)

    first = sign_with_nonce(LAB_KEY, FIRST_MESSAGE, REUSED_NONCE)
    second = sign_with_nonce(LAB_KEY, SECOND_MESSAGE, REUSED_NONCE)
    nonce = recover_nonce(
        first, second, message_hash(FIRST_MESSAGE), message_hash(SECOND_MESSAGE)
    )
    recovered = recover_private_key(first, message_hash(FIRST_MESSAGE), nonce)

    return [
        ("compressed public key", compressed.hex()),
        ("length of the compressed public key in bytes", str(len(compressed))),
        ("sha-256 of the message", f"{message_hash(message):064x}"),
        ("signature r", f"{signature.r:064x}"),
        ("signature s", f"{signature.s:064x}"),
        (
            "signing the same message twice gives the same signature (yes/no)",
            "yes" if sign(LAB_KEY, message) == signature else "no",
        ),
        (
            'verifies against "transfer 10 to bob" (yes/no)',
            "yes" if verify(point, "transfer 10 to bob", signature) else "no",
        ),
        (
            'verifies against "transfer 100 to alice" (yes/no)',
            "yes" if verify(point, "transfer 100 to alice", signature) else "no",
        ),
        ("shared r across the two signatures", f"{first.r:064x}"),
        ("recovered private key", f"{recovered:064x}"),
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
