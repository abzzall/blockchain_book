import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { parseEther, formatEther } from "viem";

describe("CampusToken, driven as an application would", async () => {
  const { viem } = await network.getOrCreate();

  it("mints to an account and reports the balance", async () => {
    const [owner, other] = await viem.getWalletClients();
    const token = await viem.deployContract("CampusToken", [owner.account.address]);

    await token.write.mint([other.account.address, parseEther("100")]);

    assert.equal(await token.read.balanceOf([other.account.address]), parseEther("100"));
    assert.equal(formatEther(await token.read.totalSupply()), "100");
  });

  it("carries the metadata the standard requires", async () => {
    const [owner] = await viem.getWalletClients();
    const token = await viem.deployContract("CampusToken", [owner.account.address]);
    assert.equal(await token.read.name(), "Campus Token");
    assert.equal(await token.read.symbol(), "CAMP");
    assert.equal(await token.read.decimals(), 18);
  });

  it("emits a Transfer event on minting, from the zero address", async () => {
    const [owner, other] = await viem.getWalletClients();
    const token = await viem.deployContract("CampusToken", [owner.account.address]);
    await token.write.mint([other.account.address, 5n]);

    const events = await token.getEvents.Transfer();
    assert.equal(events.length, 1);
    assert.equal(events[0].args.from, "0x0000000000000000000000000000000000000000");
    assert.equal(events[0].args.value, 5n);
  });
});
