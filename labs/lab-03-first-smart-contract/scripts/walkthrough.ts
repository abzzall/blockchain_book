import { network } from "hardhat";

/**
 * Runs the whole registry story on a fresh local chain and prints every value
 * the lab asks you to record, including the gas each write costs and the reason
 * each expected failure fails.
 */
const { viem } = await network.create();
const publicClient = await viem.getPublicClient();
const [instructor, alice, bob] = await viem.getWalletClients();

const registry = await viem.deployContract("StudentRegistry", ["Blockchain Systems"]);
const gas = async (hash: `0x${string}`) =>
  (await publicClient.waitForTransactionReceipt({ hash })).gasUsed;

console.log(`contract      ${registry.address}`);
console.log(`instructor    ${await registry.read.instructor()}`);
console.log(`courseName    ${await registry.read.courseName()}`);
console.log(`studentCount  ${await registry.read.studentCount()}\n`);

const created = await registry.write.saveStudent([alice.account.address, "Aruzhan", 91]);
console.log(`create Aruzhan(91)  gas ${await gas(created)}   count ${await registry.read.studentCount()}`);

const updated = await registry.write.saveStudent([alice.account.address, "Aruzhan", 95]);
console.log(`update Aruzhan(95)  gas ${await gas(updated)}   count ${await registry.read.studentCount()}`);

const second = await registry.write.saveStudent([bob.account.address, "Daniyar", 78]);
console.log(`create Daniyar(78)  gas ${await gas(second)}   count ${await registry.read.studentCount()}\n`);

const record = await registry.read.getStudent([alice.account.address]);
console.log(`getStudent(alice)   name=${record.name} score=${record.score} exists=${record.exists}`);
console.log(`  (a read costs no gas and produces no transaction)\n`);

const failures: [string, () => Promise<unknown>][] = [
  ["score of 101", () => registry.write.saveStudent([bob.account.address, "Daniyar", 101])],
  ["empty name", () => registry.write.saveStudent([bob.account.address, "", 50])],
  ["zero address", () => registry.write.saveStudent(["0x0000000000000000000000000000000000000000", "X", 50])],
  ["a caller who is not the instructor", () =>
    registry.write.saveStudent([bob.account.address, "Daniyar", 50], { account: alice.account.address })],
  ["reading a student who was never saved", () =>
    registry.read.getStudent(["0x000000000000000000000000000000000000dEaD"])],
];

console.log("expected failures\n");
for (const [description, run] of failures) {
  try {
    await run();
    console.log(`  ${description}: DID NOT FAIL — this is a defect`);
  } catch (error) {
    const text = String((error as Error).message);
    const name = text.match(/\b(EmptyName|InstructorOnly|InvalidStudentAddress|ScoreOutOfRange|StudentNotFound)\b/);
    console.log(`  ${description}: reverted with ${name ? name[1] : "an unrecognised error"}`);
  }
}
