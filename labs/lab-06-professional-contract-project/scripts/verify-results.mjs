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
  ["selector of contribute()", toFunctionSelector("contribute()")],
  ["selector of finalize()", toFunctionSelector("finalize()")],
  ["selector of claimRefund()", toFunctionSelector("claimRefund()")],
  ["selector of GoalNotReached()", toFunctionSelector("GoalNotReached()")],
  ["topic0 of Contribution(address,uint256,uint256)", toEventSelector("Contribution(address,uint256,uint256)")],
  ["forge gas for testContributionIsRecorded", "97052"],
  ["forge gas for testMissedGoalCanBeRefunded", "123229"],
  ["forge gas for testCannotFinalizeBeforeDeadline", "29378"],
  ["average gas reported for contribute", "69774"],
  ["average gas reported for claimRefund", "32175"],
  ["bytecode length from both toolchains, in bytes", "2242"],
  ["identical leading bytes", "2199"],
  ["differing trailing bytes", "43"],
  ["are the two builds byte-for-byte identical", "false"],
  ["first contract address on a fresh local node", "0x5fbdb2315678afecb367f032d93f642f64180aa3"],
];

const recorded = readTableValues(await readFile(path, "utf8"));
let correct = 0, wrong = 0, blank = 0;
console.log(`marking ${path}\n`);
for (const [label, want] of expected) {
  const got = recorded.get(label.toLowerCase());
  if (got === undefined) { console.log(`MISSING  ${label}`); blank += 1; }
  else if (got === "") { console.log(`BLANK    ${label}`); blank += 1; }
  else if (got.replace(/,/g, "").toLowerCase() === String(want).toLowerCase()) { console.log(`ok       ${label}`); correct += 1; }
  else { console.log(`WRONG    ${label}\n         recorded ${got}\n         expected ${want}`); wrong += 1; }
}
console.log(`\n${correct} correct, ${wrong} wrong, ${blank} blank, out of ${expected.length}`);
process.exit(wrong === 0 && blank === 0 ? 0 : 1);
