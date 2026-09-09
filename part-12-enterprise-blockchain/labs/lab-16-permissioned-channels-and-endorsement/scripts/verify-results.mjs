import { readFile } from "node:fs/promises";
import { describe, satisfies } from "../src/endorsement.mjs";
import { assemble, endorse } from "../src/channel.mjs";
import {
  consortium, shipmentChannel, auditChannel, recordShipment, SHIPMENT_POLICY,
} from "../src/scenario.mjs";

const path = process.argv[2] ?? new URL("../RESULTS.md", import.meta.url).pathname;

function readTableValues(markdown) {
  const values = new Map();
  for (const line of markdown.split("\n")) {
    const match = line.match(/^\s*\|([^|]+)\|([^|]*)\|\s*$/);
    if (!match) continue;
    const label = match[1].trim().replace(/`/g, "").toLowerCase();
    const value = match[2].trim().replace(/`/g, "");
    if (!label || /^-+$/.test(label) || label === "field" || label === "item") continue;
    values.set(label, value);
  }
  return values;
}
const yes = (c) => (c ? "yes" : "no");

// Endorsement outcomes, each on a fresh channel.
const statusFor = (signers) => {
  const c = consortium();
  const channel = shipmentChannel(c);
  return channel.commit(assemble(signers.map((s) => endorse(channel, c.ids[s], recordShipment)))).status;
};

// Two concurrent proposals over one key.
const concurrent = (() => {
  const c = consortium();
  const channel = shipmentChannel(c);
  const first = assemble([endorse(channel, c.ids.sam, recordShipment), endorse(channel, c.ids.cara, recordShipment)]);
  const second = assemble([endorse(channel, c.ids.sam, recordShipment), endorse(channel, c.ids.ada, recordShipment)]);
  const a = channel.commit(first).status;
  const b = channel.commit(second).status;
  return { a, b, value: channel.read(c.ids.sam, "shipments"), entries: channel.ledger.length };
})();

// Non-deterministic chaincode.
const divergent = (() => {
  const c = consortium();
  const channel = shipmentChannel(c);
  let calls = 0;
  const cc = (ctx) => { calls += 1; ctx.put("recordedAt", `peer-observation-${calls}`); };
  return channel.commit(assemble([endorse(channel, c.ids.sam, cc), endorse(channel, c.ids.cara, cc)])).status;
})();

// Channel isolation.
const isolation = (() => {
  const c = consortium();
  const shipments = shipmentChannel(c);
  const audit = auditChannel(c);
  shipments.commit(assemble([endorse(shipments, c.ids.sam, recordShipment), endorse(shipments, c.ids.cara, recordShipment)]));
  return {
    shipmentsValue: shipments.read(c.ids.sam, "shipments"),
    auditHasValue: audit.read(c.ids.sam, "shipments") !== undefined,
  };
})();

const mallory = (() => {
  const c = consortium();
  return shipmentChannel(c).membership.isMember(c.ids.mallory);
})();

const expected = [
  ["the channel's endorsement policy, written out", describe(SHIPMENT_POLICY)],
  ["{Supplier, Auditor} satisfies the policy (yes/no)", yes(satisfies(SHIPMENT_POLICY, ["Supplier", "Auditor"]))],
  ["{Carrier, Auditor} satisfies the policy (yes/no)", yes(satisfies(SHIPMENT_POLICY, ["Carrier", "Auditor"]))],
  ["mallory's identity is recognised (yes/no)", yes(mallory)],
  ["status when only the supplier endorses", statusFor(["sam"])],
  ["status when the supplier and carrier endorse", statusFor(["sam", "cara"])],
  ["status of the first of two concurrent transactions", concurrent.a],
  ["status of the second of two concurrent transactions", concurrent.b],
  ["value of shipments after both concurrent transactions", String(concurrent.value)],
  ["ledger entries after both concurrent transactions", String(concurrent.entries)],
  ["status of the non-deterministic transaction", divergent],
  ["the audit channel holds a value for shipments (yes/no)", yes(isolation.auditHasValue)],
];

const recorded = readTableValues(await readFile(path, "utf8"));
let correct = 0, wrong = 0, blank = 0;
console.log(`marking ${path}\n`);
for (const [label, want] of expected) {
  const got = recorded.get(label.toLowerCase());
  if (got === undefined) { console.log(`MISSING  ${label}\n         (no row with this label was found)`); blank += 1; }
  else if (got === "") { console.log(`BLANK    ${label}`); blank += 1; }
  else if (got.toLowerCase() === want.toLowerCase()) { console.log(`ok       ${label}`); correct += 1; }
  else { console.log(`WRONG    ${label}\n         recorded ${got}\n         expected ${want}`); wrong += 1; }
}
console.log(`\n${correct} correct, ${wrong} wrong, ${blank} blank, out of ${expected.length}`);
process.exit(wrong === 0 && blank === 0 ? 0 : 1);
