# Implementation 10 — A voting dApp

## Outcome

You will run a complete on-chain election: a contract that holds an electoral
roll, a voting period, one vote per eligible address, and a published result,
together with a React frontend that connects a wallet and casts a vote through
it. You will then answer the question the exercise exists to ask, which is why none
of that makes the system suitable for a national election.

## Safety and environment

- Network: Hardhat's local chain, for both the contract work and the frontend.
- Assets: local test ether only, invented by the development chain.
- Import only the disposable keys the local chain prints, and only into a
  browser profile you keep for coursework. Never reuse one anywhere else.
- Never connect a wallet holding real assets to this exercise.

## Verified versions

| Component | Version |
|---|---|
| Verification date | 2026-09-07 |
| Node.js | 24.15.0 |
| Hardhat | 3.15.0 |
| Solidity | 0.8.37 |
| React | 19.2.8 |
| wagmi | 3.7.7 |
| viem | 2.56.3 |

## Files supplied

| File | What it holds |
|---|---|
| `contract/contracts/ClassElection.sol` | roll, schedule, one-vote-per-address, result |
| `contract/test/ClassElection.ts` | three behavioural tests |
| `contract/test/Deterministic.ts` | five tests pinning the values this exercise marks |
| `contract/scripts/walkthrough.ts` | a whole election, with gas and every refusal |
| `contract/scripts/selectors.mjs` | every function, error, and event selector |
| `frontend/src/` | the React application |
| `frontend/test/schedule.test.mjs` | the open/closed boundary, tested without a browser |
| `RESULTS.md` | the template you fill in |

## Command-line work

```bash
cd part-10-decentralised-autonomous-organisations-and-governance/labs/lab-10-voting-dapp/contract
npm run build
npm test
```

All eight contract tests must pass before you continue.

### Part A — What the contract declares

```bash
npm run selectors
```

Record the four selectors and one event topic listed in `RESULTS.md`.

### Part B — A whole election

```bash
npm run walkthrough
```

This deploys a three-candidate election, tries to vote before it opens,
registers four voters, moves time forward, casts three votes, attempts every
refusal the contract can make, closes the polls, and reads the result. Record
the address, the candidate count, the three gas figures, the totals, the winner
and tie flag, and all six error names.

Two moments deserve attention.

The first is that the walkthrough moves time forward. A local chain lets you do
that; a public one does not, and the same test on a public testnet means waiting
out the real schedule. Keep that in mind if you attempt the optional extension.

The second is the pair of failed votes for candidate 9. A voter who had not yet
voted was refused with `InvalidCandidate`. A voter who had already voted was
refused with `AlreadyVoted`, even though her candidate id was equally invalid.
Both calls were wrong in two ways and each reported only the first check that
failed. `RESULTS.md` asks you what follows from that.

## Interactive work: the frontend

```bash
cd ../frontend
npm test
npm run dev
```

You will need a local chain with the contract deployed on it, and the address in
`.env`. Copy `.env.example`, deploy from `contract/`, and paste the address in.

Interfaces change faster than books do, so each step names the result that must
become true rather than the control that produces it.

1. Add the local chain to your wallet: RPC `http://127.0.0.1:8545`, chain ID
   `31337`. Import a disposable key that the local node printed.
2. Open the application and connect the wallet. The page must show the connected
   address and the local chain, not any public network.
3. Confirm the page shows the candidates and the current vote totals, and that
   they agree with what `npm run walkthrough` told you the contract holds.
4. As an account that is on the roll and has not voted, cast a vote. Approve the
   request in the wallet.
5. Watch the page between submitting and finality. It passes through more than
   one state. Note what each one is; `RESULTS.md` asks you to name them and say
   which corresponded to something that had actually happened on-chain.
6. After the vote confirms, confirm the control for voting is no longer offered
   to that account, and that the totals have changed.
7. Switch to an account that is not on the roll. The page should refuse before
   the wallet is ever asked.

## What to record

The twenty-two values in `RESULTS.md`, all of which come from the two
command-line commands. Nothing from the frontend is marked mechanically, because
nothing in it needs to be: what matters there is what you can explain.

## What to explain

`RESULTS.md` asks nine questions. Five are about the contract, three are about
what the frontend did, and the last is the one the whole exercise is built around:
why a contract that enforces eligibility, prevents double voting, keeps to a
schedule, and publishes an unalterable result is still not a national election
system. Answer it by addressing who decides the roll, whether a vote can be kept
secret from the person verifying it, and what a voter can be made to prove to
somebody else. A short paragraph is enough, but it must engage with all three.

## Verification

```bash
cd contract && npm run verify
```

The script recomputes all twenty-two values and reports each as correct, wrong,
or blank, exiting non-zero unless every one is correct.

## Troubleshooting and reset

- Restarting the local node resets its state. Redeploy and update the address in
  `frontend/.env`, then restart Vite, which reads `.env` only at startup.
- Empty candidates on the page almost always mean the address in `.env` is from
  a previous run of the chain.
- A `NotEligible` revert means the selected account is not on the roll. Register
  it from the owner account.
- A `VotingNotOpen` revert means the schedule you deployed with has not started
  or has already ended. Deploy a fresh election with a wider window.
- A gas figure that disagrees means the chain was not fresh.

## Optional public-testnet extension

Not required and not marked. If you deploy to a public testnet, choose a voting
window of a few minutes, because you cannot move a public chain's clock. Use
test assets and a dedicated key held in Hardhat's encrypted keystore, never in
this repository.
