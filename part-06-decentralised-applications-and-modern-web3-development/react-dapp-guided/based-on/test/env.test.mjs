import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readConfig, forbiddenNames, UNSET_ADDRESS } from '../src/env.js';

const good = {
  VITE_CONTRACT_ADDRESS: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  VITE_RPC_URL: 'http://127.0.0.1:8545',
  VITE_CHAIN_ID: '31337',
};

test('a complete configuration is accepted', () => {
  const r = readConfig(good);
  assert.equal(r.ok, true);
  assert.equal(r.chainId, 31337);
});

test('the placeholder address is rejected with a specific instruction', () => {
  const r = readConfig({ ...good, VITE_CONTRACT_ADDRESS: UNSET_ADDRESS });
  assert.equal(r.ok, false);
  assert.match(r.reason, /placeholder/);
});

test('a missing address names the file to copy rather than failing blankly', () => {
  const r = readConfig({ ...good, VITE_CONTRACT_ADDRESS: undefined });
  assert.equal(r.ok, false);
  assert.match(r.reason, /\.env\.example/);
});

test('a malformed address is caught before any request is made', () => {
  assert.equal(readConfig({ ...good, VITE_CONTRACT_ADDRESS: '0xnope' }).ok, false);
});

test('a non-numeric chain id is rejected', () => {
  assert.equal(readConfig({ ...good, VITE_CHAIN_ID: 'mainnet' }).ok, false);
});

test('secrets bundled into the browser are detected by name', () => {
  const leaky = { ...good, VITE_PRIVATE_KEY: '0xabc', VITE_API_TOKEN: 'x', DEPLOYER_MNEMONIC: 'safe: no VITE_ prefix' };
  const found = forbiddenNames(leaky);
  assert.ok(found.includes('VITE_PRIVATE_KEY'));
  assert.ok(found.includes('VITE_API_TOKEN'));
  // Not bundled, so not this module's problem: it never reaches the browser.
  assert.ok(!found.includes('DEPLOYER_MNEMONIC'));
});

test('a clean configuration reports nothing forbidden', () => {
  assert.deepEqual(forbiddenNames(good), []);
});
