import { readFile } from "node:fs/promises";
import { toFunctionSelector, toEventSelector } from "viem";

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

const expected = [
  ["contract address on a fresh local chain", "0x5fbdb2315678afecb367f032d93f642f64180aa3"],
  ["chain id of the local network", "31337"],
  ["selector of saveStudent(address,string,uint16)", toFunctionSelector("saveStudent(address,string,uint16)")],
  ["selector of getStudent(address)", toFunctionSelector("getStudent(address)")],
  ["topic0 of StudentSaved(address,string,uint16,bool)", toEventSelector("StudentSaved(address,string,uint16,bool)")],
  ["number of functions in the abi the page ships", "5"],
  ["number of those that are view", "4"],
  ["number of those that are nonpayable", "1"],
  ["checksummed form of 0x70997970c51812dc3a010c7d01b50e0d17dc79c8", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"],
  ["studentCount after saving one student twice", "1"],
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
process.exit(wrong === 0 && blank === 0 ? 0 : 1);
