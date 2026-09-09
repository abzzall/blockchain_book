"""A synthetic output-based ledger for the Part XIII privacy laboratory.

Everything here is invented. No real address, transaction, or amount appears in
this file or its tests, and nothing in it touches any network. The point is to
have a public record with the shape of a real one, so that the analysis applied
to it is the analysis that is applied to real ones.

SAFETY: the addresses are short labels, not real addresses. Do not attempt to
map any of this onto a live chain.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Output:
    """One spendable output: who can spend it, and how much it holds."""

    address: str
    amount: int


@dataclass
class Transaction:
    """A transaction consuming outputs and creating new ones.

    Inputs are named by the address that controlled them, which is all a
    graph-based analysis ever gets to see.
    """

    txid: str
    inputs: list[str]
    outputs: list[Output]
    time: int = 0

    @property
    def input_total(self) -> int:
        return sum(self.spent.get(address, 0) for address in self.inputs)

    spent: dict[str, int] = field(default_factory=dict)

    @property
    def output_total(self) -> int:
        return sum(output.amount for output in self.outputs)

    @property
    def output_addresses(self) -> list[str]:
        return [output.address for output in self.outputs]


class Ledger:
    """An append-only list of transactions, readable in full by anybody."""

    def __init__(self) -> None:
        self.transactions: list[Transaction] = []
        self.balances: dict[str, int] = {}

    def fund(self, address: str, amount: int, time: int = 0) -> Transaction:
        """Bring value into the ledger, as a coinbase or an exchange withdrawal would."""
        tx = Transaction(f"fund-{len(self.transactions)}", [], [Output(address, amount)], time)
        self.transactions.append(tx)
        self.balances[address] = self.balances.get(address, 0) + amount
        return tx

    def spend(
        self,
        inputs: list[str],
        outputs: list[tuple[str, int]],
        time: int = 0,
        txid: str | None = None,
    ) -> Transaction:
        """Spend the whole balance of every input address into the given outputs."""
        spent = {address: self.balances.get(address, 0) for address in inputs}
        available = sum(spent.values())
        total_out = sum(amount for _, amount in outputs)
        if total_out > available:
            raise ValueError(f"cannot spend {total_out} from {available}")

        tx = Transaction(
            txid or f"tx-{len(self.transactions)}",
            list(inputs),
            [Output(address, amount) for address, amount in outputs],
            time,
        )
        tx.spent = spent
        self.transactions.append(tx)

        for address in inputs:
            self.balances[address] = 0
        for address, amount in outputs:
            self.balances[address] = self.balances.get(address, 0) + amount
        return tx

    def addresses(self) -> set[str]:
        seen: set[str] = set()
        for tx in self.transactions:
            seen.update(tx.inputs)
            seen.update(tx.output_addresses)
        return seen

    def fee_of(self, tx: Transaction) -> int:
        return tx.input_total - tx.output_total
