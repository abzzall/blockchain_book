import { buildMerkleTree, merkleRoot, merkleProof, verifyMerkleProof } from "../src/merkle.mjs";

const [indexArgument, ...values] = process.argv.slice(2);
const index = Number(indexArgument);
if (!Number.isInteger(index) || values.length === 0) {
  console.error('usage: npm run merkle -- <leafIndex> "tx-a" "tx-b" "tx-c" "tx-d"');
  process.exit(1);
}

const levels = buildMerkleTree(values);
const root = merkleRoot(values);
levels.forEach((level, depth) => {
  console.log(`level ${depth} (${level.length} node${level.length === 1 ? "" : "s"})`);
  level.forEach((node, position) => console.log(`  [${position}] ${node}`));
});
console.log(`\nroot                ${root}`);

const proof = merkleProof(values, index);
console.log(`proof for leaf ${index} (${JSON.stringify(values[index])}), ${proof.length} step(s):`);
proof.forEach((step, depth) => console.log(`  ${depth}: sibling on the ${step.side}  ${step.hash}`));
console.log(`proof verifies:     ${verifyMerkleProof(values[index], proof, root)}`);
console.log(`same proof, wrong leaf: ${verifyMerkleProof("not-in-the-tree", proof, root)}`);
