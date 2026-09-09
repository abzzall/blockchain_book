import { checkBatch } from "./rollup.mjs";
import { clone, stateRoot } from "./state.mjs";

/**
 * A settlement layer, reduced to the three things it actually does for an
 * optimistic rollup: accept a batch, hold it for a challenge window, and
 * finalise it if nobody disproved it.
 *
 * It deliberately does NOT re-execute anything on acceptance. That is the
 * optimistic assumption, and every property in this lab follows from it.
 */

/** Gas an L1 charges for one byte of calldata, post-EIP-2028, for non-zero bytes. */
export const GAS_PER_CALLDATA_BYTE = 16;
/** Gas a plain L1 transfer costs before any calldata. */
export const L1_TRANSFER_GAS = 21_000;
/** Fixed overhead an L1 charges to record one batch. */
export const BATCH_OVERHEAD_GAS = 45_000;

export class SettlementLayer {
  constructor(genesisRoot, challengeWindow = 3) {
    this.finalisedRoot = genesisRoot;
    this.challengeWindow = challengeWindow;
    this.pending = [];
    this.block = 0;
    this.log = [];
  }

  advance(blocks = 1) {
    this.block += blocks;
    return this;
  }

  /**
   * Accept a batch without checking it. The operator pays for the calldata,
   * which is what makes data availability the dominant cost of a rollup.
   */
  postBatch(batch) {
    const record = {
      batch,
      postedAt: this.block,
      gasPaid: BATCH_OVERHEAD_GAS + calldataGas(batch),
      status: "pending",
    };
    this.pending.push(record);
    this.log.push(`block ${this.block}: batch posted, claiming ${batch.claimedRoot.slice(0, 12)}...`);
    return record;
  }

  /**
   * Challenge a pending batch by re-executing it against the state it claims
   * to start from. A successful challenge discards the batch.
   */
  challenge(record, stateBeforeBatch) {
    if (record.status !== "pending") {
      throw new Error(`batch is ${record.status} and can no longer be challenged`);
    }
    if (this.block - record.postedAt >= this.challengeWindow) {
      throw new Error("the challenge window has closed");
    }
    const result = checkBatch(clone(stateBeforeBatch), record.batch);
    if (result.valid) {
      this.log.push(`block ${this.block}: challenge failed, batch holds up`);
      return { upheld: false, ...result };
    }
    record.status = "rejected";
    this.pending = this.pending.filter((entry) => entry !== record);
    this.log.push(`block ${this.block}: challenge upheld, batch rejected (${result.reason})`);
    return { upheld: true, ...result };
  }

  /** Finalise every batch whose window has closed unchallenged. */
  finalise() {
    const finalised = [];
    for (const record of [...this.pending]) {
      if (this.block - record.postedAt >= this.challengeWindow) {
        record.status = "finalised";
        this.finalisedRoot = record.batch.claimedRoot;
        this.pending = this.pending.filter((entry) => entry !== record);
        finalised.push(record);
        this.log.push(
          `block ${this.block}: batch finalised, root is now ${record.batch.claimedRoot.slice(0, 12)}...`,
        );
      }
    }
    return finalised;
  }
}

/** Calldata gas for the transfer data a batch must publish. */
export function calldataGas(batch) {
  const bytes = Buffer.byteLength(
    batch.transfers.map((t) => `${t.from}>${t.to}:${t.amount}#${t.nonce}`).join(";"),
    "utf8",
  );
  return bytes * GAS_PER_CALLDATA_BYTE;
}

/** The whole L1 cost of one batch: the fixed overhead plus its calldata. */
export function batchGas(batch) {
  return BATCH_OVERHEAD_GAS + calldataGas(batch);
}

/** What the same transfers would have cost as individual L1 transactions. */
export function individualGas(transferCount) {
  return transferCount * L1_TRANSFER_GAS;
}
