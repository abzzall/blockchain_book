import { readFile } from "node:fs/promises";
import { keccak256, encodeAbiParameters } from "viem";

const path = process.argv[2] ?? new URL("../RESULTS.md", import.meta.url).pathname;
function readTableValues(markdown) {
  const values = new Map();
  for (const line of markdown.split("\n")) {
    const m = line.match(/^\s*\|([^|]+)\|([^|]*)\|\s*$/);
    if (!m) continue;
    const label = m[1].trim().replace(/`/g, "").toLowerCase();
    const value = m[2].trim().replace(/`/g, "");
    if (!label || /^-+$/.test(label) || label === "field" || label === "item") continue;
    values.set(label, value);
  }
  return values;
}

const RECIPIENT = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const ISSUER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

const expected = [
  ["acceptance tests passing", "18"],
  ["acceptance tests failing", "0"],
  ["certificateId for the recipient, issuer, and course named in LAB.md",
    keccak256(encodeAbiParameters(
      [{ type: "address" }, { type: "address" }, { type: "string" }],
      [RECIPIENT, ISSUER, "Blockchain Systems"]))],
  ["contract address on a fresh local chain", "0x5fbdb2315678afecb367f032d93f642f64180aa3"],
  ["isValid for a certificate that was issued and then revoked", "false"],
  ["totalIssued after issuing one certificate and revoking it", "1"],
];

const recorded = readTableValues(await readFile(path, "utf8"));
let correct = 0, wrong = 0, blank = 0;
console.log(`marking ${path}\n`);
for (const [label, want] of expected) {
  const got = recorded.get(label.toLowerCase());
  if (got === undefined) { console.log(`MISSING  ${label}`); blank += 1; }
  else if (got === "") { console.log(`BLANK    ${label}`); blank += 1; }
  else if (got.toLowerCase() === String(want).toLowerCase()) { console.log(`ok       ${label}`); correct += 1; }
  else { console.log(`WRONG    ${label}\n         recorded ${got}\n         expected ${want}`); wrong += 1; }
}
console.log(`\n${correct} correct, ${wrong} wrong, ${blank} blank, out of ${expected.length}`);
console.log(`\nNote: these values are necessary but not sufficient. The capstone is`);
console.log(`marked on the acceptance suite passing and on your written answers.`);
process.exit(wrong === 0 && blank === 0 ? 0 : 1);
