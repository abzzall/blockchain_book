import { readFile } from "node:fs/promises";
import { toFunctionSelector, toEventSelector } from "viem";

const path = process.argv[2] ?? new URL("../../RESULTS.md", import.meta.url).pathname;

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
  ["candidateCount", "3"],
  ["selector of vote(uint256)", toFunctionSelector("vote(uint256)")],
  ["selector of setEligibility(address[],bool)", toFunctionSelector("setEligibility(address[],bool)")],
  ["selector of AlreadyVoted(address)", toFunctionSelector("AlreadyVoted(address)")],
  ["selector of NotEligible(address)", toFunctionSelector("NotEligible(address)")],
  ["topic0 of VoteCast(address,uint256)", toEventSelector("VoteCast(address,uint256)")],
  ["gas to register four voters in one call", "120053"],
  ["gas for the first vote", "94315"],
  ["gas for the second vote", "77227"],
  ["totalVotes at the close", "3"],
  ["votes for candidate 0", "2"],
  ["votes for candidate 1", "1"],
  ["votes for candidate 2", "0"],
  ["winnerId reported by result()", "0"],
  ["tied reported by result()", "false"],
  ["error when voting before the polls open", "VotingNotOpen"],
  ["error when a stranger calls setEligibility", "OwnerOnly"],
  ["error when an unregistered account votes", "NotEligible"],
  ["error when a registered voter votes twice", "AlreadyVoted"],
  ["error when a voter who has not voted picks candidate 9", "InvalidCandidate"],
  ["error when result() is called while voting is open", "ResultsNotReady"],
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
