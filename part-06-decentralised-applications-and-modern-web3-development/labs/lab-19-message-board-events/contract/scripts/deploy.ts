import { network } from "hardhat";

const { viem } = await network.connect();

const board = await viem.deployContract("MessageBoard");
const client = await viem.getPublicClient();
const deployedAt = await client.getBlockNumber();

console.log("MessageBoard deployed");
console.log("  address        ", board.address);
console.log("  deployed at    block", deployedAt);
console.log("  max length     ", await board.read.MAX_LENGTH());
console.log();
console.log("Put both of these in frontend/.env.local:");
console.log(`  VITE_CONTRACT_ADDRESS=${board.address}`);
console.log(`  VITE_DEPLOY_BLOCK=${deployedAt}`);
console.log();
console.log("The deployment block matters: it is where the interface starts");
console.log("scanning for logs. Scanning from zero works on a local chain and");
console.log("is untenable on a public one.");
