# Hardhat sample (Chapters 23, 25 and 27)

A Hardhat 3 project holding the Chapter 23 material (a project, two kinds of
test, a local network, a declarative deployment) and the Chapter 25 material
(contracts assembled from OpenZeppelin).

## Running

```bash
npm install
npx hardhat compile
npx hardhat test
npx hardhat test --gas-stats
```

Verified on 2026-09-06 with **Hardhat 3.15.0**, **Node 24.15.0** (the current
Active LTS line, "Krypton"), **solc 0.8.36**, and
**@nomicfoundation/hardhat-toolbox-viem 5.0.7**. All versions are pinned
exactly in `package.json` and `hardhat.config.js`.

**Hardhat 3, not 2.** Nearly all existing tutorials describe version 2, whose
configuration shape, plugin mechanism and test arrangement are different.
Version 2 is still published and maintained under the `hh2` dist-tag, so
`npm install hardhat@hh2` gets it; `hardhat@latest` gets version 3.

## What it shows

- **`contracts/Counter.sol`** — one small contract with state and an event.
- **`test/Counter.t.sol`** — a test written in **Solidity**, executed directly
  on the EVM. Uses plain `require`, so it needs no test library.
- **`test/counter.js`** — the same contract driven from **JavaScript** through
  viem, the way an application would. Note `0n` and `1n`: amounts come back as
  `bigint`, for the reason Chapter 21 gives.
- **`ignition/modules/Counter.js`** — a declarative deployment. Re-running it
  does not deploy a second copy.

`npx hardhat test` runs both suites and reports the split (2 Solidity,
2 JavaScript).

## Chapter 25 contracts

- **`contracts/CampusToken.sol`** — an ERC-20 with an owner-restricted mint,
  in twelve lines. Everything a token does arrives through inheritance.
- **`contracts/Registry.sol`** — `AccessControl` instead of a single owner:
  named roles, each administered by another role.
- **`test/OpenZeppelin.t.sol`** — asserts the behaviour that actually matters,
  including **which custom error** a rejected call returns
  (`OwnableUnauthorizedAccount`, `AccessControlUnauthorizedAccount`) rather
  than merely that it reverted.
- **`test/token.js`** — the same token driven through viem, including the
  `Transfer` event minting emits from the zero address.

**OpenZeppelin Contracts is pinned at 5.6.1.** Version 4 is what most existing
material shows, and two changes break it: `Ownable` now takes its initial
owner as an explicit constructor argument, and failures revert with typed
custom errors rather than strings. The registry also carries a `dev` tag
(5.7.0 at the time of writing) which this project deliberately does not use.

Deployed sizes, for the comparison Chapter 25 draws: `Counter` 405 bytes from
9 source lines; `CampusToken` 4,380 bytes from 12.

## Chapter 27 contracts

- **`contracts/CampusBadge.sol`** — an ERC-721 (`CampusBadge`), an ERC-1155
  (`CampusItems`), and `RefusesTokens`, a contract with no token handling used
  to show what a safe transfer actually checks.
- **`test/TokenStandards.t.sol`** — the allowance mechanism, including the test
  that grants an allowance from an account holding **no tokens**; the safe
  transfer refusing a contract that cannot receive; ERC-1155 holding several
  classes; and interface identifiers.

Two results worth knowing about:

- **ERC-1155 applies its acceptance check on minting too**, not only on
  transfer, so a contract must implement `onERC1155Received` before it can be
  issued tokens at all. ERC-721's plain mint does not. This surfaced as a
  failing test.
- **`0x80ac58cd` is derived, not magic.** Combining the nine ERC-721 function
  selectors with exclusive-or produces it exactly;
  `samples-and-code/ethereum/contracts.py` computes the selectors with the
  book's own Keccak-256. The same procedure gives `0xd9b67a26` for ERC-1155
  and `0x01ffc9a7` for ERC-165, and all three match what the deployed
  contracts report through `supportsInterface`.

## Two cross-checks worth knowing about

The local network's first account is `0xf39Fd6e5…`, the same address
`samples-and-code/ethereum/` derives from the published test mnemonic and the
same one Foundry's `anvil` supplies. All three derive it identically.

Deploying the contract from that account at nonce 0 gives
`0x5FbDB2315678afecb367f032d93F642f64180aa3`, which is exactly what
`create_address` in `samples-and-code/ethereum/` computes for the same inputs.
The address was knowable before the deployment ran.

## Safety

The development accounts have **published private keys**. Hardhat prints its
own warning about this on startup. They are safe only where nothing of value
exists; never send real funds to them.
