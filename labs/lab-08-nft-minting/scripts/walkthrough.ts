import { network } from "hardhat";

/**
 * Issues certificates, transfers one, shows what the chain stores about them,
 * and demonstrates what the chain does not know. Everything is reproducible.
 */
const { viem } = await network.create();
const publicClient = await viem.getPublicClient();
const [issuer, alice, bob] = await viem.getWalletClients();

const nft = await viem.deployContract("CourseCertificate", []);
const gas = async (hash: `0x${string}`) =>
  (await publicClient.waitForTransactionReceipt({ hash })).gasUsed;

const attempt = async (label: string, run: () => Promise<unknown>) => {
  try { await run(); console.log(`  ${label}: DID NOT FAIL — this is a defect`); }
  catch (error) {
    const m = String((error as Error).message).match(/\b(NotTheOwner|ERC721\w+|OwnableUnauthorizedAccount)\b/);
    console.log(`  ${label}: reverted with ${m ? m[1] : "an unrecognised error"}`);
  }
};

console.log(`contract   ${nft.address}`);
console.log(`name       ${await nft.read.name()}`);
console.log(`symbol     ${await nft.read.symbol()}\n`);

const ipfs = "ipfs://bafkreiabcdefghijklmnopqrstuvwxyz234567abcdefghijklmnopq/1.json";
const httpUri = "https://example.invalid/certificates/2.json";

const m1 = await nft.write.issue([alice.account.address, ipfs]);
console.log(`issue #1 to alice   gas ${await gas(m1)}`);
const m2 = await nft.write.issue([bob.account.address, httpUri]);
console.log(`issue #2 to bob     gas ${await gas(m2)}\n`);

console.log(`issuedCount         ${await nft.read.issuedCount()}`);
console.log(`ownerOf(1)          ${await nft.read.ownerOf([1n])}`);
console.log(`ownerOf(2)          ${await nft.read.ownerOf([2n])}`);
console.log(`balanceOf(alice)    ${await nft.read.balanceOf([alice.account.address])}`);
console.log(`tokenURI(1)         ${await nft.read.tokenURI([1n])}`);
console.log(`tokenURI(2)         ${await nft.read.tokenURI([2n])}\n`);

console.log("what the chain stores is the pointer, not the metadata.");
console.log("neither URI above was fetched by anything on-chain, and nothing");
console.log("on-chain can tell you whether either one still resolves.\n");

console.log("--- interface support, as ERC-165 reports it ---");
for (const [id, label] of [["0x80ac58cd", "ERC-721"], ["0x5b5e139f", "ERC-721Metadata"], ["0xd9b67a26", "ERC-1155"]] as const) {
  console.log(`  ${id}  ${label.padEnd(16)} ${await nft.read.supportsInterface([id])}`);
}

console.log("\n--- a transfer moves the token, not the metadata ---");
const t = await nft.write.transferFrom([alice.account.address, bob.account.address, 1n],
  { account: alice.account.address });
console.log(`alice -> bob #1     gas ${await gas(t)}`);
console.log(`ownerOf(1)          ${await nft.read.ownerOf([1n])}`);
console.log(`tokenURI(1)         ${await nft.read.tokenURI([1n])}  (unchanged)\n`);

console.log("--- expected failures ---");
await attempt("alice issuing a certificate to herself", () =>
  nft.write.issue([alice.account.address, ipfs], { account: alice.account.address }));
await attempt("bob burning a certificate he does not own", () =>
  nft.write.burn([2n], { account: alice.account.address }));
await attempt("asking who owns token 99", () => nft.read.ownerOf([99n]));

const nonReceiver = await viem.deployContract("NonReceiver", []);
await attempt("issuing to a contract with no receiver hook", () =>
  nft.write.issue([nonReceiver.address, ipfs]));
const receiver = await viem.deployContract("Receiver", []);
await nft.write.issue([receiver.address, ipfs]);
console.log(`  issuing to a contract that implements the hook: succeeded, owner of #3 is the contract`);

console.log("\n--- burning ---");
await nft.write.burn([2n], { account: bob.account.address });
console.log(`issuedCount after burn  ${await nft.read.issuedCount()}  (ids are never reused)`);
await attempt("asking who owns the burned token 2", () => nft.read.ownerOf([2n]));
