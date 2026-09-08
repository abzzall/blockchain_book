# Lab 2 — Wallets, transactions, and explorers

## Outcome

Use a dedicated educational MetaMask account on Ethereum Sepolia, send a small
amount of valueless test ETH, and explain the resulting transaction and receipt
fields in an explorer.

## Safety and environment

- Network: Ethereum Sepolia, chain ID `11155111`.
- Assets: Sepolia test ETH only; it has no monetary value.
- Use a dedicated educational account. Never expose its Secret Recovery Phrase
  or private key. Never perform this lab on mainnet.
- Use a faucet linked by ethereum.org's current Sepolia documentation or
  supplied by your instructor; never pay for test ETH.

## Verified command-line versions

| Component | Version |
|---|---|
| Verification date | 2026-09-06 |
| Node.js | 24.15.0 |
| viem | 2.56.3 |
| Network target | Sepolia (`11155111`) |

## Files and command-line verification

`scripts/inspect-transaction.mjs` retrieves the transaction, receipt, and block;
`src/summarize-receipt.mjs` computes the required fields; the test is offline.

```bash
npm --workspace @blockchain-handbook/lab-02 test
```

Once the transaction has confirmed, inspect it yourself. Record the values
it prints rather than capturing the terminal:

```bash
cd labs/lab-02-wallets-transactions-explorers
RPC_URL="YOUR_SEPOLIA_RPC_URL" npm run inspect -- "YOUR_TRANSACTION_HASH"
```

## Browser procedure you perform

1. Open MetaMask and create or select a dedicated educational account.
2. Enable test networks if necessary, select **Sepolia**, and confirm chain ID
   `11155111`. Do not continue on mainnet.
3. Copy the account address and obtain a small amount of Sepolia ETH from an
   instructor-approved faucet. Wait for the balance.
4. Send a very small amount to a second educational address controlled by you
   or supplied by the instructor. Check network, recipient, amount, and fee.
5. Record the hash, wait for confirmation, and open it in a Sepolia explorer.
6. Locate status, hash, block, timestamp, sender, recipient, value, fee, gas
   limit, gas used, effective gas price, nonce, and transaction type.
7. Open the containing block and locate your transaction.
8. Calculate `gas used × effective gas price` and compare it with the fee.

## What to record

Write these into `RESULTS.md`. Every one is a value someone else can look up.

| Item | Where it comes from |
|---|---|
| Transaction hash of your transfer | the wallet, after sending |
| Block number and index | the explorer, or the supplied script |
| `status` on the receipt | the receipt |
| `gasUsed` and `effectiveGasPrice` | the receipt |
| Fee, computed as their product, in wei and in ETH | your own arithmetic |
| Nonce and transaction type | the transaction |
| Transaction hash of your **failed** transfer (below) | the wallet |
| `status` on that receipt | the receipt |

## A transaction that fails

Chapter 11 makes the point that being included and succeeding are different
facts, and it cannot be shown with a transfer that works. Produce one that
fails:

9. Attempt to send more test ETH than the account holds, but leave enough for
   the fee. Depending on the wallet, it may refuse before signing — if so,
   note that and try instead sending to a contract that rejects plain
   transfers, such as the token contract from a later lab.
10. When a transaction is included with `status` 0, record its hash.
11. Compare the fee charged on the failed transaction with the fee on the
    successful one.

If your wallet prevents every failing case, say so in `RESULTS.md` and use the
supplied script against a known failed transaction on the same network
instead. Either way, record a hash whose receipt shows `status` 0.

## What to explain

Answer in your own words, a short paragraph each. There are no screenshots;
these answers are the evidence that you understood what you saw.

1. Your wallet showed a confirmation before signing. What did it display, and
   which of those fields came from the transaction rather than from the page
   or app that requested it?
2. Your failed transaction cost a fee and changed nothing. Explain why the fee
   is charged anyway, in terms of what the network actually did.
3. An explorer told you the transaction succeeded. What did you rely on to
   believe that, and what would you have to do to check it without trusting
   the explorer?
4. Multiply `gasUsed` by `effectiveGasPrice`. Some of that was destroyed and
   some was paid. Explain which, and why the split exists.

## Verification

Both hashes are public, so this lab marks itself:

```bash
RPC_URL=<a Sepolia endpoint> npm --workspace @blockchain-handbook/lab-02 run inspect -- <your hash>
```

The script fetches the transaction, its receipt, and its block, and prints the
fields you recorded. Run it for both hashes. Your recorded values must match
its output exactly; if they do not, the recording is wrong, not the chain.

## Troubleshooting

- If the explorer cannot find the hash, confirm it is the Sepolia explorer and
  retry after propagation.
- If the transaction remains pending, confirm the network and that the account
  has enough test ETH for value plus fee.
- If the RPC script disagrees, confirm `RPC_URL` is Sepolia and reuse the exact
  hash.
