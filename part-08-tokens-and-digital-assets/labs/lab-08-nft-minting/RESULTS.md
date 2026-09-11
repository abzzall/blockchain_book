# Exercise 8 results

Fill this in as you go. No images. Every value below is fixed by the contract
source and by a fresh local chain, so `npm run verify` marks this file.

Keep the row labels exactly as they are. Write selectors and topics in lowercase
hex with the `0x` prefix, booleans as `true` or `false`, and error names without
their arguments.

## Environment

- Node.js version:
- Date completed:

## Part A — What the contract declares

| Field | Value |
|---|---|
| Contract address on a fresh local chain | |
| Symbol | |
| Selector of ownerOf(uint256) | |
| Selector of tokenURI(uint256) | |
| Selector of safeTransferFrom(address,address,uint256) | |
| topic0 of Transfer(address,address,uint256) | |

## Part B — What ERC-165 reports

| Field | Value |
|---|---|
| supportsInterface for 0x80ac58cd | |
| supportsInterface for 0x5b5e139f | |
| supportsInterface for 0xd9b67a26 | |

## Part C — Issuing, holding, transferring

| Field | Value |
|---|---|
| Gas to issue the first certificate | |
| Gas to issue the second certificate | |
| Gas to transfer a certificate | |
| issuedCount after two certificates | |
| balanceOf alice after she holds one certificate | |

## Part D — What failed

| Field | Value |
|---|---|
| Error when alice issues a certificate to herself | |
| Error when burning a certificate you do not own | |
| Error when asking who owns token 99 | |
| Error when issuing to a contract with no receiver hook | |

## Explanations

**1. The walkthrough issued one certificate with an `ipfs://` URI and one with
an `https://` URI. Explain what the contract did with each of those strings, and
what it would do differently if one of them stopped resolving tomorrow:**

**2. An IPFS URI contains a hash of the content it names; an HTTPS URI names a
location. Explain what that difference buys, and what it does *not* buy — in
particular, whether an IPFS URI guarantees the metadata is still retrievable:**

**3. Transferring the token did not change `tokenURI`. Explain what was actually
transferred, and state precisely what the new owner now controls and what they
do not:**

**4. `_safeMint` refused to issue to `NonReceiver` but accepted `Receiver`,
which does nothing except return a fixed four bytes. Explain what that check
achieves and what it cannot achieve:**

**5. Issuing the second certificate cost less gas than the first, and both cost
far more than a fungible token transfer. Account for both facts:**

**6. Token id 1 was burned and the next issue produced id 2, not id 1. Explain
why reusing an id would be a problem, given what a `Transfer` event log and an
off-chain index would each have recorded:**

**7. Somebody holds a certificate token issued by this contract. State exactly
what that proves, and then state three things a reader might wrongly assume it
proves. Address the relationship between holding a token and holding any right
in the thing the metadata describes:**

## Verification

```bash
npm --workspace @blockchain-handbook/lab-08 run verify
```

- [ ] `npm run verify` reports 18 correct, 0 wrong, 0 blank
- [ ] `npm test` passes all 8 tests
- [ ] Every explanation above is written in my own words
