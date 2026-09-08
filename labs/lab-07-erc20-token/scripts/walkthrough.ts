import { network } from "hardhat";
import { formatUnits, parseUnits } from "viem";

/**
 * Runs the whole ERC-20 story on a fresh local chain: supply, transfer,
 * approve, transferFrom, burn, and mint. Everything printed is reproducible.
 */
const { viem } = await network.create();
const publicClient = await viem.getPublicClient();
const [owner, alice, bob] = await viem.getWalletClients();

const token = await viem.deployContract("CourseToken", [parseUnits("1000000", 18)]);
const gas = async (hash: `0x${string}`) =>
  (await publicClient.waitForTransactionReceipt({ hash })).gasUsed;
const units = async (address: `0x${string}`) =>
  formatUnits(await token.read.balanceOf([address]), 18);

console.log(`contract     ${token.address}`);
console.log(`name         ${await token.read.name()}`);
console.log(`symbol       ${await token.read.symbol()}`);
console.log(`decimals     ${await token.read.decimals()}`);
console.log(`totalSupply  ${formatUnits(await token.read.totalSupply(), 18)}`);
console.log(`  raw        ${await token.read.totalSupply()}  (the integer actually stored)\n`);

console.log("--- a direct transfer ---");
const t1 = await token.write.transfer([alice.account.address, parseUnits("1000", 18)]);
console.log(`owner -> alice 1000   gas ${await gas(t1)}`);
console.log(`owner ${await units(owner.account.address)}   alice ${await units(alice.account.address)}\n`);

console.log("--- approval is not a transfer ---");
const a1 = await token.write.approve([bob.account.address, parseUnits("400", 18)],
  { account: alice.account.address });
console.log(`alice approves bob 400  gas ${await gas(a1)}`);
console.log(`allowance(alice,bob)  ${formatUnits(await token.read.allowance([alice.account.address, bob.account.address]), 18)}`);
console.log(`alice balance          ${await units(alice.account.address)}  (unchanged: nothing moved)`);
console.log(`bob balance            ${await units(bob.account.address)}\n`);

console.log("--- bob spends part of the allowance ---");
const f1 = await token.write.transferFrom(
  [alice.account.address, bob.account.address, parseUnits("250", 18)],
  { account: bob.account.address });
console.log(`transferFrom 250       gas ${await gas(f1)}`);
console.log(`alice ${await units(alice.account.address)}   bob ${await units(bob.account.address)}`);
console.log(`allowance remaining    ${formatUnits(await token.read.allowance([alice.account.address, bob.account.address]), 18)}\n`);

console.log("--- spending more than the allowance ---");
try {
  await token.write.transferFrom(
    [alice.account.address, bob.account.address, parseUnits("500", 18)],
    { account: bob.account.address });
  console.log("  DID NOT FAIL — this is a defect");
} catch (error) {
  const name = String((error as Error).message).match(/ERC20\w+/);
  console.log(`  reverted with ${name ? name[0] : "an unrecognised error"}\n`);
}

console.log("--- burning reduces total supply ---");
const supplyBefore = await token.read.totalSupply();
const b1 = await token.write.burn([parseUnits("100", 18)], { account: bob.account.address });
console.log(`bob burns 100          gas ${await gas(b1)}`);
console.log(`totalSupply ${formatUnits(supplyBefore, 18)} -> ${formatUnits(await token.read.totalSupply(), 18)}`);
console.log(`bob balance            ${await units(bob.account.address)}\n`);

console.log("--- only the owner may mint ---");
try {
  await token.write.mint([alice.account.address, parseUnits("1", 18)], { account: alice.account.address });
  console.log("  DID NOT FAIL — this is a defect");
} catch (error) {
  const name = String((error as Error).message).match(/Ownable\w+/);
  console.log(`  alice minting reverted with ${name ? name[0] : "an unrecognised error"}`);
}
const m1 = await token.write.mint([alice.account.address, parseUnits("500", 18)]);
console.log(`owner mints 500 to alice  gas ${await gas(m1)}`);
console.log(`totalSupply            ${formatUnits(await token.read.totalSupply(), 18)}`);
console.log(`alice                  ${await units(alice.account.address)}`);
