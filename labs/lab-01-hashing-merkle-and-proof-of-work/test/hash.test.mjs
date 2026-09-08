import assert from "node:assert/strict";
import test from "node:test";
import { sha256, doubleSha256, leadingZeroBits } from "../src/hash.mjs";

test("sha256 matches the published NIST vector for \"abc\"", () => {
  assert.equal(
    sha256("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("sha256 of the empty string matches its published vector", () => {
  assert.equal(
    sha256(""),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
});

test("a one-character change alters roughly half the digest bits", () => {
  const a = BigInt("0x" + sha256("blockchain"));
  const b = BigInt("0x" + sha256("blockchaim"));
  let differing = 0n;
  let xor = a ^ b;
  while (xor > 0n) {
    differing += xor & 1n;
    xor >>= 1n;
  }
  assert.ok(differing > 96n && differing < 160n, `expected near 128 differing bits, got ${differing}`);
});

test("double sha256 is not the same as sha256 applied twice to the hex text", () => {
  assert.notEqual(doubleSha256("hello"), sha256(sha256("hello")));
  assert.equal(
    doubleSha256("hello"),
    "9595c9df90075148eb06860365df33584b75bff782a510c6cd4883a419833d50",
  );
});

test("leadingZeroBits counts bits, not characters", () => {
  assert.equal(leadingZeroBits("0000ffff"), 16);
  assert.equal(leadingZeroBits("000fffff"), 12);
  assert.equal(leadingZeroBits("00ffffff"), 8);
  assert.equal(leadingZeroBits("8fffffff"), 0);
  assert.equal(leadingZeroBits("1fffffff"), 3);
});
