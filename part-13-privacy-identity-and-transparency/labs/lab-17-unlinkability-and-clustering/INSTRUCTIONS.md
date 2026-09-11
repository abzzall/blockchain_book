# Implementation 17 — Unlinkability and address clustering

## Outcome

You will implement, in a language of your choice, the analysis that an observer
of a public ledger performs: the common-input-ownership heuristic, change
detection, and an attribution procedure that composes the two. You will apply it
to a synthetic history, watch a mixing round defeat it, and then watch an
ordinary consolidation three transactions later undo the mix completely.

The finding to take away is that nothing is broken at any point. The mix does
exactly what it promises. The owner destroys it themselves, with a transaction
that looks entirely unremarkable.

**The task does not require any particular programming language.** A complete
reference solution in Python is supplied, but every value recorded here follows
from the rules below.

This runs entirely offline. There is no network, no wallet, no browser, and no
test assets.

## Safety and scope

- Network: none. Every address and amount in this exercise is invented.
- Nothing here corresponds to any real address, transaction, or party, and
  nothing produced by it is a statement about anybody.
- The heuristics below are the published, widely-described ones. Implementing
  them teaches what a public record discloses; it is not a tool for
  investigating real parties.

## Verified versions

| Component | Version |
|---|---|
| Verification date | 2026-09-09 |
| Python (reference solution) | 3.11 or newer |
| Dependencies | none (standard library only) |

---

## Specification

### The ledger

An output-based ledger. A transaction has a list of **input addresses** (whose
entire balances it consumes) and a list of **outputs**, each an address and an
amount. A funding transaction has no inputs. The fee of a transaction is its
input total minus its output total.

### Common-input-ownership heuristic

If a transaction has two or more input addresses, one party was able to
authorise all of them, so all of its inputs belong to a single cluster. Merge
transitively: clusters are the connected components under this relation.

This is not a guess. It is a fact about what the record shows.

### Change detection

Given a transaction and a set of addresses already attributed to the sender:

1. If any output pays an address already in that set, those outputs are the
   change candidates.
2. Otherwise, the candidates are the outputs whose amount is **not** a multiple
   of ten and which are not already attributed.

Rule 2 is a heuristic standing in for the real one, which guesses that a payment
is a round number and the remainder is change. It is a guess and a wallet can
defeat it, which is why an attribution built with it is weaker than one built
from common inputs alone.

### Attribution

Starting from a set of seed addresses, alternate the two rules until nothing
more is added:

- if **any** input of a transaction is attributed, attribute **every** input;
- if **every** input of a transaction is attributed, attribute its change
  candidates.

### Anonymity set

For an address that is an output of a transaction with more than two outputs all
of the same amount, the anonymity set is every output address of that
transaction. Otherwise it is the address alone.

### The scenario under test

| Time | Transaction | Inputs | Outputs |
|---|---|---|---|
| 0 | funding | — | `a1`:10, `a2`:10, `a3`:10 |
| 1 | `purchase` | `a1`, `a2` | `shop`:10, `a4`:9 |
| 2 | funding | — | `brona-in`:10, `cemal-in`:10, `dilnaz-in`:10, `eren-in`:10 |
| 3 | `mix` | `a3`, `brona-in`, `cemal-in`, `dilnaz-in`, `eren-in` | `alice-out`:10, `brona-out`:10, `cemal-out`:10, `dilnaz-out`:10, `eren-out`:10 |
| 4 | `consolidate` | `alice-out`, `a4` | `savings`:13 |

Seed the attribution from `a1` alone.

---

## Sample solution

| File | What it holds |
|---|---|
| `chain.py` | the synthetic ledger |
| `clustering.py` | union-find, the two heuristics, attribution, anonymity sets |
| `scenario.py` | the three stages of the history |
| `privacy_demo.py` | the four commands below |
| `test_clustering.py` | 17 automated tests |

```bash
cd part-13-privacy-identity-and-transparency/labs/lab-17-unlinkability-and-clustering
python3 -m unittest -v
```

## Command-line work

### Part A — The record

```bash
python3 privacy_demo.py record
```

Record how many addresses appear. Note that no name is attached to any of them.

### Part B — Clustering

```bash
python3 privacy_demo.py cluster
```

Record the cluster containing `a1` and the cluster containing `a3`, and the
change candidate for the purchase when nothing is known in advance.

### Part C — The mix

```bash
python3 privacy_demo.py mix
```

Record the size of the anonymity set of `alice-out`, and whether `alice-out` is
attributed to `a1`'s owner at this stage. Note which address was used to enter
the mix and why it was not already attributed.

### Part D — Undoing it

```bash
python3 privacy_demo.py undo
```

Record whether `alice-out` is attributed now, how many addresses are attributed
in total, and which addresses the analyst gained.

## What to explain

`RESULTS.md` asks five questions in prose: what justifies the common-input
merge, what the owner did right before the mix, what the mix achieved and left
visible, the chain of inference that undid it, and what chain analysis actually
works from.

## Verification

```bash
python3 verify_results.py
```

Ten marked values, each reported correct, wrong, or blank.

## Troubleshooting and reset

- Nothing here writes state.
- If `a3` appears in `a1`'s cluster before the mix, your clustering is merging
  outputs as well as inputs. Only inputs justify the merge.
- If `alice-out` is attributed before the consolidation, check that attribution
  spreads from inputs of a transaction, not from its outputs.
- If attribution never reaches `alice-out` after the consolidation, your change
  rule probably never attributed `a4`.

## Optional self-study

- Change the purchase so that both outputs are round numbers, and work out what
  that does to the attribution. This is what a wallet avoiding change detection
  is trying to achieve.
- Read about the payjoin construction, in which the recipient contributes an
  input, and explain what it does to the common-input heuristic.
