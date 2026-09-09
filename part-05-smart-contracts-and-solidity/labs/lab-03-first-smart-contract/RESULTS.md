# Lab 3 results

Fill this in as you go. No images. Every value below is fixed by the contract
source and by a fresh local chain, so `npm run verify` marks this file.

Keep the row labels exactly as they are. Write selectors in lowercase hex with
the `0x` prefix, and error names without their arguments.

## Environment

- Node.js version:
- Date completed:

## Part A — Selectors

| Field | Value |
|---|---|
| Selector of saveStudent(address,string,uint16) | |
| Selector of ScoreOutOfRange(uint16) | |
| Selector of InstructorOnly(address) | |
| Selector of StudentNotFound(address) | |
| topic0 of StudentSaved(address,string,uint16,bool) | |

## Part B — Deployment and gas

| Field | Value |
|---|---|
| Contract address on a fresh local chain | |
| Gas to create the first record | |
| Gas to update that record | |
| Gas to create a second record | |
| studentCount after creating, updating, and creating again | |

## Part C — The expected failures

| Field | Value |
|---|---|
| Error for a score of 101 | |
| Error for an empty name | |
| Error for the zero address | |
| Error when a non-instructor calls saveStudent | |
| Error when reading a student who was never saved | |

## Explanations

**1. Creating a record cost about three times what updating one cost. Account
for the difference in terms of what each transaction wrote to storage:**

**2. Creating the second record cost less than creating the first, even though
both created a new student. Explain what the first one paid for that the second
did not:**

**3. `getStudent` reverts with `StudentNotFound` rather than returning an empty
record. Explain what a caller could not distinguish if it returned an empty
record instead:**

**4. `instructor` is `immutable` and `courseName` is not. Explain what that
buys, and why the same treatment would not work for `studentCount`:**

**5. In Remix, calling `getStudent` behaved differently from calling
`saveStudent`. Describe in your own words what the interface did differently for
each, and explain what underlying difference that reflects:**

**6. In Remix you triggered a revert on purpose. Describe what the interface
told you, and what you had to already know in order to work out which of the
contract's five errors had fired:**

## Verification

```bash
npm --workspace @blockchain-handbook/lab-03 run verify
```

- [ ] `npm run verify` reports 15 correct, 0 wrong, 0 blank
- [ ] `npm test` passes all 6 tests
- [ ] I completed the Remix section and answered questions 5 and 6 from it
- [ ] No private key, recovery phrase, or mainnet account appears anywhere above
