import { buildChain, validateChain } from "../src/chain.mjs";

const bits = Number(process.argv[2] ?? 12);
const blocks = buildChain([["a1", "a2"], ["b1", "b2", "b3"], ["c1"]], bits);

console.log(`a chain of ${blocks.length} blocks at ${bits} bits\n`);
for (const block of blocks) {
  console.log(`block ${block.height}  hash ${block.hash}`);
  console.log(`         prev ${block.header.previousHash}`);
  console.log(`         root ${block.header.merkleRoot}  nonce ${block.header.nonce}`);
}
console.log(`\nas built: ${JSON.stringify(validateChain(blocks, bits))}`);

const edited = structuredClone(blocks);
edited[0].transactions[0] = "a1-but-changed";
console.log(`edit one transaction in block 0: ${JSON.stringify(validateChain(edited, bits))}`);

const relinked = structuredClone(blocks);
relinked[2].header.previousHash = "11".repeat(32);
console.log(`repoint block 2 at a different parent: ${JSON.stringify(validateChain(relinked, bits))}`);

const renonced = structuredClone(blocks);
renonced[1].header.nonce += 1;
console.log(`change block 1's nonce by one: ${JSON.stringify(validateChain(renonced, bits))}`);
