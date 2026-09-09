import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther } from "viem";
import { summarizeTransaction } from "../src/summarize-receipt.mjs";

const { viem } = await network.create();

describe("local transaction and receipt evidence", function () {
  it("summarizes a successful local transfer", async function () {
    const publicClient = await viem.getPublicClient();
    const [sender, recipient] = await viem.getWalletClients();

    const hash = await sender.sendTransaction({
      account: sender.account,
      to: recipient.account.address,
      value: parseEther("0.001"),
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const transaction = await publicClient.getTransaction({ hash });
    const block = await publicClient.getBlock({ blockHash: receipt.blockHash });
    const summary = summarizeTransaction(transaction, receipt, block);

    assert.equal(summary.status, "success");
    assert.equal(summary.to.toLowerCase(), recipient.account.address.toLowerCase());
    assert.equal(summary.valueWei, "1000000000000000");
    assert.equal(summary.gasUsed, "21000");
    assert.equal(summary.feeWei, (receipt.gasUsed * receipt.effectiveGasPrice).toString());
  });

  it("records a mined transaction that reverts", async function () {
    const publicClient = await viem.getPublicClient();
    const [sender] = await viem.getWalletClients();
    const rejecting = await viem.deployContract("RejectEther");

    // The development node raises on a failed transaction rather than
    // returning its hash. The transaction is mined all the same, which is the
    // whole point being demonstrated, so the hash is recovered from the block.
    await sender
      .sendTransaction({
        account: sender.account,
        to: rejecting.address,
        value: 1n,
        gas: 100_000n,
      })
      .catch(() => undefined);

    const minedBlock = await publicClient.getBlock({ blockTag: "latest", includeTransactions: true });
    const mined = minedBlock.transactions.at(-1);
    assert.ok(mined && typeof mined !== "string", "the failed transaction was still mined");
    const hash = mined.hash;
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const transaction = await publicClient.getTransaction({ hash });
    const block = await publicClient.getBlock({ blockHash: receipt.blockHash });
    const summary = summarizeTransaction(transaction, receipt, block);

    assert.equal(summary.status, "reverted");
    assert.equal(summary.to.toLowerCase(), rejecting.address.toLowerCase());
    assert.equal(summary.valueWei, "1");
    assert.ok(BigInt(summary.gasUsed) > 21_000n);
    assert.equal(summary.feeWei, (receipt.gasUsed * receipt.effectiveGasPrice).toString());
  });
});
