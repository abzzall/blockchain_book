# Introduction to Blockchain Technology — Samples and Code

Public repository: <https://github.com/abzzall/blockchain_book>

This repository contains the executable samples, implementation examples, and
project code for the *Introduction to Blockchain Technology* textbook. It is the samples-and-code
repository for the book: the manuscript explains the concepts, while this
repository provides runnable programs, contracts, tests, deployment scripts, and
student-facing implementation material.

The repository is intentionally limited to educational code. It contains no
funded keys, recovery phrases, private research library, manuscript source, or
build artefacts.

## Repository rules

- Public commit messages, file contents, and documentation must not refer to
  collaboration tools, assistants, or code-generation systems.
- Commits must use `abzzall` as the author and committer identity.
- Keep generated dependencies, build outputs, credentials, private keys, and
  recovery phrases out of version control.
- Commit `.env.example` files when a project needs configuration names, but do
  not commit `.env`, `.env.local`, or any file containing real endpoints,
  access tokens, private keys, or recovery phrases.
- Commit source, tests, lockfiles, and reproducible configuration. Do not commit
  `node_modules`, build output, compiler caches, coverage output, or editor
  state.

## Quick start

These two commands are the whole repository-wide check. Install the
prerequisites under [Requirements](#requirements) first --- Python 3.12+,
Node.js 24 with npm 11, and Foundry with `forge` on `PATH`. Nothing else is
needed: the check script installs the npm dependencies of the standalone
chapter samples itself.

```bash
npm ci
./scripts/check-all.sh
```

`npm ci` installs exactly the versions recorded in `package-lock.json`. Use it
rather than `npm install`, which may resolve newer compatible versions and so
reproduce a different toolchain from the one each guide records.

Individual chapter examples and implementation exercises may have narrower prerequisites.
Each part directory documents its own commands.

## Division of work

The command-line and interactive portions of an implementation exercise are intentionally separated.

| Work | Prepared and verified by | Student action |
|---|---|---|
| Source code, contracts, tests, deployment scripts, and frontend | Textbook project | Clone or download and use it |
| Command-line installation, compilation, and automated tests | Textbook project | Follow only when an exercise asks for it |
| The values an exercise marks, and the script that marks them | Textbook project | Run the script; record what it prints |
| Wallets, Remix IDE, explorers, and dApp interfaces | Student | Perform the documented steps |
| Evidence of interactive work | Student | Write a prose explanation of what happened |

Every implementation exercise includes a guide file with exact prerequisites, commands, interactive
steps, and expected results, and a `RESULTS.md` the student fills in. Interfaces
change as services update, so each guide records when it was last verified and
describes *the result that must become true* rather than the control to click.

## No Exercise Requires A Screenshot

This is a standing rule, set out in full in
[`AUTHORING_STANDARD.md`](AUTHORING_STANDARD.md). Evidence is a recorded
value or a written explanation, never an image, because a screenshot cannot be
re-checked by anyone, dates as fast as the interface it pictures, and invites
accidental disclosure of balances and account names.

Every implementation exercise is markable without seeing the student's machine.
Most exercises supply a marking script in the language of the exercise --- a
`scripts/verify-results.mjs` for the JavaScript and Solidity exercises, a
`verify_results.py` for the Python ones (`lab-13`, `lab-14`, `lab-17`,
`lab-18`). It reads the value tables out of the student's `RESULTS.md`,
recomputes each one, and reports it as correct, wrong, or blank.

Four exercises are marked differently because a value table is the wrong
instrument for them. `lab-02` remarks itself by rerunning the local chain
scenario with `npm run walkthrough`, which reproduces the same hashes and
addresses. The browser dApp exercises `lab-10`, `lab-10b`, and `lab-19` are
marked by their own contract and frontend test suites together with the written
explanations their `RESULTS.md` asks for, because what they teach is observed
behaviour rather than a table of deterministic values.
The values are markable because they are deterministic: selectors and event
topics follow from a signature alone, and a fresh local chain reproduces the
same contract addresses and the same gas figures for everyone. Where a value is
none of those things, the exercise asks for a prose explanation instead.

## Safety rules

- Use a dedicated educational wallet account.
- Use local networks for required implementation exercises.
- Never use a seed phrase, private key, or funded mainnet account supplied by
  another person.
- Never paste a seed phrase or private key into source code, issues, commits,
  or submission documents.
- Record no account name, balance, or address that the exercise did not ask for.
- Treat any optional faucet assets used for self-study as valueless test assets.
- Public testnets such as Sepolia may be used for optional self-study only.
- Mainnet transactions are never required for textbook implementation exercises.

## Repository structure

The repository follows the parts of the book.

| Book part | Directory | Contents |
|---|---|---|
| Part 1 | `part-01-blockchain-foundations/` | cryptography, consensus, and wallet examples |
| Part 2 | `part-02-bitcoin/` | Bitcoin examples and hashing implementation |
| Part 3 | `part-03-ethereum/` | Ethereum state, proof-of-stake, RPC, and transaction examples |
| Part 4 | `part-04-ethereum-transactions-networks-and-wallets/` | local transaction and receipt implementation |
| Part 5 | `part-05-smart-contracts-and-solidity/` | Solidity examples, Remix material, and contract implementations |
| Part 6 | `part-06-decentralised-applications-and-modern-web3-development/` | JavaScript examples and registry dApp implementation |
| Part 7 | `part-07-development-tools/` | Hardhat examples and professional project workflow |
| Part 8 | `part-08-tokens-and-digital-assets/` | token and NFT implementation examples |
| Part 9 | `part-09-decentralised-finance/` | decentralised finance examples and AMM implementation |
| Part 10 | `part-10-decentralised-autonomous-organisations-and-governance/` | governance examples and voting dApp implementation |
| Part 11 | `part-11-scaling-and-cross-chain-systems/` | rollup batching and fraud-proof implementation |
| Part 12 | `part-12-enterprise-blockchain/` | permissioned channel and endorsement implementation |
| Part 13 | `part-13-privacy-identity-and-transparency/` | privacy examples |
| Part 14 | `part-14-security-fraud-and-user-safety/` | security examples and re-entrancy implementation |
| Part 15 | `part-15-institutions-and-compliance-concepts/` | compliance examples and exposure-scoring implementation |
| Part 16 | `part-16-capstone-projects/` | capstone certificate-registry project |

## Implementation Examples

1. [`lab-01-hashing-merkle-and-proof-of-work`](part-02-bitcoin/labs/lab-01-hashing-merkle-and-proof-of-work/INSTRUCTIONS.md)
   — hashing, Merkle proofs, and proof-of-work arithmetic.
2. [`lab-02-wallets-transactions-explorers`](part-04-ethereum-transactions-networks-and-wallets/labs/lab-02-wallets-transactions-explorers/INSTRUCTIONS.md)
   — local transaction evidence and receipt inspection.
3. [`lab-03-first-smart-contract`](part-05-smart-contracts-and-solidity/labs/lab-03-first-smart-contract/INSTRUCTIONS.md)
   — first Solidity contract, Hardhat tests, deployment, and Remix inspection.
4. [`lab-04-payable-crowdfund`](part-05-smart-contracts-and-solidity/labs/lab-04-payable-crowdfund/INSTRUCTIONS.md)
   — payable functions, balances, withdrawals, and local-chain evidence.
5. [`lab-05-student-registry-dapp`](part-06-decentralised-applications-and-modern-web3-development/labs/lab-05-student-registry-dapp/INSTRUCTIONS.md)
   — React, wagmi, viem, ABI use, and wallet-mediated contract interaction.
6. [`lab-06-professional-contract-project`](part-07-development-tools/labs/lab-06-professional-contract-project/INSTRUCTIONS.md)
   — Hardhat, Foundry, pinned builds, deployment scripts, and secret hygiene.
7. [`lab-07-erc20-token`](part-08-tokens-and-digital-assets/labs/lab-07-erc20-token/INSTRUCTIONS.md)
   — OpenZeppelin ERC-20 transfers, allowances, minting, and burning.
8. [`lab-08-nft-minting`](part-08-tokens-and-digital-assets/labs/lab-08-nft-minting/INSTRUCTIONS.md)
   — ERC-721 minting, metadata, token ownership, and interface detection.
9. [`lab-09-constant-product-amm`](part-09-decentralised-finance/labs/lab-09-constant-product-amm/INSTRUCTIONS.md)
   — automated-market-maker swaps, fees, invariant growth, and slippage.
10. [`lab-10-voting-dapp`](part-10-decentralised-autonomous-organisations-and-governance/labs/lab-10-voting-dapp/INSTRUCTIONS.md)
    — eligibility-controlled election contract and React voting frontend.
11. [`lab-11-reentrancy-exploit-and-fix`](part-14-security-fraud-and-user-safety/labs/lab-11-reentrancy-exploit-and-fix/INSTRUCTIONS.md)
    — reentrancy exploitation, checks-effects-interactions, and guarded repair.
12. [`lab-12-capstone-certificate-registry`](part-16-capstone-projects/labs/lab-12-capstone-certificate-registry/INSTRUCTIONS.md)
    — capstone implementation scaffold with acceptance tests.
13. [`lab-13-digital-signatures`](part-01-blockchain-foundations/labs/lab-13-digital-signatures/INSTRUCTIONS.md)
    — digital signatures and what a repeated nonce costs.
14. [`lab-14-applying-a-block`](part-03-ethereum/labs/lab-14-applying-a-block/INSTRUCTIONS.md)
    — applying a block to account state.
15. [`lab-15-rollup-batching-and-fraud-proofs`](part-11-scaling-and-cross-chain-systems/labs/lab-15-rollup-batching-and-fraud-proofs/INSTRUCTIONS.md)
    — rollup batching and fraud proofs, as a teaching model.
16. [`lab-16-permissioned-channels-and-endorsement`](part-12-enterprise-blockchain/labs/lab-16-permissioned-channels-and-endorsement/INSTRUCTIONS.md)
    — permissioned channels and endorsement policies, as a teaching model.
17. [`lab-17-unlinkability-and-clustering`](part-13-privacy-identity-and-transparency/labs/lab-17-unlinkability-and-clustering/INSTRUCTIONS.md)
    — unlinkability and address clustering on invented data.
18. [`lab-18-exposure-scoring`](part-15-institutions-and-compliance-concepts/labs/lab-18-exposure-scoring/INSTRUCTIONS.md)
    — exposure scoring on a synthetic flow graph, as a teaching model.
19. [`lab-19-message-board-events`](part-06-decentralised-applications-and-modern-web3-development/labs/lab-19-message-board-events/INSTRUCTIONS.md)
    — a page built entirely from logs: filtered historical queries, live
    subscriptions, confirmation, and reorganisation handling.
20. [`lab-10b-governance-dapp`](part-10-decentralised-autonomous-organisations-and-governance/labs/lab-10b-governance-dapp/INSTRUCTIONS.md)
    — token governance end to end: delegation, checkpointed voting power,
    proposal snapshots, quorum, timelock, and execution.

Implementations 1 to 12 run in reading order alongside the book. The remainder
sit with the part whose material they exercise. Implementations 1, 13, 14, 15,
16, 17, and 18 need no chain, no wallet, and no network; 2, 3, 4, 7, 8, 9, 11,
and 12 run on a local development chain; 5, 10, 19, and 20 add a browser
frontend connected to a local node. Public testnets and browser wallets are
optional self-study extensions, never required.

`lab-10` and `lab-10b` are deliberately not redundant: the first teaches an
eligibility-controlled election, the second teaches token governance, where
voting power is delegated, snapshotted, and executed through a timelock.

### Standalone chapter samples

Three directories are runnable chapter samples rather than numbered exercises.
Each pins its own `package-lock.json`, documents its own `npm ci` in its README,
and is covered by `scripts/check-all.sh`:

- `part-06-decentralised-applications-and-modern-web3-development/javascript/`
  — the chapter 21 ethers and viem samples.
- `part-06-decentralised-applications-and-modern-web3-development/javascript-guided/`
  — the same chapter 21 material as a step-by-step walkthrough. It holds a
  `starter/` folder, whose tests are complete and whose code is stubbed with
  numbered TODOs, and a `solution/` folder with the finished result. Only
  `solution/` is tested by `scripts/check-all.sh`; `starter/` is expected to
  fail until the reader completes it.
- `part-07-development-tools/hardhat/` — the chapter 23, 25, and 27 Hardhat
  project.

A sample in a new directory is invisible to both `npm ci` and the test suite
unless it is added to `scripts/check-all.sh`, because these directories match no
workspace glob in the root `package.json`. Add it there when you add the sample.

## Requirements

- Python 3.12 or later for the foundational samples. They import only the
  standard library, so nothing needs to be installed with `pip`.
- Node.js 24 and npm 11 for the Hardhat and React labs. The exact version this
  repository was verified against is recorded in `.nvmrc`.
- Foundry 1.8.1 for the professional project workflow. Install it only from the official Foundry
  instructions and ensure `forge` is on `PATH`.

### Compiler version policy

The pinned Solidity compiler is **0.8.37**. Every Hardhat and Foundry project in
this repository sets that exact version in its build configuration, so the same
source produces the same bytecode for every reader. A `pragma` is only a version
*check* --- it never selects a compiler --- so the build configuration is what
makes a project reproducible, and the pragma is what stops a file being compiled
by something it was not written for.

Two deliberate exceptions exist, and neither is an oversight:

- `part-05-.../chapter-19-remix-ide/RemixStorage.sol` declares a wide
  `pragma solidity ^0.8.24`. It is opened in Remix, which compiles with whichever
  release the browser offers that day --- 0.8.34 when chapter 19 was written. A
  wide range keeps it compiling as that default moves.
- Contracts using `^0.8.37` rather than an exact pragma still build against the
  pinned 0.8.37, because the toolchain, not the pragma, chooses the compiler.

**A newer compiler release is not adopted automatically.** Solidity 0.8.37 was
adopted through a controlled migration and a complete repository-wide check. A
future release must likewise be pinned, tested with `scripts/check-all.sh`, and
recorded below before it becomes the book's target.

### Verified environment

Every check in `scripts/check-all.sh` was last run to completion on the
configuration below, from a checkout containing only the files tracked by git.
The record of that run, and the command to reproduce it, are in
[`validation/clean-checkout.md`](validation/clean-checkout.md). The same two
commands run in CI on every push --- see
[`.github/workflows/check.yml`](.github/workflows/check.yml) --- which retains
the output so the claim can be audited rather than taken on trust.

Other platforms are expected to work but have not been verified; on Windows, use
WSL2, because the scripts assume a POSIX shell.

| Component | Verified version |
|---|---|
| Verification date | 2026-09-12 |
| Tests passing | 583 (0 failing) |
| Operating system | Linux x86-64 |
| Python | 3.12.3 |
| Node.js | 24.15.0 |
| npm | 11.12.1 |
| Foundry (`forge`) | 1.8.1 |
| Solidity (`solc`) | 0.8.37 |

Run all current command-line checks from this repository:

```bash
npm ci
./scripts/check-all.sh
```

For the required structure of future browser-based implementation exercises, see
[`AUTHORING_STANDARD.md`](AUTHORING_STANDARD.md), which specifies the sections an
`INSTRUCTIONS.md` must carry and in what order. To add an exercise, copy the
existing one closest in shape rather than working from a skeleton.

## License and attribution

The companion code and its documentation are licensed under the [MIT License](LICENSE).
Retain the copyright notice, source attribution to
<https://github.com/abzzall/blockchain_book>, and permission notice in copies or
substantial portions of the software. Dependencies retain their own licenses.
This grant covers this companion repository; it does not license the book manuscript.
