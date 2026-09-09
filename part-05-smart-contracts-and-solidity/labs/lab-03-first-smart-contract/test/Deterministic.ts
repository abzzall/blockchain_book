import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { toFunctionSelector, toEventSelector } from "viem";

const { viem } = await network.create();

/** Pins every value Lab 3 asks the student to record. */
describe("values the lab marks", function () {
  it("deploys to the first contract address of a fresh local chain", async function () {
    const registry = await viem.deployContract("StudentRegistry", ["Blockchain Systems"]);
    assert.equal(registry.address.toLowerCase(), "0x5fbdb2315678afecb367f032d93f642f64180aa3");
  });

  it("has the selectors the lab records", function () {
    assert.equal(toFunctionSelector("saveStudent(address,string,uint16)"), "0x5b0dc3bd");
    assert.equal(toFunctionSelector("ScoreOutOfRange(uint16)"), "0xef44ec2f");
    assert.equal(toFunctionSelector("InstructorOnly(address)"), "0xed41499e");
    assert.equal(toFunctionSelector("StudentNotFound(address)"), "0xf8a2d094");
    assert.equal(
      toEventSelector("StudentSaved(address,string,uint16,bool)"),
      "0x0183f9505a3033ad83b227e29f256a309bf02e803602912215b56f4e5d172687",
    );
  });

  it("charges the gas figures the walkthrough prints", async function () {
    const publicClient = await viem.getPublicClient();
    const [, alice, bob] = await viem.getWalletClients();
    const registry = await viem.deployContract("StudentRegistry", ["Blockchain Systems"]);
    const gas = async (hash: `0x${string}`) =>
      (await publicClient.waitForTransactionReceipt({ hash })).gasUsed;

    const created = await gas(await registry.write.saveStudent([alice.account.address, "Aruzhan", 91]));
    const updated = await gas(await registry.write.saveStudent([alice.account.address, "Aruzhan", 95]));
    const second = await gas(await registry.write.saveStudent([bob.account.address, "Daniyar", 78]));

    assert.equal(created, 92_984n);
    assert.equal(updated, 33_785n);
    assert.equal(second, 75_872n);
    assert.ok(created > updated, "creating a record costs more than updating one");
    assert.equal(await registry.read.studentCount(), 2n);
  });
});
