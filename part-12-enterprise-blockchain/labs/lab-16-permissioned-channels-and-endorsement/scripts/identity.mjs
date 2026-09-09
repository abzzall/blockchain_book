import { MembershipService } from "../src/identity.mjs";
import { consortium, shipmentChannel } from "../src/scenario.mjs";

const c = consortium();
const channel = shipmentChannel(c);
const service = channel.membership;

console.log("An identity here is issued, not generated.\n");
for (const [name, identity] of Object.entries(c.ids)) {
  const ok = service.isMember(identity);
  console.log(
    `  ${name.padEnd(8)} org ${String(identity.org).padEnd(9)} serial ${String(identity.serial).padEnd(3)} recognised: ${ok}`,
  );
}

console.log("\nmallory presents a well-formed identity claiming to be a Supplier client.");
console.log("It is refused, because the Supplier's certificate authority never issued it.");
console.log("On a public chain there would be nothing to refuse: a key pair is a key pair.\n");

c.supplier.revoke("sam");
console.log(`after revoking sam, recognised: ${service.isMember(c.ids.sam)}`);
console.log("Revocation is why membership is a service that must be consulted, and not");
console.log("a property that can be checked from the identity alone.");
