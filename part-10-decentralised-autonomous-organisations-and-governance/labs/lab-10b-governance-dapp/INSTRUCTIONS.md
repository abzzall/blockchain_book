# Implementation 10b — A governance dApp

## Outcome

You will run a complete governance system from a wallet: hold a token, discover
that holding it gives you no say, delegate to acquire that say, submit a
proposal, vote on it, watch it pass, queue it, wait out the timelock, and
execute it — after which a parameter on another contract has changed because a
vote said so.

You will then answer the question this implementation exists to ask, which is
what a voter has actually verified when they vote on a proposal in an interface.

## Safety and environment

- Network: Hardhat's local chain, for both the contract work and the frontend.
- Assets: local test ether only, invented by the development chain.
- Import only the disposable keys the local chain prints, and only into a
  browser profile you keep for coursework. Never reuse one anywhere else.
- Never connect a wallet holding real assets to this implementation.

## Verified versions

| Component | Version |
|---|---|
| Verification date | 2026-09-09 |
| Node.js | 24.15.0 |
| Hardhat | 3.15.0 |
| Solidity | 0.8.37 |
| React | 19.2.8 |
| wagmi | 3.7.7 |
| viem | 2.56.3 |

## Files supplied

| File | What it holds |
|---|---|
| `contract/contracts/GovernanceDAO.sol` | token, delegation, checkpoints, governor, timelock |
| `contract/contracts/ProtocolParameters.sol` | the thing being governed: a fee only the governor may set |
| `contract/test/GovernanceDAO.ts` | seventeen behavioural tests across six groups |
| `contract/scripts/deploy.ts` | deploys both contracts and prints the parameters |
| `frontend/src/` | the React application |
| `frontend/test/lifecycle.test.mjs` | the quorum and timelock boundaries, tested without a chain |
| `RESULTS.md` | the template you fill in |

## Command-line work

```bash
cd part-10-decentralised-autonomous-organisations-and-governance/labs/lab-10b-governance-dapp/contract
npm run build
npm test
```

All seventeen contract tests must pass before you continue.

### Part A — Holding is not voting

Read the first test in `GovernanceDAO.ts`, then answer in `RESULTS.md`: after
the constructor runs, Alice holds 60 tokens. What is `getVotes(alice)`, and why?

### Part B — What delegation moves

Run the delegation tests and record, for the second test, all three of Alice's
balance, Alice's voting power, and Bob's voting power, before and after she
delegates to him. State precisely what moved and what did not.

Then read the third test and explain how an address holding zero tokens comes to
outweigh the largest single holder.

### Part C — The snapshot

Read the snapshot test. Carol delegates *after* the proposal is created, and
`getVotes(carol)` is then 30. Her vote is still rejected. Record the error and
explain, in terms of `snapshotBlock`, why the two facts are consistent.

Then answer: which of the two governance attacks in Chapter 36 does this defeat,
and which does it not?

### Part D — Quorum

Run the quorum tests. One proposal has 30 votes in favour and none against, and
is defeated. Record the numbers and state what quorum protects against.

Now change `QUORUM` in the test file to `0n`, re-run, and record which tests
change their result. Say what the system now permits, and who could exploit it.
Restore the original value afterwards.

### Part E — The timelock

Run the timelock tests. Record the exact revert for executing a proposal that is
queued but not yet due, and the fee value on `ProtocolParameters` immediately
before and immediately after execution.

Then answer the question this whole implementation is built around: during the
delay between queueing and execution, what could somebody who dislikes the
outcome actually do?

### Part F — The description and the calldata

Run the last test, in the group named *what the description does not tell you*.
Record the proposal's `description`, its `callData`, and the resulting fee.

Explain, in your own words, what a voter who read only the description had
verified at the moment they voted.

## Browser work

Start a local chain, deploy, and configure the frontend:

```bash
# terminal 1
cd part-10-decentralised-autonomous-organisations-and-governance/labs/lab-10b-governance-dapp/contract
npm run node

# terminal 2, same directory
npm run deploy:local
```

Copy the two addresses the deploy script prints into the frontend environment:

```bash
cd ../frontend
cp .env.example .env
# edit .env: VITE_CONTRACT_ADDRESS and VITE_PARAMETERS_ADDRESS
npm run dev
```

Import one of the funded holder keys the local chain printed into a browser
wallet, connect it, and work through the following. Record values as you go;
none of this asks for a picture.

### Part G — The lifecycle, from a wallet

1. Connect. Record your token balance and your voting power. Explain the
   difference to somebody who has not read Part A.
2. Delegate to yourself. Record the transaction hash and your voting power
   afterwards.
3. Submit a proposal. Record its id and the snapshot block the interface shows.
4. Vote for it. Record the transaction hash and the tally afterwards.
5. Wait for voting to close. Record the state the interface reports.
6. Queue it. Record the transaction hash and the countdown the interface shows.
7. Attempt to execute before the countdown reaches zero. Record what the
   interface does, and why — the button state and the reason for it.
8. Execute once the delay has elapsed. Record the transaction hash and the new
   fee shown in the status bar.

### Part H — Reading a proposal properly

Open the *What this proposal will execute* panel on your proposal. Record the
target address and the calldata.

Now, without running anything, work out from the calldata alone what value the
proposal sets. The first four bytes are the function selector and the remaining
thirty-two are the argument. Show your working.

Then write one paragraph on what an interface would have to display for a voter
to be able to verify a proposal, and one on why displaying it is still not
sufficient.

## What to record

Everything asked for above goes in `RESULTS.md`: transaction hashes, contract
addresses, voting powers, tallies, gas where the interface reports it, the exact
revert reasons, and the written paragraphs. No screenshots are required, and
none will be accepted as evidence.
