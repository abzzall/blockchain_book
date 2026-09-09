"""A synthetic value-flow graph for the Part XV laboratory.

Every address, amount, and label in this file is invented. Nothing here
corresponds to any real address, entity, or case, and nothing in this laboratory
touches any network or any commercial analytics service.

The purpose is to have a graph with the shape of a real one, so that the
mechanics of exposure scoring can be examined without making any claim about a
real party.

SAFETY AND SCOPE: this is a teaching model of a measurement technique. It is not
a compliance tool, it produces no legal conclusion about anybody, and the
thresholds used here are arbitrary numbers chosen to make the arithmetic legible.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Transfer:
    """Value moving from one address to another at a point in time."""

    source: str
    target: str
    amount: int
    time: int


@dataclass
class FlowGraph:
    """A directed multigraph of transfers, plus whatever labels are known."""

    transfers: list[Transfer] = field(default_factory=list)
    labels: dict[str, str] = field(default_factory=dict)

    def add(self, source: str, target: str, amount: int, time: int) -> "FlowGraph":
        if amount <= 0:
            raise ValueError("a transfer must move a positive amount")
        self.transfers.append(Transfer(source, target, amount, time))
        return self

    def label(self, address: str, label: str) -> "FlowGraph":
        """Attach a known category to an address.

        A label is an external claim about an address, supplied by whoever
        compiled it. It is not a fact the chain records, and its accuracy is an
        assumption the whole exercise rests on.
        """
        self.labels[address] = label
        return self

    def addresses(self) -> set[str]:
        found: set[str] = set(self.labels)
        for transfer in self.transfers:
            found.add(transfer.source)
            found.add(transfer.target)
        return found

    def incoming(self, address: str) -> list[Transfer]:
        return [t for t in self.transfers if t.target == address]

    def outgoing(self, address: str) -> list[Transfer]:
        return [t for t in self.transfers if t.source == address]

    def received(self, address: str) -> int:
        return sum(t.amount for t in self.incoming(address))

    def ordered(self) -> list[Transfer]:
        """Transfers in time order, which is the order exposure propagates in."""
        return sorted(self.transfers, key=lambda t: (t.time, t.source, t.target))
