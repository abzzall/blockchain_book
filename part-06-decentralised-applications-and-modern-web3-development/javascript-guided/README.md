# Chapter 21 — guided walkthrough

This directory is the **step-by-step** version of the chapter 21 sample. The
finished, self-directed version is in `../javascript/`; use that one if you would
rather read working code than build it.

There are two folders here:

| Folder | What it is |
|---|---|
| `based-on/` | What you begin with. The tests are complete, the code is stubbed. |
| `full-code/` | The finished result. Read it after you have tried, not before. |

The tests in `based-on/test/` already describe everything the code must do, so
after each step run `npm test` and let the failures tell you what is left. The
starter currently fails on its very first line, because step 3 has not been done.

## Step 1 — Node.js

Node.js runs JavaScript outside a browser. Install it from
<https://nodejs.org> — take the LTS release, which is the one this book is
verified against (Node 24). Check it arrived:

```bash
node --version
npm --version
```

`npm` comes with Node; you do not install it separately. This is the only time
this book explains the installation — from here on chapters simply say to make
sure Node.js is installed.

Then copy `based-on/` somewhere you can work in.

## Step 2 — dependencies

Add these two entries to the `dependencies` of `package.json`:

```json
"dependencies": {
  "ethers": "6.17.0",
  "viem": "2.56.3"
}
```

Then `npm install`.

Both packages do the same job: they turn the JSON-RPC interface of chapter 13
into ordinary function calls, handle the hexadecimal encoding rules for you, and
decode contract results using an ABI. Neither has privileged access to anything —
they are shapes over the same interface, which is exactly why this sample runs
both and checks that they agree.

- **ethers** is the older and more widely taught of the two. Its reading object
  is a `Provider` and its writing object is a `Signer`, and that split is the
  library's way of making the read/write boundary of chapter 20 impossible to
  cross by accident.
- **viem** is the newer one. It makes the same split as a *public client* for
  reading and a *wallet client* for writing, and expresses it in the type system
  rather than leaving it to discipline.

The exact versions are pinned rather than given as ranges, for the reason
chapter 22 gives about reproducible builds.

## Step 3 — re-export the conversion helpers

In `src/units.mjs`, re-export `formatEther`, `parseEther`, `formatUnits` and
`parseUnits` from viem.

This is the step the whole chapter is about. Every amount on Ethereum is an
integer number of wei, and one ether is 10^18 of them — about 111 times larger
than the biggest integer JavaScript's ordinary `number` type can hold exactly.
The library's helpers convert between that integer and a decimal string for
display, and never route the value through a float on the way. Re-exporting them
from one module means the rest of the project cannot accidentally import some
other conversion.

## Step 4 — the precision helpers

Implement `survivesAsNumber` and `precisionLostViaNumber`.

The tests pin down the behaviour that matters: 21,000 wei survives a trip
through `number` and one ether does not. That asymmetry is why this class of bug
reaches production — it is invisible at the amounts a developer types while
testing, and appears only at the amounts a user actually sends.

## Step 5 — the fee

Implement `feePaid`: gas used times the effective gas price, in wei, as
chapter 12 defines it. The test checks 21,000 gas at 50 gwei, which must come to
exactly `0.00105` ether.

Run `npm test`. All eleven tests should now pass, with no network involved.

## Step 6 to 10 — reading a live chain

`src/read-chain.mjs` is the part that talks to a network. Work through its TODOs
in order; each names what to import or build, and the chapter explains why.

Nothing in this file signs anything. There is no key here, no wallet, and no
transaction is sent, so there is nothing to lose by getting it wrong.

```bash
npm run demo
```

It reads a public endpoint by default. To use a different network, set `RPC_URL`.

## If you get stuck

`full-code/` holds the finished version of both files. Compare rather than copy —
the tests pass either way, and only one of the two teaches you anything.
