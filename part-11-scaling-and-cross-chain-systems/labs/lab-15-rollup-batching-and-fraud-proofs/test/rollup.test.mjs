import assert from "node:assert/strict";
import test from "node:test";
import { InvalidTransfer, applyAll, applyTransfer, clone, fromBalances, stateRoot, totalSupply } from "../src/state.mjs";
import { batchHash, buildBatch, buildFraudulentBatch, checkBatch } from "../src/rollup.mjs";

const OPENING = () => fromBalances({ alice: 100, bob: 50, carol: 0 });
const TRANSFERS = [
  { from: "alice", to: "bob", amount: 30, nonce: 0 },
  { from: "bob", to: "carol", amount: 60, nonce: 0 },
  { from: "alice", to: "carol", amount: 10, nonce: 1 },
];

test("the root is independent of the order accounts were created in", () => {
  const first = fromBalances({ alice: 1, bob: 2 });
  const second = fromBalances({ bob: 2, alice: 1 });
  assert.equal(stateRoot(first), stateRoot(second));
});

test("any change to any account changes the root", () => {
  const state = OPENING();
  const before = stateRoot(state);
  state.get("alice").balance += 1;
  assert.notEqual(stateRoot(state), before);
});

test("transfers conserve the supply", () => {
  const state = applyAll(OPENING(), TRANSFERS);
  assert.equal(totalSupply(state), 150);
});

test("a transfer that breaks a rule throws", () => {
  assert.throws(() => applyTransfer(OPENING(), { from: "alice", to: "bob", amount: 1000, nonce: 0 }), InvalidTransfer);
  assert.throws(() => applyTransfer(OPENING(), { from: "alice", to: "bob", amount: 1, nonce: 7 }), InvalidTransfer);
  assert.throws(() => applyTransfer(OPENING(), { from: "nobody", to: "bob", amount: 1, nonce: 0 }), InvalidTransfer);
  assert.throws(() => applyTransfer(OPENING(), { from: "alice", to: "bob", amount: -5, nonce: 0 }), InvalidTransfer);
});

test("an honest batch checks out against the state it started from", () => {
  const state = OPENING();
  const batch = buildBatch(state, TRANSFERS);
  const result = checkBatch(state, batch);
  assert.ok(result.valid);
  assert.equal(result.computedRoot, batch.claimedRoot);
});

test("a batch claiming the wrong root is caught by re-execution", () => {
  const state = OPENING();
  const batch = buildFraudulentBatch(state, TRANSFERS, (next) => {
    next.get("carol").balance += 1_000_000;
    return next;
  });
  const result = checkBatch(state, batch);
  assert.equal(result.valid, false);
  assert.equal(result.reason, "claimed root is not the computed root");
});

test("a batch whose posted data does not match its commitment is caught", () => {
  const state = OPENING();
  const batch = buildBatch(state, TRANSFERS);
  const swapped = { ...batch, transfers: [...TRANSFERS].reverse() };
  assert.equal(checkBatch(state, swapped).valid, false);
});

test("a batch containing an invalid transfer is caught", () => {
  const state = OPENING();
  const bad = [{ from: "alice", to: "bob", amount: 10_000, nonce: 0 }];
  const batch = { previousRoot: stateRoot(state), claimedRoot: "whatever", transfers: bad, dataHash: batchHash(bad) };
  const result = checkBatch(state, batch);
  assert.equal(result.valid, false);
  assert.match(result.reason, /invalid transfer/);
});

test("a batch does not check out against a state it did not start from", () => {
  const batch = buildBatch(OPENING(), TRANSFERS);
  const different = fromBalances({ alice: 1 });
  assert.equal(checkBatch(different, batch).valid, false);
});

test("re-execution needs nothing except the previous state and the posted data", () => {
  // Stated as a test because it is the property the whole design rests on.
  const state = OPENING();
  const batch = buildBatch(state, TRANSFERS);
  const rebuilt = { previousRoot: batch.previousRoot, claimedRoot: batch.claimedRoot, transfers: batch.transfers, dataHash: batch.dataHash };
  assert.ok(checkBatch(clone(state), rebuilt).valid);
});
