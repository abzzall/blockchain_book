// The feed rules, tested without a chain, a browser, or a wallet.
//
// These are the mistakes that survive a demo and fail in use: a message shown
// twice because the scan and the subscription overlap, a message that stays on
// screen after the chain dropped it, and a byte limit checked as characters.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyLogs, blockWindows, keyOf, settle, sortMessages, validate, MAX_LENGTH,
} from "../src/feed.ts";

const log = (over = {}) => ({
  transactionHash: "0xaa", logIndex: 0, blockNumber: 10n, removed: false,
  args: { author: "0x1111111111111111111111111111111111111111", room: "0xroom", id: 0n, text: "hello" },
  ...over,
});

test("a log is identified by its position, not its contents", () => {
  assert.equal(keyOf({ transactionHash: "0xaa", logIndex: 3 }), "0xaa:3");
  assert.notEqual(
    keyOf({ transactionHash: "0xaa", logIndex: 0 }),
    keyOf({ transactionHash: "0xaa", logIndex: 1 }),
  );
});

test("the same log delivered twice appears once", () => {
  // This is what the overlap between the historical scan and the live
  // subscription produces, every time, by design.
  const once = applyLogs([], [log()], 20n);
  const twice = applyLogs(once, [log()], 20n);
  assert.equal(twice.length, 1);
});

test("two identical messages are two messages", () => {
  const a = log({ transactionHash: "0xaa", logIndex: 0 });
  const b = log({ transactionHash: "0xbb", logIndex: 0 });
  assert.equal(applyLogs([], [a, b], 20n).length, 2);
});

test("a removed log is taken out of the feed", () => {
  const present = applyLogs([], [log()], 20n);
  assert.equal(present.length, 1);
  const after = applyLogs(present, [log({ removed: true })], 20n);
  assert.equal(after.length, 0, "a reorganised-out message must not stay on screen");
});

test("a removed log that was never shown changes nothing", () => {
  assert.equal(applyLogs([], [log({ removed: true })], 20n).length, 0);
});

test("a message can come back in a different block after a reorganisation", () => {
  const first = applyLogs([], [log({ transactionHash: "0xaa", blockNumber: 10n })], 20n);
  const gone = applyLogs(first, [log({ transactionHash: "0xaa", removed: true })], 20n);
  const back = applyLogs(gone, [log({ transactionHash: "0xcc", blockNumber: 11n })], 20n);
  assert.equal(back.length, 1);
  assert.equal(back[0].blockNumber, 11n);
});

test("the feed is newest first, and the log index breaks a tie within a block", () => {
  const sorted = sortMessages([
    { key: "a", blockNumber: 5n, logIndex: 0 },
    { key: "b", blockNumber: 7n, logIndex: 1 },
    { key: "c", blockNumber: 7n, logIndex: 0 },
  ]);
  assert.deepEqual(sorted.map((m) => m.key), ["b", "c", "a"]);
});

test("a message in a recent block is marked pending, and settles as the head moves", () => {
  const fresh = applyLogs([], [log({ blockNumber: 30n })], 28n);
  assert.equal(fresh[0].pending, true);
  const later = settle(fresh, 31n);
  assert.equal(later[0].pending, false);
});

test("settling never makes a settled message pending again", () => {
  const settled = settle([{ pending: false, blockNumber: 5n }], 1n);
  assert.equal(settled[0].pending, false);
});

test("the limit is bytes, not characters", () => {
  // 280 ASCII characters fit; 100 four-byte emoji do not, though 100 < 280.
  assert.equal(validate("x".repeat(MAX_LENGTH)), null);
  assert.match(validate("x".repeat(MAX_LENGTH + 1)), /281 bytes/);
  const emoji = "\u{1F680}".repeat(100); // 100 characters, 400 bytes
  assert.equal(emoji.length, 200); // JS counts UTF-16 units
  assert.match(validate(emoji), /400 bytes/);
});

test("an empty message is refused before it reaches the chain", () => {
  assert.match(validate(""), /cannot be empty/);
});

test("a block range is split into windows that cover it exactly once", () => {
  const windows = blockWindows(0n, 9n, 4n);
  assert.deepEqual(windows, [[0n, 3n], [4n, 7n], [8n, 9n]]);
  assert.equal(windows[windows.length - 1][1], 9n, "the last window must stop at the head");
});

test("a single-block range is one window", () => {
  assert.deepEqual(blockWindows(7n, 7n, 100n), [[7n, 7n]]);
});

test("an empty or inverted range asks for nothing", () => {
  assert.deepEqual(blockWindows(10n, 9n, 5n), []);
  assert.deepEqual(blockWindows(0n, 10n, 0n), []);
});
