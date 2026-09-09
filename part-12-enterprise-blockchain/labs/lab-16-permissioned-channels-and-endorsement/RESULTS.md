# Implementation 16 results

Fill this in as you go. Do not attach images. Every value below is reproducible
on another machine, so `npm run verify` can mark this file.

Keep the row labels exactly as they are; the marking script finds values by
label. Write statuses exactly as the network reports them.

## Environment

- Language and version used:
- Own implementation or reference solution:
- Date completed:

## Membership and policy

| Field | Value |
|---|---|
| The channel's endorsement policy, written out | |
| {Supplier, Auditor} satisfies the policy (yes/no) | |
| {Carrier, Auditor} satisfies the policy (yes/no) | |
| mallory's identity is recognised (yes/no) | |

## Transaction outcomes

| Field | Value |
|---|---|
| Status when only the supplier endorses | |
| Status when the supplier and carrier endorse | |
| Status of the first of two concurrent transactions | |
| Status of the second of two concurrent transactions | |
| Value of shipments after both concurrent transactions | |
| Ledger entries after both concurrent transactions | |
| Status of the non-deterministic transaction | |
| The audit channel holds a value for shipments (yes/no) | |

## Explanations

Answer each in a short paragraph, in your own words.

**1. mallory presented a well-formed identity naming a real organisation and was
refused. Explain what was actually checked, and why the equivalent check has no
counterpart on a public chain:**

**2. Two of the transactions you recorded reached the ledger and changed nothing.
Explain why an invalid transaction is recorded at all rather than discarded, and
what a reader of the ledger can determine from its presence:**

**3. The second concurrent transaction was endorsed by an authorised set and
still failed. Explain what it was validated against, and why executing before
ordering makes this outcome unavoidable:**

**4. The non-deterministic chaincode was not rejected when it was installed or
when it ran. Explain what actually caught it, and why a policy naming a single
organisation would not have:**

**5. The audit channel holds no value for shipments. Explain the difference
between this and an arrangement in which the carrier receives the data
encrypted, and say which of the two a channel implements:**

## Verification

```bash
npm --workspace @blockchain-handbook/lab-16 run verify
```

- [ ] `npm run verify` reports 12 correct, 0 wrong, 0 blank
- [ ] `npm test` passes all 14 tests
- [ ] Every explanation above is written in my own words
