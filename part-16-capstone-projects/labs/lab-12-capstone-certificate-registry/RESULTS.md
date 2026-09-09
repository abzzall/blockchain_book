# Lab 12 results — capstone

Fill this in when your implementation passes the acceptance suite. No images.

Keep the row labels exactly as they are.

## Environment

- Node.js version:
- Date completed:

## Part A — The suite

Run `npm run accept` and record the totals.

| Field | Value |
|---|---|
| Acceptance tests passing | |
| Acceptance tests failing | |

## Part B — Values your implementation produces

The recipient is the local chain's second account,
`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`; the issuer is its first,
`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`; the course is
`Blockchain Systems`.

| Field | Value |
|---|---|
| certificateId for the recipient, issuer, and course named in LAB.md | |
| Contract address on a fresh local chain | |
| isValid for a certificate that was issued and then revoked | |
| totalIssued after issuing one certificate and revoking it | |

## Part C — Your own tests

The acceptance suite is the floor, not the ceiling. List the tests you added
beyond it, and what each one establishes that the supplied suite does not.

| Test you added | What it establishes |
|---|---|
| | |
| | |
| | |

## Explanations

**1. `certificateId` is a pure function of recipient, issuer, and course name.
Explain what that buys — specifically, what someone holding a certificate can
do without the registry's cooperation — and name one thing it makes impossible
that a sequential counter would have allowed:**

**2. Revoking a certificate leaves it readable and leaves `totalIssued`
unchanged. Explain why the registry does not delete it, and what a verifier
learns from a revoked certificate that they would not learn from a missing one:**

**3. Your registry has an admin who can appoint and dismiss issuers. Describe
what happens to every certificate ever issued if that admin's key is lost, and
then if it is stolen. Say which of the two is worse and why:**

**4. `isValid` returns false for a certificate that does not exist, while `get`
reverts. Explain why the two behave differently, and what a caller of each is
really asking:**

**5. Describe the access-control decisions you made where the specification left
you a choice, and defend one of them against the alternative you rejected:**

**6. Run through the security topics in Chapter 42 and name two that apply to
your contract. For each, say what in your implementation addresses it, or state
plainly that nothing does and what an attacker could do as a result:**

**7. This registry records that an issuer said something about a recipient. State
precisely what a third party can conclude from a valid certificate, and what
they cannot. Address in particular whether the chain establishes that the course
happened, that the recipient attended it, or that the issuer was entitled to
award it:**

## Submission checklist

- [ ] `npm run accept` reports 18 passing and 0 failing
- [ ] `npm run verify` reports 6 correct, 0 wrong, 0 blank
- [ ] I added my own tests beyond the acceptance suite and listed them above
- [ ] I did not modify `test/Acceptance.ts`
- [ ] I did not change any supplied function signature, event, or error name
- [ ] Every explanation is written in my own words
- [ ] No private key, recovery phrase, or mainnet account appears anywhere
