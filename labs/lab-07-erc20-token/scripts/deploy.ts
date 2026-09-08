import { network } from "hardhat";
import { formatUnits, parseUnits } from "viem";

const { viem } = await network.create();
const token = await viem.deployContract("CourseToken", [parseUnits("1000000", 18)]);

console.log(`CourseToken deployed to ${token.address}`);
console.log(`Symbol: ${await token.read.symbol()}`);
console.log(`Decimals: ${await token.read.decimals()}`);
console.log(`Initial supply: ${formatUnits(await token.read.totalSupply(), 18)} BCT`);
console.log(`Owner: ${await token.read.owner()}`);
