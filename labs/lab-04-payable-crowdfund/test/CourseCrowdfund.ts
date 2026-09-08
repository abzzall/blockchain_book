import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther } from "viem";

const { viem, networkHelpers } = await network.create();

const GOAL = parseEther("1");
const DAY = 24 * 60 * 60;

async function deploy(goal = GOAL, duration = DAY) {
  const [deployer, alice, bob] = await viem.getWalletClients();
  const campaign = await viem.deployContract("CourseCrowdfund", [
    deployer.account.address,
    goal,
    BigInt(duration),
  ]);
  return { campaign, deployer, alice, bob };
}

const balanceOf = async (address: `0x${string}`) =>
  (await viem.getPublicClient()).getBalance({ address });

describe("CourseCrowdfund — value in", function () {
  it("accepts a payable contribution and records it against the sender", async function () {
    const { campaign, alice } = await deploy();

    await viem.assertions.emitWithArgs(
      campaign.write.contribute({ value: parseEther("0.5"), account: alice.account.address }),
      campaign,
      "Contributed",
      [alice.account.address, parseEther("0.5"), parseEther("0.5")],
    );

    assert.equal(await campaign.read.contributionOf([alice.account.address]), parseEther("0.5"));
    assert.equal(await campaign.read.totalRaised(), parseEther("0.5"));
    assert.equal(await balanceOf(campaign.address), parseEther("0.5"));
  });

  it("adds repeat contributions from the same address together", async function () {
    const { campaign, alice } = await deploy();
    const from = { account: alice.account.address };
    await campaign.write.contribute({ value: parseEther("0.2"), ...from });
    await campaign.write.contribute({ value: parseEther("0.3"), ...from });
    assert.equal(await campaign.read.contributionOf([alice.account.address]), parseEther("0.5"));
    assert.equal(await campaign.read.totalRaised(), parseEther("0.5"));
  });

  it("rejects a contribution below the minimum", async function () {
    const { campaign, alice } = await deploy();
    await assert.rejects(
      campaign.write.contribute({ value: 1n, account: alice.account.address }),
      /ContributionTooSmall/,
    );
  });

  it("rejects a plain transfer that carries no data", async function () {
    const { campaign, alice } = await deploy();
    await assert.rejects(
      alice.sendTransaction({ to: campaign.address, value: parseEther("0.5") }),
      /DirectPaymentNotAccepted|revert/,
    );
    assert.equal(await balanceOf(campaign.address), 0n);
  });

  it("rejects contributions once the deadline has passed", async function () {
    const { campaign, alice } = await deploy();
    await networkHelpers.time.increase(DAY + 1);
    await assert.rejects(
      campaign.write.contribute({ value: parseEther("0.5"), account: alice.account.address }),
      /CampaignClosed/,
    );
  });
});

describe("CourseCrowdfund — value out", function () {
  it("pays the beneficiary once after a successful campaign", async function () {
    const { campaign, deployer, alice, bob } = await deploy();
    await campaign.write.contribute({ value: parseEther("0.6"), account: alice.account.address });
    await campaign.write.contribute({ value: parseEther("0.4"), account: bob.account.address });
    assert.equal(await campaign.read.goalReached(), true);

    await networkHelpers.time.increase(DAY + 1);
    const before = await balanceOf(deployer.account.address);
    await campaign.write.withdraw({ account: deployer.account.address });
    const after = await balanceOf(deployer.account.address);

    assert.ok(after > before, "the beneficiary gained ether net of the fee");
    assert.equal(await balanceOf(campaign.address), 0n);
    assert.equal(await campaign.read.withdrawn(), true);
    await assert.rejects(
      campaign.write.withdraw({ account: deployer.account.address }),
      /AlreadyWithdrawn/,
    );
  });

  it("refuses withdrawal before the deadline, to a stranger, and on a failed campaign", async function () {
    const { campaign, deployer, alice } = await deploy();
    await campaign.write.contribute({ value: parseEther("0.1"), account: alice.account.address });

    await assert.rejects(campaign.write.withdraw({ account: deployer.account.address }), /CampaignStillOpen/);
    await networkHelpers.time.increase(DAY + 1);
    await assert.rejects(campaign.write.withdraw({ account: alice.account.address }), /BeneficiaryOnly/);
    await assert.rejects(campaign.write.withdraw({ account: deployer.account.address }), /GoalNotReached/);
  });

  it("refunds each contributor exactly once after a failed campaign", async function () {
    const { campaign, alice, bob } = await deploy();
    await campaign.write.contribute({ value: parseEther("0.3"), account: alice.account.address });
    await campaign.write.contribute({ value: parseEther("0.2"), account: bob.account.address });
    await networkHelpers.time.increase(DAY + 1);

    await viem.assertions.emitWithArgs(
      campaign.write.refund({ account: alice.account.address }),
      campaign,
      "Refunded",
      [alice.account.address, parseEther("0.3")],
    );

    assert.equal(await campaign.read.contributionOf([alice.account.address]), 0n);
    assert.equal(await balanceOf(campaign.address), parseEther("0.2"));
    await assert.rejects(campaign.write.refund({ account: alice.account.address }), /NothingToRefund/);

    await campaign.write.refund({ account: bob.account.address });
    assert.equal(await balanceOf(campaign.address), 0n);
  });

  it("refuses a refund while the campaign is open or after it succeeded", async function () {
    const { campaign, alice } = await deploy();
    await campaign.write.contribute({ value: parseEther("0.5"), account: alice.account.address });
    await assert.rejects(campaign.write.refund({ account: alice.account.address }), /CampaignStillOpen/);

    await campaign.write.contribute({ value: parseEther("0.5"), account: alice.account.address });
    await networkHelpers.time.increase(DAY + 1);
    await assert.rejects(campaign.write.refund({ account: alice.account.address }), /GoalWasReached/);
  });

  it("reverts the whole withdrawal when the beneficiary refuses payment", async function () {
    const [, alice] = await viem.getWalletClients();
    const rejecting = await viem.deployContract("RejectingBeneficiary", []);
    const campaign = await viem.deployContract("CourseCrowdfund", [
      rejecting.address, GOAL, BigInt(DAY),
    ]);
    await campaign.write.contribute({ value: GOAL, account: alice.account.address });
    await networkHelpers.time.increase(DAY + 1);

    await assert.rejects(rejecting.write.pull([campaign.address]), /TransferFailed|revert/);
    // the revert undid the state change, so the money is still claimable
    assert.equal(await campaign.read.withdrawn(), false);
    assert.equal(await balanceOf(campaign.address), GOAL);
  });
});
