# Implementations

Each implementation has a self-contained `INSTRUCTIONS.md` with its procedure, a `RESULTS.md` the
student fills in, supplied source code, automated tests, and a script that marks
the recorded values.

**No implementation requires a screenshot.** Evidence is a recorded value or a written
explanation. See [`../AUTHORING_STANDARD.md`](../AUTHORING_STANDARD.md).

The implementations run in reading order alongside the book:

| # | Part | Topic |
|---|---|---|
| 1 | II | [Hashing, Merkle trees, and proof of work](../part-02-bitcoin/labs/lab-01-hashing-merkle-and-proof-of-work/INSTRUCTIONS.md) |
| 2 | IV | [Local transactions and receipt evidence](../part-04-ethereum-transactions-networks-and-wallets/labs/lab-02-wallets-transactions-explorers/INSTRUCTIONS.md) |
| 3 | V | [Your first smart contract](../part-05-smart-contracts-and-solidity/labs/lab-03-first-smart-contract/INSTRUCTIONS.md) |
| 4 | V | [Payable functions: a crowdfunding campaign](../part-05-smart-contracts-and-solidity/labs/lab-04-payable-crowdfund/INSTRUCTIONS.md) |
| 5 | VI | [A frontend for the registry](../part-06-decentralised-applications-and-modern-web3-development/labs/lab-05-student-registry-dapp/INSTRUCTIONS.md) |
| 6 | VII | [A professional contract project](../part-07-development-tools/labs/lab-06-professional-contract-project/INSTRUCTIONS.md) |
| 7 | VIII | [An ERC-20 token](../part-08-tokens-and-digital-assets/labs/lab-07-erc20-token/INSTRUCTIONS.md) |
| 8 | VIII | [Minting an NFT and its metadata](../part-08-tokens-and-digital-assets/labs/lab-08-nft-minting/INSTRUCTIONS.md) |
| 9 | IX | [A constant-product automated market maker](../part-09-decentralised-finance/labs/lab-09-constant-product-amm/INSTRUCTIONS.md) |
| 10 | X | [A voting dApp](../part-10-decentralised-autonomous-organisations-and-governance/labs/lab-10-voting-dapp/INSTRUCTIONS.md) |
| 11 | XIV | [Re-entrancy: the exploit and the fix](../part-14-security-fraud-and-user-safety/labs/lab-11-reentrancy-exploit-and-fix/INSTRUCTIONS.md) |
| 12 | XVI | [Capstone: a certificate registry](../part-16-capstone-projects/labs/lab-12-capstone-certificate-registry/INSTRUCTIONS.md) |
| 13 | I | [Digital signatures and the cost of a repeated nonce](../part-01-blockchain-foundations/labs/lab-13-digital-signatures/INSTRUCTIONS.md) |
| 14 | III | [Applying a block to account state](../part-03-ethereum/labs/lab-14-applying-a-block/INSTRUCTIONS.md) |
| 15 | XI | [Rollup batching and fraud proofs](../part-11-scaling-and-cross-chain-systems/labs/lab-15-rollup-batching-and-fraud-proofs/INSTRUCTIONS.md) |
| 16 | XII | [Permissioned channels and endorsement policies](../part-12-enterprise-blockchain/labs/lab-16-permissioned-channels-and-endorsement/INSTRUCTIONS.md) |
| 17 | XIII | [Unlinkability and address clustering](../part-13-privacy-identity-and-transparency/labs/lab-17-unlinkability-and-clustering/INSTRUCTIONS.md) |
| 18 | XV | [Exposure scoring on a synthetic flow graph](../part-15-institutions-and-compliance-concepts/labs/lab-18-exposure-scoring/INSTRUCTIONS.md) |

Every part of the book has at least one implementation.

Implementations 13, 14, 17, and 18 are Python and need nothing but a Python
installation. Implementations 1, 15, and 16 are JavaScript and need nothing but
Node.js. All seven run entirely offline, with no network, wallet, or test
assets. Implementations 2, 3, 4, 7, 8, 9, 11, and 12 run on a local development
chain, and 5 and 10 add a browser frontend connected to a local node. Public
testnets and browser wallets are optional self-study extensions, never required.

[`INSTRUCTIONS_TEMPLATE.md`](INSTRUCTIONS_TEMPLATE.md) is the skeleton for new implementations. It is not a
student assignment by itself.

## Running everything

```bash
cd samples-and-code
npm install
./scripts/check-all.sh
```
