# Solidity samples

Small contracts and their tests. Everything here compiles with a pinned
compiler and runs on a real EVM, so the claims the chapter makes about the
language are checked rather than asserted.

## Running them

These need [Foundry](https://getfoundry.sh/). It is not vendored here; install
it once, then:

```bash
forge build
forge test
```

Verified on 2026-09-08 with **Foundry 1.8.1** and **solc 0.8.36**, both pinned
in `foundry.toml`. All **71 tests pass**. No network, no node, no wallet, no
key, and no funds: `forge test` runs the contracts in a local EVM.

Useful for reading further:

```bash
forge inspect src/Constants.sol:Constants storageLayout
forge inspect src/Counter.sol:Counter methods
```

## Chapter 15 contracts

- **`Counter.sol`** — state variables, visibility, a constructor, and the
  difference between changing state, reading it, and touching none of it.
  `count` is `public` and gets an automatic getter; `_writes` is `internal`
  and is absent from the ABI entirely.
- **`Arithmetic.sol`** — arithmetic reverts on overflow and underflow since
  Solidity 0.8.0, and `unchecked` restores the old wrapping. Also integer
  division, which truncates, and the literal-rational trap: `7 / 2` written
  literally is 3.5 and will not compile as a `uint256`.
- **`Constants.sol`** — `constant` is fixed when the source is compiled,
  `immutable` when the contract is deployed, neither occupies storage, and
  ordinary state variables, local variables, named return variables, enums, and
  mapping values receive type defaults. `forge inspect ... storageLayout` shows
  the storage point plainly: the `Constants` contract declares five state
  variables and uses **one** slot.
- **`Mutability.sol`** — what `pure`, `view` and `payable` promise, and what
  the compiler refuses. A non-payable function cannot even name `msg.value`.
  It also includes payable vault, trapped-balance, and paid-service examples.
- **`ControlFlow.sol`** — bounded `for` loops, `while` loops that make progress
  explicit, and cursor-based batching for work split across transactions.

## Chapter 16 contracts

- **`DataStructures.sol`** — a `TaskRegistry` that uses a struct as a domain
  record, an enum for state, an array for numeric identifiers, and a mapping
  index for owner-to-task lookup.

## Chapter 17 contracts

- **`Inheritance.sol`** — an interface, an abstract contract, and a concrete
  one; plus a diamond (`Diamond is Left, Right`, both deriving from `Root`)
  whose overrides record the order they run in. The test asserts
  `Diamond, Right, Left, Root`: `super` walks towards the base taking the
  **rightmost** listed base first, and the shared base runs **once**.
  Constructor order is checked the same way and runs base-first.
- **`Modifiers.sol`** — a guard that reverts, and two nesting modifiers whose
  trace shows the body spliced in at the underscore.
- **`MathLib.sol`** — a library with only internal functions, so nothing is
  deployed separately, and `using ... for` shown to compile to the same call.
- **`EventsAndFallback.sol`** — events and log structure, and the full
  `receive`/`fallback` dispatch including a contract that can receive nothing.

The event tests declare a small slice of Foundry's cheatcode interface inline
(`recordLogs`, `getRecordedLogs`) so real logs can be inspected without adding
a dependency. They confirm that `topics[0]` is the hash of the event
signature, that an indexed `string` is stored as a **hash** while an unindexed
copy stays readable, and that a log is attributed to its emitting contract.

## Tests without a test library

The tests use plain `require`, not `forge-std`, so this project has no
dependencies to fetch and will keep working unchanged. Cases that must fail
are checked with a low-level `call` and its success flag, which is also a fair
picture of what a failed call looks like from the outside.

## A cross-check worth knowing about

The selectors `forge inspect src/Counter.sol:Counter methods` prints are the
same values `part-03-ethereum/ethereum/contracts.py` computes from the
function signatures with its own Keccak-256 implementation. All six agree, so
the hand-written implementation in the Chapter 14 sample and the real compiler
independently confirm each other.
