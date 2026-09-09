"""The synthetic scenario every command and the marker share.

An invented origin sends value onward. Some recipients pass it on knowingly;
others are ordinary parties who happen to receive value that was mixed with it
several hops earlier and have no way of knowing.

The scenario carries a ground truth -- who was actually involved -- which real
monitoring never has. It is here so that the cost of a threshold can be counted
rather than asserted.
"""

from __future__ import annotations

from flows import FlowGraph

ORIGIN = "origin"

#: The parties the scenario says were actually involved.
TRULY_INVOLVED = {"origin", "hop1", "hop2"}


def scenario() -> FlowGraph:
    graph = FlowGraph()
    graph.label(ORIGIN, "flagged-origin")
    graph.label("exchange-a", "exchange")
    graph.label("merchant", "merchant")

    # The origin splits its holdings across two intermediaries.
    graph.add(ORIGIN, "hop1", 60, time=1)
    graph.add(ORIGIN, "hop2", 40, time=1)

    # hop1 mixes what it received with a much larger clean balance before
    # paying onward, which is what dilutes exposure under the haircut method.
    graph.add("clean-treasury", "hop1", 540, time=2)
    graph.add("hop1", "trader", 300, time=3)
    graph.add("hop1", "merchant", 300, time=3)

    # hop2 passes its holding on almost undiluted.
    graph.add("hop2", "trader", 40, time=3)

    # The trader pays an ordinary supplier, several hops from the origin.
    graph.add("trader", "supplier", 200, time=4)
    graph.add("supplier", "employee", 100, time=5)

    # An exchange is absorbing: what happens after a deposit is the operator's
    # record, not the chain's.
    graph.add("merchant", "exchange-a", 250, time=5)
    graph.add("exchange-a", "unrelated-customer", 250, time=6)

    # A party with no connection to any of it.
    graph.add("clean-treasury", "unconnected", 100, time=6)
    return graph
