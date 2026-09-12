# Implementation authoring standard

This standard applies to every implementation in this book, including those involving a
browser, wallet, explorer, faucet, Remix IDE, or dApp interface.

## Implementations do not use screenshots

Earlier versions of this standard asked students to capture screenshots as
evidence. **They no longer do, and no implementation may require one.** The reasons are
practical rather than stylistic:

- A screenshot proves that a screen looked a certain way on one machine. It
  cannot be re-checked by anyone, including the student.
- Interfaces change. A exercise whose evidence is a picture of a wallet dates as
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

A exercise asks for the third kind wherever the first two are impossible. It never
asks for a picture instead.

## Required exercise files

Each exercise lives in its own directory and includes:

- `INSTRUCTIONS.md` — the student-facing procedure;
- `RESULTS.md` — a template the student fills in, listing every value to
  record and every question to answer in prose;
- application and contract source code;
- automated tests for everything checkable without a browser;
- a verification script where recorded values can be checked mechanically,
  named for the language of the exercise --- `scripts/verify-results.mjs` for the
  JavaScript and Solidity exercises, `verify_results.py` for the Python ones.
  Where a value table is the wrong instrument --- a browser dApp marked by its
  own test suites, or an exercise that remarks itself by rerunning its scenario
  --- say so in `INSTRUCTIONS.md` and omit the script;
- setup, build, deployment, or reset scripts the procedure needs;
- `.env.example` when configuration is needed, with names and safe
  placeholders only;
- a version record in `INSTRUCTIONS.md`.

Generated dependencies, build artefacts, private `.env` files, wallet exports,
and secret material do not belong in the repository.

## Required structure of `INSTRUCTIONS.md`

1. **Outcome** — what the student will have working at the end.
2. **Safety and environment** — local or test network, test-only assets, and
   the dedicated-account rule.
3. **Verified versions** — the exact environment used to validate the exercise, with
   a date.
4. **Files supplied.**
5. **Command-line work** — everything that can be automated, with the commands.
6. **Interactive work** — numbered, single-action steps, each naming the
   *result* to look for rather than the pixels to look at.
7. **What to record** — the values that go into `RESULTS.md`.
8. **What to explain** — the questions answered in prose.
9. **Verification** — how the student, or a marker, checks the recorded values.
10. **Troubleshooting and reset.**

This list is the specification. There is no separate skeleton to copy, because a
template kept alongside twenty working exercises drifts out of step with them
and nothing fails when it does. Start a new exercise by copying the existing one
whose shape is closest — it is current by construction, and its tests prove it.

## How much to explain: three tiers

Every worked example sorts its material into three tiers, and each tier gets a
different treatment. The failure this prevents is the common one where a
tutorial explains the chain in depth, waves at everything else, and leaves the
reader unable to assemble a working program from either.

**Tier 1 — the blockchain parts. Explain fully.**
Contract calls, ABIs and encoding, addresses and chain ids, transaction
lifecycle and receipts, gas and fees, signing, wallet permission, events,
confirmation and finality, `bigint` amounts. These are the subject. Explain what
each does, why it is that way, and what it does not establish. Never reduce one
of these to a command to copy.

**Tier 2 — not blockchain, but where readers actually get stuck. Explain.**
Anything at the boundary between ordinary programming and the chain, where the
chain's behaviour makes the ordinary technique wrong:

- error handling: every distinct failure, what each means, what it cost, what
  the user should do next, and never a state that hangs;
- holding and refreshing data returned by a chain call, and why the obvious
  place to put it is the wrong one;
- moving that data between components, modules, or callbacks;
- wiring an event handler — a button, a form — to a call that can fail, and the
  states it passes through;
- connecting to a wallet and keeping the connection across reloads and across
  the user changing account or network;
- configuration and secrets: what may be committed, what reaches the browser,
  what to do when a key is leaked.

This tier is explained because the chain is what makes it hard. The same
techniques in a program with no chain in it would need no comment.

**Tier 3 — incidental. Supply whole, do not explain.**
Anything whose only consequence is cosmetic or structural. Styling, markup
scaffolding, build and tooling configuration, directory layout, boilerplate
entry points, and any dependency install that is merely an install are the
common cases, but the test is the principle and not the list: if getting it
wrong produces an ugly result rather than a wrong one, it is tier 3.

Give the file, say what it is in one clause, and move on — "copy `styles.css`
from the repository", "`npm install`, which fetches what the file names". Do not
apologise for it and do not half-explain it. A reader who wants to know how CSS
or a bundler works is reading the wrong book, and the space belongs to tier 1.

A step whose tier is unclear is tier 2 if getting it wrong produces a broken or
misleading interface, and tier 3 if getting it wrong produces an ugly one.

## Steps are atomic

A step is one action. Not one file, not one contract, not "now write the
withdrawal function" — one thing the reader does, and then the reason it was
needed.

The test is whether the step can be stated as a single instruction with a single
justification:

> To let the service take payment, add `payable` to `deposit`. Without it the
> compiler rejects any call carrying value, so the function cannot receive ether
> at all.

That is a step. "Write the vault contract" is not; neither is showing thirty
lines and describing them afterwards. When a contract is built up over a section,
each state variable, each modifier, each guard clause, each external call is its
own step, in the order a person would actually write them, with the code added at
that step shown on its own.

Two consequences follow. The reader can stop at any step and have something that
compiles or a stated reason why it does not yet. And every line in the finished
file has been justified once, which is the property that distinguishes a
walkthrough from a listing with commentary.

The exception is tier 3. Incidental material is not decomposed at all — it is
handed over whole, because splitting a stylesheet into steps would imply the
reader should be reasoning about each rule, which is exactly the message the tier
system exists to avoid sending.

## Installation is explained once

The first chapter that needs a tool explains how to install it, including how to
tell that it worked. Every later chapter says only to make sure it is installed
and cross-references the first. Repeating the instructions in each chapter is
what makes a book feel padded; omitting them everywhere is what makes a reader
give up on chapter one.

## Guided examples come in two folders

Where an example is large enough to build up rather than read, it ships as a
pair:

- `based-on/` — the starting point. Tests complete, code stubbed behind numbered
  steps that match the chapter's.
- `full-code/` — the finished result, which must pass its own tests.

Every explanation of such an example ends by naming where the full code is, as a
path plus a link to the repository. A reader must never have to guess whether a
finished version exists.

Only `full-code/` is wired into `scripts/check-all.sh`; `based-on/` is expected
to fail until the reader completes it. A new sample directory matches no
workspace glob in the root `package.json`, so it is installed by nothing and
tested by nothing until it is added to that script by hand.

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

Every exercise must be markable without seeing the student's machine. Achieve this
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

Unchanged and non-negotiable. Exercises use local chains or test networks and
test-only assets; they use a dedicated educational account; they never ask for
a seed phrase or private key; they never instruct mainnet activity with real
value. A exercise that records a transaction hash records a **testnet** hash.

Prefer a deterministic local chain unless public-network behaviour is itself
the learning outcome.

## Project validation responsibilities

Before a exercise is handed to a student, the project must:

- consult current official documentation for every version-sensitive tool;
- pin dependencies, and prefer LTS releases per `CONTEXT/code-validation.md`;
- install, compile, test, and run the command-line portion;
- validate contracts and deployment scripts on a local development network;
- run the verification script against known-good inputs;
- record exactly what was tested, and distinguish automated checks from
  manual interactive work;
- scan tracked files for secrets and funded credentials.

## Publication readiness

The companion tree remains independently publishable. A exercise is ready when a
clean checkout can follow its commands and the automated checks pass.
