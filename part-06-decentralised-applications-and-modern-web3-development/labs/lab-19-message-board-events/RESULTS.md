# Results — Implementation 19, a message board built from logs

Name:
Date:
Node version used:
Commit or version of this repository:

## Recorded values

| What | Value |
|---|---|
| `npm test` in `contract/` — tests passed | |
| `npm test` in `frontend/` — tests passed | |
| Contract address deployed to | |
| Deployment block | |
| Blocks a message stayed marked *not yet settled* | |
| `messageCount` after posting five messages | |
| Messages displayed after posting five messages | |
| Requests the page made to rebuild the feed (from the *Feed* heading) | |
| Bytes reported for your emoji message | |

## Questions

**1. The contract stores one `uint256`. The page shows every message ever
posted. Explain how both are true.** Say where a message actually lives, what it
cost to put there compared with storage, and what a *contract* could do with
those messages.

**2. The room filter is applied by the node; the author filter is applied in the
browser.** Find the line that does each. Why is one a topic and the other not,
and what does that difference cost as the number of messages grows?

**3. The historical scan and the live subscription overlap.** Why is that
deliberate? What would go wrong if the page switched cleanly from one to the
other at a single block? Which function makes the overlap harmless, and how?

**4. A message disappeared from the feed after appearing.** What happened on the
chain? Why can the page not ignore it? Why does `feed.ts` remove by log position
rather than by the message's own identifier?

**5. You stopped the node, rejected a transaction in the wallet, and sent a
message that was too long.** Describe how each failure presented itself, in the
page and in the browser's developer tools. Which of the three never reached the
chain?

**6. `Tagged` declares `string indexed tag`.** The test shows the log carries
`keccak256("solidity")` and not `"solidity"`. State what an interface can and
cannot do with that, and describe a case where you would still index a string.

**7. The second browser window showed the message without reloading and without
making a request for it.** What delivered it, and what would have happened to
that window if its connection had dropped for a minute? What would the page have
to do to recover?

**8. Suppose this board had been written to store messages in an array instead.**
Name one thing that would become possible and two things that would become
worse. Be specific about which is a cost paid once and which is paid by every
future user.

## A note on evidence

No step here requires a screenshot. A recorded value or a written explanation is
the evidence, and it demonstrates something a picture of a screen does not.
