import { readFile } from "node:fs/promises";
import { toFunctionSelector, toEventSelector, parseUnits } from "viem";

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
  ["symbol", "BCT"],
  ["decimals", "18"],
  ["total supply as the raw integer stored", parseUnits("1000000", 18).toString()],
  ["selector of transfer(address,uint256)", toFunctionSelector("transfer(address,uint256)")],
  ["selector of approve(address,uint256)", toFunctionSelector("approve(address,uint256)")],
  ["selector of transferFrom(address,address,uint256)", toFunctionSelector("transferFrom(address,address,uint256)")],
  ["topic0 of Transfer(address,address,uint256)", toEventSelector("Transfer(address,address,uint256)")],
  ["topic0 of Approval(address,address,uint256)", toEventSelector("Approval(address,address,uint256)")],
  ["gas for the direct transfer", "51603"],
  ["gas for the approval", "46389"],
  ["gas for the transferFrom", "57613"],
  ["alice's balance immediately after she approves bob", "1000"],
  ["allowance remaining after bob spends 250 of 400", "150"],
  ["total supply after bob burns 100", "999900"],
  ["error when bob spends more than his allowance", "ERC20InsufficientAllowance"],
  ["error when alice tries to mint", "OwnableUnauthorizedAccount"],
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
