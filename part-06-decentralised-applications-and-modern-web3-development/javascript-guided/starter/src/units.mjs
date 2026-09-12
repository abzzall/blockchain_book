/**
 * Unit conversion, the part that needs no network.
 *
 * GUIDED WALKTHROUGH -- STARTER FILE.
 * Each TODO below is a step in the chapter. The tests in test/units.test.mjs
 * already describe what these must do, so run `npm test` after each step and
 * let the failures tell you what is left. The completed file is in
 * ../solution/src/units.mjs -- read it after you have tried, not before.
 */

// TODO (step 3): re-export the four conversion helpers from viem, so the rest
// of the project imports them from here rather than from the library directly.
// The four are: formatEther, parseEther, formatUnits, parseUnits.

/** The largest integer JavaScript's Number type represents exactly. */
export const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

/** One ether, in wei. */
export const WEI_PER_ETHER = 10n ** 18n;

/**
 * TODO (step 4): whether an amount of wei would survive a trip through Number.
 * One ether must not: it is about 111 times larger than the safe-integer limit.
 */
export function survivesAsNumber(wei) {
  throw new Error('not implemented: see step 4');
}

/**
 * TODO (step 4): what is lost by routing an amount through Number, in wei.
 * Return 0n when nothing is lost. Beware: you cannot subtract a Number from a
 * bigint, which is the language telling you what the whole chapter is about.
 */
export function precisionLostViaNumber(wei) {
  throw new Error('not implemented: see step 4');
}

/**
 * TODO (step 5): a fee, computed the way a receipt reports it.
 * Chapter 12: gas used times the effective gas price, in wei.
 */
export function feePaid(gasUsed, effectiveGasPrice) {
  throw new Error('not implemented: see step 5');
}
