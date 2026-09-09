# Lab 10 results

Fill this in as you go. No images. Every value in the tables is fixed by the
contract source and by a fresh local chain, so `npm run verify` marks this file.

Keep the row labels exactly as they are. Write selectors and topics in lowercase
hex with the `0x` prefix, and error names without their arguments.

## Environment

- Node.js version:
- Date completed:

## Part A — What the contract declares

| Field | Value |
|---|---|
| Contract address on a fresh local chain | |
| candidateCount | |
| Selector of vote(uint256) | |
| Selector of setEligibility(address[],bool) | |
| Selector of AlreadyVoted(address) | |
| Selector of NotEligible(address) | |
| topic0 of VoteCast(address,uint256) | |

## Part B — Running the election

| Field | Value |
|---|---|
| Gas to register four voters in one call | |
| Gas for the first vote | |
| Gas for the second vote | |
| totalVotes at the close | |

## Part C — The result

| Field | Value |
|---|---|
| Votes for candidate 0 | |
| Votes for candidate 1 | |
| Votes for candidate 2 | |
| winnerId reported by result() | |
| tied reported by result() | |

## Part D — Every refusal

Write the error name only, without arguments.

| Field | Value |
|---|---|
| Error when voting before the polls open | |
| Error when a stranger calls setEligibility | |
| Error when an unregistered account votes | |
| Error when a registered voter votes twice | |
| Error when a voter who has not voted picks candidate 9 | |
| Error when result() is called while voting is open | |

## Explanations

**1. Registering four voters in one call cost roughly four times what one would
have. Explain what that says about who pays for an electoral roll on-chain, and
what happens to that cost as the roll grows:**

**2. The first vote cost more gas than the second. Account for the difference:**

**3. A voter who had not yet voted was refused for naming candidate 9, but a
voter who had already voted was refused for having voted, even though she also
named candidate 9. Explain what that tells you about the order of the checks,
and why an error message is not a reliable guide to everything wrong with a
call:**

**4. `hasVoted` is set to `true` before the vote count is incremented. Explain
why that ordering matters and what a different ordering would risk:**

**5. `result()` reverts until the polls close. Explain what becomes possible if
running totals are readable during voting, and then explain why this protection
is largely cosmetic on a public chain — that is, what an observer could work out
anyway:**

## Part E — The frontend, in prose

Run the application and use it against your local chain. There is nothing to
capture; describe what you observed.

**6. Describe what the interface showed between submitting your vote and the
vote being final. Name each distinct state it passed through, and say which of
them corresponded to something that had actually happened on-chain:**

**7. The application knew you had already voted and disabled the control.
Explain where that knowledge came from, and why the contract still has to check
it independently:**

**8. Describe what your wallet asked you to approve, and which parts of that
request came from the contract rather than from the page:**

## Part F — The question this lab exists to ask

**9. This contract prevents double voting, enforces eligibility, enforces a
schedule, and publishes a result nobody can quietly alter. Explain, in a
paragraph, why those properties are still not enough to make it suitable for a
national election. Address at least: who decides the roll, whether a vote can be
kept secret from the person who verifies it, and what a voter can be made to
prove to somebody else:**

## Verification

```bash
npm --workspace @blockchain-handbook/lab-10-contract run verify
```

- [ ] `npm run verify` reports 22 correct, 0 wrong, 0 blank
- [ ] `npm test` passes in both `contract/` and `frontend/`
- [ ] I ran the frontend and answered questions 6 to 8 from what I saw
- [ ] Question 9 is answered in my own words
- [ ] No private key, recovery phrase, or mainnet account appears anywhere above
