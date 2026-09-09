import { assemble, endorse } from "../src/channel.mjs";
import { consortium, shipmentChannel, recordShipment } from "../src/scenario.mjs";

const c = consortium();
const channel = shipmentChannel(c);

console.log("Two clients propose at the same time, both simulating against shipments = unset.\n");
const first = assemble([endorse(channel, c.ids.sam, recordShipment), endorse(channel, c.ids.cara, recordShipment)]);
const second = assemble([endorse(channel, c.ids.sam, recordShipment), endorse(channel, c.ids.ada, recordShipment)]);

console.log(`  both read shipments at version ${first.readSet.get("shipments")}`);
console.log(`  both intend to write shipments = ${first.writeSet.get("shipments")}\n`);

console.log(`  first  commits : ${channel.commit(first).status}`);
console.log(`  second commits : ${channel.commit(second).status}`);
console.log(`\n  shipments is now ${channel.read(c.ids.sam, "shipments")}, not 2.`);
console.log(`  ledger entries: ${channel.ledger.length}, of which valid: ${channel.ledger.filter((e) => e.status === "valid").length}`);

console.log("\nThe second transaction was endorsed correctly by an authorised set and still");
console.log("failed. It was simulated against a state that no longer existed by the time");
console.log("it was validated, which is the cost of executing before ordering.");
