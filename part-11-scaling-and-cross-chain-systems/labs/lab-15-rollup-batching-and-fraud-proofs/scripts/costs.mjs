import { buildBatch } from "../src/rollup.mjs";
import { fromBalances } from "../src/state.mjs";
import { batchGas, calldataGas, individualGas, BATCH_OVERHEAD_GAS, L1_TRANSFER_GAS } from "../src/l1.mjs";

console.log("What batching actually saves, and what it does not.\n");
console.log(`one settlement-layer transfer costs ${L1_TRANSFER_GAS} gas`);
console.log(`recording one batch costs ${BATCH_OVERHEAD_GAS} gas before any data\n`);

const sizes = [1, 5, 20, 50, 200];
console.log("size   individually        batched   calldata   per transfer   saving");
for (const size of sizes) {
  const transfers = Array.from({ length: size }, (_, i) => ({
    from: "alice", to: "carol", amount: 1, nonce: i,
  }));
  const state = fromBalances({ alice: 100_000, carol: 0 });
  const batch = buildBatch(state, transfers);
  const alone = individualGas(size);
  const batched = batchGas(batch);
  const perTransfer = (batched / size).toFixed(1);
  const saving = `${(100 * (1 - batched / alone)).toFixed(1)}%`;
  console.log(
    `${String(size).padStart(4)}   ${String(alone).padStart(11)}   ${String(batched).padStart(12)}   ${String(calldataGas(batch)).padStart(8)}   ${perTransfer.padStart(12)}   ${saving.padStart(6)}`,
  );
}

console.log("\nCalldata per transfer barely moves: the data is linear in the number of");
console.log("transfers and somebody still pays for every byte. What amortises is the");
console.log("fixed cost of recording the batch at all, which is why bigger batches win.");
