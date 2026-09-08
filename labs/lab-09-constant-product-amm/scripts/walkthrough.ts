import { network } from "hardhat";
import { formatEther, parseEther } from "viem";

/**
 * Seeds a pool, quotes trades of increasing size to expose price impact, runs a
 * swap, shows the invariant rising by exactly the fee, and finishes with the
 * comparison every liquidity provider needs to see.
 */
const { viem } = await network.create();
const [deployer, trader, provider] = await viem.getWalletClients();

const MAX = 2n ** 256n - 1n;
const t = (x: bigint) => Number(formatEther(x)).toLocaleString("en-US", { maximumFractionDigits: 6 });

const token0 = await viem.deployContract("TestToken", ["Alpha", "ALPHA", parseEther("10000000")]);
const token1 = await viem.deployContract("TestToken", ["Beta", "BETA", parseEther("10000000")]);
const pool = await viem.deployContract("ConstantProductPool", [token0.address, token1.address]);

for (const token of [token0, token1]) {
  for (const who of [deployer, trader, provider]) {
    await token.write.mint([who.account.address, parseEther("1000000")], { account: who.account.address });
    await token.write.approve([pool.address, MAX], { account: who.account.address });
  }
}

console.log("=== seeding the pool ===\n");
await pool.write.seed([parseEther("1000"), parseEther("1000")]);
console.log(`reserves        ${t(await pool.read.reserve0())} ALPHA / ${t(await pool.read.reserve1())} BETA`);
console.log(`shares issued   ${t(await pool.read.totalShares())}`);
console.log(`invariant k     ${formatEther(await pool.read.invariant())}e18`);
console.log(`spot price      1 ALPHA = ${t(await pool.read.spotPrice0In1())} BETA\n`);

console.log("=== price impact: what the pool quotes for increasing size ===\n");
console.log("  ALPHA in     BETA out     effective price   vs spot");
for (const size of ["1", "10", "100", "500", "1000", "5000"]) {
  const amountIn = parseEther(size);
  const out = await pool.read.quote([token0.address, amountIn]);
  const effective = (out * parseEther("1")) / amountIn;
  const slip = 100 - (Number(formatEther(effective)) / 1) * 100;
  console.log(`  ${size.padStart(8)}  ${t(out).padStart(11)}  ${Number(formatEther(effective)).toFixed(6).padStart(15)}   ${slip.toFixed(2).padStart(6)}% worse`);
}

console.log("\n=== one swap of 100 ALPHA ===\n");
const kBefore = await pool.read.invariant();
await pool.write.swap([token0.address, parseEther("100"), 0n], { account: trader.account.address });
const kAfter = await pool.read.invariant();
console.log(`reserves        ${t(await pool.read.reserve0())} ALPHA / ${t(await pool.read.reserve1())} BETA`);
console.log(`spot price      1 ALPHA = ${t(await pool.read.spotPrice0In1())} BETA  (moved against the buyer)`);
console.log(`k before        ${formatEther(kBefore)}e18`);
console.log(`k after         ${formatEther(kAfter)}e18`);
console.log(`k grew by       ${(Number(formatEther(kAfter - kBefore)) / Number(formatEther(kBefore)) * 100).toFixed(4)}%  — this is the fee, and it belongs to the providers\n`);

console.log("=== slippage protection ===\n");
const expected = await pool.read.quote([token0.address, parseEther("100")]);
try {
  await pool.write.swap([token0.address, parseEther("100"), expected + 1n], { account: trader.account.address });
  console.log("  a swap demanding more than the quote succeeded — this is a defect");
} catch (error) {
  const m = String((error as Error).message).match(/InsufficientOutput/);
  console.log(`  demanding one wei more than the quote: reverted with ${m ? m[0] : "an error"}`);
}

console.log("\n=== what a provider ends up with ===\n");
const before0 = await token0.read.balanceOf([provider.account.address]);
const before1 = await token1.read.balanceOf([provider.account.address]);
await pool.write.addLiquidity([parseEther("100")], { account: provider.account.address });
const shares = await pool.read.sharesOf([provider.account.address]);
console.log(`provider added 100 ALPHA and the matching BETA, receiving ${t(shares)} shares`);

// a large trade moves the price a long way
await pool.write.swap([token0.address, parseEther("2000"), 0n], { account: trader.account.address });
console.log(`after a 2000 ALPHA trade, spot price is 1 ALPHA = ${t(await pool.read.spotPrice0In1())} BETA`);

await pool.write.removeLiquidity([shares], { account: provider.account.address });
const after0 = await token0.read.balanceOf([provider.account.address]);
const after1 = await token1.read.balanceOf([provider.account.address]);

const delta = (before: bigint, after: bigint) =>
  `${after >= before ? "+" : "-"}${t(after >= before ? after - before : before - after)}`;

console.log(`\nthe provider deposited and then withdrew everything. net change:\n`);
console.log(`  ALPHA  ${t(before0)} -> ${t(after0)}   ${delta(before0, after0)}`);
console.log(`  BETA   ${t(before1)} -> ${t(after1)}   ${delta(before1, after1)}`);
console.log(`\nThey deposited equal value on both sides and withdrew more ALPHA than`);
console.log(`they put in and less BETA. The pool sold BETA into the price move on`);
console.log(`their behalf, all the way down, because that is the only thing it can do.`);
console.log(`Holding the two tokens in a wallet instead would have left them with`);
console.log(`exactly what they started with. The difference is impermanent loss, and`);
console.log(`the fees earned along the way are what is meant to compensate for it.`);
