import { assemble, endorse } from "../src/channel.mjs";
import { consortium, shipmentChannel } from "../src/scenario.mjs";

const c = consortium();
const channel = shipmentChannel(c);

let peerCalls = 0;
const readsSomethingLocal = (ctx) => {
  peerCalls += 1;
  ctx.put("recordedAt", `peer-observation-${peerCalls}`);
};

console.log("Chaincode that consults something local to the peer -- a clock, a random");
console.log("source, a file, an external service -- gives a different answer on each peer.\n");

const endorsements = [
  endorse(channel, c.ids.sam, readsSomethingLocal),
  endorse(channel, c.ids.cara, readsSomethingLocal),
];
for (const e of endorsements) {
  console.log(`  ${e.org.padEnd(9)} wrote recordedAt = ${e.writeSet.get("recordedAt")}`);
}

const record = channel.commit(assemble(endorsements));
console.log(`\n  commit status: ${record.status}`);
console.log(`  recordedAt in the world state: ${channel.read(c.ids.sam, "recordedAt")}\n`);

console.log("Nothing rejected this chaincode when it was installed, and nothing rejected");
console.log("it when it ran. The divergence was caught only because two peers happened to");
console.log("disagree, and the policy required both. Under a one-organisation policy there");
console.log("would have been nothing to compare, and the transaction would have committed.");
