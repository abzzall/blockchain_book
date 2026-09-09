import assert from "node:assert/strict";
import test from "node:test";

function phase(now, starts, ends) {
  if (now < starts) return "Not started";
  if (now >= ends) return "Closed";
  return "Voting open";
}

test("schedule boundaries are half-open", () => {
  assert.equal(phase(9n, 10n, 20n), "Not started");
  assert.equal(phase(10n, 10n, 20n), "Voting open");
  assert.equal(phase(20n, 10n, 20n), "Closed");
});
