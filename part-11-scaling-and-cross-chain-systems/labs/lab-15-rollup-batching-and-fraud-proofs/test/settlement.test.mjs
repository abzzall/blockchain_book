import assert from "node:assert/strict";
import test from "node:test";
import { fromBalances, stateRoot } from "../src/state.mjs";
import { buildBatch, buildFraudulentBatch } from "../src/rollup.mjs";
import { SettlementLayer, batchGas, calldataGas, individualGas } from "../src/l1.mjs";

const OPENING = () => fromBalances({ alice: 100, bob: 50, carol: 0 });
const TRANSFERS = [
  { from: "alice", to: "bob", amount: 30, nonce: 0 },
  { from: "bob", to: "carol", amount: 60, nonce: 0 },
  { from: "alice", to: "carol", amount: 10, nonce: 1 },
];

test("an unchallenged batch finalises once its window closes", () => {
  const state = OPENING();
  const l1 = new SettlementLayer(stateRoot(state), 3);
  const record = l1.postBatch(buildBatch(state, TRANSFERS));
  l1.advance(3);
  assert.equal(l1.finalise().length, 1);
  assert.equal(record.status, "finalised");
  assert.equal(l1.finalisedRoot, record.batch.claimedRoot);
});

test("a batch does not finalise before its window closes", () => {
  const state = OPENING();
  const l1 = new SettlementLayer(stateRoot(state), 3);
  l1.postBatch(buildBatch(state, TRANSFERS));
  l1.advance(2);
  assert.equal(l1.finalise().length, 0);
  assert.equal(l1.finalisedRoot, stateRoot(state));
});

test("a fraudulent batch is rejected when challenged in the window", () => {
  const state = OPENING();
  const l1 = new SettlementLayer(stateRoot(state), 3);
  const record = l1.postBatch(
    buildFraudulentBatch(state, TRANSFERS, (next) => {
      next.get("carol").balance += 1_000_000;
      return next;
    }),
  );
  l1.advance(1);
  const outcome = l1.challenge(record, state);
  assert.ok(outcome.upheld);
  assert.equal(record.status, "rejected");
  assert.equal(l1.finalisedRoot, stateRoot(state), "the bad root never took effect");
});

test("challenging an honest batch fails and leaves it standing", () => {
  const state = OPENING();
  const l1 = new SettlementLayer(stateRoot(state), 3);
  const record = l1.postBatch(buildBatch(state, TRANSFERS));
  l1.advance(1);
  assert.equal(l1.challenge(record, state).upheld, false);
  assert.equal(record.status, "pending");
});

test("a fraudulent batch finalises if nobody challenges in time", () => {
  const state = OPENING();
  const l1 = new SettlementLayer(stateRoot(state), 3);
  const record = l1.postBatch(
    buildFraudulentBatch(state, TRANSFERS, (next) => {
      next.get("carol").balance += 1_000_000;
      return next;
    }),
  );
  l1.advance(3);
  l1.finalise();
  assert.equal(record.status, "finalised");
  assert.notEqual(l1.finalisedRoot, stateRoot(state));
  // The security of an optimistic rollup is entirely this: somebody was
  // watching, had the data, and acted inside the window.
});

test("a batch cannot be challenged after its window has closed", () => {
  const state = OPENING();
  const l1 = new SettlementLayer(stateRoot(state), 3);
  const record = l1.postBatch(buildBatch(state, TRANSFERS));
  l1.advance(5);
  assert.throws(() => l1.challenge(record, state), /window has closed/);
});

test("batching costs less gas than the same transfers sent individually", () => {
  const batch = buildBatch(OPENING(), TRANSFERS);
  assert.ok(calldataGas(batch) < individualGas(TRANSFERS.length));
});

test("the fixed batch overhead amortises, so bigger batches save more per transfer", () => {
  const many = Array.from({ length: 50 }, (_, i) => ({
    from: "alice",
    to: "carol",
    amount: 1,
    nonce: i,
  }));
  const state = fromBalances({ alice: 1000, carol: 0 });
  const small = buildBatch(state, many.slice(0, 5));
  const large = buildBatch(state, many);

  const smallRatio = individualGas(5) / batchGas(small);
  const largeRatio = individualGas(50) / batchGas(large);
  assert.ok(largeRatio > smallRatio, "the saving per transfer must improve with batch size");

  // Calldata alone is linear in the number of transfers, so it is the fixed
  // overhead, not the data, that the batch is amortising.
  const smallPerTransfer = calldataGas(small) / 5;
  const largePerTransfer = calldataGas(large) / 50;
  assert.ok(Math.abs(smallPerTransfer - largePerTransfer) < smallPerTransfer * 0.5);
});
