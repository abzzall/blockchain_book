import { network } from "hardhat";

/**
 * Runs a complete election on a fresh local chain: registration, an open
 * period, votes, every refusal the contract can make, and the result. Time is
 * moved forward deliberately, which a public chain would not let you do.
 */
const { viem, networkHelpers } = await network.create();
const publicClient = await viem.getPublicClient();
const [owner, alice, bob, carol, mallory, dave] = await viem.getWalletClients();

const now = Number((await publicClient.getBlock()).timestamp);
const OPENS = now + 60;
const CLOSES = OPENS + 3600;

const election = await viem.deployContract("ClassElection", [
  ["Aruzhan", "Daniyar", "Madina"], BigInt(OPENS), BigInt(CLOSES),
]);
const gas = async (hash: `0x${string}`) =>
  (await publicClient.waitForTransactionReceipt({ hash })).gasUsed;

const attempt = async (label: string, run: () => Promise<unknown>) => {
  try {
    await run();
    console.log(`  ${label}: DID NOT FAIL — this is a defect`);
  } catch (error) {
    const name = String((error as Error).message)
      .match(/\b(AlreadyVoted|EmptyCandidateName|InvalidCandidate|InvalidSchedule|NotEligible|OwnerOnly|ResultsNotReady|TooFewCandidates|VotingNotOpen)\b/);
    console.log(`  ${label}: reverted with ${name ? name[1] : "an unrecognised error"}`);
  }
};

console.log(`contract        ${election.address}`);
console.log(`candidateCount  ${await election.read.candidateCount()}`);
console.log(`opens / closes  ${OPENS} / ${CLOSES}\n`);

console.log("--- before the polls open ---");
await attempt("an eligible-looking vote", () => election.write.vote([0n], { account: alice.account.address }));
await attempt("asking for the result", () => election.read.result());

const reg = await election.write.setEligibility(
  [[alice.account.address, bob.account.address, carol.account.address, dave.account.address], true]);
console.log(`\nregister four voters    gas ${await gas(reg)}`);
console.log(`alice eligible          ${await election.read.eligible([alice.account.address])}`);
console.log(`mallory eligible        ${await election.read.eligible([mallory.account.address])}`);
await attempt("a stranger registering someone", () =>
  election.write.setEligibility([[mallory.account.address], true], { account: mallory.account.address }));

await networkHelpers.time.increase(120);
console.log("\n--- polls open ---");
const firstVote = await election.write.vote([0n], { account: alice.account.address });
console.log(`alice votes for 0       gas ${await gas(firstVote)}`);
const secondVote = await election.write.vote([1n], { account: bob.account.address });
console.log(`bob votes for 1         gas ${await gas(secondVote)}`);
await election.write.vote([0n], { account: carol.account.address });
console.log(`carol votes for 0`);
console.log(`totalVotes              ${await election.read.totalVotes()}\n`);

await attempt("alice voting again", () => election.write.vote([1n], { account: alice.account.address }));
await attempt("mallory, who was never registered", () => election.write.vote([0n], { account: mallory.account.address }));
await attempt("a vote for candidate 9, by someone who has not voted", () =>
  election.write.vote([9n], { account: dave.account.address }));
await attempt("a vote for candidate 9, by alice, who already voted", () =>
  election.write.vote([9n], { account: alice.account.address }));
await attempt("asking for the result while open", () => election.read.result());

await networkHelpers.time.increase(3600);
console.log("\n--- polls closed ---");
for (let id = 0n; id < 3n; id += 1n) {
  const c = await election.read.candidate([id]);
  console.log(`  candidate ${id}  ${c.name.padEnd(8)} ${c.voteCount} vote(s)`);
}
const [winnerId, tied] = await election.read.result();
console.log(`\nresult                  winnerId ${winnerId}, tied ${tied}`);
await attempt("a late vote", () => election.write.vote([2n], { account: alice.account.address }));
