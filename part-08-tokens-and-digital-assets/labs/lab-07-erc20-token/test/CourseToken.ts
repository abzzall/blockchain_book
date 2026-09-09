import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { getAddress, parseUnits } from "viem";

const { viem } = await network.create();

describe("CourseToken", function () {
  it("assigns the initial supply to the deployer", async function () {
    const [owner] = await viem.getWalletClients();
    const initial = parseUnits("1000000", 18);
    const token = await viem.deployContract("CourseToken", [initial]);
    assert.equal(await token.read.name(), "Blockchain Course Token");
    assert.equal(await token.read.symbol(), "BCT");
    assert.equal(await token.read.totalSupply(), initial);
    assert.equal(await token.read.balanceOf([owner.account.address]), initial);
  });

  it("transfers tokens and emits Transfer", async function () {
    const [owner, recipient] = await viem.getWalletClients();
    const token = await viem.deployContract("CourseToken", [parseUnits("1000", 18)]);
    const amount = parseUnits("25", 18);
    await viem.assertions.emitWithArgs(
      token.write.transfer([recipient.account.address, amount]), token, "Transfer",
      [owner.account.address, recipient.account.address, amount],
    );
    assert.equal(await token.read.balanceOf([recipient.account.address]), amount);
  });

  it("approve plus transferFrom spends and reduces allowance", async function () {
    const [owner, spender, recipient] = await viem.getWalletClients();
    const token = await viem.deployContract("CourseToken", [parseUnits("1000", 18)]);
    const approved = parseUnits("80", 18);
    const spent = parseUnits("30", 18);
    await token.write.approve([spender.account.address, approved]);
    await token.write.transferFrom([owner.account.address, recipient.account.address, spent], { account: spender.account.address });
    assert.equal(await token.read.allowance([owner.account.address, spender.account.address]), approved - spent);
    assert.equal(await token.read.balanceOf([recipient.account.address]), spent);
  });

  it("only the owner can mint and holders can burn", async function () {
    const [owner, holder] = await viem.getWalletClients();
    const token = await viem.deployContract("CourseToken", [parseUnits("100", 18)]);
    await assert.rejects(token.write.mint([holder.account.address, 1n], { account: holder.account.address }));
    await token.write.mint([holder.account.address, parseUnits("10", 18)]);
    await token.write.burn([parseUnits("4", 18)], { account: holder.account.address });
    assert.equal(await token.read.balanceOf([holder.account.address]), parseUnits("6", 18));
    assert.equal(await token.read.owner(), getAddress(owner.account.address));
  });
});
