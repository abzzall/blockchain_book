# Chapter 20 — guided walkthrough: a React dApp

A minimal interface over one contract, built to show the boundary between an
ordinary web page and a chain. Most of what goes wrong for a first dApp is not
Solidity and not cryptography — it is React, configuration, and error handling
meeting a network that can refuse, revert, stall, or vanish.

Two folders:

| Folder | What it is |
|---|---|
| `based-on/` | What you start from. Tests complete, code stubbed with numbered TODOs. |
| `full-code/` | The finished application. **The full code is here.** |

```bash
cd based-on
npm install
npm test        # 16 tests, all failing until you implement the modules
npm run dev     # the page, once the components have something to render
```

## What this walkthrough explains that is not blockchain

These are the parts a chain-focused tutorial skips and a reader then gets stuck
on. Each is implemented in `full-code/` with the reasoning in a comment.

**Where chain data lives.** `useReadContract` keeps the value in the React Query
cache, not in your component. So it survives a component unmounting, it is shared
by every component that asks for it, and a stale response cannot overwrite a
newer one. Reading once into `useState` inside `useEffect` loses on all three
counts — it is the cause of "my data disappears when I switch tabs" and of the
race where an old answer lands last. **Do not copy chain data into state.** Only
what the user is typing belongs in `useState`.

**Moving data between components.** Props for a value one component owns and
another needs; a callback prop to report events back upward. Context for what the
whole tree needs — the wallet connection and the query cache, which is why they
are providers at the root rather than props threaded through every level. And for
anything that came from the chain: nothing, because any component can ask the
cache for it directly and get the same copy.

**Providers at the root.** `WagmiProvider` and `QueryClientProvider` wrap the
tree once. The `QueryClient` is created *outside* the component — creating it
inside makes a new cache on every render and silently discards everything read
so far.

**Button click handlers.** An ordinary DOM handler that calls a library
function; there is nothing chain-specific in the wiring. What *is* specific:
a handler runs outside React's render, so an error boundary will not catch it,
and every handler that can fail must catch its own or the button appears dead.

**The four states of a write.** Idle, waiting for the user's wallet, waiting for
the chain, confirmed. Showing one "loading" for the middle two is what makes a
user press the button a second time, because they cannot tell "waiting for you"
from "waiting for the network". The button is disabled throughout.

**Re-reading after a write.** A confirmed transaction changes the chain, and the
cached read is now wrong. Nothing tells the cache that; it has to be told.

**Rendering a `uint256`.** It arrives as a `bigint`. React will not render one
directly and `JSON.stringify` throws on one, so convert with `.toString()` at the
point of display — never `Number()`, which loses precision above 2^53 − 1.

**Connecting a wallet, and keeping it connected.** Connecting is a request to a
person and can be refused, so it needs the same error handling as anything else.
The connection survives a reload because wagmi stores the last connector and
reconnects. And the user can change account or network *in the wallet* without
touching your page: `useAccount` re-renders when they do, whereas code that
copied the address into `useState` would keep showing the old one. That is the
most common wallet bug in a first dApp.

**Being on the wrong network.** The same address exists on every chain, so a
call made on the wrong one reaches a real network and finds nothing there. It
gets its own message rather than a generic failure.

**`.env`, and what must never go in it.** Anything named `VITE_*` is embedded
into the bundle and readable by anyone who opens the page. Contract address,
chain id and a public RPC URL are fine — they are public already. A private key,
mnemonic, deployer key, paid API key, database URL or session secret is not, and
no amount of `.gitignore` helps, because the value ships to the browser.
`.env` is gitignored and `.env.example` is committed. `forbiddenNames()` catches
the dangerous names by pattern; run it over your own file before a first commit.
If a key ever is committed, deleting it in the next commit does **not** remove
it — it is in the history, and the key must be rotated.

**Every way a request can fail, and what to say.** `src/errors.js` classifies
eight cases: rejected, no wallet, wrong network, insufficient funds, reverted,
offline, timeout, unknown. Two matter more than the rest. **Offline** — the
request never reached a node — is what hangs a naive interface forever, because
no answer is coming; it needs a message and a retry, not a spinner. **Timeout**
must never invite a resend, because a submitted transaction may still be mined.
Only a revert costs gas; a rejection costs nothing and is not rendered as an
error, because the user did it on purpose.

**Not going blank.** An uncaught error during render unmounts the whole tree and
the user sees white — the failure they report as "the site is down".
`ErrorBoundary` catches it and renders a page with a way out.

**The page is not the rule.** Everything checked before sending is a convenience.
The contract enforces; a page cannot stop anyone calling the contract directly.

## What is supplied finished, and not explained

Anything whose only consequence is cosmetic or structural is given to you
complete: `styles.css`, `index.html`, `vite.config.js`, the directory layout,
and the dependency install itself. The test is the principle rather than the
list — if getting it wrong makes the page ugly instead of wrong, it is not
explained here. Copy it and move on.

## Steps

1. **Node.js.** Make sure it is installed — chapter 21 covers this once.
2. **Dependencies.** `npm install`. `react` and `react-dom` render; `vite` serves
   and bundles; `wagmi` supplies the React hooks for wallets and contracts;
   `viem` is the library underneath it that does the encoding; and
   `@tanstack/react-query` is the cache wagmi's read hooks are built on, which is
   why it must be provided at the root.
3. **`readConfig`** in `src/env.js`.
4. **`forbiddenNames`** in the same file.
5. **`classify`** in `src/errors.js` — the eight cases above.
6. **`browserThinksItIsOnline`** in the same file.
7. Run `npm test`. Sixteen tests, and they should now all pass with no network,
   no wallet and no browser involved.
8. Read the components. They are complete, and each carries the reasoning for
   the decisions above in a comment where the decision is made.

**The full code is in `full-code/` in this repository.** Compare rather than
copy; the tests pass either way and only one of the two teaches you anything.
