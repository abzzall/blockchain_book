import { network } from "hardhat";
import { formatEther, parseEther } from "viem";

/**
 * Runs a whole campaign twice — once that reaches its goal and once that does
 * not — printing the balances and gas at each step. Everything printed here is
 * reproducible, which is why this lab needs no screenshots.
 */
const { viem, networkHelpers } = await network.create();
const publicClient = await viem.getPublicClient();
const [deployer, alice, bob] = await viem.getWalletClients();

const DAY = 24 * 60 * 60;
const GOAL = parseEther("1");
const eth = (wei: bigint) => `${formatEther(wei)} ETH`;

async function contractBalance(address: `0x${string}`) {
  return publicClient.getBalance({ address });
}

async function gasFor(hash: `0x${string}`) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt.gasUsed;
}

async function campaignThatSucceeds() {
  console.log("=== a campaign that reaches its goal ===\n");
  const campaign = await viem.deployContract("CourseCrowdfund", [
    deployer.account.address, GOAL, BigInt(DAY),
  ]);
  console.log(`contract            ${campaign.address}`);
  console.log(`contract balance    ${eth(await contractBalance(campaign.address))}\n`);

  const first = await campaign.write.contribute({ value: parseEther("0.6"), account: alice.account.address });
  console.log(`alice contributes 0.6 — gas ${await gasFor(first)}  (first write to her slot)`);
  const second = await campaign.write.contribute({ value: parseEther("0.4"), account: bob.account.address });
  console.log(`bob contributes 0.4   — gas ${await gasFor(second)}`);
  const third = await campaign.write.contribute({ value: parseEther("0.1"), account: alice.account.address });
  console.log(`alice adds 0.1        — gas ${await gasFor(third)}  (her slot already had a value)\n`);

  console.log(`totalRaised         ${eth(await campaign.read.totalRaised())}`);
  console.log(`contract balance    ${eth(await contractBalance(campaign.address))}`);
  console.log(`goalReached         ${await campaign.read.goalReached()}`);
  console.log(`alice recorded      ${eth(await campaign.read.contributionOf([alice.account.address]))}\n`);

  await networkHelpers.time.increase(DAY + 1);
  const before = await publicClient.getBalance({ address: deployer.account.address });
  const hash = await campaign.write.withdraw({ account: deployer.account.address });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const after = await publicClient.getBalance({ address: deployer.account.address });
  const fee = receipt.gasUsed * receipt.effectiveGasPrice;

  console.log(`withdraw gas        ${receipt.gasUsed}`);
  console.log(`fee paid            ${eth(fee)}`);
  console.log(`beneficiary gained  ${eth(after - before)}  (1.1 ETH received minus the fee)`);
  console.log(`contract balance    ${eth(await contractBalance(campaign.address))}\n`);
}

async function campaignThatFails() {
  console.log("=== a campaign that misses its goal ===\n");
  const campaign = await viem.deployContract("CourseCrowdfund", [
    deployer.account.address, GOAL, BigInt(DAY),
  ]);
  await campaign.write.contribute({ value: parseEther("0.3"), account: alice.account.address });
  await campaign.write.contribute({ value: parseEther("0.2"), account: bob.account.address });
  console.log(`totalRaised         ${eth(await campaign.read.totalRaised())} against a goal of ${eth(GOAL)}`);

  await networkHelpers.time.increase(DAY + 1);
  console.log(`goalReached         ${await campaign.read.goalReached()}\n`);

  const hash = await campaign.write.refund({ account: alice.account.address });
  console.log(`alice refunds       gas ${await gasFor(hash)}`);
  console.log(`alice recorded      ${eth(await campaign.read.contributionOf([alice.account.address]))}`);
  console.log(`contract balance    ${eth(await contractBalance(campaign.address))}  (bob has not pulled yet)`);

  await campaign.write.refund({ account: bob.account.address });
  console.log(`after bob refunds   ${eth(await contractBalance(campaign.address))}\n`);
}

await campaignThatSucceeds();
await campaignThatFails();
