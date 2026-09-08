import { readFile } from "node:fs/promises";

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
  ["shares issued to the first provider", "1000"],
  ["spot price after seeding, in BETA per ALPHA", "1"],
  ["BETA out for 1 ALPHA in", "0.996007"],
  ["BETA out for 100 ALPHA in", "90.661089"],
  ["BETA out for 1000 ALPHA in", "499.248873"],
  ["BETA out for 5000 ALPHA in", "832.915622"],
  ["reserve0 after a 100 ALPHA swap", "1100"],
  ["reserve1 after a 100 ALPHA swap", "909.338911"],
  ["spot price after that swap, in BETA per ALPHA", "0.826672"],
  ["percentage k grew by after that swap", "0.0273"],
  ["shares the second provider received for 100 ALPHA", "90.909091"],
  ["error when demanding one wei more than the quote", "InsufficientOutput"],
  ["error when quoting a token the pool does not hold", "UnknownToken"],
  ["error when seeding a pool twice", "PoolAlreadySeeded"],
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
