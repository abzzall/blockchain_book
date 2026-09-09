import { mine, serializeHeader } from "../src/pow.mjs";
import { merkleRoot } from "../src/merkle.mjs";

const bits = Number(process.argv[2] ?? 16);
const transactions = process.argv.slice(3);
const values = transactions.length > 0 ? transactions : ["tx-a", "tx-b", "tx-c", "tx-d"];

const header = {
  previousHash: "00".repeat(32),
  merkleRoot: merkleRoot(values),
  timestamp: 1_700_000_000,
  nonce: 0,
};

console.log(`transactions   ${JSON.stringify(values)}`);
console.log(`merkle root    ${header.merkleRoot}`);
console.log(`difficulty     ${bits} leading zero bits`);
const started = process.hrtime.bigint();
const result = mine(header, bits);
const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

console.log(`\nnonce          ${result.nonce}`);
console.log(`attempts       ${result.attempts}`);
console.log(`block hash     ${result.hash}`);
console.log(`elapsed        ${elapsedMs.toFixed(1)} ms`);
console.log(`expected work  about 2^${bits} = ${2 ** bits} hashes`);
console.log(`\nheader hashed:\n  ${serializeHeader({ ...header, nonce: result.nonce })}`);
