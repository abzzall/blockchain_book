import { buildBatch, checkBatch } from "../src/rollup.mjs";
import { clone, stateRoot, totalSupply } from "../src/state.mjs";
import { OPENING, TRANSFERS } from "../src/scenario.mjs";

const state = OPENING();
console.log("opening state");
for (const [account, { balance, nonce }] of state) {
  console.log(`  ${account.padEnd(6)} balance ${String(balance).padStart(4)}  nonce ${nonce}`);
}
console.log(`  root ${stateRoot(state)}\n`);

const batch = buildBatch(state, TRANSFERS);
console.log("the batch the operator posts");
console.log(`  previous root ${batch.previousRoot}`);
console.log(`  claimed root  ${batch.claimedRoot}`);
console.log(`  data hash     ${batch.dataHash}`);
console.log(`  transfers     ${batch.transfers.length}\n`);

const result = checkBatch(clone(state), batch);
console.log(`re-executing the posted data reproduces the claim: ${result.valid}\n`);

const after = OPENING();
for (const t of TRANSFERS) {
  const { applyTransfer } = await import("../src/state.mjs");
  applyTransfer(after, t);
}
console.log("state after applying the batch");
for (const [account, { balance, nonce }] of after) {
  console.log(`  ${account.padEnd(6)} balance ${String(balance).padStart(4)}  nonce ${nonce}`);
}
console.log(`  total supply ${totalSupply(after)} (unchanged: transfers move value, they do not create it)`);
