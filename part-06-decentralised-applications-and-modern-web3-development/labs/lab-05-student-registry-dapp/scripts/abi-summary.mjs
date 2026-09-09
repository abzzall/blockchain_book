import { studentRegistryAbi } from "../src/abi.ts";
import { toFunctionSelector, toEventSelector } from "viem";

const signature = (i) => `${i.name}(${i.inputs.map((x) => x.type).join(",")})`;
const functions = studentRegistryAbi.filter((e) => e.type === "function");

console.log("the ABI this page ships\n");
for (const item of functions) {
  console.log(`  ${toFunctionSelector(signature(item))}  ${signature(item).padEnd(36)} [${item.stateMutability}]`);
}
console.log(`\n  functions total   ${functions.length}`);
console.log(`  view              ${functions.filter((f) => f.stateMutability === "view").length}`);
console.log(`  nonpayable        ${functions.filter((f) => f.stateMutability === "nonpayable").length}`);
console.log("\n  the view functions are answered by the RPC provider without a");
console.log("  transaction. the nonpayable one is the only one that needs a wallet.");
console.log(`\n  topic0 of StudentSaved(address,string,uint16,bool)`);
console.log(`  ${toEventSelector("StudentSaved(address,string,uint16,bool)")}`);
console.log("\n  note: this event is NOT in the ABI above. the page cannot decode a");
console.log("  log it has no entry for, which is why an ABI is a decoding table and");
console.log("  not merely a call list.");
