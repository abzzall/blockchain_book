import { readFile } from "node:fs/promises";
import { toFunctionSelector, toEventSelector } from "viem";

const artifact = JSON.parse(
  await readFile(new URL("../artifacts/contracts/ClassElection.sol/ClassElection.json", import.meta.url)),
);
const signature = (item) => `${item.name}(${item.inputs.map((i) => i.type).join(",")})`;

for (const [heading, kind, encode] of [
  ["custom error selectors", "error", toFunctionSelector],
  ["event topic0", "event", toEventSelector],
  ["function selectors", "function", toFunctionSelector],
]) {
  console.log(`\n${heading}\n`);
  for (const item of artifact.abi.filter((e) => e.type === kind)) {
    const sig = signature(item);
    const mutability = kind === "function" ? `  [${item.stateMutability}]` : "";
    console.log(`  ${encode(sig)}  ${sig}${mutability}`);
  }
}
