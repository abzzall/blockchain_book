import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther } from "viem";

const { viem } = await network.create();
const MAX = 2n ** 256n - 1n;

async function seededPool(a = parseEther("1000"), b = parseEther("1000")) {
  const [deployer, trader, provider] = await viem.getWalletClients();
  const token0 = await viem.deployContract("TestToken", ["Alpha", "ALPHA", parseEther("10000000")]);
  const token1 = await viem.deployContract("TestToken", ["Beta", "BETA", parseEther("10000000")]);
  const pool = await viem.deployContract("ConstantProductPool", [token0.address, token1.address]);
  for (const token of [token0, token1]) {
    for (const who of [deployer, trader, provider]) {
      await token.write.mint([who.account.address, parseEther("1000000")], { account: who.account.address });
      await token.write.approve([pool.address, MAX], { account: who.account.address });
    }
  }
  await pool.write.seed([a, b]);
  return { pool, token0, token1, deployer, trader, provider };
}

describe("the constant-product rule", function () {
  it("issues the geometric mean of the seeded amounts as shares", async function () {
    const { pool } = await seededPool();
    assert.equal(await pool.read.totalShares(), parseEther("1000"));
    assert.equal(await pool.read.invariant(), parseEther("1000") * parseEther("1000"));
  });

  it("never lets the product fall, and grows it by the fee", async function () {
    const { pool, token0, trader } = await seededPool();
    const before = await pool.read.invariant();
    await pool.write.swap([token0.address, parseEther("100"), 0n], { account: trader.account.address });
    const after = await pool.read.invariant();
    assert.ok(after > before, "the product rises because the fee stays in the pool");
    // the growth is small: a 0.3% fee on a trade that is 10% of the reserve
    assert.ok(after < (before * 1001n) / 1000n);
  });

  it("gives a worse effective price the larger the trade", async function () {
    const { pool, token0 } = await seededPool();
    const rates: number[] = [];
    for (const size of ["1", "10", "100", "1000"]) {
      const amountIn = parseEther(size);
      const out = await pool.read.quote([token0.address, amountIn]);
      rates.push(Number((out * 1_000_000n) / amountIn));
    }
    for (let i = 1; i < rates.length; i += 1) {
      assert.ok(rates[i] < rates[i - 1], "each larger trade gets a worse rate");
    }
  });

  it("can never be drained by a single trade, however large", async function () {
    const { pool, token0 } = await seededPool();
    const huge = await pool.read.quote([token0.address, parseEther("1000000000")]);
    assert.ok(huge < parseEther("1000"), "the output approaches but never reaches the reserve");
  });

  it("moves the spot price against the direction of the trade", async function () {
    const { pool, token0, trader } = await seededPool();
    const before = await pool.read.spotPrice0In1();
    await pool.write.swap([token0.address, parseEther("100"), 0n], { account: trader.account.address });
    assert.ok(await pool.read.spotPrice0In1() < before, "buying BETA makes BETA dearer");
  });
});

describe("liquidity and its risks", function () {
  it("requires later providers to add at the current ratio", async function () {
    const { pool, provider } = await seededPool(parseEther("1000"), parseEther("4000"));
    const [amount1] = await pool.simulate.addLiquidity([parseEther("100")], { account: provider.account.address })
      .then((r) => r.result as [bigint, bigint]);
    assert.equal(amount1, parseEther("400"), "four times as much of the other token");
  });

  it("returns a provider's exact share of both reserves", async function () {
    const { pool, token0, token1, provider } = await seededPool();
    await pool.write.addLiquidity([parseEther("1000")], { account: provider.account.address });
    const shares = await pool.read.sharesOf([provider.account.address]);
    const before0 = await token0.read.balanceOf([provider.account.address]);
    const before1 = await token1.read.balanceOf([provider.account.address]);
    await pool.write.removeLiquidity([shares], { account: provider.account.address });
    // with no trades in between, they get back exactly what they put in
    assert.equal(await token0.read.balanceOf([provider.account.address]), before0 + parseEther("1000"));
    assert.equal(await token1.read.balanceOf([provider.account.address]), before1 + parseEther("1000"));
  });

  it("leaves a provider holding more of the token that fell", async function () {
    const { pool, token0, token1, trader, provider } = await seededPool();
    const before0 = await token0.read.balanceOf([provider.account.address]);
    const before1 = await token1.read.balanceOf([provider.account.address]);
    await pool.write.addLiquidity([parseEther("100")], { account: provider.account.address });
    await pool.write.swap([token0.address, parseEther("2000"), 0n], { account: trader.account.address });
    await pool.write.removeLiquidity([await pool.read.sharesOf([provider.account.address])],
      { account: provider.account.address });

    assert.ok(await token0.read.balanceOf([provider.account.address]) > before0, "more of the token that fell");
    assert.ok(await token1.read.balanceOf([provider.account.address]) < before1, "less of the token that rose");
  });

  it("enforces a minimum output and rejects an unknown token", async function () {
    const { pool, token0, trader } = await seededPool();
    const quoted = await pool.read.quote([token0.address, parseEther("100")]);
    await assert.rejects(
      pool.write.swap([token0.address, parseEther("100"), quoted + 1n], { account: trader.account.address }),
      /InsufficientOutput/);
    await assert.rejects(
      pool.read.quote(["0x000000000000000000000000000000000000dEaD", parseEther("1")]),
      /UnknownToken/);
  });

  it("refuses to be seeded twice", async function () {
    const { pool } = await seededPool();
    await assert.rejects(pool.write.seed([parseEther("1"), parseEther("1")]), /PoolAlreadySeeded/);
  });
});

/** Pins every value Lab 9 asks the student to record. */
describe("values the lab marks", function () {
  it("quotes the recorded outputs for the recorded sizes", async function () {
    const { pool, token0 } = await seededPool();
    assert.equal(await pool.read.quote([token0.address, parseEther("1")]), 996_006_981_039_903_216n);
    assert.equal(await pool.read.quote([token0.address, parseEther("100")]), 90_661_089_388_014_913_158n);
    assert.equal(await pool.read.quote([token0.address, parseEther("1000")]), 499_248_873_309_964_947_421n);
  });

  it("reaches the recorded reserves and invariant after a 100 ALPHA swap", async function () {
    const { pool, token0, trader } = await seededPool();
    await pool.write.swap([token0.address, parseEther("100"), 0n], { account: trader.account.address });
    assert.equal(await pool.read.reserve0(), parseEther("1100"));
    assert.equal(await pool.read.reserve1(), 909_338_910_611_985_086_842n);
    assert.equal(await pool.read.invariant(), 1_000_272_801_673_183_595_526_200n * 10n ** 18n);
  });
});
