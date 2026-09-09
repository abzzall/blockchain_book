import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { toEventSelector, toFunctionSelector } from "viem";

const { viem } = await network.create();
const IPFS = "ipfs://bafkreiabcdefghijklmnopqrstuvwxyz234567abcdefghijklmnopq/1.json";

describe("CourseCertificate", function () {
  it("issues distinct tokens with distinct owners and URIs", async function () {
    const nft = await viem.deployContract("CourseCertificate", []);
    const [, alice, bob] = await viem.getWalletClients();
    await nft.write.issue([alice.account.address, IPFS]);
    await nft.write.issue([bob.account.address, "https://example.invalid/2.json"]);

    assert.equal(await nft.read.issuedCount(), 2n);
    assert.notEqual(await nft.read.ownerOf([1n]), await nft.read.ownerOf([2n]));
    assert.notEqual(await nft.read.tokenURI([1n]), await nft.read.tokenURI([2n]));
    assert.equal(await nft.read.balanceOf([alice.account.address]), 1n);
  });

  it("moves ownership without touching the metadata", async function () {
    const nft = await viem.deployContract("CourseCertificate", []);
    const [, alice, bob] = await viem.getWalletClients();
    await nft.write.issue([alice.account.address, IPFS]);
    const before = await nft.read.tokenURI([1n]);
    await nft.write.transferFrom([alice.account.address, bob.account.address, 1n],
      { account: alice.account.address });
    assert.equal((await nft.read.ownerOf([1n])).toLowerCase(), bob.account.address.toLowerCase());
    assert.equal(await nft.read.tokenURI([1n]), before, "the URI is unchanged by a transfer");
  });

  it("refuses a recipient contract that cannot receive, and accepts one that can", async function () {
    const nft = await viem.deployContract("CourseCertificate", []);
    const nonReceiver = await viem.deployContract("NonReceiver", []);
    const receiver = await viem.deployContract("Receiver", []);
    await assert.rejects(nft.write.issue([nonReceiver.address, IPFS]), /ERC721InvalidReceiver/);
    await nft.write.issue([receiver.address, IPFS]);
    assert.equal((await nft.read.ownerOf([1n])).toLowerCase(), receiver.address.toLowerCase());
  });

  it("lets only the issuer issue and only the holder burn", async function () {
    const nft = await viem.deployContract("CourseCertificate", []);
    const [, alice, bob] = await viem.getWalletClients();
    await assert.rejects(
      nft.write.issue([alice.account.address, IPFS], { account: alice.account.address }),
      /OwnableUnauthorizedAccount/);
    await nft.write.issue([alice.account.address, IPFS]);
    await assert.rejects(nft.write.burn([1n], { account: bob.account.address }), /NotTheOwner/);
    await nft.write.burn([1n], { account: alice.account.address });
    await assert.rejects(nft.read.ownerOf([1n]), /ERC721NonexistentToken/);
  });

  it("never reuses a token id after a burn", async function () {
    const nft = await viem.deployContract("CourseCertificate", []);
    const [, alice] = await viem.getWalletClients();
    await nft.write.issue([alice.account.address, IPFS]);
    await nft.write.burn([1n], { account: alice.account.address });
    await nft.write.issue([alice.account.address, IPFS]);
    assert.equal((await nft.read.ownerOf([2n])).toLowerCase(), alice.account.address.toLowerCase());
    assert.equal(await nft.read.issuedCount(), 2n);
  });
});

/** Pins every value Lab 8 asks the student to record. */
describe("values the lab marks", function () {
  it("reports the ERC-165 interface ids correctly", async function () {
    const nft = await viem.deployContract("CourseCertificate", []);
    assert.equal(await nft.read.supportsInterface(["0x80ac58cd"]), true);
    assert.equal(await nft.read.supportsInterface(["0x5b5e139f"]), true);
    assert.equal(await nft.read.supportsInterface(["0xd9b67a26"]), false);
  });

  it("has the selectors and topics the lab records", function () {
    assert.equal(toFunctionSelector("ownerOf(uint256)"), "0x6352211e");
    assert.equal(toFunctionSelector("tokenURI(uint256)"), "0xc87b56dd");
    assert.equal(toFunctionSelector("safeTransferFrom(address,address,uint256)"), "0x42842e0e");
    assert.equal(
      toEventSelector("Transfer(address,address,uint256)"),
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    );
  });

  it("charges the gas figures the walkthrough prints", async function () {
    const publicClient = await viem.getPublicClient();
    const [, alice, bob] = await viem.getWalletClients();
    const nft = await viem.deployContract("CourseCertificate", []);
    const gas = async (h: `0x${string}`) =>
      (await publicClient.waitForTransactionReceipt({ hash: h })).gasUsed;

    assert.equal(await gas(await nft.write.issue([alice.account.address, IPFS])), 173_737n);
    assert.equal(await gas(await nft.write.issue([bob.account.address, "https://example.invalid/certificates/2.json"])), 150_820n);
    assert.equal(
      await gas(await nft.write.transferFrom([alice.account.address, bob.account.address, 1n],
        { account: alice.account.address })),
      37_976n,
    );
  });
});
