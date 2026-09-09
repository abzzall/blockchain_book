import assert from "node:assert/strict";
import test from "node:test";
import { mine, hashHeader, meetsDifficulty } from "../src/pow.mjs";
import { buildChain, validateChain } from "../src/chain.mjs";

const HEADER = {
  previousHash: "00".repeat(32),
  merkleRoot: "3ae3fd9168a3f2df9cf178008994dceef7ce6930b0f819d42a6451dee131f36f",
  timestamp: 1_700_000_000,
  nonce: 0,
};

test("mining is deterministic: the same header yields the same nonce", () => {
  assert.equal(mine(HEADER, 8).nonce, mine(HEADER, 8).nonce);
  assert.equal(mine(HEADER, 16).nonce, 238_317);
  assert.equal(
    mine(HEADER, 16).hash,
    "000015f6a7c9262879cd6e327ca01b63ef7567149ac6c73657fc57bfe3d1d231",
  );
});

test("the found hash actually meets the difficulty and the header reproduces it", () => {
  const result = mine(HEADER, 16);
  assert.ok(meetsDifficulty(result.hash, 16));
  assert.equal(hashHeader({ ...HEADER, nonce: result.nonce }), result.hash);
});

test("verifying is cheap while finding was not", () => {
  const result = mine(HEADER, 16);
  assert.ok(result.attempts > 1000, "finding took many attempts");
  // one hash is enough to check it
  assert.equal(hashHeader({ ...HEADER, nonce: result.nonce }), result.hash);
});

test("raising difficulty by four bits costs about sixteen times the work", () => {
  const cheap = mine(HEADER, 8).attempts;
  const dear = mine(HEADER, 16).attempts;
  assert.ok(dear > cheap * 10, `${dear} should greatly exceed ${cheap}`);
});

test("a built chain validates, and each kind of edit is caught", () => {
  const bits = 12;
  const blocks = buildChain([["a1", "a2"], ["b1", "b2", "b3"], ["c1"]], bits);
  assert.equal(validateChain(blocks, bits).valid, true);

  const editedTransaction = structuredClone(blocks);
  editedTransaction[0].transactions[0] = "a1-changed";
  assert.deepEqual(validateChain(editedTransaction, bits), {
    valid: false, height: 0, reason: "Merkle root does not match transactions",
  });

  const editedNonce = structuredClone(blocks);
  editedNonce[1].header.nonce += 1;
  assert.deepEqual(validateChain(editedNonce, bits), {
    valid: false, height: 1, reason: "recorded hash does not match header",
  });

  const editedLink = structuredClone(blocks);
  editedLink[2].header.previousHash = "11".repeat(32);
  assert.deepEqual(validateChain(editedLink, bits), {
    valid: false, height: 2, reason: "previous-hash link broken",
  });
});
