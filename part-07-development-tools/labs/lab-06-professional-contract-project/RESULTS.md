# Exercise 6 results

Fill this in as you go. No images. Every value below is fixed by the source and
by the pinned tool versions, so `npm run verify` marks this file.

Keep the row labels exactly as they are. Write selectors and topics in lowercase
hex with the `0x` prefix.

## Environment

- Node.js version:
- Foundry version (`forge --version`):
- Date completed:

## Part A — Selectors, computed by `cast` from the signature alone

| Field | Value |
|---|---|
| Selector of contribute() | |
| Selector of finalize() | |
| Selector of claimRefund() | |
| Selector of GoalNotReached() | |
| topic0 of Contribution(address,uint256,uint256) | |

## Part B — What Forge reports

| Field | Value |
|---|---|
| forge gas for testContributionIsRecorded | |
| forge gas for testMissedGoalCanBeRefunded | |
| forge gas for testCannotFinalizeBeforeDeadline | |
| Average gas reported for contribute | |
| Average gas reported for claimRefund | |

## Part C — The same contract, built twice

| Field | Value |
|---|---|
| Bytecode length from both toolchains, in bytes | |
| Identical leading bytes | |
| Differing trailing bytes | |
| Are the two builds byte-for-byte identical | |

## Part D — The local node

| Field | Value |
|---|---|
| First contract address on a fresh local node | |

## Explanations

**1. `cast sig` produced a selector without compiling anything, without a node,
and without ever seeing the contract. Explain what it computed and from what,
and what follows for a caller trying to work out what an unverified contract
does:**

**2. Both toolchains compiled the same source with the same compiler version and
produced bytecode of the same length, 2199 bytes of which are identical.
Explain what the differing 43 bytes are and why they differ, and say whether the
two contracts would behave differently if deployed:**

**3. You deployed to a fresh local node and got the same address the exercise
predicted. Explain what determines a contract's address, and why that makes a
local chain markable in a way a public one is not:**

**4. Forge reported an average gas figure per function across the whole test
suite, and Hardhat's tests did not. Explain what that report is for, and why an
average across tests is not the same thing as what a real caller will pay:**

**5. You ran the same contract through two toolchains that overlap almost
entirely. Give the case for each being worth knowing, in terms of what each does
that the other does not do as well:**

**6. `claimRefund` costs about 32,000 gas and `contribute` about 70,000. Account
for the difference in terms of what each writes to storage:**

**7. The deployment script reads its key from an environment file that is not in
the repository, and the exercise insists it be a disposable local key. Explain what
would go wrong with a key in the repository even if the repository were private,
and what makes the local key safe to treat casually:**

## Verification

```bash
npm --workspace @blockchain-handbook/lab-06 run verify
```

- [ ] `npm run verify` reports 15 correct, 0 wrong, 0 blank
- [ ] `npm test` passes the Hardhat tests
- [ ] `forge test` passes all three Foundry tests
- [ ] No private key appears anywhere above or in any tracked file
