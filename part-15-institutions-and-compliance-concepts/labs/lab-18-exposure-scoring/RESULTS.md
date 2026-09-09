# Implementation 18 results

Fill this in as you go. Do not attach images. Every value below is reproducible
on another machine, so `verify_results.py` can mark this file.

Keep the row labels exactly as they are. Write exposures to four decimal places,
for example `0.1000`.

Everything in this exercise is a synthetic scenario. Nothing you record here is
a statement about any real party.

## Environment

- Language and version used:
- Own implementation or reference solution:
- Date completed:

## Exposure

| Field | Value |
|---|---|
| Haircut exposure of hop1 | |
| Haircut exposure of hop2 | |
| Haircut exposure of trader | |
| Haircut exposure of employee | |
| Haircut exposure of unrelated-customer | |
| Hops from the origin to supplier | |
| The trader scores higher than hop1 (yes/no) | |

## What thresholds cost

| Field | Value |
|---|---|
| Addresses flagged by haircut at a threshold of 0.5 | |
| Involved parties missed by haircut at a threshold of 0.5 | |
| Addresses flagged by haircut at a threshold of 0.1 | |
| False positives from haircut at a threshold of 0.1 | |
| Addresses flagged by the poison method | |

## Explanations

Answer each in a short paragraph, in your own words.

**1. hop1 handled the value knowingly and scored 0.10, while the trader was not
involved at all and scored higher. Explain the arithmetic that produced this,
and state what exposure actually measures:**

**2. The exchange has a positive exposure but the customer who withdrew from it
has none. Explain why propagation stops there, and what an investigator would
have to obtain to continue:**

**3. Compare the two methods. State the different question each one answers, and
explain why a reported exposure figure is uninterpretable unless the method is
named:**

**4. No threshold in the table separates the involved parties from everybody
else. Explain the trade-off a lower threshold makes, and identify who bears the
cost of a false positive:**

**5. The scenario supplied a ground truth so that the errors could be counted.
Real monitoring has none. Explain what follows for how a score should be
described, and why a flag is not a conclusion about a person:**

## Verification

```bash
python3 verify_results.py
```

- [ ] `python3 verify_results.py` reports 12 correct, 0 wrong, 0 blank
- [ ] `python3 -m unittest` passes all 18 tests
- [ ] Every explanation above is written in my own words
