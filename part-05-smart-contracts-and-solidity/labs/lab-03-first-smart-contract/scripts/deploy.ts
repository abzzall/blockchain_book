import { network } from "hardhat";

const { viem } = await network.create();
const registry = await viem.deployContract("StudentRegistry", ["Blockchain Systems"]);

console.log(`StudentRegistry deployed to ${registry.address}`);
console.log(`Instructor: ${await registry.read.instructor()}`);
console.log(`Course: ${await registry.read.courseName()}`);
