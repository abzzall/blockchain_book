# Blockchain Handbook Companion Code

Public repository: <https://github.com/abzzall/blockchain_book>

This repository contains the executable examples and laboratory projects for the
*Blockchain Handbook*. It is the companion source-code repository for the book:
the manuscript explains the concepts, while this repository provides runnable
programs, contracts, tests, deployment scripts, and student-facing lab material.

The repository is intentionally limited to educational code. It contains no
funded keys, recovery phrases, private research library, manuscript source, or
build artefacts.

## Repository rules

- Public commit messages, file contents, and documentation must not refer to
  collaboration tools, assistants, or code-generation systems.
- Commits must use `abzzall` as the author and committer identity.
- Keep generated dependencies, build outputs, credentials, private keys, and
  recovery phrases out of version control.

## Quick start

Install the dependencies and run the repository-wide checks from the repository
root:

```bash
npm install
./scripts/check-all.sh
```

Individual chapter examples and laboratories may have narrower prerequisites.
Each directory documents its own commands.

## Division of work

The command-line and interactive portions of a lab are intentionally separated.

| Work | Prepared and verified by | Student action |
|---|---|---|
| Source code, contracts, tests, deployment scripts, and frontend | Handbook project | Clone or download and use it |
| Command-line installation, compilation, and automated tests | Handbook project | Follow only when a lab asks for it |
| The values a lab marks, and the script that marks them | Handbook project | Run the script; record what it prints |
| Wallets, Remix IDE, faucets, explorers, and dApp interfaces | Student | Perform the documented steps |
| Evidence of interactive work | Student | Write a prose explanation of what happened |

Every lab includes a `LAB.md` with exact prerequisites, commands, interactive
steps, and expected results, and a `RESULTS.md` the student fills in. Interfaces
change as services update, so each guide records when it was last verified and
describes *the result that must become true* rather than the control to click.

## No lab requires a screenshot

This is a standing rule, set out in full in
[`LAB_AUTHORING_STANDARD.md`](LAB_AUTHORING_STANDARD.md). Evidence is a recorded
value or a written explanation, never an image, because a screenshot cannot be
re-checked by anyone, dates as fast as the interface it pictures, and invites
accidental disclosure of balances and account names.

Every lab is markable without seeing the student's machine. Each supplies a
`scripts/verify-results.mjs` that reads the value tables out of the student's
`RESULTS.md`, recomputes each one, and reports it as correct, wrong, or blank.
The values are markable because they are deterministic: selectors and event
topics follow from a signature alone, and a fresh local chain reproduces the
same contract addresses and the same gas figures for everyone. Where a value is
none of those things, the lab asks for a prose explanation instead.

## Safety rules

- Use a dedicated educational wallet account.
- Use only local networks or the testnet named in the lab.
- Never use a seed phrase, private key, or funded mainnet account supplied by
  another person.
- Never paste a seed phrase or private key into source code, issues, commits,
  or submission documents.
- Record no account name, balance, or address that the lab did not ask for.
- Treat faucet assets as valueless test assets.
- Mainnet transactions are not required for handbook labs.

## Executable examples

- `cryptography/` — hashes, Merkle trees, and tests.
- `consensus/` — a reduced chain-rules teaching model.
- `wallets/` — deterministic wallet derivation checked against published test
  vectors.
- `bitcoin/` — supply, UTXO/Script, and proof-of-work demonstrations.
- `ethereum/` — accounts, state, proof of stake, and transaction encoding.
- `solidity/` — Solidity language mechanics and Foundry tests.
- `javascript/` — Ethereum JSON-RPC access from current JavaScript libraries.
- `hardhat/` — reproducible Hardhat compilation, testing, deployment, and
  verification examples.
- `nft/` — non-fungible token contracts and metadata exercises.
- `defi/` — decentralised exchange, lending, and risk examples.
- `dao/` — governance and voting examples.
- `privacy/` — privacy, transparency, and proof-oriented demonstrations.
- `security/` — smart-contract security examples and tests.

## Book labs

1. [`lab-01-hashing-merkle-and-proof-of-work`](labs/lab-01-hashing-merkle-and-proof-of-work/LAB.md)
   — hashing, Merkle proofs, and proof-of-work arithmetic.
2. [`lab-02-wallets-transactions-explorers`](labs/lab-02-wallets-transactions-explorers/LAB.md)
   — wallet setup, Sepolia transaction evidence, and receipt inspection.
3. [`lab-03-first-smart-contract`](labs/lab-03-first-smart-contract/LAB.md)
   — first Solidity contract, Hardhat tests, deployment, and Remix inspection.
4. [`lab-04-payable-crowdfund`](labs/lab-04-payable-crowdfund/LAB.md)
   — payable functions, balances, withdrawals, and local-chain evidence.
5. [`lab-05-student-registry-dapp`](labs/lab-05-student-registry-dapp/LAB.md)
   — React, wagmi, viem, ABI use, and wallet-mediated contract interaction.
6. [`lab-06-professional-contract-project`](labs/lab-06-professional-contract-project/LAB.md)
   — Hardhat, Foundry, pinned builds, deployment scripts, and secret hygiene.
7. [`lab-07-erc20-token`](labs/lab-07-erc20-token/LAB.md)
   — OpenZeppelin ERC-20 transfers, allowances, minting, and burning.
8. [`lab-08-nft-minting`](labs/lab-08-nft-minting/LAB.md)
   — ERC-721 minting, metadata, token ownership, and interface detection.
9. [`lab-09-constant-product-amm`](labs/lab-09-constant-product-amm/LAB.md)
   — automated-market-maker swaps, fees, invariant growth, and slippage.
10. [`lab-10-voting-dapp`](labs/lab-10-voting-dapp/LAB.md)
    — eligibility-controlled election contract and React voting frontend.
11. [`lab-11-reentrancy-exploit-and-fix`](labs/lab-11-reentrancy-exploit-and-fix/LAB.md)
    — reentrancy exploitation, checks-effects-interactions, and guarded repair.
12. [`lab-12-capstone-certificate-registry`](labs/lab-12-capstone-certificate-registry/LAB.md)
    — capstone implementation scaffold with acceptance tests.

## Requirements

- Python 3.12 or later for the foundational samples.
- Node.js 24 and npm 11 for the Hardhat and React labs.
- Foundry 1.8.1 for Lab 6. Install it only from the official Foundry
  instructions and ensure `forge` is on `PATH`.

Run all current command-line checks from this repository:

```bash
npm install
./scripts/check-all.sh
```

For the required structure of future browser-based labs, see
[`LAB_AUTHORING_STANDARD.md`](LAB_AUTHORING_STANDARD.md). A reusable guide is
available at [`labs/LAB_TEMPLATE.md`](labs/LAB_TEMPLATE.md).
