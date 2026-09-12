# Implementation 19 — A message board built from logs

## Outcome

You will build and run an application whose entire content comes from events.
The contract stores one number. Every message the page displays — the whole
history, from any author, in any room — is reconstructed from logs.

You will fetch the history with a filtered query over a block range, subscribe
to new messages as they arrive, watch a message sit provisional until the head
moves past it, and remove one that a reorganisation took back. You will then
answer the question this exercise exists to ask, which is why a contract that
stores nothing can still be the source of everything on the screen.

## Safety and environment

- Network: Hardhat's local chain, for both the contract work and the frontend.
- Assets: local test ether only, invented by the development chain.
- Import only the disposable keys the local chain prints, and only into a
  browser profile you keep for coursework. Never reuse one anywhere else.
- Never connect a wallet holding real assets to this implementation.

## Verified versions

| Component | Version |
|---|---|
| Verification date | 2026-09-12 |
| Operating system | Linux x86-64 |
| Node.js | 24.15.0 |
| Hardhat | 3.15.0 |
| Solidity | 0.8.37 |
| React | 19.2.8 |
| wagmi | 3.7.7 |
| viem | 2.56.3 |

## Files supplied

| File | What it holds |
|---|---|
| `contract/contracts/MessageBoard.sol` | one counter, two events, two custom errors |
| `contract/test/MessageBoard.ts` | thirteen tests across five groups |
| `contract/scripts/deploy.ts` | deploys and prints the address *and the deployment block* |
| `frontend/src/abi.ts` | the ABI, carrying the events as well as the functions |
| `frontend/src/feed.ts` | the merge, de-duplication, removal, and validation rules |
| `frontend/src/App.tsx` | the historical scan, the live subscription, and the page |
| `frontend/test/feed.test.mjs` | fourteen tests of the feed rules, with no chain |
| `RESULTS.md` | the template you fill in |

## Command-line work

```bash
cd part-06-decentralised-applications-and-modern-web3-development/labs/lab-19-message-board-events/contract
npm ci
npm run build
npm test
```

Thirteen tests should pass. Read them before going further: they are the
specification of everything the page later relies on. Note in particular
`cannot filter on the text, because the text is not a topic`, and
`puts the hash of the tag in the topic, and not the tag`.

Now start a chain and deploy. In one terminal:

```bash
npm run node
```

In a second terminal, from the same `contract` directory:

```bash
npm run deploy:local
```

It prints two values. Put **both** in `frontend/.env.local`:

```
VITE_CONTRACT_ADDRESS=0x...
VITE_DEPLOY_BLOCK=...
```

The second one is not decoration. The page scans for logs from that block
forward. On a local chain you could scan from zero and never notice; on a public
chain, scanning from zero is not a thing you are allowed to do.

Then, in a third terminal:

```bash
cd ../frontend
npm ci
npm test          # fourteen tests, no chain, no browser
npm run dev
```

`npm run dev` prints a local address, normally `http://localhost:5173`. Open it.

If the page says the contract address is unset, you edited `.env.local` after
starting the dev server: stop it and start it again. Vite reads environment
variables once, at startup.

## Interactive work

Connect a wallet holding one of the accounts the local chain printed, then work
through the following. Record what becomes true at each step, not which control
you pressed.

1. **Post a message.** Watch the button change while the wallet is open, change
   again while the transaction is in flight, and the message appear in the feed.
   Record how long it stayed marked as not yet settled, in blocks.

2. **Find out where the message lives.** The page shows a message count that
   comes from contract storage. Post five messages and record both the count and
   the number of messages displayed. Explain the relationship.

3. **Filter by room.** Change the room to something else and post there. Record
   what happens to the feed, and how many requests the page made to rebuild it —
   the figure under the *Feed* heading tells you.

4. **Filter by author.** Tick *only mine*. Then read `App.tsx` and answer a
   question it raises: the room filter is applied by the node and the author
   filter is applied in the browser. Find the line that does each, and say what
   the difference costs.

5. **Watch a second window.** Open the page in a second browser window and post
   from the first. The second window is not reloaded and has made no request.
   Explain what put the message there.

6. **Break it on purpose.** Stop the Hardhat node while the page is open, then
   post. Open the browser console and the network panel, and record: what the
   console printed, what the network panel showed for the request, and how this
   differs from what you see when you reject the transaction in the wallet
   instead. These are three different failures and the page reports them
   differently.

7. **Try to post 300 bytes.** Record what stopped you and where. Then try an
   emoji-heavy message of about 100 characters and record what happens. The
   contract counts bytes; the page had to be told to.

## What to explain

`RESULTS.md` asks eight questions. Three are worth naming here.

The contract stores a single `uint256`. The page shows every message ever
posted. Explain, in terms of what a log is and where it lives, how both of those
are true at once — and say what a *contract* could do with the messages, given
that no contract can read a log.

The historical scan and the live subscription overlap: the scan runs to the
current head, and the subscription was already listening before it finished.
Explain why that overlap is deliberate, what would go wrong if the page switched
cleanly from one to the other, and which function makes the overlap harmless.

A message can be removed from the feed after it appeared. Explain what has
happened on the chain when that occurs, why the page cannot simply ignore it,
and why `feed.ts` removes by log position rather than by message identifier.

## Verification

```bash
cd contract  && npm test    # 13 passing
cd ../frontend && npm test  # 14 passing
cd ../frontend && npm run build
```

No step in this implementation requires a screenshot. The evidence is the values
you recorded and the explanations you wrote.
