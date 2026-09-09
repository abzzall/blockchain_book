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

Install the dependencies and run the repository-wide checks from the repository
root:

```bash
npm install
./scripts/check-all.sh
```

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
[`LAB_AUTHORING_STANDARD.md`](LAB_AUTHORING_STANDARD.md). Evidence is a recorded
value or a written explanation, never an image, because a screenshot cannot be
re-checked by anyone, dates as fast as the interface it pictures, and invites
accidental disclosure of balances and account names.

Every implementation exercise is markable without seeing the student's machine. Each supplies a
`scripts/verify-results.mjs` that reads the value tables out of the student's
`RESULTS.md`, recomputes each one, and reports it as correct, wrong, or blank.
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
| Part 11 | `part-11-scaling-and-cross-chain-systems/` | no required executable code yet |
| Part 12 | `part-12-enterprise-blockchain/` | no required executable code yet |
| Part 13 | `part-13-privacy-identity-and-transparency/` | privacy examples |
| Part 14 | `part-14-security-fraud-and-user-safety/` | security examples and re-entrancy implementation |
| Part 15 | `part-15-institutions-and-compliance-concepts/` | no required executable code yet |
| Part 16 | `part-16-capstone-projects/` | capstone certificate-registry project |

## Implementation Examples

1. [`lab-01-hashing-merkle-and-proof-of-work`](part-02-bitcoin/labs/lab-01-hashing-merkle-and-proof-of-work/LAB.md)
   — hashing, Merkle proofs, and proof-of-work arithmetic.
2. [`lab-02-wallets-transactions-explorers`](part-04-ethereum-transactions-networks-and-wallets/labs/lab-02-wallets-transactions-explorers/LAB.md)
   — local transaction evidence and receipt inspection.
3. [`lab-03-first-smart-contract`](part-05-smart-contracts-and-solidity/labs/lab-03-first-smart-contract/LAB.md)
   — first Solidity contract, Hardhat tests, deployment, and Remix inspection.
4. [`lab-04-payable-crowdfund`](part-05-smart-contracts-and-solidity/labs/lab-04-payable-crowdfund/LAB.md)
   — payable functions, balances, withdrawals, and local-chain evidence.
5. [`lab-05-student-registry-dapp`](part-06-decentralised-applications-and-modern-web3-development/labs/lab-05-student-registry-dapp/LAB.md)
   — React, wagmi, viem, ABI use, and wallet-mediated contract interaction.
6. [`lab-06-professional-contract-project`](part-07-development-tools/labs/lab-06-professional-contract-project/LAB.md)
   — Hardhat, Foundry, pinned builds, deployment scripts, and secret hygiene.
7. [`lab-07-erc20-token`](part-08-tokens-and-digital-assets/labs/lab-07-erc20-token/LAB.md)
   — OpenZeppelin ERC-20 transfers, allowances, minting, and burning.
8. [`lab-08-nft-minting`](part-08-tokens-and-digital-assets/labs/lab-08-nft-minting/LAB.md)
   — ERC-721 minting, metadata, token ownership, and interface detection.
9. [`lab-09-constant-product-amm`](part-09-decentralised-finance/labs/lab-09-constant-product-amm/LAB.md)
   — automated-market-maker swaps, fees, invariant growth, and slippage.
10. [`lab-10-voting-dapp`](part-10-decentralised-autonomous-organisations-and-governance/labs/lab-10-voting-dapp/LAB.md)
    — eligibility-controlled election contract and React voting frontend.
11. [`lab-11-reentrancy-exploit-and-fix`](part-14-security-fraud-and-user-safety/labs/lab-11-reentrancy-exploit-and-fix/LAB.md)
    — reentrancy exploitation, checks-effects-interactions, and guarded repair.
12. [`lab-12-capstone-certificate-registry`](part-16-capstone-projects/labs/lab-12-capstone-certificate-registry/LAB.md)
    — capstone implementation scaffold with acceptance tests.

## Requirements

- Python 3.12 or later for the foundational samples.
- Node.js 24 and npm 11 for the Hardhat and React labs.
- Foundry 1.8.1 for the professional project workflow. Install it only from the official Foundry
  instructions and ensure `forge` is on `PATH`.

Run all current command-line checks from this repository:

```bash
npm install
./scripts/check-all.sh
```

For the required structure of future browser-based implementation exercises, see
[`LAB_AUTHORING_STANDARD.md`](LAB_AUTHORING_STANDARD.md). A reusable guide is
available at [`labs/LAB_TEMPLATE.md`](labs/LAB_TEMPLATE.md).
