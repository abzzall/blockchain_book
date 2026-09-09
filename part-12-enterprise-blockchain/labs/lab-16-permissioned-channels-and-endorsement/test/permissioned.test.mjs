import assert from "node:assert/strict";
import test from "node:test";
import { MembershipService, Organisation, UnknownIdentity } from "../src/identity.mjs";
import { and, or, outOf, satisfies, describe } from "../src/endorsement.mjs";
import { Channel, NotAMember, OrderingService, assemble, endorse } from "../src/channel.mjs";

const orgs = () => {
  const a = new Organisation("OrgA");
  const b = new Organisation("OrgB");
  const c = new Organisation("OrgC");
  return { a, b, c, alice: a.enrol("alice"), bob: b.enrol("bob"), carol: c.enrol("carol") };
};

const increment = (key) => (ctx) => ctx.put(key, (ctx.get(key) ?? 0) + 1);

test("an identity must be issued, not self-generated", () => {
  const { a, alice } = orgs();
  const service = new MembershipService([a]);
  assert.equal(service.validate(alice), "OrgA");
  assert.throws(() => service.validate({ org: "OrgA", commonName: "mallory", serial: 1 }), UnknownIdentity);
  assert.throws(() => service.validate({ org: "OrgZ", commonName: "alice", serial: 1 }), UnknownIdentity);
  assert.throws(() => service.validate(undefined), UnknownIdentity);
});

test("a revoked identity stops being recognised", () => {
  const { a, alice } = orgs();
  const service = new MembershipService([a]);
  assert.ok(service.isMember(alice));
  a.revoke("alice");
  assert.equal(service.isMember(alice), false);
});

test("policies evaluate as written", () => {
  assert.ok(satisfies(and("OrgA", "OrgB"), ["OrgA", "OrgB"]));
  assert.equal(satisfies(and("OrgA", "OrgB"), ["OrgA"]), false);
  assert.ok(satisfies(or("OrgA", "OrgB"), ["OrgB"]));
  assert.equal(satisfies(or("OrgA", "OrgB"), ["OrgC"]), false);
  assert.ok(satisfies(outOf(2, "OrgA", "OrgB", "OrgC"), ["OrgA", "OrgC"]));
  assert.equal(satisfies(outOf(2, "OrgA", "OrgB", "OrgC"), ["OrgA"]), false);
  assert.ok(satisfies(and("OrgA", or("OrgB", "OrgC")), ["OrgA", "OrgC"]));
});

test("a policy is rendered readably", () => {
  assert.equal(describe(and("OrgA", or("OrgB", "OrgC"))), "(OrgA AND (OrgB OR OrgC))");
  assert.equal(describe(outOf(2, "OrgA", "OrgB")), "2-of(OrgA, OrgB)");
});

test("a non-member cannot read the channel at all", () => {
  const { a, b, alice, carol } = orgs();
  const channel = new Channel("supply", [a, b], and("OrgA", "OrgB"));
  assert.throws(() => channel.read(carol, "widget"), NotAMember);
  assert.equal(channel.read(alice, "widget"), undefined);
});

test("two channels are two ledgers, not one filtered ledger", () => {
  const { a, b, c, alice, carol } = orgs();
  const supply = new Channel("supply", [a, b], "OrgA");
  const audit = new Channel("audit", [a, c], "OrgA");

  supply.commit(assemble([endorse(supply, alice, increment("widget"))]));
  assert.equal(supply.read(alice, "widget"), 1);
  assert.equal(audit.read(alice, "widget"), undefined, "the other channel never saw it");
  assert.equal(audit.ledger.length, 0);
  assert.throws(() => supply.read(carol, "widget"), NotAMember);
});

test("a transaction failing the policy is recorded and marked, and its writes are not applied", () => {
  const { a, b, alice } = orgs();
  const channel = new Channel("supply", [a, b], and("OrgA", "OrgB"));
  const record = channel.commit(assemble([endorse(channel, alice, increment("widget"))]));
  assert.equal(record.status, "ENDORSEMENT_POLICY_FAILURE");
  assert.equal(channel.ledger.length, 1, "invalid transactions still reach the ledger");
  assert.equal(channel.read(alice, "widget"), undefined, "but their writes are not applied");
});

test("a transaction satisfying the policy commits", () => {
  const { a, b, alice, bob } = orgs();
  const channel = new Channel("supply", [a, b], and("OrgA", "OrgB"));
  const chaincode = increment("widget");
  const record = channel.commit(
    assemble([endorse(channel, alice, chaincode), endorse(channel, bob, chaincode)]),
  );
  assert.equal(record.status, "valid");
  assert.equal(channel.read(alice, "widget"), 1);
});

test("the ordering service orders and does not execute", () => {
  const { a, b, alice, bob } = orgs();
  const channel = new Channel("supply", [a, b], and("OrgA", "OrgB"));
  const chaincode = increment("widget");
  const tx = assemble([endorse(channel, alice, chaincode), endorse(channel, bob, chaincode)]);

  const orderer = new OrderingService();
  const block = orderer.orderBlock([tx]);
  assert.equal(block.transactions.length, 1);
  assert.equal(channel.read(alice, "widget"), undefined, "ordering changed no state");

  for (const ordered of block.transactions) channel.commit(ordered);
  assert.equal(channel.read(alice, "widget"), 1, "state changes only at validation");
});

test("two concurrent transactions over the same key: the second is a read conflict", () => {
  const { a, b, alice, bob } = orgs();
  const channel = new Channel("supply", [a, b], and("OrgA", "OrgB"));
  const chaincode = increment("widget");

  // Both simulate against the same state, before either commits.
  const first = assemble([endorse(channel, alice, chaincode), endorse(channel, bob, chaincode)]);
  const second = assemble([endorse(channel, alice, chaincode), endorse(channel, bob, chaincode)]);

  assert.equal(channel.commit(first).status, "valid");
  assert.equal(channel.commit(second).status, "MVCC_READ_CONFLICT");
  assert.equal(channel.read(alice, "widget"), 1, "the conflicting write was discarded");
});

test("non-deterministic chaincode is caught as divergent endorsements, not by the runtime", () => {
  const { a, b, alice, bob } = orgs();
  const channel = new Channel("supply", [a, b], and("OrgA", "OrgB"));
  let calls = 0;
  const nonDeterministic = (ctx) => {
    calls += 1;
    ctx.put("reading", calls); // a different answer on each peer
  };

  const tx = assemble([
    endorse(channel, alice, nonDeterministic),
    endorse(channel, bob, nonDeterministic),
  ]);
  const record = channel.commit(tx);
  assert.equal(record.status, "ENDORSEMENT_MISMATCH");
  assert.equal(channel.read(alice, "reading"), undefined);
});

test("deterministic chaincode produces identical write sets on every peer", () => {
  const { a, b, alice, bob } = orgs();
  const channel = new Channel("supply", [a, b], and("OrgA", "OrgB"));
  const chaincode = increment("widget");
  const endorsements = [endorse(channel, alice, chaincode), endorse(channel, bob, chaincode)];
  assert.deepEqual([...endorsements[0].writeSet], [...endorsements[1].writeSet]);
});

test("the world state is derivable by replaying the valid ledger entries", () => {
  const { a, b, alice, bob } = orgs();
  const channel = new Channel("supply", [a, b], and("OrgA", "OrgB"));
  const chaincode = increment("widget");
  for (let i = 0; i < 3; i += 1) {
    channel.commit(assemble([endorse(channel, alice, chaincode), endorse(channel, bob, chaincode)]));
  }
  channel.commit(assemble([endorse(channel, alice, chaincode)])); // fails the policy

  const replayed = new Map();
  for (const entry of channel.ledger) {
    if (entry.status !== "valid") continue;
    for (const [key, value] of entry.writeSet) replayed.set(key, value);
  }
  assert.equal(replayed.get("widget"), channel.read(alice, "widget"));
  assert.equal(channel.ledger.length, 4, "all four are in the ledger");
});

test("an outsider cannot even simulate against the channel", () => {
  const { a, b, carol } = orgs();
  const channel = new Channel("supply", [a, b], "OrgA");
  assert.throws(() => endorse(channel, carol, increment("widget")), UnknownIdentity);
});
