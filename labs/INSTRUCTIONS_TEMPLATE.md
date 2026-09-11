# Lab N — Title

> Skeleton for a new lab. It is not a student assignment. Follow
> [`../LAB_AUTHORING_STANDARD.md`](../LAB_AUTHORING_STANDARD.md), which this
> template implements.

## Outcome

What the student will have working, and what they will be able to explain, at
the end. One short paragraph.

## Safety and environment

- Network: local development chain unless the work is explicitly marked as an
  optional self-study extension.
- Assets: test-only, and why they have no value.
- The dedicated-account rule where a wallet is involved.
- Never ask for a seed phrase or a private key. Never instruct mainnet activity.

## Verified versions

| Component | Version |
|---|---|
| Verification date | |
| Node.js | |
| *(each version-sensitive tool)* | |

## Files supplied

A table of every supplied file and what it holds.

## Command-line work

Everything that can be automated, with the exact commands. State how many tests
must pass before the student continues.

```bash
cd part-NN-name/labs/lab-NN-name
npm run build
npm test
```

Then one subsection per part of the exercise, each ending in the values to
record.

## Interactive work

Only where a browser, wallet, or IDE is genuinely required.

**Describe what must become true, not where to click.** Interfaces change faster
than books do. Prefer "Send 0.001 test ETH to the second account and record the
transaction hash" over naming a button. Where a control must be named, say that
labels change and the current documentation is the authority.

## What to record

Point at `RESULTS.md`. Every marked value must be one of:

- **checkable locally** — a fresh local chain is deterministic, so contract
  addresses and gas figures repeat exactly for everyone;
- **derived from a signature** — a function selector or an event topic0;
- **self-consistent** — a figure the supplied tests independently reproduce.

Anything else belongs in "What to explain" instead.

## What to explain

The questions answered in prose in `RESULTS.md`. These carry everything an image
was once asked to carry: what an interface showed, why a control was disabled,
what happened while a transaction was pending. **No lab asks for a screenshot.**

## Verification

```bash
npm run verify
```

`scripts/verify-results.mjs` reads the `| label | value |` rows out of the
student's `RESULTS.md`, recomputes each value, and reports it as correct, wrong,
or blank, exiting non-zero unless all are correct.

**Pin every marked value in `test/Deterministic.ts` as well.** If the contract
changes and a gas figure moves, the suite must fail rather than the marking
script silently going wrong.

## Troubleshooting and reset

How to get back to a clean state, and the two or three failures students
actually hit — including the expected reverts, which are the lab working rather
than breaking.

## Required files

- `LAB.md`, `RESULTS.md`
- application and contract source
- `test/` — behavioural tests, and `Deterministic.ts` for the marked values
- `scripts/` — `walkthrough`, `selectors` where there is an ABI, `verify-results`
- `.env.example` where configuration is needed, with safe placeholders only

Generated dependencies, build artefacts, private `.env` files, and any secret
material stay out of the repository.
