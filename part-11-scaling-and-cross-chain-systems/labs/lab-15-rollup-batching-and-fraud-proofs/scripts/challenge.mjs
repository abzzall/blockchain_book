import { buildBatch, buildFraudulentBatch } from "../src/rollup.mjs";
import { stateRoot } from "../src/state.mjs";
import { SettlementLayer } from "../src/l1.mjs";
import { OPENING, TRANSFERS, INFLATE_CAROL, CHALLENGE_WINDOW } from "../src/scenario.mjs";

function run(label, batch, challengeAtBlock) {
  console.log(`--- ${label}`);
  const state = OPENING();
  const l1 = new SettlementLayer(stateRoot(state), CHALLENGE_WINDOW);
  const record = l1.postBatch(batch);
  console.log(`    posted, claiming root ${batch.claimedRoot.slice(0, 16)}...`);

  if (challengeAtBlock !== null) {
    l1.advance(challengeAtBlock);
    const outcome = l1.challenge(record, OPENING());
    console.log(`    challenged at block ${l1.block}: upheld = ${outcome.upheld}`);
    if (outcome.upheld) console.log(`      reason: ${outcome.reason}`);
  }

  l1.advance(CHALLENGE_WINDOW);
  l1.finalise();
  console.log(`    batch status  : ${record.status}`);
  console.log(`    finalised root: ${l1.finalisedRoot.slice(0, 16)}...`);
  console.log(`    honest root   : ${stateRoot(OPENING())===l1.finalisedRoot ? "unchanged" : "advanced"}\n`);
}

const honest = buildBatch(OPENING(), TRANSFERS);
const fraudulent = buildFraudulentBatch(OPENING(), TRANSFERS, INFLATE_CAROL);

console.log("Three runs of the same settlement layer.\n");
run("an honest batch, unchallenged", honest, null);
run("a fraudulent batch, challenged inside the window", fraudulent, 1);
run("the same fraudulent batch, nobody challenges", fraudulent, null);

console.log("The third run is the one to think about. Nothing failed and nothing was");
console.log("broken: the settlement layer accepted a false claim because it never");
console.log("checks anything itself, and the only thing that would have caught it is");
console.log("somebody choosing to look while the window was open.");
