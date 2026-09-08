import assert from "node:assert/strict";
import test from "node:test";
import { buildMerkleTree, merkleRoot, merkleProof, verifyMerkleProof } from "../src/merkle.mjs";

const FOUR = ["tx-a", "tx-b", "tx-c", "tx-d"];

test("a four-leaf tree has three levels and a fixed root", () => {
  assert.deepEqual(buildMerkleTree(FOUR).map((level) => level.length), [4, 2, 1]);
  assert.equal(
    merkleRoot(FOUR),
    "3ae3fd9168a3f2df9cf178008994dceef7ce6930b0f819d42a6451dee131f36f",
  );
});

test("every leaf has a proof of length log2(n) that verifies", () => {
  const root = merkleRoot(FOUR);
  for (let index = 0; index < FOUR.length; index += 1) {
    const proof = merkleProof(FOUR, index);
    assert.equal(proof.length, 2);
    assert.ok(verifyMerkleProof(FOUR[index], proof, root));
  }
});

test("a proof does not verify a leaf that is not in the tree", () => {
  assert.equal(verifyMerkleProof("tx-x", merkleProof(FOUR, 0), merkleRoot(FOUR)), false);
});

test("changing any leaf changes the root", () => {
  const root = merkleRoot(FOUR);
  for (let index = 0; index < FOUR.length; index += 1) {
    const altered = [...FOUR];
    altered[index] = `${altered[index]}!`;
    assert.notEqual(merkleRoot(altered), root);
  }
});

test("an odd level duplicates its last node rather than dropping it", () => {
  const three = ["tx-a", "tx-b", "tx-c"];
  assert.deepEqual(buildMerkleTree(three).map((level) => level.length), [3, 2, 1]);
  const root = merkleRoot(three);
  for (let index = 0; index < three.length; index += 1) {
    assert.ok(verifyMerkleProof(three[index], merkleProof(three, index), root));
  }
});

test("proof size grows logarithmically, so 1024 leaves need ten steps", () => {
  const many = Array.from({ length: 1024 }, (_, i) => `tx-${i}`);
  assert.equal(merkleProof(many, 777).length, 10);
  assert.ok(verifyMerkleProof("tx-777", merkleProof(many, 777), merkleRoot(many)));
});
