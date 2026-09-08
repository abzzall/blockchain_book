import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

const { viem } = await network.create();

describe("StudentRegistry", function () {
  it("stores a student, increments the count, and emits an event", async function () {
    const registry = await viem.deployContract("StudentRegistry", ["Blockchain Systems"]);
    const [, student] = await viem.getWalletClients();

    await viem.assertions.emitWithArgs(
      registry.write.saveStudent([student.account.address, "Aruzhan", 91]),
      registry,
      "StudentSaved",
      [student.account.address, "Aruzhan", 91, true],
    );

    const record = await registry.read.getStudent([student.account.address]);
    assert.equal(record.name, "Aruzhan");
    assert.equal(record.score, 91);
    assert.equal(record.exists, true);
    assert.equal(await registry.read.studentCount(), 1n);
  });

  it("updates without counting the same address twice", async function () {
    const registry = await viem.deployContract("StudentRegistry", ["Blockchain Systems"]);
    const [, student] = await viem.getWalletClients();
    await registry.write.saveStudent([student.account.address, "Aruzhan", 80]);
    await registry.write.saveStudent([student.account.address, "Aruzhan", 95]);
    assert.equal((await registry.read.getStudent([student.account.address])).score, 95);
    assert.equal(await registry.read.studentCount(), 1n);
  });

  it("rejects invalid scores and non-instructors", async function () {
    const registry = await viem.deployContract("StudentRegistry", ["Blockchain Systems"]);
    const [, other] = await viem.getWalletClients();
    await assert.rejects(registry.write.saveStudent([other.account.address, "Aruzhan", 101]));
    await assert.rejects(
      registry.write.saveStudent([other.account.address, "Aruzhan", 90], { account: other.account.address }),
    );
  });
});
