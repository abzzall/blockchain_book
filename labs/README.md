# Handbook labs

Each lab has a self-contained `LAB.md` with its procedure, a `RESULTS.md` the
student fills in, supplied source code, automated tests, and a script that marks
the recorded values.

**No lab requires a screenshot.** Evidence is a recorded value or a written
explanation. See [`../LAB_AUTHORING_STANDARD.md`](../LAB_AUTHORING_STANDARD.md).

The labs run in reading order alongside the book:

| Lab | Part | Topic |
|---|---|---|
| 1 | I--II | [Hashing, Merkle trees, and proof of work](lab-01-hashing-merkle-and-proof-of-work/LAB.md) |
| 2 | IV | [Wallets, transactions, and explorers](lab-02-wallets-transactions-explorers/LAB.md) |
| 3 | V | [Your first smart contract](lab-03-first-smart-contract/LAB.md) |
| 4 | V | [Payable functions: a crowdfunding campaign](lab-04-payable-crowdfund/LAB.md) |
| 5 | VI | [A frontend for the registry](lab-05-student-registry-dapp/LAB.md) |
| 6 | VII | [A professional contract project](lab-06-professional-contract-project/LAB.md) |
| 7 | VIII | [An ERC-20 token](lab-07-erc20-token/LAB.md) |
| 8 | VIII | [Minting an NFT and its metadata](lab-08-nft-minting/LAB.md) |
| 9 | IX | [A constant-product automated market maker](lab-09-constant-product-amm/LAB.md) |
| 10 | X | [A voting dApp](lab-10-voting-dapp/LAB.md) |
| 11 | XIV | [Re-entrancy: the exploit and the fix](lab-11-reentrancy-exploit-and-fix/LAB.md) |
| 12 | XVI | [Capstone: a certificate registry](lab-12-capstone-certificate-registry/LAB.md) |

Lab 1 needs nothing but Node.js and runs entirely offline. Labs 3, 4, 7, 8, 9,
11, and 12 run on a local development chain. Labs 5 and 10 add a browser
frontend. Lab 2 is the only one that uses a public testnet, and it uses test
assets only.

[`LAB_TEMPLATE.md`](LAB_TEMPLATE.md) is the skeleton for new labs. It is not a
student assignment by itself.

## Running everything

```bash
cd samples-and-code
npm install
npm run test --workspaces --if-present
```
