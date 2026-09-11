# Implementation 8 — Minting an NFT and its metadata

## Outcome

You will issue non-fungible certificates, hold them, transfer one, burn one, and
watch every refusal the contract can make. The subject of the exercise is not minting,
which is easy, but the relationship between the token and the thing it refers
to: what the chain actually stores, what it never checks, and what holding one
of these tokens does and does not prove.

## Safety and environment

- Network: Hardhat's in-process local chain. Nothing leaves your machine.
- Assets: tokens you created on a simulated chain. They have no value and refer
  to nothing real.
- The metadata URIs in this exercise point at `example.invalid` and at an IPFS
  identifier that does not resolve. That is deliberate, and it is part of the
  lesson.

## Verified versions

| Component | Version |
|---|---|
| Verification date | 2026-09-07 |
| Node.js | 24.15.0 |
| Hardhat | 3.15.0 |
| Solidity | 0.8.36 |
| OpenZeppelin Contracts | 5.6.1 |
| viem | 2.56.3 |

## Files supplied

| File | What it holds |
|---|---|
| `contracts/CourseCertificate.sol` | ERC-721 with per-token URIs, issuer-only minting, holder-only burning |
| `contracts/Receiver.sol` | the minimum a contract needs to be allowed to hold an NFT |
| `contracts/NonReceiver.sol` | a contract that does not implement the hook |
| `test/Certificate.ts` | eight tests, three of which pin the values this exercise marks |
| `scripts/walkthrough.ts` | issues, transfers, burns, and triggers every failure |
| `scripts/selectors.mjs` | separates the ERC-721 interface from the extensions |
| `RESULTS.md` | the template you fill in |

## Command-line work

```bash
cd part-08-tokens-and-digital-assets/labs/lab-08-nft-minting
npm run build
npm test
```

All eight tests must pass before you continue.

### Part A — What the contract declares

```bash
npm run selectors
```

Record the three selectors and one event topic in `RESULTS.md`.

Notice that the `Transfer` topic is the same 32 bytes you recorded in Exercise 7 for
a fungible token. The signature `Transfer(address,address,uint256)` is identical;
what differs is that the third argument is a token id here and an amount there,
and that here it is indexed. Anything reading logs must know which kind of
contract it is looking at before it can interpret them, and ERC-165 is how it
asks. Record the three `supportsInterface` answers.

### Part B — Issuing, transferring, burning

```bash
npm run walkthrough
```

Record the contract address, the symbol, the three gas figures, `issuedCount`,
Alice's balance, and the four error names.

Three things in that output are the point of the exercise.

1. Two certificates were issued with two different URIs — one `ipfs://`, one
   `https://`. The contract stored both strings. It fetched neither, validated
   neither, and has no way to know whether either resolves.
2. Transferring token 1 changed its owner and left `tokenURI` exactly as it was.
   The token moved; the metadata did not, and nor did anything the metadata
   describes.
3. Issuing to `NonReceiver` was refused and issuing to `Receiver` succeeded —
   and `Receiver` does nothing at all except return four fixed bytes. The check
   establishes that a contract *claims* it can handle the token. It establishes
   nothing else.

### Part C — Ids are not reused

The walkthrough burns token 2 and `issuedCount` does not go backwards. A test
proves that a burn followed by an issue produces a new id rather than recycling
the old one. `RESULTS.md` asks you why that matters to anything that recorded
the earlier `Transfer` events.

## What to record

The eighteen values in `RESULTS.md`, all from the two commands, all reproducible.

## What to explain

`RESULTS.md` asks seven questions. The first six are about mechanism: what the
contract did with each URI, what a content hash buys and does not buy, what a
transfer actually moved, what the receiver check achieves, why the gas figures
differ, and why ids are never reused.

The seventh is the one that matters most and is the reason this exercise exists.
Somebody holds a certificate issued by this contract. State exactly what that
proves — and then state three things a reader might wrongly assume it proves.
Address directly the relationship between holding a token and holding any right
in whatever the metadata describes. The chain records who holds an entry in a
mapping. Everything beyond that is a claim made by somebody, somewhere else, and
the contract has no opinion on it.

Keep to mechanism and to what is and is not established. This exercise does not ask
you to reach a legal conclusion, and you should not attempt one; the point is
the far simpler observation that the chain is silent on the question.

## Verification

```bash
npm run verify
```

The script recomputes all eighteen values and reports each as correct, wrong, or
blank, exiting non-zero unless every one is correct.

## Troubleshooting and reset

- Every command builds its own chain, so there is nothing to reset. A gas figure
  that disagrees means the chain was not fresh.
- If `npm run selectors` cannot find the artifact, run `npm run build`.
- `ERC721NonexistentToken` when reading a burned or never-issued token is the
  contract working correctly, not a fault.
- An `OwnableUnauthorizedAccount` revert means the call came from an account
  other than the deployer.

## Optional public-testnet extension

Not required and not marked. If you deploy to a public testnet with test assets,
you may find a wallet or explorer displays an image for your token. It is
fetching the URI and rendering whatever it finds. Nothing on-chain participated
in that, and nothing on-chain would notice if the file changed.
