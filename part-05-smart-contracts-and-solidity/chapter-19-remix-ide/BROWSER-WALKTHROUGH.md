# Chapter 19 — deferred Remix browser walkthrough

This browser activity is intentionally kept outside the theory manuscript. Complete it when the labs are resumed. It requires no real funds and no wallet for the Remix VM portion.

The interface was verified against Remix IDE 2.5.7 on 6 September 2026. Remix changes frequently, so follow the concepts if a label moves.

## Safety boundary

- Use `https://app.remix.live/`.
- For Steps 1–8, keep the environment on **Remix VM**. Its accounts and ether are fictional.
- Do not select **Browser Extension**, approve a wallet connection, or deploy to a public network for this walkthrough.
- Never paste a seed phrase or private key into Remix.

## Source file

Use [`RemixStorage.sol`](./RemixStorage.sol). In Remix, create `contracts/RemixStorage.sol` and paste the source into it.

## Procedure

1. Open Remix and dismiss introductory overlays if necessary. Confirm that the header identifies Remix IDE and note the displayed version.
2. Open **Files**. Create `contracts/RemixStorage.sol`, paste the supplied contract, and save it.
3. Open **Compile**. Select a compiler compatible with `pragma solidity ^0.8.24;`. Record the exact compiler version and compile the file.
4. Read all compiler messages. If compilation succeeds without warnings, record that fact rather than manufacturing a warning.
5. Open **Deploy**. Confirm that the environment is **Remix VM**, record its selected EVM fork, and record the first fictional account’s starting balance.
6. Select `RemixStorage`. Supply `42` as the constructor argument and leave **Value** at `0`. Deploy it.
7. Expand the deployed instance. Call `get()` and confirm that it returns `42`. This is a read-only call and should not create a state-changing transaction receipt.
8. Call `set(99)`, then call `get()` again and confirm that it returns `99`. Expand the state-changing transaction in the terminal and identify its sender, destination, input, gas, status, and emitted `ValueChanged` log.
9. Open the deployment transaction in the debugger if the **Debug** action is available. Step through several instructions and locate the stack, memory, storage, and execution position views.
10. Export or copy the Solidity source somewhere outside browser storage when finished. Clearing site data can remove the Remix workspace.

## What to record

No screenshot is required. Every item below is a value you read off the screen
and write down, or a sentence you write yourself. A recorded value can be
checked mechanically; a picture of a screen cannot.

- Remix IDE version
- Solidity compiler version, and whether compilation produced warnings
- Selected Remix VM fork
- Deployment address
- Starting and ending fictional account balances
- Deployment transaction hash and `set(99)` transaction hash
- Gas used by deployment and by `set(99)`
- The value returned by `get()` before and after `set(99)`
- The name of the event emitted by `set(99)` and the value carried in it
- The sender and destination recorded on the `set(99)` transaction
- One paragraph explaining why `get()` has a result but no state-changing
  transaction receipt
- One paragraph explaining why the Remix VM balance change is not real ether
  expenditure
- One paragraph naming one thing the debugger showed you that the transaction
  receipt alone does not

## Optional later testnet extension

Do this only when the separate lab explicitly asks for it. Use a dedicated educational wallet, a supported testnet, and test ether. Record the network and chain ID before approving anything. Never repeat the exercise on mainnet merely to reproduce a result you already have.
