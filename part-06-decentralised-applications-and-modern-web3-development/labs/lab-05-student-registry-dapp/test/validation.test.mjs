import assert from "node:assert/strict";
import test from "node:test";
import { parseScore, parseStudent } from "../src/validation.ts";

const ADDRESS = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

test("score accepts the contract's range", () => {
  assert.equal(parseScore("0"), 0);
  assert.equal(parseScore("91"), 91);
  assert.equal(parseScore("100"), 100);
});

test("score rejects what the contract would reject", () => {
  assert.throws(() => parseScore("101"), /0 to 100/);
  assert.throws(() => parseScore("20.5"), /whole number/);
  assert.throws(() => parseScore("-1"), /whole number/);
  assert.throws(() => parseScore(""), /whole number/);
  assert.throws(() => parseScore("abc"), /whole number/);
});

test("parseStudent returns a checksummed address", () => {
  const parsed = parseStudent(ADDRESS, "Aruzhan", "91");
  assert.equal(parsed.address, "0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
  assert.equal(parsed.name, "Aruzhan");
  assert.equal(parsed.score, 91);
});

test("parseStudent trims the name and rejects an empty one", () => {
  assert.equal(parseStudent(ADDRESS, "  Aruzhan  ", "91").name, "Aruzhan");
  assert.throws(() => parseStudent(ADDRESS, "   ", "91"), /name is required/);
});

test("parseStudent rejects anything that is not an address", () => {
  assert.throws(() => parseStudent("0x123", "Aruzhan", "91"), /valid Ethereum address/);
  assert.throws(() => parseStudent("", "Aruzhan", "91"), /valid Ethereum address/);
});

test("the page refuses exactly what the contract refuses", () => {
  // the contract reverts with ScoreOutOfRange above 100 and EmptyName on a
  // blank name; the page must not let either reach the chain and waste a fee
  assert.throws(() => parseStudent(ADDRESS, "Aruzhan", "101"));
  assert.throws(() => parseStudent(ADDRESS, "", "91"));
});
