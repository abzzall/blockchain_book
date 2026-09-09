import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("Counter, driven from JavaScript", async () => {
  const { viem } = await network.getOrCreate();

  it("starts at zero and increments", async () => {
    const counter = await viem.deployContract("Counter");
    assert.equal(await counter.read.count(), 0n);
    await counter.write.increment();
    assert.equal(await counter.read.count(), 1n);
  });

  it("emits an event carrying the new count", async () => {
    const counter = await viem.deployContract("Counter");
    await counter.write.increment();
    const events = await counter.getEvents.Counted();
    assert.equal(events.length, 1);
    assert.equal(events[0].args.newCount, 1n);
  });
});
