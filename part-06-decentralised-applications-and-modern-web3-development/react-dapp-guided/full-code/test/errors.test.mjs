import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../src/errors.js';

test('a rejected request is not a fault and costs nothing', () => {
  const r = classify({ code: 4001, message: 'User rejected the request' });
  assert.equal(r.kind, 'rejected');
  assert.equal(r.costsGas, false);
});

test('a missing wallet is told apart from a refused request', () => {
  assert.equal(classify({ name: 'ConnectorNotFoundError' }).kind, 'no-wallet');
});

test('a chain mismatch is its own case, because the address exists everywhere', () => {
  assert.equal(classify({ name: 'ChainMismatchError' }).kind, 'wrong-network');
  assert.equal(classify({ code: 4902 }).kind, 'wrong-network');
});

test('insufficient funds is distinguished from a revert', () => {
  assert.equal(classify(new Error('insufficient funds for gas * price + value')).kind, 'insufficient-funds');
});

test('a revert costs gas, unlike every other failure here', () => {
  const r = classify(new Error('execution reverted: not the owner'));
  assert.equal(r.kind, 'reverted');
  assert.equal(r.costsGas, true);
});

test('a lost connection is recognised and reported as retryable', () => {
  for (const e of [new TypeError('Failed to fetch'), { name: 'HttpRequestError' }, new Error('NetworkError when attempting to fetch resource')]) {
    const r = classify(e);
    assert.equal(r.kind, 'offline', `misclassified: ${JSON.stringify(e)}`);
    assert.equal(r.recoverable, true);
  }
});

test('a timeout warns against resending, because the transaction may still be mined', () => {
  const r = classify({ name: 'TimeoutError', message: 'request timed out' });
  assert.equal(r.kind, 'timeout');
  assert.match(r.detail, /may still be mined/);
});

test('an unrecognised error still produces a renderable result, never undefined', () => {
  for (const e of [undefined, null, 'a string', {}, new Error('')]) {
    const r = classify(e);
    assert.equal(r.kind, 'unknown');
    assert.ok(r.title.length > 0);
  }
});

test('every branch returns the full shape, so the banner can never render a hole', () => {
  for (const e of [{ code: 4001 }, { name: 'ChainMismatchError' }, new Error('execution reverted'), new Error('Failed to fetch'), {}]) {
    const r = classify(e);
    for (const key of ['kind', 'title', 'detail', 'recoverable', 'costsGas']) {
      assert.ok(key in r, `missing ${key}`);
    }
  }
});
