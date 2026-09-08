import { createHash } from "node:crypto";

/** SHA-256 of a UTF-8 string or Buffer, returned as lowercase hex. */
export function sha256(data) {
  const input = Buffer.isBuffer(data) ? data : Buffer.from(String(data), "utf8");
  return createHash("sha256").update(input).digest("hex");
}

/** Bitcoin's double SHA-256: SHA-256 applied to the raw digest of SHA-256. */
export function doubleSha256(data) {
  const input = Buffer.isBuffer(data) ? data : Buffer.from(String(data), "utf8");
  const once = createHash("sha256").update(input).digest();
  return createHash("sha256").update(once).digest("hex");
}

/**
 * The number of leading zero bits in a hex digest. This is the quantity a
 * proof-of-work target actually constrains, and it is what Chapter 8 calls
 * difficulty in its simplified form.
 */
export function leadingZeroBits(hex) {
  let bits = 0;
  for (const character of hex) {
    const nibble = parseInt(character, 16);
    if (Number.isNaN(nibble)) throw new Error(`not a hex digest: ${hex}`);
    if (nibble === 0) {
      bits += 4;
      continue;
    }
    bits += Math.clz32(nibble) - 28;
    break;
  }
  return bits;
}
