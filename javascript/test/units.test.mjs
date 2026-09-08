import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatEther, parseEther, formatUnits, parseUnits,
  MAX_SAFE, WEI_PER_ETHER, survivesAsNumber, precisionLostViaNumber, feePaid,
} from '../src/units.mjs';

// These tests need no network. The live demo is src/read-chain.mjs.

test('one ether is 10^18 wei', () => {
  assert.equal(parseEther('1'), WEI_PER_ETHER);
  assert.equal(formatEther(WEI_PER_ETHER), '1');
});

test('the smallest amount is one wei and survives the round trip', () => {
  assert.equal(parseEther('0.000000000000000001'), 1n);
  assert.equal(formatEther(1n), '0.000000000000000001');
});

test('parsing and formatting are inverse for awkward values', () => {
  for (const v of ['0', '1', '0.5', '12.345678901234567891', '1000000']) {
    assert.equal(formatEther(parseEther(v)), v);
  }
});

test('a token with other decimals uses formatUnits', () => {
  assert.equal(formatUnits(1_000_000n, 6), '1');       // a 6-decimal token
  assert.equal(parseUnits('1', 6), 1_000_000n);
});

test('decimals are a token convention, not a protocol rule', () => {
  // The same integer means different amounts under different decimals.
  assert.equal(formatUnits(1_000_000n, 6), '1');
  assert.equal(formatUnits(1_000_000n, 18), '0.000000000001');
});

test('one ether does not survive a trip through Number', () => {
  assert.equal(survivesAsNumber(WEI_PER_ETHER), false);
  assert.ok(WEI_PER_ETHER > MAX_SAFE);
});

test('small amounts do survive, which is what makes the bug intermittent', () => {
  assert.equal(survivesAsNumber(21_000n), true);
  assert.equal(precisionLostViaNumber(21_000n), 0n);
});

test('a realistic wei amount loses precision through Number', () => {
  const amount = 2_036_743_815_817_044_738_246_252n; // WETH total supply, once
  assert.ok(precisionLostViaNumber(amount) > 0n);
});

test('amounts are bigint, and mixing them with Number throws', () => {
  assert.equal(typeof parseEther('1'), 'bigint');
  assert.throws(() => parseEther('1') + 1, TypeError);
});

test('a fee is gas used times the effective price', () => {
  // 21,000 gas at 50 gwei, the plain transfer of Chapter 12.
  assert.equal(feePaid(21_000n, 50_000_000_000n), 1_050_000_000_000_000n);
  assert.equal(formatEther(feePaid(21_000n, 50_000_000_000n)), '0.00105');
});

test('formatting never introduces a float', () => {
  const odd = 123_456_789_012_345_678_901n;
  assert.equal(parseEther(formatEther(odd)), odd);
});
