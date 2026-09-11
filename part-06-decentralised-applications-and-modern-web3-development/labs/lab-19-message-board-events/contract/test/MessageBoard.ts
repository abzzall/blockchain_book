import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { keccak256, toHex, stringToHex, decodeEventLog } from "viem";

const { viem } = await network.connect();

const ROOM_A = stringToHex("general", { size: 32 });
const ROOM_B = stringToHex("random", { size: 32 });

async function deploy() {
  return viem.deployContract("MessageBoard");
}

describe("MessageBoard: what a post actually writes", () => {
  it("emits the message and stores none of it", async () => {
    const board = await deploy();
    const client = await viem.getPublicClient();

    await board.write.post([ROOM_A, "the first message"]);

    const logs = await client.getContractEvents({
      address: board.address,
      abi: board.abi,
      eventName: "Posted",
      fromBlock: 0n,
    });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].args.text, "the first message");

    // The only storage the contract has is a counter.
    assert.equal(await board.read.messageCount(), 1n);
  });

  it("gives every message the next identifier", async () => {
    const board = await deploy();
    for (const text of ["one", "two", "three"]) {
      await board.write.post([ROOM_A, text]);
    }
    assert.equal(await board.read.messageCount(), 3n);

    const client = await viem.getPublicClient();
    const logs = await client.getContractEvents({
      address: board.address, abi: board.abi, eventName: "Posted", fromBlock: 0n,
    });
    assert.deepEqual(logs.map((l) => l.args.id), [0n, 1n, 2n]);
  });

  it("records the sender, not the contract", async () => {
    const board = await deploy();
    const [alice] = await viem.getWalletClients();
    await board.write.post([ROOM_A, "from alice"], { account: alice.account });

    const client = await viem.getPublicClient();
    const [log] = await client.getContractEvents({
      address: board.address, abi: board.abi, eventName: "Posted", fromBlock: 0n,
    });
    assert.equal(
      log.args.author!.toLowerCase(),
      alice.account.address.toLowerCase(),
    );
  });
});

describe("MessageBoard: filtering, which is what indexed is for", () => {
  it("returns only one author's messages when filtered on the author topic", async () => {
    const board = await deploy();
    const [alice, bob] = await viem.getWalletClients();
    await board.write.post([ROOM_A, "alice one"], { account: alice.account });
    await board.write.post([ROOM_A, "bob one"], { account: bob.account });
    await board.write.post([ROOM_A, "alice two"], { account: alice.account });

    const client = await viem.getPublicClient();
    const mine = await client.getContractEvents({
      address: board.address, abi: board.abi, eventName: "Posted",
      args: { author: alice.account.address },
      fromBlock: 0n,
    });
    assert.deepEqual(mine.map((l) => l.args.text), ["alice one", "alice two"]);
  });

  it("returns only one room's messages when filtered on the room topic", async () => {
    const board = await deploy();
    await board.write.post([ROOM_A, "in general"]);
    await board.write.post([ROOM_B, "in random"]);
    await board.write.post([ROOM_A, "in general again"]);

    const client = await viem.getPublicClient();
    const general = await client.getContractEvents({
      address: board.address, abi: board.abi, eventName: "Posted",
      args: { room: ROOM_A },
      fromBlock: 0n,
    });
    assert.deepEqual(general.map((l) => l.args.text), ["in general", "in general again"]);
  });

  it("cannot filter on the text, because the text is not a topic", async () => {
    const board = await deploy();
    await board.write.post([ROOM_A, "findable?"]);

    const client = await viem.getPublicClient();
    const all = await client.getContractEvents({
      address: board.address, abi: board.abi, eventName: "Posted", fromBlock: 0n,
    });
    // The only way to select on text is to fetch and inspect every log.
    assert.equal(all.filter((l) => l.args.text === "findable?").length, 1);
  });
});

describe("MessageBoard: an indexed string is a hash", () => {
  it("puts the hash of the tag in the topic, and not the tag", async () => {
    const board = await deploy();
    await board.write.postTagged([ROOM_A, "tagged message", "solidity"]);

    const client = await viem.getPublicClient();
    const [log] = await client.getContractEvents({
      address: board.address, abi: board.abi, eventName: "Tagged", fromBlock: 0n,
    });

    // The decoded value is the hash. The tag itself is not in the log at all.
    assert.equal(log.args.tag, keccak256(toHex("solidity")));
    assert.notEqual(log.args.tag, "solidity");
  });

  it("can still be searched for by someone who already knows the tag", async () => {
    const board = await deploy();
    await board.write.postTagged([ROOM_A, "about solidity", "solidity"]);
    await board.write.postTagged([ROOM_A, "about viem", "viem"]);

    const client = await viem.getPublicClient();
    const solidityOnly = await client.getContractEvents({
      address: board.address, abi: board.abi, eventName: "Tagged",
      args: { tag: "solidity" },
      fromBlock: 0n,
    });
    assert.equal(solidityOnly.length, 1);
    assert.equal(solidityOnly[0].args.id, 0n);
  });
});

describe("MessageBoard: one transaction, two events", () => {
  it("puts both events in the same receipt, in the order emitted", async () => {
    const board = await deploy();
    const client = await viem.getPublicClient();
    const hash = await board.write.postTagged([ROOM_A, "both", "tag"]);
    const receipt = await client.waitForTransactionReceipt({ hash });

    assert.equal(receipt.logs.length, 2);
    const decoded = receipt.logs.map((l) =>
      decodeEventLog({ abi: board.abi, data: l.data, topics: l.topics }),
    );
    assert.deepEqual(decoded.map((d) => d.eventName), ["Posted", "Tagged"]);
  });
});

describe("MessageBoard: what it refuses", () => {
  it("rejects an empty message", async () => {
    const board = await deploy();
    await viem.assertions.revertWithCustomError(
      board.write.post([ROOM_A, ""]),
      board,
      "EmptyMessage",
    );
  });

  it("rejects a message longer than the maximum, and says by how much", async () => {
    const board = await deploy();
    const tooLong = "x".repeat(281);
    await viem.assertions.revertWithCustomErrorWithArgs(
      board.write.post([ROOM_A, tooLong]),
      board,
      "MessageTooLong",
      [281n, 280n],
    );
  });

  it("accepts a message of exactly the maximum length", async () => {
    const board = await deploy();
    await board.write.post([ROOM_A, "x".repeat(280)]);
    assert.equal(await board.read.messageCount(), 1n);
  });

  it("writes no log at all when the call reverts", async () => {
    const board = await deploy();
    const client = await viem.getPublicClient();
    try { await board.write.post([ROOM_A, ""]); } catch { /* expected */ }

    const logs = await client.getContractEvents({
      address: board.address, abi: board.abi, eventName: "Posted", fromBlock: 0n,
    });
    assert.equal(logs.length, 0);
  });
});
