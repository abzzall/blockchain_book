/**
 * Unit conversion and encoding, the parts that need no network.
 *
 * Every amount on Ethereum is an integer of wei, as Chapter 12 established.
 * JavaScript's Number cannot hold one: it loses precision above 2^53 - 1, and
 * a wei amount routinely exceeds that. Both libraries therefore use `bigint`,
 * and the conversion helpers exist to turn a bigint into a string for display
 * and a string back into a bigint for use -- never into a float.
 */

import { formatEther, parseEther, formatUnits, parseUnits } from 'viem';

export { formatEther, parseEther, formatUnits, parseUnits };

/** The largest integer JavaScript's Number type represents exactly. */
export const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

/** One ether, in wei. */
export const WEI_PER_ETHER = 10n ** 18n;

/**
 * Whether an amount of wei would survive a trip through Number.
 * One ether does not: it is about 111 times larger than the safe-integer limit.
 */
export function survivesAsNumber(wei) {
  return wei <= MAX_SAFE;
}

/**
 * What is lost by routing an amount through Number, in wei.
 * Returns 0n when nothing is lost.
 */
export function precisionLostViaNumber(wei) {
  const roundTripped = BigInt(Math.trunc(Number(wei)));
  return roundTripped > wei ? roundTripped - wei : wei - roundTripped;
}

/** A fee, computed the way a receipt reports it: gas used times price. */
export function feePaid(gasUsed, effectiveGasPrice) {
  return gasUsed * effectiveGasPrice;
}
