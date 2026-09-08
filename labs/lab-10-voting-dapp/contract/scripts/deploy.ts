import { network } from "hardhat";

const { viem } = await network.create();
const [owner, voterA, voterB] = await viem.getWalletClients();
const publicClient = await viem.getPublicClient();
const now = (await publicClient.getBlock()).timestamp;
const startsAt = now + 5n;
const endsAt = startsAt + 24n * 60n * 60n;
const election = await viem.deployContract("ClassElection", [["Aruzhan", "Dias", "Mira"], startsAt, endsAt]);
await election.write.setEligibility([[owner.account.address, voterA.account.address, voterB.account.address], true]);

console.log(`ClassElection deployed to ${election.address}`);
console.log(`Owner: ${owner.account.address}`);
console.log(`Eligible local voters: ${owner.account.address}, ${voterA.account.address}, ${voterB.account.address}`);
console.log(`Voting closes at Unix timestamp ${endsAt}`);
