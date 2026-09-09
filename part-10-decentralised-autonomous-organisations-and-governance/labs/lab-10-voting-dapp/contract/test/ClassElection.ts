import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

const { viem, networkHelpers } = await network.create();
const publicClient = await viem.getPublicClient();

async function deploy() {
  const now = (await publicClient.getBlock()).timestamp;
  const startsAt = now + 60n;
  const endsAt = startsAt + 3600n;
  const election = await viem.deployContract("ClassElection", [["Aruzhan", "Dias", "Mira"], startsAt, endsAt]);
  return { election, startsAt, endsAt };
}

describe("ClassElection", function () {
  it("owner grants eligibility and an eligible account votes once", async function () {
    const { election, startsAt } = await deploy();
    const [, voter] = await viem.getWalletClients();
    await election.write.setEligibility([[voter.account.address], true]);
    await networkHelpers.time.increaseTo(startsAt);
    await viem.assertions.emitWithArgs(
      election.write.vote([1n], { account: voter.account.address }), election, "VoteCast",
      [voter.account.address, 1n],
    );
    assert.equal((await election.read.candidate([1n])).voteCount, 1n);
    assert.equal(await election.read.totalVotes(), 1n);
    await assert.rejects(election.write.vote([0n], { account: voter.account.address }));
  });

  it("rejects ineligible and early votes", async function () {
    const { election, startsAt } = await deploy();
    const [, voter] = await viem.getWalletClients();
    await election.write.setEligibility([[voter.account.address], true]);
    await assert.rejects(election.write.vote([0n], { account: voter.account.address }));
    await networkHelpers.time.increaseTo(startsAt);
    const [, , outsider] = await viem.getWalletClients();
    await assert.rejects(election.write.vote([0n], { account: outsider.account.address }));
  });

  it("reports a winner and detects a tie after closing", async function () {
    const { election, startsAt, endsAt } = await deploy();
    const [, voterA, voterB] = await viem.getWalletClients();
    await election.write.setEligibility([[voterA.account.address, voterB.account.address], true]);
    await networkHelpers.time.increaseTo(startsAt);
    await election.write.vote([0n], { account: voterA.account.address });
    await election.write.vote([0n], { account: voterB.account.address });
    await networkHelpers.time.increaseTo(endsAt);
    assert.deepEqual(await election.read.result(), [0n, false]);

    const second = await deploy();
    await second.election.write.setEligibility([[voterA.account.address, voterB.account.address], true]);
    await networkHelpers.time.increaseTo(second.startsAt);
    await second.election.write.vote([0n], { account: voterA.account.address });
    await second.election.write.vote([1n], { account: voterB.account.address });
    await networkHelpers.time.increaseTo(second.endsAt);
    assert.equal((await second.election.read.result())[1], true);
  });
});
