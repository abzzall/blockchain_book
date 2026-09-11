# Implementation 5 — A frontend for the registry

## Outcome

You will run a React application against the `StudentRegistry` contract from
Lab 3: connect a wallet, read state without a transaction, submit a write, wait
for its receipt, and see the page update. The subject is the boundary — what the
page does, what the wallet does, what the RPC provider does, and what only the
contract can do.

## Safety and environment

- Network: the local Hardhat chain, chain ID `31337`.
- Assets: local test ether, invented by the development chain.
- Import only a disposable key printed by your local node, into a browser
  profile you keep for coursework. Never reuse it anywhere else.
- Never put a private key or recovery phrase in `.env`. `.env` here holds a
  contract address and an RPC URL, both public information.

## Verified versions

| Component | Version |
|---|---|
| Verification date | 2026-09-07 |
| Node.js | 24.15.0 |
| React | 19.2.8 |
| Vite | 8.2.2 |
| wagmi | 3.7.7 |
| viem | 2.56.3 |
| TanStack Query | 5.102.8 |

## Files supplied

| File | What it holds |
|---|---|
| `src/App.tsx` | the whole application: connection, reads, the write, the receipt |
| `src/abi.ts` | the ABI the page ships — read it, it is short |
| `src/validation.ts` | the checks the page makes before it opens the wallet |
| `src/config.ts` | chains and transports |
| `test/validation.test.mjs` | six tests, against the real validation module |
| `scripts/abi-summary.mjs` | selectors, mutability counts, and what is missing |
| `RESULTS.md` | the template you fill in |

## Command-line work

```bash
cd part-06-decentralised-applications-and-modern-web3-development/labs/lab-05-student-registry-dapp
npm test
npm run build
```

All six tests must pass and the build must complete with no type errors.

### Part A — Read the ABI before you run anything

```bash
npm run abi
```

Record the three counts, the two selectors, and the event topic.

Two things in that output matter. Four of the five functions are `view`, and one
is not; that division decides whether the page needs a wallet at all. And the
`StudentSaved` event is not in the ABI, even though the contract emits it —
which is a real limitation of this page, not an oversight in the lab.
`RESULTS.md` asks you what follows from each.

### Part B — Deploy the contract and point the page at it

Lab 3 supplies the contract. In one terminal, start a node and deploy:

```bash
cd ../lab-03-first-smart-contract
npm run node                 # leave running
npm run deploy:local         # in a second terminal
```

Then configure this lab and start it:

```bash
cd ../lab-05-student-registry-dapp
cp .env.example .env         # set VITE_CONTRACT_ADDRESS to the deployed address
npm run dev
```

Record the contract address and the chain ID.

## Interactive work

Interfaces change faster than books do, so each step names the result that must
become true rather than the control that produces it.

1. Add the local network to your wallet: RPC `http://127.0.0.1:8545`, chain ID
   `31337`. Import a disposable key the node printed.
2. Open the application and connect. The page must show the connected address
   and the local chain, and must not show any public network.
3. Confirm the page displays the course name, the instructor, and a student
   count of zero. All three arrived without a transaction and without the wallet
   being asked anything.
4. The contract allows only the deploying instructor to write, so select that
   account. Save a student: a second local address, a name, and a score of `91`.
5. Watch the page from the moment you submit until the record changes.
   It passes through more than one state. Note each one and whether anything had
   yet happened on-chain; `RESULTS.md` asks you to list them.
6. Look up the student and confirm the name and score.
7. Save the same student again with a score of `95`. The record must change and
   the count must not. Record the count.
8. Try a score of `101`. The page must refuse it without opening the wallet.
9. Switch to an account that is not the instructor and try to save. This one
   will reach the chain and revert. Note what the page did with the failure.

## What to record

The ten values in `RESULTS.md`. Everything else about this lab is prose, because
everything else about it is an interface, and an interface is exactly the thing
a recorded value cannot capture and a picture never explained.

## What to explain

`RESULTS.md` asks eight questions: what the page did differently for reads and
writes; what it cannot do with an event missing from its ABI; every state
between submission and finality; why the same check exists in the page and the
contract; what an address checksum encodes and whether the contract cares; what
your wallet showed and which parts came from where; whom you trusted when you
believed the displayed count; and how a stale count could have appeared.

## Verification

```bash
npm run verify
```

The script recomputes all ten values and reports each as correct, wrong, or
blank, exiting non-zero unless every one is correct.

## Troubleshooting and reset

- Restarting the node resets its state. Redeploy, put the new address in `.env`,
  and restart Vite, which reads `.env` only at startup.
- A blank course name almost always means the address in `.env` does not match a
  contract on the chain the wallet is connected to.
- An `InstructorOnly` revert means the wallet has a different account selected
  from the one that deployed. That is the access control working.
- If the page shows a stale count, that is question 8, not a fault to work
  around.

## Optional public-testnet extension

Not required and not marked. Deploy Lab 3's contract to a public testnet with
test assets, point `.env` at it, and use the wallet on that network. Note how
much slower every state in step 5 becomes, and that the page's code did not
change at all.
