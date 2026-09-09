import { network } from "hardhat";
import { formatEther, parseEther } from "viem";

const { viem } = await network.create();
const [deployer] = await viem.getWalletClients();

const GOAL = parseEther("1");
const DURATION = 7n * 24n * 60n * 60n;

const campaign = await viem.deployContract("CourseCrowdfund", [
  deployer.account.address,
  GOAL,
  DURATION,
]);

console.log(`CourseCrowdfund deployed to ${campaign.address}`);
console.log(`beneficiary          ${await campaign.read.beneficiary()}`);
console.log(`goal                 ${formatEther(await campaign.read.goal())} ETH`);
console.log(`deadline (unix)      ${await campaign.read.deadline()}`);
console.log(`minimum contribution ${formatEther(await campaign.read.MINIMUM_CONTRIBUTION())} ETH`);
