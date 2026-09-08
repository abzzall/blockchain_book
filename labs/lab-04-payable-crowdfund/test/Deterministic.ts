import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther, toFunctionSelector, toEventSelector } from "viem";
import { readFile } from "node:fs/promises";

const { viem } = await network.create();

/**
 * These are the values Lab 4 asks the student to record. They are fixed by the
 * source and by a fresh local chain, so if any of them changes, the lab's
 * marking script is wrong and this test says so.
 */
describe("values the lab marks", function () {
  it("deploys to the first contract address of a fresh local chain", async function () {
    const [deployer] = await viem.getWalletClients();
    const campaign = await viem.deployContract("CourseCrowdfund", [
      deployer.account.address, parseEther("1"), 86_400n,
    ]);
    assert.equal(campaign.address.toLowerCase(), "0x5fbdb2315678afecb367f032d93f642f64180aa3");
    assert.equal(await campaign.read.MINIMUM_CONTRIBUTION(), parseEther("0.001"));
  });

  it("has the error and event selectors the lab records", async function () {
    assert.equal(toFunctionSelector("ContributionTooSmall(uint256,uint256)"), "0xfb219a2e");
    assert.equal(toFunctionSelector("DirectPaymentNotAccepted()"), "0x00352f54");
    assert.equal(toFunctionSelector("GoalNotReached(uint256,uint256)"), "0x29f02334");
    assert.equal(toFunctionSelector("NothingToRefund(address)"), "0xbb386939");
    assert.equal(
      toEventSelector("Contributed(address,uint256,uint256)"),
      "0xfa35a310d7113dddce1c275da946348e9aaebf9050b00b372033c4d84b0bd6eb",
    );
  });

  it("declares exactly two payable entry points", async function () {
    const artifact = JSON.parse(
      await readFile(new URL("../artifacts/contracts/CourseCrowdfund.sol/CourseCrowdfund.json", import.meta.url)),
    );
    const payable = artifact.abi.filter((entry: any) => entry.stateMutability === "payable");
    assert.equal(payable.length, 2);
    assert.deepEqual(
      payable.map((entry: any) => entry.type === "receive" ? "receive" : entry.name).sort(),
      ["contribute", "receive"],
    );
  });

  it("charges the gas figures the walkthrough prints", async function () {
    const publicClient = await viem.getPublicClient();
    const [deployer, alice, bob] = await viem.getWalletClients();
    const campaign = await viem.deployContract("CourseCrowdfund", [
      deployer.account.address, parseEther("1"), 86_400n,
    ]);
    const gas = async (hash: `0x${string}`) =>
      (await publicClient.waitForTransactionReceipt({ hash })).gasUsed;

    const first = await gas(await campaign.write.contribute({ value: parseEther("0.6"), account: alice.account.address }));
    const second = await gas(await campaign.write.contribute({ value: parseEther("0.4"), account: bob.account.address }));
    const third = await gas(await campaign.write.contribute({ value: parseEther("0.1"), account: alice.account.address }));

    assert.equal(first, 67_638n);
    assert.equal(second, 50_538n);
    assert.equal(third, 33_438n);
    assert.ok(first > second && second > third, "each contribution is cheaper as slots warm up");
  });
});
