"""Exposure scoring: propagating a label through a value-flow graph.

Two methods are implemented, because the choice between them is the point. Both
are defensible, both are in use, and they disagree about who is implicated --
which means a figure quoted without its method is not interpretable.
"""

from __future__ import annotations

from flows import FlowGraph

#: Addresses that are treated as absorbing: value entering them stops
#: propagating, because the operator, not the chain, decides what happens next.
ABSORBING = {"exchange", "custodian"}


def proportional_exposure(graph: FlowGraph, origin: str) -> dict[str, float]:
    """The haircut method.

    An address's exposure is the share of the value it received that can be
    traced to the origin. Mixing tainted and untainted value dilutes: receiving
    one unit from a fully exposed address and nine from clean ones leaves an
    exposure of one tenth.

    This is the method that decays with distance, and the one that produces
    small numbers for addresses far from the origin.
    """
    exposure = {address: 0.0 for address in graph.addresses()}
    exposure[origin] = 1.0
    received_tainted = {address: 0.0 for address in graph.addresses()}
    received_total = {address: 0.0 for address in graph.addresses()}

    for transfer in graph.ordered():
        if graph.labels.get(transfer.source) in ABSORBING:
            continue
        received_total[transfer.target] += transfer.amount
        received_tainted[transfer.target] += transfer.amount * exposure[transfer.source]
        if received_total[transfer.target] > 0:
            exposure[transfer.target] = (
                received_tainted[transfer.target] / received_total[transfer.target]
            )
    exposure[origin] = 1.0
    return exposure


def poison_exposure(graph: FlowGraph, origin: str) -> dict[str, float]:
    """The poison method.

    Any address that received anything traceable to the origin is fully
    exposed, however small the amount and however many hops away. It does not
    decay, so it implicates far more addresses than the haircut method.
    """
    exposure = {address: 0.0 for address in graph.addresses()}
    exposure[origin] = 1.0
    changed = True
    while changed:
        changed = False
        for transfer in graph.ordered():
            if graph.labels.get(transfer.source) in ABSORBING:
                continue
            if exposure[transfer.source] > 0 and exposure[transfer.target] == 0:
                exposure[transfer.target] = 1.0
                changed = True
    return exposure


def hops_from(graph: FlowGraph, origin: str) -> dict[str, int]:
    """Shortest number of transfers between the origin and each address."""
    distance = {origin: 0}
    frontier = [origin]
    while frontier:
        nxt = []
        for address in frontier:
            for transfer in graph.outgoing(address):
                if transfer.target not in distance:
                    distance[transfer.target] = distance[address] + 1
                    nxt.append(transfer.target)
        frontier = nxt
    return distance


def flagged(exposure: dict[str, float], threshold: float) -> set[str]:
    """Addresses whose exposure reaches the threshold.

    A flag is a candidate for review, not a conclusion about anybody.
    """
    return {address for address, value in exposure.items() if value >= threshold}


def confusion(flagged_set: set[str], truly_involved: set[str], population: set[str]) -> dict[str, int]:
    """Compare what a threshold flags against what the scenario says is true.

    Real monitoring has no such ground truth, which is precisely why the cost of
    a false positive has to be reasoned about rather than measured.
    """
    return {
        "flagged": len(flagged_set),
        "true_positives": len(flagged_set & truly_involved),
        "false_positives": len(flagged_set - truly_involved),
        "missed": len(truly_involved - flagged_set),
        "population": len(population),
    }
