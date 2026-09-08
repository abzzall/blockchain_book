import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther } from "viem";

const { viem, networkHelpers } = await network.create();
const publicClient = await viem.getPublicClient();

async function deploy(goal = parseEther("2")) {
  const [, beneficiary] = await viem.getWalletClients();
  const now = (await publicClient.getBlock()).timestamp;
  const deadline = now + 3600n;
  const campaign = await viem.deployContract("Crowdfunding", [beneficiary.account.address, goal, deadline]);
  return { campaign, deadline };
}

describe("Crowdfunding", function () {
  it("records contributions and emits the running total", async function () {
    const { campaign } = await deploy();
    const [, , contributor] = await viem.getWalletClients();
    await viem.assertions.emitWithArgs(
      campaign.write.contribute({ account: contributor.account.address, value: parseEther("0.5") }),
      campaign,
      "Contribution",
      [contributor.account.address, parseEther("0.5"), parseEther("0.5")],
    );
    assert.equal(await campaign.read.contributions([contributor.account.address]), parseEther("0.5"));
  });

  it("finalizes a successful campaign only after its deadline", async function () {
    const { campaign, deadline } = await deploy(parseEther("1"));
    const [, , contributor] = await viem.getWalletClients();
    await campaign.write.contribute({ account: contributor.account.address, value: parseEther("1") });
    await assert.rejects(campaign.write.finalize());
    await networkHelpers.time.increaseTo(deadline);
    await campaign.write.finalize();
    assert.equal(await campaign.read.finalized(), true);
    assert.equal(await publicClient.getBalance({ address: campaign.address }), 0n);
  });

  it("allows pull refunds when the goal is missed", async function () {
    const { campaign, deadline } = await deploy(parseEther("2"));
    const [, , contributor] = await viem.getWalletClients();
    await campaign.write.contribute({ account: contributor.account.address, value: parseEther("0.25") });
    await networkHelpers.time.increaseTo(deadline);
    await campaign.write.claimRefund({ account: contributor.account.address });
    assert.equal(await campaign.read.contributions([contributor.account.address]), 0n);
    await assert.rejects(campaign.write.claimRefund({ account: contributor.account.address }));
  });
});
