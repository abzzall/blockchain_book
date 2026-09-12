# Implementation 6 — A professional contract project

## Outcome

You will take one crowdfunding contract through two complete professional
toolchains — Hardhat and Foundry — build it with both, test it with both, deploy
it to a persistent local node, and inspect it from the command line with Cast.
You will finish able to say what each toolchain is for, and to explain why two
correct builds of the same source are not byte-for-byte identical.

## Safety and environment

- Network: a persistent local development node, run by you. Nothing leaves your
  machine.
- Assets: the local node's disposable accounts and their invented ether. Never
  send anything to those addresses on a public network; their keys are published
  in the tools' own documentation.
- The deployment key lives in a `.env` file that is not in the repository, and
  for this exercise it must be one of the local node's own disposable keys.

## Verified versions

| Component | Version |
|---|---|
| Verification date | 2026-09-07 |
| Node.js | 24.15.0 |
| Hardhat | 3.15.0 |
| Foundry (forge, anvil, cast) | 1.8.1 |
| Solidity | 0.8.37 |

## Files supplied

| File | What it holds |
|---|---|
| `src/Crowdfunding.sol` | custom errors, events, contributions, finalization, pull refunds |
| `test/hardhat/Crowdfunding.ts` | the Hardhat and viem test suite |
| `test/foundry/Crowdfunding.t.sol` | the Forge test suite, with no external test library |
| `scripts/deploy.ts` | the Hardhat deployment script |
| `script/DeployCrowdfunding.s.sol` | the Foundry deployment script |
| `scripts/toolchain-values.sh` | prints every value this exercise marks, using both toolchains |
| `hardhat.config.ts`, `foundry.toml`, `.env.example` | reproducible configuration |
| `RESULTS.md` | the template you fill in |

## Command-line work

Both toolchains build the same `src/`. Run both.

```bash
cd part-07-development-tools/labs/lab-06-professional-contract-project
npm run build          # hardhat
npm test               # hardhat, viem
forge build
forge test -vv
```

All the Hardhat tests and all three Forge tests must pass before you continue.

`forge build` will emit a lint suggestion about a strict equality on a balance.
Read it; it is a real linting rule and it is pointing at a real pattern worth
knowing about. It is not an error and the build succeeds.

### Part A — Selectors without a compiler

```bash
cast sig "contribute()"
cast keccak "Contribution(address,uint256,uint256)"
```

Then run the whole set at once:

```bash
npm run values
```

Record the four selectors and one event topic. Note what just happened: `cast`
computed all of them without compiling anything, without a node, and without
ever seeing the contract. `RESULTS.md` asks what follows from that for anyone
looking at an unverified contract.

### Part B — Gas, as Forge reports it

```bash
forge test --gas-report
```

Record the three per-test gas figures and the average gas for `contribute` and
`claimRefund`. `RESULTS.md` asks what an average across a test suite is and is
not good for.

### Part C — The same source, built twice

The `npm run values` output ends by comparing the two builds. Record the
bytecode length, the number of identical leading bytes, the number of differing
trailing bytes, and whether the two are identical.

They are not, and both are correct. 2199 of 2242 bytes match exactly. The
difference is the metadata the compiler appends, which commits to the settings
and paths of the build — and those genuinely differ between the toolchains.
`RESULTS.md` asks you to explain it and to say whether the deployed contracts
would behave differently.

### Part D — A persistent node

Hardhat and Foundry each provide one. Use either, in a second terminal:

```bash
npm run node           # hardhat, or:
anvil                  # foundry
```

Deploy to it and record the contract address:

```bash
npm run deploy:local
```

For the Foundry path, copy `.env.example` to `.env`, fill it with one of the
node's own printed keys and a local beneficiary address, and run the Forge
script with `--broadcast`. Never put a key that controls anything into that
file.

Then inspect the deployed contract without a frontend. Use `cast call` for the
view functions and `cast send` for the state-changing ones, and confirm you can
read `totalRaised` back after contributing.

## What to record

The fifteen values in `RESULTS.md`. All of them come from `npm run values`,
`forge test --gas-report`, and the deployment, and all are reproducible.

The contract address is deterministic because a fresh local node always starts
the same deployer at nonce zero. If yours differs, your node was not fresh.

## What to explain

`RESULTS.md` asks seven questions: what `cast sig` computed and from what; what
the differing 43 bytes are; what determines a contract address; what a gas
report is and is not good for; the case for knowing each toolchain; why
`contribute` costs more than `claimRefund`; and what would go wrong with a key
committed to a repository even a private one.

## Verification

```bash
npm run verify
```

The script recomputes all fifteen values and reports each as correct, wrong, or
blank, exiting non-zero unless every one is correct.

## Troubleshooting and reset

- Restarting the local node resets its state. Redeploy; the address will be the
  same again, which is the point.
- A gas figure that disagrees usually means the contract was edited. The figures
  are pinned to the supplied source.
- `forge` not found means the Foundry toolchain is not on your `PATH`. It
  installs to `~/.foundry/bin`.
- If `npm run values` reports that it cannot compare the builds, run both
  `npm run build` and `forge build` first; it needs both artefacts.
- A `CampaignStillOpen` or `GoalNotReached` revert is the contract working.

## Optional public-testnet extension

Not required and not marked. If you deploy to a public testnet, use a dedicated
test-only key held outside the repository, and note that the deployed address
will not match the local one, because the deployer's nonce will not be zero.
