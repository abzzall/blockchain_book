import { network } from "hardhat";

const { viem } = await network.connect();

const QUORUM = 100n;
const THRESHOLD = 10n;
const VOTING_PERIOD = 600n;    // ten minutes, so a class can watch it close
const TIMELOCK_DELAY = 120n;   // two minutes, so a class can watch it elapse

const [deployer, alice, bob, carol] = await viem.getWalletClients();

const holders = [alice.account.address, bob.account.address, carol.account.address];
const amounts = [60n, 50n, 30n];

const dao = await viem.deployContract("GovernanceDAO", [
  holders, amounts, QUORUM, THRESHOLD, VOTING_PERIOD, TIMELOCK_DELAY,
]);
const parameters = await viem.deployContract("ProtocolParameters", [dao.address, 30n]);

console.log("deployer            ", deployer.account.address);
console.log("GovernanceDAO       ", dao.address);
console.log("ProtocolParameters  ", parameters.address);
console.log("");
console.log("quorum              ", QUORUM.toString(), "votes cast");
console.log("proposal threshold  ", THRESHOLD.toString(), "voting power");
console.log("voting period       ", VOTING_PERIOD.toString(), "seconds");
console.log("timelock delay      ", TIMELOCK_DELAY.toString(), "seconds");
console.log("");
console.log("holders (tokens held, voting power until they delegate: zero)");
for (let i = 0; i < holders.length; i++) {
  console.log("  ", holders[i], amounts[i].toString());
}
console.log("");
console.log("Put the GovernanceDAO address in frontend/.env as VITE_CONTRACT_ADDRESS,");
console.log("and the ProtocolParameters address as VITE_PARAMETERS_ADDRESS.");
