import { sha256, doubleSha256, leadingZeroBits } from "../src/hash.mjs";

const input = process.argv.slice(2).join(" ");
if (!input) {
  console.error('usage: npm run hash -- "some text"');
  process.exit(1);
}
const once = sha256(input);
console.log(`input        ${JSON.stringify(input)}`);
console.log(`bytes        ${Buffer.from(input, "utf8").length}`);
console.log(`sha256       ${once}`);
console.log(`double sha256 ${doubleSha256(input)}`);
console.log(`leading zero bits of sha256: ${leadingZeroBits(once)}`);
