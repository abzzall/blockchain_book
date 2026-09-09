import { applyAll, clone, sha256, stateRoot } from "./state.mjs";

/**
 * A batch is the unit a rollup posts to its settlement layer: the root it
 * started from, the root it claims to have reached, and the transfers that are
 * supposed to connect them.
 */

export function encodeTransfer({ from, to, amount, nonce }) {
  return `${from}>${to}:${amount}#${nonce}`;
}

export function encodeBatch(transfers) {
  return transfers.map(encodeTransfer).join(";");
}

export function batchHash(transfers) {
  return sha256(encodeBatch(transfers));
}

/**
 * Build a batch honestly: apply the transfers and claim the root that results.
 */
export function buildBatch(state, transfers) {
  const next = applyAll(clone(state), transfers);
  return {
    previousRoot: stateRoot(state),
    claimedRoot: stateRoot(next),
    transfers,
    dataHash: batchHash(transfers),
  };
}

/**
 * Build a batch dishonestly: claim a root the transfers do not produce.
 * This is the only way to obtain an invalid batch, and it exists so the lab
 * has something for a challenger to catch.
 */
export function buildFraudulentBatch(state, transfers, tamper) {
  const honest = buildBatch(state, transfers);
  const tampered = tamper(applyAll(clone(state), transfers));
  return { ...honest, claimedRoot: stateRoot(tampered) };
}

/**
 * Re-execute a batch from the posted data and report whether its claim holds.
 * This is the whole of an optimistic rollup's fraud proof: anybody holding the
 * previous state and the batch data can run it.
 */
export function checkBatch(state, batch) {
  if (stateRoot(state) !== batch.previousRoot) {
    return { valid: false, reason: "batch does not start from this state" };
  }
  if (batchHash(batch.transfers) !== batch.dataHash) {
    return { valid: false, reason: "posted data does not match its commitment" };
  }
  let computedRoot;
  try {
    computedRoot = stateRoot(applyAll(clone(state), batch.transfers));
  } catch (error) {
    return { valid: false, reason: `invalid transfer: ${error.message}` };
  }
  if (computedRoot !== batch.claimedRoot) {
    return { valid: false, reason: "claimed root is not the computed root", computedRoot };
  }
  return { valid: true, computedRoot };
}
