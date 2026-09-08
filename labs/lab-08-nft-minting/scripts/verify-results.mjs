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
  ["symbol", "BCC"],
  ["selector of ownerOf(uint256)", toFunctionSelector("ownerOf(uint256)")],
  ["selector of tokenURI(uint256)", toFunctionSelector("tokenURI(uint256)")],
  ["selector of safeTransferFrom(address,address,uint256)", toFunctionSelector("safeTransferFrom(address,address,uint256)")],
  ["topic0 of Transfer(address,address,uint256)", toEventSelector("Transfer(address,address,uint256)")],
  ["supportsInterface for 0x80ac58cd", "true"],
  ["supportsInterface for 0x5b5e139f", "true"],
  ["supportsInterface for 0xd9b67a26", "false"],
  ["gas to issue the first certificate", "173737"],
  ["gas to issue the second certificate", "150820"],
  ["gas to transfer a certificate", "37976"],
  ["issuedCount after two certificates", "2"],
  ["balanceOf alice after she holds one certificate", "1"],
  ["error when alice issues a certificate to herself", "OwnableUnauthorizedAccount"],
  ["error when burning a certificate you do not own", "NotTheOwner"],
  ["error when asking who owns token 99", "ERC721NonexistentToken"],
  ["error when issuing to a contract with no receiver hook", "ERC721InvalidReceiver"],
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
