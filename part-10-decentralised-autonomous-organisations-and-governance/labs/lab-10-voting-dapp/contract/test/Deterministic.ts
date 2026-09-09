import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { toFunctionSelector, toEventSelector } from "viem";

const { viem, networkHelpers } = await network.create();

async function openElection(names = ["Aruzhan", "Daniyar", "Madina"]) {
  const publicClient = await viem.getPublicClient();
  const now = Number((await publicClient.getBlock()).timestamp);
  const election = await viem.deployContract("ClassElection", [
    names, BigInt(now + 60), BigInt(now + 60 + 3600),
  ]);
  return { election, publicClient };
}

/** Pins every value Lab 10 asks the student to record. */
describe("values the lab marks", function () {
  it("has the selectors and topics the lab records", function () {
    assert.equal(toFunctionSelector("vote(uint256)"), "0x0121b93f");
    assert.equal(toFunctionSelector("setEligibility(address[],bool)"), "0xd2978067");
    assert.equal(toFunctionSelector("AlreadyVoted(address)"), "0xd449d674");
    assert.equal(toFunctionSelector("NotEligible(address)"), "0x3a1c1545");
    assert.equal(toFunctionSelector("VotingNotOpen()"), "0x3d0e4af7");
    assert.equal(
      toEventSelector("VoteCast(address,uint256)"),
      "0xa36cc2bebb74db33e9f88110a07ef56e1b31b24b4c4f51b54b1664266e29f45b",
    );
  });

  it("runs the walkthrough election to the recorded figures", async function () {
    const { election, publicClient } = await openElection();
    const [, alice, bob, carol, , dave] = await viem.getWalletClients();
    const gas = async (hash: `0x${string}`) =>
      (await publicClient.waitForTransactionReceipt({ hash })).gasUsed;

    assert.equal(await election.read.candidateCount(), 3n);
    assert.equal(
      await gas(await election.write.setEligibility([[
        alice.account.address, bob.account.address, carol.account.address, dave.account.address,
      ], true])),
      120_053n,
    );

    await networkHelpers.time.increase(120);
    assert.equal(await gas(await election.write.vote([0n], { account: alice.account.address })), 94_315n);
    assert.equal(await gas(await election.write.vote([1n], { account: bob.account.address })), 77_227n);
    await election.write.vote([0n], { account: carol.account.address });
    assert.equal(await election.read.totalVotes(), 3n);

    await networkHelpers.time.increase(3600);
    assert.equal((await election.read.candidate([0n])).voteCount, 2n);
    assert.equal((await election.read.candidate([1n])).voteCount, 1n);
    assert.equal((await election.read.candidate([2n])).voteCount, 0n);
    assert.deepEqual(await election.read.result(), [0n, false]);
  });

  it("checks that the voter has not voted before it checks the candidate exists", async function () {
    const { election } = await openElection();
    const [, alice, , , , dave] = await viem.getWalletClients();
    await election.write.setEligibility([[alice.account.address, dave.account.address], true]);
    await networkHelpers.time.increase(120);
    await election.write.vote([0n], { account: alice.account.address });

    // dave has not voted, so the candidate check is the one that fires
    await assert.rejects(election.write.vote([9n], { account: dave.account.address }), /InvalidCandidate/);
    // alice has voted, so that check fires first and hides the bad candidate id
    await assert.rejects(election.write.vote([9n], { account: alice.account.address }), /AlreadyVoted/);
  });

  it("reports a tie, including the tie of an election nobody voted in", async function () {
    const { election } = await openElection();
    const [, alice, bob] = await viem.getWalletClients();
    await election.write.setEligibility([[alice.account.address, bob.account.address], true]);
    await networkHelpers.time.increase(120);
    await election.write.vote([0n], { account: alice.account.address });
    await election.write.vote([1n], { account: bob.account.address });
    await networkHelpers.time.increase(3600);
    assert.deepEqual(await election.read.result(), [0n, true]);

    const { election: empty } = await openElection();
    await networkHelpers.time.increase(3660 + 120);
    assert.deepEqual(await empty.read.result(), [0n, true]);
  });

  it("refuses a schedule that ends before it starts, and a one-candidate election", async function () {
    const publicClient = await viem.getPublicClient();
    const now = Number((await publicClient.getBlock()).timestamp);
    await assert.rejects(
      viem.deployContract("ClassElection", [["A", "B"], BigInt(now + 100), BigInt(now + 50)]),
      /InvalidSchedule/,
    );
    await assert.rejects(
      viem.deployContract("ClassElection", [["A"], BigInt(now + 60), BigInt(now + 600)]),
      /TooFewCandidates/,
    );
  });
});
