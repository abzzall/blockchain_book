import { network } from "hardhat";
import { parseEther } from "viem";

const { viem } = await network.create();
const [deployer, beneficiary] = await viem.getWalletClients();
const publicClient = await viem.getPublicClient();
const deadline = (await publicClient.getBlock()).timestamp + 24n * 60n * 60n;
const campaign = await viem.deployContract("Crowdfunding", [beneficiary.account.address, parseEther("2"), deadline]);

console.log(`Crowdfunding deployed to ${campaign.address}`);
console.log(`Deployer: ${deployer.account.address}`);
console.log(`Beneficiary: ${beneficiary.account.address}`);
console.log(`Goal: 2 ETH; deadline timestamp: ${deadline}`);
