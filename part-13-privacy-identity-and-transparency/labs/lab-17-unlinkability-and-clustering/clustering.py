"""Address clustering: what an observer of a public ledger can work out.

Two heuristics do most of the work in practice, and neither breaks any
cryptography. They read a record that was published deliberately.
"""

from __future__ import annotations

from chain import Ledger, Transaction


class UnionFind:
    """Disjoint sets, used to merge addresses believed to share an owner."""

    def __init__(self) -> None:
        self.parent: dict[str, str] = {}

    def add(self, item: str) -> None:
        self.parent.setdefault(item, item)

    def find(self, item: str) -> str:
        self.add(item)
        root = item
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[item] != root:  # path compression
            self.parent[item], item = root, self.parent[item]
        return root

    def union(self, left: str, right: str) -> None:
        self.parent[self.find(left)] = self.find(right)

    def clusters(self) -> list[set[str]]:
        groups: dict[str, set[str]] = {}
        for item in self.parent:
            groups.setdefault(self.find(item), set()).add(item)
        return sorted(groups.values(), key=lambda g: (-len(g), sorted(g)[0]))


def common_input_clusters(ledger: Ledger) -> list[set[str]]:
    """The common-input-ownership heuristic.

    If several addresses are spent together in one transaction, whoever made
    that transaction was able to authorise all of them. That is a fact about
    the record, not a guess, and it is the single most productive heuristic in
    chain analysis.
    """
    union = UnionFind()
    for address in ledger.addresses():
        union.add(address)
    for tx in ledger.transactions:
        if len(tx.inputs) < 2:
            continue
        first = tx.inputs[0]
        for other in tx.inputs[1:]:
            union.union(first, other)
    return union.clusters()


def cluster_of(clusters: list[set[str]], address: str) -> set[str]:
    for cluster in clusters:
        if address in cluster:
            return cluster
    return {address}


def change_candidates(tx: Transaction, known: set[str]) -> list[str]:
    """Outputs that look like change returning to the sender.

    A weaker heuristic than common input, and one that a wallet can defeat. An
    output paying an address already attributed to the sender is the clearest
    case; a lone output that is not a round number is the classic guess.
    """
    candidates = [address for address in tx.output_addresses if address in known]
    if candidates:
        return candidates
    return [
        output.address
        for output in tx.outputs
        if output.amount % 10 != 0 and output.address not in known
    ]


def anonymity_set(ledger: Ledger, address: str) -> set[str]:
    """Addresses an observer cannot distinguish from `address` after a mix.

    The output of a mixing transaction with equal-valued outputs leaves every
    recipient equally likely, so the anonymity set is every output of that
    transaction. It shrinks the moment anything distinguishes them again.
    """
    for tx in ledger.transactions:
        if address not in tx.output_addresses:
            continue
        amounts = [output.amount for output in tx.outputs]
        if len(tx.outputs) > 2 and len(set(amounts)) == 1:
            return set(tx.output_addresses)
    return {address}


def attribute(ledger: Ledger, seeds: set[str]) -> set[str]:
    """Attribute addresses to one owner, composing both heuristics.

    Real analysis does not apply a single rule. It starts from something known
    --- an address published by its owner, or one identified at an exchange ---
    and grows the set by alternating between the two heuristics until nothing
    more is added:

    1. If any input of a transaction is attributed, every input is attributed,
       because one party authorised all of them.
    2. If every input of a transaction is attributed, its change output is
       probably attributed too.

    The second rule is a guess and the first is not, which is why an attribution
    built with both should be reported as weaker than one built with the first
    alone.
    """
    owned = set(seeds)
    changed = True
    while changed:
        changed = False
        for tx in ledger.transactions:
            if not tx.inputs:
                continue
            if any(address in owned for address in tx.inputs):
                new = set(tx.inputs) - owned
                if new:
                    owned |= new
                    changed = True
            if all(address in owned for address in tx.inputs):
                for candidate in change_candidates(tx, owned):
                    if candidate not in owned:
                        owned.add(candidate)
                        changed = True
    return owned
