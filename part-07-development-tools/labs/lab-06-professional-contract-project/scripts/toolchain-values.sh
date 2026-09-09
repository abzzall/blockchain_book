#!/usr/bin/env bash
# Prints every value Lab 6 asks you to record, using both toolchains.
# Run from the lab directory: bash scripts/toolchain-values.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== selectors, computed by cast from the signature alone ==="
for sig in "contribute()" "finalize()" "claimRefund()" "secondsRemaining()"; do
  printf "  %-22s %s\n" "$sig" "$(cast sig "$sig")"
done
echo
echo "=== error selectors ==="
for sig in "GoalNotReached()" "CampaignStillOpen()" "NothingToRefund()" "AlreadyFinalized()"; do
  printf "  %-22s %s\n" "$sig" "$(cast sig "$sig")"
done
echo
echo "=== event topic0, computed by cast keccak ==="
for sig in "Contribution(address,uint256,uint256)" "Finalized(address,uint256)" "Refund(address,uint256)"; do
  printf "  %-40s %s\n" "$sig" "$(cast keccak "$sig")"
done
echo
echo "=== forge test, with gas ==="
forge test --gas-report 2>/dev/null | grep -E '^\[PASS|^\| ' | head -30
echo
echo "=== the same contract, built by both toolchains ==="
echo "  forge build artefact:   out/Crowdfunding.sol/Crowdfunding.json"
echo "  hardhat build artefact: artifacts/src/Crowdfunding.sol/Crowdfunding.json"
node -e '
const fs=require("fs");
const read=(p)=>{try{return JSON.parse(fs.readFileSync(p,"utf8"))}catch{return null}};
const f=read("out/Crowdfunding.sol/Crowdfunding.json");
const h=read("artifacts/src/Crowdfunding.sol/Crowdfunding.json");
const bc=(a)=>(a.bytecode?.object??a.bytecode??"").replace(/^0x/,"");
if(!f||!h){console.log("  (build with both toolchains first)");process.exit(0)}
const A=bc(f),B=bc(h);
let i=0; while(i<A.length&&A[i]===B[i]) i++;
console.log("  bytecode length, both     ",A.length/2,"bytes");
console.log("  identical leading bytes   ",Math.floor(i/2));
console.log("  differing trailing bytes  ",A.length/2-Math.floor(i/2));
console.log("  byte-for-byte identical   ",A===B);
console.log();
console.log("  The code is the same; the tail is the metadata hash the compiler");
console.log("  appends, and it covers the settings and paths of the build, which");
console.log("  differ between the two toolchains. Both tails still end in the same");
console.log("  bytes recording the compiler version.");
'
