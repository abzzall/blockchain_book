import { readFile } from "node:fs/promises";
import { buildBatch, buildFraudulentBatch, checkBatch } from "../src/rollup.mjs";
import { applyAll, clone, fromBalances, stateRoot, totalSupply } from "../src/state.mjs";
import { SettlementLayer, batchGas, individualGas } from "../src/l1.mjs";
import { OPENING, TRANSFERS, INFLATE_CAROL, CHALLENGE_WINDOW } from "../src/scenario.mjs";

const path = process.argv[2] ?? new URL("../RESULTS.md", import.meta.url).pathname;

/** Reads `| label | value |` rows out of the student's RESULTS.md. */
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

const yes = (condition) => (condition ? "yes" : "no");

const opening = OPENING();
const honest = buildBatch(opening, TRANSFERS);
const settled = applyAll(clone(opening), TRANSFERS);

const fraudulent = buildFraudulentBatch(opening, TRANSFERS, INFLATE_CAROL);
const challengeResult = checkBatch(clone(opening), fraudulent);

// Challenged inside the window.
const challenged = new SettlementLayer(stateRoot(OPENING()), CHALLENGE_WINDOW);
const challengedRecord = challenged.postBatch(fraudulent);
challenged.advance(1);
const outcome = challenged.challenge(challengedRecord, OPENING());

// The same batch, left alone.
const ignored = new SettlementLayer(stateRoot(OPENING()), CHALLENGE_WINDOW);
const ignoredRecord = ignored.postBatch(fraudulent);
ignored.advance(CHALLENGE_WINDOW);
ignored.finalise();

// Fifty transfers, batched against sent individually.
const many = Array.from({ length: 50 }, (_, i) => ({ from: "alice", to: "carol", amount: 1, nonce: i }));
const bigBatch = buildBatch(fromBalances({ alice: 100_000, carol: 0 }), many);

const expected = [
  ["previous root of the canonical batch", honest.previousRoot],
  ["claimed root of the canonical batch", honest.claimedRoot],
  ["data hash of the canonical batch", honest.dataHash],
  ["carol's closing balance", String(settled.get("carol").balance)],
  ["total supply after the batch", String(totalSupply(settled))],
  ["re-executing the honest batch reproduces its claim (yes/no)", yes(checkBatch(clone(opening), honest).valid)],
  ["the fraudulent batch re-executes to its claimed root (yes/no)", yes(challengeResult.valid)],
  ["the challenge against the fraudulent batch was upheld (yes/no)", yes(outcome.upheld)],
  ["status of the fraudulent batch when nobody challenges", ignoredRecord.status],
  ["gas for fifty transfers sent individually", String(individualGas(50))],
  ["gas for the same fifty transfers as one batch", String(batchGas(bigBatch))],
];

const markdown = await readFile(path, "utf8");
const recorded = readTableValues(markdown);

let correct = 0, wrong = 0, blank = 0;
console.log(`marking ${path}\n`);
for (const [label, want] of expected) {
  const got = recorded.get(label.toLowerCase());
  if (got === undefined) {
    console.log(`MISSING  ${label}\n         (no row with this label was found)`);
    blank += 1;
  } else if (got === "") {
    console.log(`BLANK    ${label}`);
    blank += 1;
  } else if (got.toLowerCase() === want.toLowerCase()) {
    console.log(`ok       ${label}`);
    correct += 1;
  } else {
    console.log(`WRONG    ${label}\n         recorded ${got}\n         expected ${want}`);
    wrong += 1;
  }
}

console.log(`\n${correct} correct, ${wrong} wrong, ${blank} blank, out of ${expected.length}`);
process.exit(wrong === 0 && blank === 0 ? 0 : 1);
