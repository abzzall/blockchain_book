# Lab 5 results

Fill this in as you go. No images. The table values are fixed by the contract
source, the shipped ABI, and a fresh local chain, so `npm run verify` marks
this file. Everything about the interface is answered in prose.

Keep the row labels exactly as they are. Write selectors and topics in lowercase
hex with the `0x` prefix; write the checksummed address with its original
capitalisation.

## Environment

- Node.js version:
- Wallet used (name and version):
- Date completed:

## Part A — What the page ships

| Field | Value |
|---|---|
| Number of functions in the ABI the page ships | |
| Number of those that are view | |
| Number of those that are nonpayable | |
| Selector of saveStudent(address,string,uint16) | |
| Selector of getStudent(address) | |
| topic0 of StudentSaved(address,string,uint16,bool) | |

## Part B — What it connects to

| Field | Value |
|---|---|
| Contract address on a fresh local chain | |
| Chain ID of the local network | |
| Checksummed form of 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 | |
| studentCount after saving one student twice | |

## Explanations

**1. Four of the five functions in the ABI are `view` and one is not. Describe
what the page did differently for the two kinds — what it asked of the wallet in
each case, and how long each took — and explain what underlying difference that
reflects:**

**2. The `StudentSaved` event's topic is a fixed 32 bytes, but the event does
not appear in `src/abi.ts` at all. Explain what the page therefore cannot do
with a log the contract emits, and what would have to change for it to display
a history of saves:**

**3. Describe every distinct state the page passed through between your pressing
the button and the record changing on screen. For each one, say whether anything
had yet happened on-chain:**

**4. `parseStudent` rejects a score of 101 before the wallet is ever opened, and
the contract also rejects it with `ScoreOutOfRange`. Explain why both checks
exist, what each one costs the user when it fires, and which of the two you
could remove without making the system unsafe:**

**5. The page turns a lowercase address into a checksummed one. Explain what
the capitalisation encodes and what it protects against, and say whether the
contract cares:**

**6. Describe what your wallet displayed before you approved the transaction.
Say which parts of that display came from the transaction itself and which came
from the page requesting it, and explain why the distinction matters:**

**7. The page read `studentCount` and displayed it. Explain where that number
came from, whom you were trusting when you believed it, and what you would do to
check it without trusting the page or its RPC provider:**

**8. Saving the same student twice left `studentCount` at one. Explain how the
page could have shown a stale count after the second save, and what it must do
to avoid that:**

## Verification

```bash
npm --workspace @blockchain-handbook/lab-05 run verify
```

- [ ] `npm run verify` reports 10 correct, 0 wrong, 0 blank
- [ ] `npm test` passes all 6 validation tests
- [ ] `npm run build` completes with no type errors
- [ ] I ran the application and answered every prose question from what I saw
- [ ] No private key, recovery phrase, or mainnet account appears anywhere above
