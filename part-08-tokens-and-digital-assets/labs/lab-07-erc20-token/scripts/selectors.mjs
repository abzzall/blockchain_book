import { readFile } from "node:fs/promises";
import { toFunctionSelector, toEventSelector } from "viem";

const artifact = JSON.parse(
  await readFile(new URL("../artifacts/contracts/CourseToken.sol/CourseToken.json", import.meta.url)),
);
const signature = (item) => `${item.name}(${item.inputs.map((i) => i.type).join(",")})`;

console.log("the ERC-20 interface this token exposes\n");
const erc20 = new Set([
  "totalSupply()", "balanceOf(address)", "transfer(address,uint256)",
  "allowance(address,address)", "approve(address,uint256)",
  "transferFrom(address,address,uint256)", "name()", "symbol()", "decimals()",
]);
for (const item of artifact.abi.filter((e) => e.type === "function")) {
  const sig = signature(item);
  const mark = erc20.has(sig) ? "ERC-20  " : "extension";
  console.log(`  ${toFunctionSelector(sig)}  ${mark}  ${sig}`);
}

console.log("\nevent topic0\n");
for (const item of artifact.abi.filter((e) => e.type === "event")) {
  console.log(`  ${toEventSelector(signature(item))}  ${signature(item)}`);
}

console.log("\ncustom error selectors inherited from OpenZeppelin\n");
for (const item of artifact.abi.filter((e) => e.type === "error")) {
  console.log(`  ${toFunctionSelector(signature(item))}  ${signature(item)}`);
}
