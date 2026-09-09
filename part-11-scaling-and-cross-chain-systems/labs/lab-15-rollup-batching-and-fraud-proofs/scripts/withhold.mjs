import { buildFraudulentBatch } from "../src/rollup.mjs";
import { checkBatch } from "../src/rollup.mjs";
import { clone, stateRoot } from "../src/state.mjs";
import { OPENING, TRANSFERS, INFLATE_CAROL } from "../src/scenario.mjs";

const state = OPENING();
const batch = buildFraudulentBatch(state, TRANSFERS, INFLATE_CAROL);

console.log("A challenger who holds the posted data can disprove the batch:\n");
const withData = checkBatch(clone(state), batch);
console.log(`  valid  : ${withData.valid}`);
console.log(`  reason : ${withData.reason}`);
console.log(`  correct root was ${withData.computedRoot.slice(0, 24)}...`);
console.log(`  operator claimed ${batch.claimedRoot.slice(0, 24)}...\n`);

console.log("Now the operator publishes the commitment but withholds the transfers:\n");
const withheld = { ...batch, transfers: undefined };
let outcome;
try {
  outcome = checkBatch(clone(state), withheld);
} catch (error) {
  outcome = { valid: false, reason: `challenger cannot re-execute: ${error.constructor.name}` };
}
console.log(`  the challenger's re-execution: ${outcome.reason ?? "failed"}`);
console.log(`  the commitment still verifies against itself, so nothing looks wrong`);
console.log(`  on the settlement layer, and no fraud proof can be constructed.\n`);

console.log("This is why data availability is a security property and not an");
console.log("optimisation. A proof that a batch is wrong is built from the batch's own");
console.log("data. Withhold the data and the ability to challenge disappears with it,");
console.log("even though every contract involved is behaving exactly as written.");
