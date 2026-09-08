import { readFile } from "node:fs/promises";
import { toFunctionSelector, toEventSelector } from "viem";

const artifact = JSON.parse(
  await readFile(new URL("../artifacts/contracts/CourseCertificate.sol/CourseCertificate.json", import.meta.url)),
);
const signature = (i) => `${i.name}(${i.inputs.map((x) => x.type).join(",")})`;
const erc721 = new Set([
  "balanceOf(address)", "ownerOf(uint256)", "safeTransferFrom(address,address,uint256)",
  "safeTransferFrom(address,address,uint256,bytes)", "transferFrom(address,address,uint256)",
  "approve(address,uint256)", "setApprovalForAll(address,bool)", "getApproved(uint256)",
  "isApprovedForAll(address,address)",
]);

console.log("functions\n");
for (const item of artifact.abi.filter((e) => e.type === "function")) {
  const sig = signature(item);
  console.log(`  ${toFunctionSelector(sig)}  ${erc721.has(sig) ? "ERC-721  " : "other    "}  ${sig}`);
}
console.log("\nevents\n");
for (const item of artifact.abi.filter((e) => e.type === "event")) {
  console.log(`  ${toEventSelector(signature(item))}  ${signature(item)}`);
}
console.log("\nERC-165 interface ids\n");
console.log("  0x80ac58cd  ERC-721");
console.log("  0x5b5e139f  ERC-721Metadata");
console.log("  0xd9b67a26  ERC-1155");
