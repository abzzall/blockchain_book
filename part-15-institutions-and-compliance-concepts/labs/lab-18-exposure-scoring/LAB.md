# Implementation 18 — Exposure scoring on a synthetic flow graph

## Outcome

You will implement, in a language of your choice, the measurement that sits
underneath transaction-monitoring tools: propagating a label through a graph of
value flows, and applying a threshold to the result. You will implement both of
the accepted propagation methods, compare what they flag, and count the errors a
threshold makes against a ground truth that real monitoring never has.

The finding is that no threshold in this scenario separates the parties who were
involved from those who were not, and that an uninvolved party can score higher
than a knowing one. That is a property of the measurement, not a defect in it.

**The task does not require any particular programming language.**

## Safety and scope

This is a teaching model of a measurement technique. It is **not** a compliance
tool, and it produces no legal conclusion about anybody.

- Every address, amount, and label here is invented. Nothing corresponds to any
  real party, entity, case, or service.
- The thresholds are arbitrary numbers chosen to make the arithmetic legible.
  They are not standards, and no significance attaches to any of them.
- This book describes monitoring concepts neutrally and does not state what any
  jurisdiction requires of anybody. Obligations, where they exist, are set by
  law and by the institutions that supervise it, and a reader with a real
  question should consult current official sources for their own jurisdiction.

## Verified versions

| Component | Version |
|---|---|
| Verification date | 2026-09-09 |
| Python (reference solution) | 3.11 or newer |
| Dependencies | none (standard library only) |

---

## Specification

### The graph

A directed multigraph of transfers, each a source address, a target address, a
positive amount, and a time. Some addresses carry a **label**, which is an
external claim supplied by whoever compiled it, not a fact the chain records.

Addresses labelled `exchange` or `custodian` are **absorbing**: exposure does
not propagate out of them, because what happens after a deposit is the
operator's internal record rather than anything on the chain.

### Proportional exposure (the haircut method)

Process transfers in time order. For each transfer whose source is not
absorbing, accumulate at the target both the total amount received and the
tainted amount received, where the tainted part is the transfer's amount
multiplied by the source's current exposure. The target's exposure is its
tainted total divided by its received total. The origin's exposure is 1.

Mixing dilutes: receiving one unit from a fully exposed address and nine from
clean ones leaves an exposure of one tenth.

### Poison exposure

Any address reachable from the origin, without passing through an absorbing
address, has exposure 1. Everything else has 0. It does not decay with distance
or with dilution.

### Thresholds and errors

An address is **flagged** when its exposure is greater than or equal to the
threshold. Given the scenario's ground truth, count flagged addresses, true
positives, false positives, and involved parties missed.

### The scenario under test

Ground truth: `origin`, `hop1`, and `hop2` were involved. Nobody else was.

| Time | From | To | Amount |
|---|---|---|---|
| 1 | `origin` | `hop1` | 60 |
| 1 | `origin` | `hop2` | 40 |
| 2 | `clean-treasury` | `hop1` | 540 |
| 3 | `hop1` | `trader` | 300 |
| 3 | `hop1` | `merchant` | 300 |
| 3 | `hop2` | `trader` | 40 |
| 4 | `trader` | `supplier` | 200 |
| 5 | `supplier` | `employee` | 100 |
| 5 | `merchant` | `exchange-a` | 250 |
| 6 | `exchange-a` | `unrelated-customer` | 250 |
| 6 | `clean-treasury` | `unconnected` | 100 |

`exchange-a` is labelled `exchange`.

---

## Sample solution

| File | What it holds |
|---|---|
| `flows.py` | the graph and its labels |
| `scoring.py` | both propagation methods, hop distance, thresholds, error counting |
| `scenario.py` | the scenario and its ground truth |
| `risk_demo.py` | the four commands below |
| `test_scoring.py` | 18 automated tests |

```bash
cd part-15-institutions-and-compliance-concepts/labs/lab-18-exposure-scoring
python3 -m unittest -v
```

## Command-line work

```bash
python3 risk_demo.py graph        # Part A: the flows and the labels
python3 risk_demo.py score        # Part B: haircut exposure and hop distance
python3 risk_demo.py methods      # Part C: haircut against poison
python3 risk_demo.py thresholds   # Part D: what each threshold costs
```

In Part B, compare the lines for `hop1` and `trader` before going further. In
Part D, look for a threshold that flags all three involved parties and nobody
else.

## What to explain

`RESULTS.md` asks five questions: the arithmetic that put an uninvolved party
above a knowing one, why propagation stops at the exchange, what different
question each method answers, who bears the cost of a false positive, and what
follows from real monitoring having no ground truth.

## Verification

```bash
python3 verify_results.py
```

Twelve marked values, each reported correct, wrong, or blank.

## Troubleshooting and reset

- Nothing here writes state.
- If `unrelated-customer` has a positive exposure, the absorbing label is not
  being honoured.
- If `hop1` scores 1.0, you are propagating without dividing by the total
  received, which is the poison method rather than the haircut one.
- If exposures exceed 1, the tainted total is being accumulated but the received
  total is not.

## Optional self-study

- Implement a first-in-first-out method, in which specific units are tracked
  rather than proportions, and compare what it flags with the other two.
- Add a second labelled origin and decide how to report an address exposed to
  both. There is no single correct answer, which is itself worth noticing.
