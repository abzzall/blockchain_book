import { readFile } from "node:fs/promises";
import { toFunctionSelector, toEventSelector } from "viem";

/**
 * Error and event selectors are the first bytes a caller actually sees when
 * something reverts. They are derived from the signature alone, so they are the
 * same for everyone who compiles this contract.
 */
const artifact = JSON.parse(
  await readFile(
    new URL("../artifacts/contracts/CourseCrowdfund.sol/CourseCrowdfund.json", import.meta.url),
  ),
);

const signature = (item) =>
  `${item.name}(${item.inputs.map((input) => input.type).join(",")})`;

console.log("custom error selectors (4 bytes each)\n");
for (const item of artifact.abi.filter((entry) => entry.type === "error")) {
  const sig = signature(item);
  console.log(`  ${toFunctionSelector(sig)}  ${sig}`);
}

console.log("\nevent topic0 (32 bytes each)\n");
for (const item of artifact.abi.filter((entry) => entry.type === "event")) {
  const sig = signature(item);
  console.log(`  ${toEventSelector(sig)}  ${sig}`);
}

console.log("\npayable functions\n");
for (const item of artifact.abi.filter((entry) => entry.stateMutability === "payable")) {
  console.log(`  ${item.type === "receive" ? "receive()" : signature(item)}`);
}
