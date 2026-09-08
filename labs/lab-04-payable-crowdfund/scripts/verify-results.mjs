import { readFile } from "node:fs/promises";
import { toFunctionSelector, toEventSelector, parseEther } from "viem";

const path = process.argv[2] ?? new URL("../RESULTS.md", import.meta.url).pathname;

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

const expected = [
  ["contract address on a fresh local chain", "0x5fbdb2315678afecb367f032d93f642f64180aa3"],
  ["minimum contribution in wei", parseEther("0.001").toString()],
  ["number of payable entry points", "2"],
  ["selector of ContributionTooSmall(uint256,uint256)", toFunctionSelector("ContributionTooSmall(uint256,uint256)")],
  ["selector of DirectPaymentNotAccepted()", toFunctionSelector("DirectPaymentNotAccepted()")],
  ["selector of GoalNotReached(uint256,uint256)", toFunctionSelector("GoalNotReached(uint256,uint256)")],
  ["selector of NothingToRefund(address)", toFunctionSelector("NothingToRefund(address)")],
  ["topic0 of Contributed(address,uint256,uint256)", toEventSelector("Contributed(address,uint256,uint256)")],
  ["gas for alice's first contribution", "67638"],
  ["gas for bob's first contribution", "50538"],
  ["gas for alice's second contribution", "33438"],
  ["total raised in the successful campaign, in wei", parseEther("1.1").toString()],
  ["contract balance after withdraw, in wei", "0"],
  ["contract balance after alice refunds but before bob does, in wei", parseEther("0.2").toString()],
  ["error when a plain transfer is sent to the contract", "DirectPaymentNotAccepted"],
  ["error when the beneficiary withdraws twice", "AlreadyWithdrawn"],
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
