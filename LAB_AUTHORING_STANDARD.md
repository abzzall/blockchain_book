# Lab authoring standard

This standard applies to every lab in this book, including those involving a
browser, wallet, explorer, faucet, Remix IDE, or dApp interface.

## Labs do not use screenshots

Earlier versions of this standard asked students to capture screenshots as
evidence. **They no longer do, and no lab may require one.** The reasons are
practical rather than stylistic:

- A screenshot proves that a screen looked a certain way on one machine. It
  cannot be re-checked by anyone, including the student.
- Interfaces change. A lab whose evidence is a picture of a wallet dates as
  fast as the wallet does, and Chapter 19 already showed how fast that is.
- Images invite accidental disclosure of balances, addresses, and account
  names that have nothing to do with the exercise.
- Marking a screenshot is a judgement about a picture. Marking a transaction
  hash is a lookup.

**Evidence is a recorded value or a written explanation, never an image.**

## What counts as evidence

In order of preference:

1. **An on-chain artefact.** A transaction hash, a contract address, a block
   number, an event's topic. Anyone can look these up afterwards, and a script
   can check them automatically.
2. **A recorded value.** A balance before and after, a gas figure, a returned
   value, an error selector. The student writes it down; a verification step
   confirms it where confirmation is possible.
3. **A written explanation.** For anything genuinely visual or procedural —
   what a wallet's confirmation dialogue showed, why a button was disabled,
   what an interface did while a transaction was pending — the student
   **describes it in their own words**, in plain prose. This is the part a
   screenshot never actually demonstrated understanding of anyway.

A lab asks for the third kind wherever the first two are impossible. It never
asks for a picture instead.

## Required lab files

Each lab lives in its own directory and includes:

- `LAB.md` — the student-facing procedure;
- `RESULTS.md` — a template the student fills in, listing every value to
  record and every question to answer in prose;
- application and contract source code;
- automated tests for everything checkable without a browser;
- a verification script where recorded values can be checked mechanically;
- setup, build, deployment, or reset scripts the procedure needs;
- `.env.example` when configuration is needed, with names and safe
  placeholders only;
- a version record in `LAB.md`.

Generated dependencies, build artefacts, private `.env` files, wallet exports,
and secret material do not belong in the repository.

## Required structure of `LAB.md`

1. **Outcome** — what the student will have working at the end.
2. **Safety and environment** — local or test network, test-only assets, and
   the dedicated-account rule.
3. **Verified versions** — the exact environment used to validate the lab, with
   a date.
4. **Files supplied.**
5. **Command-line work** — everything that can be automated, with the commands.
6. **Interactive work** — numbered, single-action steps, each naming the
   *result* to look for rather than the pixels to look at.
7. **What to record** — the values that go into `RESULTS.md`.
8. **What to explain** — the questions answered in prose.
9. **Verification** — how the student, or a marker, checks the recorded values.
10. **Troubleshooting and reset.**

## Writing the interactive steps

Because interfaces change, a step describes **what must become true**, not
where to click. Prefer:

> Send 0.001 test ETH to the second account. Record the transaction hash.

over:

> Click the blue Send button in the top right, then click Confirm.

Where a specific control must be named, name it and add that labels change and
the current documentation is the authority. Chapter 19's safety note is the
model: where the book and the screen disagree, the screen is right.

## Verification without images

Every lab must be markable without seeing the student's machine. Achieve this
by ensuring each recorded value is one of:

- **checkable on a public network** — a transaction hash, address, or block
  number a marker can look up, and which a supplied script can verify;
- **checkable locally** — a deterministic local chain produces the same
  addresses for everyone, as Chapter 22 established, so a contract address from
  a fresh local chain is a fixed expected value;
- **self-consistent** — a recorded gas figure, balance change, or error
  selector that the supplied tests independently reproduce.

Where a value is none of these, it belongs in the "explain" section instead.

## Safety

Unchanged and non-negotiable. Labs use local chains or test networks and
test-only assets; they use a dedicated educational account; they never ask for
a seed phrase or private key; they never instruct mainnet activity with real
value. A lab that records a transaction hash records a **testnet** hash.

Prefer a deterministic local chain unless public-network behaviour is itself
the learning outcome.

## Project validation responsibilities

Before a lab is handed to a student, the project must:

- consult current official documentation for every version-sensitive tool;
- pin dependencies, and prefer LTS releases per `CONTEXT/code-validation.md`;
- install, compile, test, and run the command-line portion;
- validate contracts and deployment scripts on a local development network;
- run the verification script against known-good inputs;
- record exactly what was tested, and distinguish automated checks from
  manual interactive work;
- scan tracked files for secrets and funded credentials.

## Publication readiness

The companion tree remains independently publishable. A lab is ready when a
clean checkout can follow its commands and the automated checks pass.
