import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseUnits, toFunctionSelector, toEventSelector } from "viem";

const { viem } = await network.create();
const SUPPLY = parseUnits("1000000", 18);

/** Pins every value Lab 7 asks the student to record. */
describe("values the lab marks", function () {
  it("uses the canonical ERC-20 selectors and topics", function () {
    assert.equal(toFunctionSelector("transfer(address,uint256)"), "0xa9059cbb");
    assert.equal(toFunctionSelector("approve(address,uint256)"), "0x095ea7b3");
    assert.equal(toFunctionSelector("transferFrom(address,address,uint256)"), "0x23b872dd");
    assert.equal(toFunctionSelector("balanceOf(address)"), "0x70a08231");
    assert.equal(
      toEventSelector("Transfer(address,address,uint256)"),
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    );
    assert.equal(
      toEventSelector("Approval(address,address,uint256)"),
      "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
    );
    assert.equal(toFunctionSelector("ERC20InsufficientAllowance(address,uint256,uint256)"), "0xfb8f41b2");
    assert.equal(toFunctionSelector("OwnableUnauthorizedAccount(address)"), "0x118cdaa7");
  });

  it("stores the supply as an integer scaled by the decimals", async function () {
    const token = await viem.deployContract("CourseToken", [SUPPLY]);
    assert.equal(token.address.toLowerCase(), "0x5fbdb2315678afecb367f032d93f642f64180aa3");
    assert.equal(await token.read.decimals(), 18);
    assert.equal(await token.read.totalSupply(), 1_000_000_000_000_000_000_000_000n);
    assert.equal(await token.read.symbol(), "BCT");
  });

  it("charges the gas figures the walkthrough prints", async function () {
    const publicClient = await viem.getPublicClient();
    const [, alice, bob] = await viem.getWalletClients();
    const token = await viem.deployContract("CourseToken", [SUPPLY]);
    const gas = async (hash: `0x${string}`) =>
      (await publicClient.waitForTransactionReceipt({ hash })).gasUsed;

    assert.equal(await gas(await token.write.transfer([alice.account.address, parseUnits("1000", 18)])), 51_603n);
    assert.equal(
      await gas(await token.write.approve([bob.account.address, parseUnits("400", 18)], { account: alice.account.address })),
      46_389n,
    );
    assert.equal(
      await gas(await token.write.transferFrom(
        [alice.account.address, bob.account.address, parseUnits("250", 18)], { account: bob.account.address })),
      57_613n,
    );
    assert.equal(await token.read.allowance([alice.account.address, bob.account.address]), parseUnits("150", 18));
  });

  it("moves nothing on approve, and reduces supply on burn", async function () {
    const [, alice, bob] = await viem.getWalletClients();
    const token = await viem.deployContract("CourseToken", [SUPPLY]);
    await token.write.transfer([alice.account.address, parseUnits("1000", 18)]);

    const before = await token.read.balanceOf([alice.account.address]);
    await token.write.approve([bob.account.address, parseUnits("400", 18)], { account: alice.account.address });
    assert.equal(await token.read.balanceOf([alice.account.address]), before, "approve moves no tokens");
    assert.equal(await token.read.balanceOf([bob.account.address]), 0n);

    await token.write.burn([parseUnits("100", 18)], { account: alice.account.address });
    assert.equal(await token.read.totalSupply(), SUPPLY - parseUnits("100", 18));
  });
});
