import { doubleSha256, leadingZeroBits } from "./hash.mjs";

/**
 * The bytes a miner hashes. Everything except the nonce is fixed before mining
 * begins, which is why the nonce is the only field a miner may search.
 */
export function serializeHeader(header) {
  const { previousHash, merkleRoot, timestamp, nonce } = header;
  return `${previousHash}|${merkleRoot}|${timestamp}|${nonce}`;
}

export function hashHeader(header) {
  return doubleSha256(serializeHeader(header));
}

export function meetsDifficulty(digest, difficultyBits) {
  return leadingZeroBits(digest) >= difficultyBits;
}

/**
 * Searches nonces upward from zero until the header hash has at least
 * `difficultyBits` leading zero bits. The search is deterministic: the same
 * header and difficulty always yield the same nonce, on every machine, which is
 * what makes this lab markable without trusting the student's screen.
 */
export function mine(header, difficultyBits, maxNonce = 50_000_000) {
  if (!Number.isInteger(difficultyBits) || difficultyBits < 0) {
    throw new Error("difficultyBits must be a non-negative integer");
  }
  for (let nonce = 0; nonce <= maxNonce; nonce += 1) {
    const candidate = { ...header, nonce };
    const digest = hashHeader(candidate);
    if (meetsDifficulty(digest, difficultyBits)) {
      return { nonce, hash: digest, attempts: nonce + 1, difficultyBits };
    }
  }
  throw new Error(`no nonce below ${maxNonce} satisfies ${difficultyBits} bits`);
}
