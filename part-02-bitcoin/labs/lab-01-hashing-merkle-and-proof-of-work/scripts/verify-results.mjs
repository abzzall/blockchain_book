import { readFile } from "node:fs/promises";
import { sha256, doubleSha256 } from "../src/hash.mjs";
import { merkleRoot, merkleProof } from "../src/merkle.mjs";
import { mine } from "../src/pow.mjs";
import { buildChain, validateChain } from "../src/chain.mjs";

const path = process.argv[2] ?? new URL("../RESULTS.md", import.meta.url).pathname;

/** Reads `| label | value |` rows out of the student's RESULTS.md. */
function readTableValues(markdown) {
  const values = new Map();
  for (const line of markdown.split("\n")) {
    const match = line.match(/^\s*\|([^|]+)\|([^|]*)\|\s*$/);
    if (!match) continue;
    const label = match[1].trim().replace(/`/g, "").toLowerCase();
    const value = match[2].trim().replace(/`/g, "");
    if (!label || /^-+$/.test(label) || label === "field" || label === "item") continue;
    values.set(label, value);
  }
  return values;
}

const FOUR = ["tx-a", "tx-b", "tx-c", "tx-d"];
const HEADER = {
  previousHash: "00".repeat(32),
  merkleRoot: merkleRoot(FOUR),
  timestamp: 1_700_000_000,
  nonce: 0,
};
const chain = buildChain([["a1", "a2"], ["b1", "b2", "b3"], ["c1"]], 12);

const expected = [
  ["sha-256 of \"blockchain\"", sha256("blockchain")],
  ["double sha-256 of \"blockchain\"", doubleSha256("blockchain")],
  ["merkle root of the four transactions", merkleRoot(FOUR)],
  ["number of steps in the proof for tx-c", String(merkleProof(FOUR, 2).length)],
  ["first sibling hash in the proof for tx-c", merkleProof(FOUR, 2)[0].hash],
  ["nonce at 16 bits", String(mine(HEADER, 16).nonce)],
  ["block hash at 16 bits", mine(HEADER, 16).hash],
  ["nonce at 8 bits", String(mine(HEADER, 8).nonce)],
  ["hash of block 0 in the three-block chain", chain[0].hash],
  ["hash of block 2 in the three-block chain", chain[2].hash],
  ["height reported when block 0's first transaction is edited", "0"],
  ["height reported when block 2's previous hash is edited", "2"],
];

const markdown = await readFile(path, "utf8");
const recorded = readTableValues(markdown);

let correct = 0;
let blank = 0;
let wrong = 0;
console.log(`marking ${path}\n`);
for (const [label, want] of expected) {
  const got = recorded.get(label.toLowerCase());
  if (got === undefined) {
    console.log(`MISSING  ${label}\n         (no row with this label was found)`);
    blank += 1;
  } else if (got === "") {
    console.log(`BLANK    ${label}`);
    blank += 1;
  } else if (got.toLowerCase() === want.toLowerCase()) {
    console.log(`ok       ${label}`);
    correct += 1;
  } else {
    console.log(`WRONG    ${label}\n         recorded ${got}\n         expected ${want}`);
    wrong += 1;
  }
}

console.log(`\nthe supplied chain still validates: ${JSON.stringify(validateChain(chain, 12))}`);
console.log(`\n${correct} correct, ${wrong} wrong, ${blank} blank, out of ${expected.length}`);
process.exit(wrong === 0 && blank === 0 ? 0 : 1);
