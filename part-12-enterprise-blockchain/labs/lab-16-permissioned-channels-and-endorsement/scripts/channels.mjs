import { NotAMember } from "../src/channel.mjs";
import { assemble, endorse } from "../src/channel.mjs";
import { consortium, shipmentChannel, auditChannel, recordShipment } from "../src/scenario.mjs";

const c = consortium();
const shipments = shipmentChannel(c);
const audit = auditChannel(c);

shipments.commit(assemble([endorse(shipments, c.ids.sam, recordShipment), endorse(shipments, c.ids.cara, recordShipment)]));

console.log("two channels over the same consortium\n");
console.log(`  shipments  members: Supplier, Carrier, Auditor   ledger entries: ${shipments.ledger.length}`);
console.log(`  audit      members: Supplier, Auditor            ledger entries: ${audit.ledger.length}\n`);

console.log(`  shipments.shipments as seen by sam   : ${shipments.read(c.ids.sam, "shipments")}`);
console.log(`  audit.shipments as seen by sam       : ${audit.read(c.ids.sam, "shipments")}`);
console.log("\nThe audit channel does not hold that value in any form. It is a separate");
console.log("ledger, not the same ledger with a filter over it.\n");

try {
  audit.read(c.ids.cara, "shipments");
} catch (error) {
  if (!(error instanceof NotAMember)) throw error;
  console.log(`  cara reading the audit channel: ${error.constructor.name}`);
  console.log("  The carrier is not refused the data; the carrier is never sent it.");
}
