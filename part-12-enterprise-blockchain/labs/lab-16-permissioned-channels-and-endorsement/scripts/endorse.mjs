import { describe, satisfies } from "../src/endorsement.mjs";
import { assemble, endorse } from "../src/channel.mjs";
import { consortium, shipmentChannel, recordShipment, SHIPMENT_POLICY } from "../src/scenario.mjs";

console.log(`channel policy: ${describe(SHIPMENT_POLICY)}\n`);

const combinations = [
  ["Supplier"],
  ["Carrier"],
  ["Supplier", "Carrier"],
  ["Supplier", "Auditor"],
  ["Carrier", "Auditor"],
  ["Supplier", "Carrier", "Auditor"],
];
console.log("which sets of endorsers satisfy it:");
for (const set of combinations) {
  console.log(`  ${satisfies(SHIPMENT_POLICY, set) ? "yes" : "no "}  {${set.join(", ")}}`);
}

console.log("\nNow the same thing through the network.\n");
for (const [label, signers] of [
  ["supplier alone", ["sam"]],
  ["supplier and carrier", ["sam", "cara"]],
  ["carrier and auditor", ["cara", "ada"]],
]) {
  const c = consortium();
  const channel = shipmentChannel(c);
  const endorsements = signers.map((s) => endorse(channel, c.ids[s], recordShipment));
  const record = channel.commit(assemble(endorsements));
  console.log(
    `  ${label.padEnd(22)} -> ${record.status.padEnd(28)} shipments = ${channel.read(c.ids.sam, "shipments") ?? "unset"}`,
  );
}

console.log("\nEvery one of those reached the ledger. Two of them changed nothing.");
