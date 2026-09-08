import assert from "node:assert/strict";
import test from "node:test";
import { summarizeTransaction } from "../src/summarize-receipt.mjs";

test("summarizes explorer fields and computes the fee exactly", () => {
  const summary = summarizeTransaction(
    { hash: "0x" + "12".repeat(32), from: "0x" + "ab".repeat(20), to: "0x" + "cd".repeat(20), value: 1_000_000_000_000_000n, nonce: 7, type: "eip1559", chainId: 11155111, gas: 21_000n },
    { status: "success", gasUsed: 21_000n, effectiveGasPrice: 2_000_000_000n, blockNumber: 123n, blockHash: "0x" + "34".repeat(32) },
    { timestamp: 1_700_000_000n },
  );
  assert.equal(summary.valueEther, "0.001");
  assert.equal(summary.feeWei, "42000000000000");
  assert.equal(summary.effectiveGasPriceGwei, "2");
  assert.equal(summary.status, "success");
});

test("labels contract creation when the recipient is null", () => {
  const summary = summarizeTransaction(
    { hash: "0x0", from: "0x1", to: null, value: 0n, nonce: 0, type: "legacy", chainId: 1, gas: 53_000n },
    { status: "success", gasUsed: 52_000n, effectiveGasPrice: 1n, blockNumber: 1n, blockHash: "0x2" },
    { timestamp: 0n },
  );
  assert.equal(summary.to, "contract creation");
});
