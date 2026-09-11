import assert from "node:assert/strict";
import test from "node:test";

// The state rules the contract enforces, restated here so the frontend's
// reading of them can be checked without a chain.

const ACTIVE = "Active";
const DEFEATED = "Defeated";
const SUCCEEDED = "Succeeded";

function outcome({ now, voteEnd, forVotes, againstVotes, quorum }) {
  if (now < voteEnd) return ACTIVE;
  const cast = forVotes + againstVotes;
  if (cast < quorum) return DEFEATED;
  return forVotes > againstVotes ? SUCCEEDED : DEFEATED;
}

function executable({ now, executableAt, queued, executed }) {
  if (executed) return false;
  if (!queued) return false;
  return now >= executableAt;
}

test("voting stays open up to the deadline and closes on it", () => {
  const base = { voteEnd: 100n, forVotes: 200n, againstVotes: 0n, quorum: 100n };
  assert.equal(outcome({ ...base, now: 99n }), ACTIVE);
  assert.equal(outcome({ ...base, now: 100n }), SUCCEEDED);
});

test("quorum is measured against votes cast, not against the supply", () => {
  // Unanimous, and still defeated: only thirty of the hundred needed turned up.
  assert.equal(
    outcome({ now: 100n, voteEnd: 100n, forVotes: 30n, againstVotes: 0n, quorum: 100n }),
    DEFEATED,
  );
  // The same thirty in favour, with seventy against, now reaches quorum and loses.
  assert.equal(
    outcome({ now: 100n, voteEnd: 100n, forVotes: 30n, againstVotes: 70n, quorum: 100n }),
    DEFEATED,
  );
});

test("a tie is not a pass", () => {
  assert.equal(
    outcome({ now: 100n, voteEnd: 100n, forVotes: 50n, againstVotes: 50n, quorum: 100n }),
    DEFEATED,
  );
});

test("nothing executes before it is queued", () => {
  assert.equal(executable({ now: 999n, executableAt: 0n, queued: false, executed: false }), false);
});

test("the timelock boundary is inclusive at its end", () => {
  const queued = { executableAt: 200n, queued: true, executed: false };
  assert.equal(executable({ ...queued, now: 199n }), false);
  assert.equal(executable({ ...queued, now: 200n }), true);
});

test("an executed proposal cannot execute again", () => {
  assert.equal(
    executable({ now: 999n, executableAt: 200n, queued: true, executed: true }),
    false,
  );
});
