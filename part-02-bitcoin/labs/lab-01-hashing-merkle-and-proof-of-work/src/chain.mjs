import { merkleRoot } from "./merkle.mjs";
import { hashHeader, mine, meetsDifficulty } from "./pow.mjs";

const GENESIS_PREVIOUS = "00".repeat(32);

/** Builds a chain in which each block commits to its transactions and to the
 *  block before it. Both commitments are what tampering has to defeat. */
export function buildChain(blockTransactions, difficultyBits, startTimestamp = 1_700_000_000) {
  const blocks = [];
  let previousHash = GENESIS_PREVIOUS;
  blockTransactions.forEach((transactions, height) => {
    const header = {
      previousHash,
      merkleRoot: merkleRoot(transactions),
      timestamp: startTimestamp + height * 600,
      nonce: 0,
    };
    const mined = mine(header, difficultyBits);
    const block = {
      height,
      transactions,
      header: { ...header, nonce: mined.nonce },
      hash: mined.hash,
    };
    blocks.push(block);
    previousHash = mined.hash;
  });
  return blocks;
}

/**
 * Reports the first block that fails, and why. A tampered transaction breaks the
 * Merkle root; an edited header breaks the proof of work; a replaced block
 * breaks the link in every block after it.
 */
export function validateChain(blocks, difficultyBits) {
  let previousHash = GENESIS_PREVIOUS;
  for (const block of blocks) {
    if (block.header.previousHash !== previousHash) {
      return { valid: false, height: block.height, reason: "previous-hash link broken" };
    }
    if (block.header.merkleRoot !== merkleRoot(block.transactions)) {
      return { valid: false, height: block.height, reason: "Merkle root does not match transactions" };
    }
    const digest = hashHeader(block.header);
    if (digest !== block.hash) {
      return { valid: false, height: block.height, reason: "recorded hash does not match header" };
    }
    if (!meetsDifficulty(digest, difficultyBits)) {
      return { valid: false, height: block.height, reason: "hash does not meet difficulty" };
    }
    previousHash = digest;
  }
  return { valid: true };
}
