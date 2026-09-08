import { readFile } from "node:fs/promises";
import { toFunctionSelector, toEventSelector } from "viem";

const artifact = JSON.parse(
  await readFile(new URL("../artifacts/contracts/StudentRegistry.sol/StudentRegistry.json", import.meta.url)),
);
const signature = (item) => `${item.name}(${item.inputs.map((i) => i.type).join(",")})`;

console.log("custom error selectors\n");
for (const item of artifact.abi.filter((e) => e.type === "error")) {
  console.log(`  ${toFunctionSelector(signature(item))}  ${signature(item)}`);
}
console.log("\nevent topic0\n");
for (const item of artifact.abi.filter((e) => e.type === "event")) {
  console.log(`  ${toEventSelector(signature(item))}  ${signature(item)}`);
}
console.log("\nfunction selectors\n");
for (const item of artifact.abi.filter((e) => e.type === "function")) {
  console.log(`  ${toFunctionSelector(signature(item))}  ${signature(item)}  [${item.stateMutability}]`);
}
