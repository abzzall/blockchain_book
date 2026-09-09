import { readFile } from "node:fs/promises";
import { toFunctionSelector, toEventSelector } from "viem";

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
  ["selector of saveStudent(address,string,uint16)", toFunctionSelector("saveStudent(address,string,uint16)")],
  ["selector of ScoreOutOfRange(uint16)", toFunctionSelector("ScoreOutOfRange(uint16)")],
  ["selector of InstructorOnly(address)", toFunctionSelector("InstructorOnly(address)")],
  ["selector of StudentNotFound(address)", toFunctionSelector("StudentNotFound(address)")],
  ["topic0 of StudentSaved(address,string,uint16,bool)", toEventSelector("StudentSaved(address,string,uint16,bool)")],
  ["gas to create the first record", "92984"],
  ["gas to update that record", "33785"],
  ["gas to create a second record", "75872"],
  ["studentCount after creating, updating, and creating again", "2"],
  ["error for a score of 101", "ScoreOutOfRange"],
  ["error for an empty name", "EmptyName"],
  ["error for the zero address", "InvalidStudentAddress"],
  ["error when a non-instructor calls saveStudent", "InstructorOnly"],
  ["error when reading a student who was never saved", "StudentNotFound"],
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
