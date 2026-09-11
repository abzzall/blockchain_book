# Chapter 21 JavaScript samples

Reading Ethereum from JavaScript with both current libraries at once, and the
integer arithmetic that amounts require.

## Running

```bash
npm ci
npm test        # offline; no network
npm run demo    # reads a live network
```

Verified on 2026-09-06 with **Node 24.15.0**, **viem 2.56.3**, and
**ethers 6.17.0**, both pinned exactly in `package.json`.

**Nothing here signs anything.** There is no key in this sample, no wallet, and
no transaction is sent. The demo only reads.

## Why two libraries

`src/read-chain.mjs` runs viem and ethers against the same endpoint and checks
that they agree on the chain id, on three contract reads, and on an ether
balance. That is the chapter's point made executable: both are shapes over the
same JSON-RPC interface, and a disagreement would be a bug in one of them
rather than a difference in the chain.

It reads WETH, which is a good subject because it is an ordinary ERC-20 whose
reads are cheap and stable. In canonical WETH9, `totalSupply()` returns the
contract's ether balance, so agreement between those calls is an implementation
consistency check rather than independent proof of holder liabilities. A full
backing analysis must reconstruct outstanding credits and consider unsolicited
ether.

## Why the tests are offline

`test/units.test.mjs` covers the part that has real bugs in it: amounts.

Every Ethereum amount is an integer of wei, and JavaScript's `Number` holds
integers exactly only to `2**53 - 1` — about 111 times smaller than one ether.
Both libraries use `bigint` throughout, and the language refuses to mix
the two.

The important pair of tests is this: a small amount such as 21,000 gas survives
a trip through `Number` unharmed, and a realistic amount does not. That is
precisely why the bug survives testing and reaches production.

The tests need no network, so they are deterministic and will keep passing.
The live reads are in the demo, where a flaky endpoint cannot fail a test run.

## Setting a different endpoint

```bash
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com npm run demo
```

The contract address will not hold the same contract on another network, which
is itself worth observing — an address is not a reference to a contract.

## Pinning the block

The demo prints the block it read at, and reads the head by default. Any figure
taken from a chain is meaningless without the block it was read at, so record
the printed block alongside anything you quote.

To make the figures themselves identical between runs, pin the block:

```bash
RPC_URL=<an archive endpoint> BLOCK=25900000 npm run demo
```

Reading a block older than the last few hundred is an *archive* request, and
free public endpoints generally refuse it without an account. That refusal is
worth meeting once: historical state is a service somebody pays for, not
something the network owes you.
