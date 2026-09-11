# Implementation 10b — Results

Name:
Date:

No screenshots are required anywhere in this implementation. Evidence is a
recorded value or a written explanation.

## Part A — Holding is not voting

| Item | Value |
|---|---|
| `balanceOf(alice)` after the constructor | |
| `getVotes(alice)` after the constructor | |

Why are these two numbers different?

>

## Part B — What delegation moves

| Item | Before delegating | After delegating |
|---|---|---|
| `balanceOf(alice)` | | |
| `getVotes(alice)` | | |
| `getVotes(bob)` | | |
| `balanceOf(bob)` | | |

What moved, and what did not?

>

How does an address holding zero tokens come to outweigh the largest holder?

>

## Part C — The snapshot

| Item | Value |
|---|---|
| `getVotes(carol)` after she delegates | |
| Error when she votes | |
| The proposal's `snapshotBlock` | |

Why are those first two lines consistent with each other?

>

Which Chapter 36 attack does the snapshot defeat, and which does it not? Why not?

>

## Part D — Quorum

| Item | Value |
|---|---|
| `forVotes` | |
| `againstVotes` | |
| `quorumVotes` | |
| Resulting state | |

What does quorum protect against?

>

With `QUORUM` set to `0n`, which tests change their result, and what does the
system now permit?

>

## Part E — The timelock

| Item | Value |
|---|---|
| Revert when executing too early | |
| `feeBasisPoints` before execution | |
| `feeBasisPoints` after execution | |
| `timelockDelay` | |

During the delay, what could somebody who dislikes the outcome actually do?

>

## Part F — The description and the calldata

| Item | Value |
|---|---|
| Proposal `description` | |
| Proposal `callData` | |
| Resulting `feeBasisPoints` | |

What had a voter who read only the description verified?

>

## Part G — The lifecycle, from a wallet

| Step | Value |
|---|---|
| Token balance on connecting | |
| Voting power on connecting | |
| Delegation transaction hash | |
| Voting power after delegating | |
| Proposal id | |
| Snapshot block | |
| Vote transaction hash | |
| Tally after voting | |
| State once voting closed | |
| Queue transaction hash | |
| Countdown shown after queueing | |
| Execute transaction hash | |
| Fee shown afterwards | |

At step 7 you tried to execute early. What did the interface do, and why?

>

## Part H — Reading a proposal properly

| Item | Value |
|---|---|
| Target address | |
| Calldata | |
| Selector (first four bytes) | |
| Argument (remaining thirty-two bytes) | |
| Decoded value | |

Show your working for the decoded value:

>

What would an interface have to display for a voter to verify a proposal?

>

Why is displaying it still not sufficient?

>
