import { createHash } from "node:crypto";

const hashPair = (left, right) =>
  createHash("sha256")
    .update(Buffer.from(left + right, "hex"))
    .digest("hex");

const leafHash = (value) =>
  createHash("sha256").update(Buffer.from(String(value), "utf8")).digest("hex");

/**
 * Builds every level of a Merkle tree, bottom level first. An odd level
 * duplicates its last node, which is the rule Bitcoin uses and the reason a
 * tree with three leaves and a tree with four can share a shape.
 */
export function buildMerkleTree(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("a Merkle tree needs at least one leaf");
  }
  const levels = [values.map(leafHash)];
  while (levels.at(-1).length > 1) {
    const below = levels.at(-1);
    const next = [];
    for (let i = 0; i < below.length; i += 2) {
      const left = below[i];
      const right = below[i + 1] ?? below[i];
      next.push(hashPair(left, right));
    }
    levels.push(next);
  }
  return levels;
}

export function merkleRoot(values) {
  return buildMerkleTree(values).at(-1)[0];
}

/**
 * The sibling hashes needed to recompute the root from one leaf, together with
 * the side each sibling sits on. This is the whole membership proof: its length
 * grows with the logarithm of the leaf count, not the leaf count.
 */
export function merkleProof(values, index) {
  const levels = buildMerkleTree(values);
  if (!Number.isInteger(index) || index < 0 || index >= values.length) {
    throw new Error(`leaf index ${index} is outside the tree`);
  }
  const proof = [];
  let position = index;
  for (let level = 0; level < levels.length - 1; level += 1) {
    const nodes = levels[level];
    const isRight = position % 2 === 1;
    const siblingIndex = isRight ? position - 1 : position + 1;
    const sibling = nodes[siblingIndex] ?? nodes[position];
    proof.push({ hash: sibling, side: isRight ? "left" : "right" });
    position = Math.floor(position / 2);
  }
  return proof;
}

/** Recomputes a root from a leaf value and its proof. */
export function verifyMerkleProof(value, proof, root) {
  let computed = leafHash(value);
  for (const step of proof) {
    computed =
      step.side === "left"
        ? hashPair(step.hash, computed)
        : hashPair(computed, step.hash);
  }
  return computed === root;
}

export { leafHash };
